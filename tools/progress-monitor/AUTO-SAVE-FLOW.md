# Progress Monitor Auto-Save Data Flow

## Scenario 1: Working Within a Session

```
┌─────────────────────────────────────────────────────────────┐
│ User opens Progress Monitor                                  │
├─────────────────────────────────────────────────────────────┤
│ 1. progress-monitor.js loads                                 │
│    └─> Exposes window.ProgressMonitorSnapshot                │
│ 2. setup() runs on DOMContentLoaded                          │
│    └─> Loads from localStorage (persistent storage)          │
│ 3. temp-autosave.js loads                                    │
│    └─> Finds window.ProgressMonitorSnapshot                  │
│    └─> Calls tryLoad() on DOMContentLoaded                   │
│    └─> Restores temp data (overrides localStorage)           │
│                                                               │
│ Result: User sees their in-progress work                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User works on data, adds targets, sessions...                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User clicks "← Session Wizard" to navigate away              │
├─────────────────────────────────────────────────────────────┤
│ 1. temp-autosave.js intercepts link click                    │
│ 2. Calls trySave()                                           │
│    └─> Calls window.ProgressMonitorSnapshot.prepareSnapshot()│
│    └─> Saves to temp storage (sessionStorage/electron temp)  │
│ 3. Navigation proceeds                                       │
│                                                               │
│ Result: Work in progress is saved                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User returns to Progress Monitor                             │
├─────────────────────────────────────────────────────────────┤
│ 1. temp-autosave.js restores temp data                       │
│                                                               │
│ Result: User sees exactly where they left off                │
└─────────────────────────────────────────────────────────────┘
```

## Scenario 2: Fresh Start (App Closed/Reopened)

```
┌─────────────────────────────────────────────────────────────┐
│ User closes app completely                                   │
├─────────────────────────────────────────────────────────────┤
│ Electron: Temp storage cleared                               │
│ Browser: Tab closed, sessionStorage cleared                  │
│ localStorage: Still contains last manual save                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User reopens app, navigates to Progress Monitor              │
├─────────────────────────────────────────────────────────────┤
│ 1. setup() loads from localStorage                           │
│ 2. temp-autosave.js tryLoad() finds no temp data             │
│                                                               │
│ Result: Clean slate (or last persistent save)                │
└─────────────────────────────────────────────────────────────┘
```

## Scenario 3: Clear All

```
┌─────────────────────────────────────────────────────────────┐
│ User clicks "Clear All" button                               │
├─────────────────────────────────────────────────────────────┤
│ 1. clearAllData() runs                                       │
│    └─> Clears model = {sessions: [], targets: []}           │
│    └─> save() → updates localStorage                         │
│    └─> render() → updates UI                                 │
│    └─> Calls window.__tempAutosave.trySave()                │
│        └─> Saves EMPTY snapshot to temp storage              │
│                                                               │
│ Result: Everything cleared AND empty state saved             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User navigates away and returns                              │
├─────────────────────────────────────────────────────────────┤
│ 1. temp-autosave.js restores the EMPTY snapshot              │
│                                                               │
│ Result: Still cleared (no surprise data restoration)         │
└─────────────────────────────────────────────────────────────┘
```

## Storage Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Storage Hierarchy                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────┐          │
│  │ 1. Temp Storage (Auto-Save)                   │          │
│  │    ✓ Survives: Tool switching, page hide      │          │
│  │    ✗ Cleared: App close, tab close            │          │
│  │    Priority: Highest (overrides localStorage) │          │
│  └───────────────────────────────────────────────┘          │
│                         ↓                                     │
│  ┌───────────────────────────────────────────────┐          │
│  │ 2. localStorage (Persistent)                  │          │
│  │    ✓ Survives: App restart, tab close         │          │
│  │    ✗ Cleared: Manual clear, browser data wipe │          │
│  │    Priority: Medium (fallback)                │          │
│  └───────────────────────────────────────────────┘          │
│                         ↓                                     │
│  ┌───────────────────────────────────────────────┐          │
│  │ 3. File Snapshots (Archives)                  │          │
│  │    ✓ Survives: Everything                     │          │
│  │    ✗ Cleared: Manual deletion only            │          │
│  │    Priority: User-controlled                  │          │
│  └───────────────────────────────────────────────┘          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Auto-Save Triggers

```javascript
// 1. Page visibility change (switching tabs/apps)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') trySave()
})

// 2. Before page unload (closing/navigating)
window.addEventListener('beforeunload', () => { 
  trySave() 
})

// 3. Link clicks (internal navigation)
document.addEventListener('click', (e) => {
  const a = e.target.closest('a')
  if (a && a.href && a.target !== '_blank') {
    trySave()
  }
})
```

## Key Implementation Details

### Why Script Order Matters
```html
<!-- WRONG: temp-autosave can't find ProgressMonitorSnapshot -->
<script defer src="temp-autosave.js"></script>
<script type="module" src="progress-monitor.js"></script>

<!-- CORRECT: ProgressMonitorSnapshot defined before use -->
<script type="module" src="progress-monitor.js"></script>
<script defer src="temp-autosave.js"></script>
```

### How temp-autosave Finds Snapshot Functions
```javascript
// temp-autosave.js searches for *Snapshot objects
for (const k in window) {
  if (k.endsWith('Snapshot') && window[k]) {
    if (typeof window[k].restoreSnapshot === 'function') {
      window[k].restoreSnapshot(data)
      break
    }
  }
}
```

### What Gets Auto-Saved
Everything in the snapshot:
- ✓ Client name and date
- ✓ All targets with levels
- ✓ All session data (performance, support, comments)
- ✓ Settings (perf/support types, qualitative options)
- ✓ Graph mode state
- ✓ Visualization panel settings

### What Doesn't Get Auto-Saved
- ✗ Modal open/closed state
- ✗ Scroll position
- ✗ UI interaction state (hover, focus)
- ✗ Expanded/collapsed panel state (tracked separately)
