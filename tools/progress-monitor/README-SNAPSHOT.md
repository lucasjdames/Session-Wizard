# Progress Monitor Snapshot & Auto-Save Feature

## Overview
The Progress Monitor now supports both permanent Save/Load snapshot functionality and temporary auto-save for session continuity.

## Features Implemented

### 1. Permanent Save/Load (Snapshot)
Creates a complete snapshot of the current session including:
- Client name and date metadata
- All targets, levels, and session data
- User settings (performance/support types, qualitative options)
- Graph mode state
- Visualization settings (overlay, cell shading, data points, rulers, comments)

**Filename format:** `{ClientName}-{DDMmmYYYY}-ProgressMonitor.json`

**Usage:**
- **Electron Desktop:** File > Save Session / Load Session menu
- **Programmatic:** Via `window.ProgressMonitorSnapshot` API

### 2. Temporary Auto-Save
Automatically preserves work in progress when navigating away from the tool:
- ✅ Saves on page hide (switching tools/apps)
- ✅ Saves on page unload (closing tab/app)
- ✅ Saves when clicking navigation links
- ✅ Restores on return to tool
- ✅ Cleared when app closes (fresh start)

**Storage:**
- Electron: Uses temp storage (cleared on app restart)
- Browser: Uses sessionStorage (cleared when tab/window closes)

## Behavior

### Within Session (Auto-Save)
1. User works on Progress Monitor with client data
2. User clicks "← Session Wizard" to go back to main page
3. → Auto-save captures current state
4. User returns to Progress Monitor
5. → Auto-save restores where they left off

### Between Sessions (Fresh Start)
1. User closes the app completely
2. → Temp storage is cleared
3. User reopens app and navigates to Progress Monitor
4. → Starts with clean slate (or localStorage if they manually saved)

### Clear All Behavior
When user clicks "Clear All":
1. Confirms with user
2. Clears all data
3. Saves empty state to auto-save
4. → Prevents restored old data on return

## Integration

### Script Loading Order
```html
<!-- In <head> -->
<script src="../../assets/js/theme.js"></script>
<script defer src="../../assets/js/prefetch-back.js"></script>

<!-- At end of <body> -->
<script src="progress-monitor.js" type="module"></script>
<script defer src="../../assets/js/shared/temp-autosave.js"></script>
```

**Critical:** `temp-autosave.js` loads AFTER `progress-monitor.js` to ensure `window.ProgressMonitorSnapshot` is available.

### Electron Menu Events
```javascript
// In setup() function
window.electronOn.on('menu:save-session', async () => {
  const snap = prepareSnapshot()
  await saveSnapshotToFile(snap)
})

window.electronOn.on('menu:load-session', async () => {
  const snap = await loadSnapshotFromFile()
  if (snap) restoreSnapshot(snap)
})
```

### Auto-Save Integration
The temp-autosave module automatically:
- Finds `window.ProgressMonitorSnapshot.prepareSnapshot()`
- Finds `window.ProgressMonitorSnapshot.restoreSnapshot()`
- Calls them at appropriate times

## Snapshot Structure
```json
{
  "version": 1,
  "tool": "progress-monitor",
  "created": "2025-10-19T12:00:00.000Z",
  "meta": {
    "patient": "ClientName",
    "date": "2025-10-19"
  },
  "model": {
    "sessions": [...],
    "targets": [...]
  },
  "settings": {
    "defaultPerf": "percent",
    "defaultSupport": "qualitative",
    "defaultQual": [...]
  },
  "graphMode": false,
  "vizSettings": {
    "showOverlay": true,
    "showCellShading": true,
    "showDataPoints": true,
    "showRulers": true,
    "showComments": true
  }
}
```

## Testing Checklist

### Permanent Save/Load
- [ ] Save snapshot with client data
- [ ] Verify filename format
- [ ] Clear data and load snapshot
- [ ] Verify complete restoration
- [ ] Test in Electron desktop
- [ ] Test in browser

### Auto-Save (Within Session)
- [ ] Enter data in Progress Monitor
- [ ] Navigate to Session Wizard home
- [ ] Return to Progress Monitor
- [ ] **Expected:** Data still present
- [ ] Navigate away again
- [ ] Return again
- [ ] **Expected:** Data still present

### Fresh Start (Between Sessions)
- [ ] Enter data in Progress Monitor
- [ ] Close app completely
- [ ] Reopen app
- [ ] Navigate to Progress Monitor
- [ ] **Expected:** Clean slate (no data)

### Clear All
- [ ] Enter data
- [ ] Click "Clear All"
- [ ] Confirm
- [ ] Navigate away
- [ ] Return to Progress Monitor  
- [ ] **Expected:** Still cleared (not restored)

## Files Modified
- `tools/progress-monitor/progress-monitor.js` - Added snapshot functions, auto-save integration
- `tools/progress-monitor/index.html` - Added temp-autosave.js script
- `tools/progress-monitor/README-SNAPSHOT.md` - Documentation

## Technical Notes

### Why Load Order Matters
Module scripts (`type="module"`) execute in order but are deferred. The temp-autosave script needs `window.ProgressMonitorSnapshot` to exist, so it must load after progress-monitor.js.

### Why Auto-Save Works
1. `temp-autosave.js` searches for `window.*Snapshot` objects
2. Finds `window.ProgressMonitorSnapshot` 
3. Calls `.prepareSnapshot()` when saving
4. Calls `.restoreSnapshot(data)` when loading
5. Storage cleared on app close (Electron) or tab close (browser)

### Persistence Layers
1. **localStorage** - Long-term storage (survives app restart)
2. **temp storage** - Session continuity (cleared on restart)
3. **File snapshots** - Permanent archives (user-managed)
