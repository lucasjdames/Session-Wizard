// Temporary autosave module
// Hooks into pages that expose prepareSnapshot() and restoreSnapshot(snapshot)
(function(){
  function makeKey() {
    // Use pathname and optional tool id meta tag
    const path = (location.pathname || '').replace(/\//g, '_');
    const meta = document.querySelector('meta[name="tool-id"]');
    const tool = meta ? meta.getAttribute('content') : '';
    return `tmp:${tool || path}`;
  }

  async function tryLoad() {
    try {
      const key = makeKey();
      if (window.electronSnapshot && typeof window.electronSnapshot.tempLoad === 'function') {
        const res = await window.electronSnapshot.tempLoad(key);
        if (res && res.success && res.data) {
          if (typeof window.restoreSnapshot === 'function') {
            try { window.restoreSnapshot(res.data); return true; } catch(e) {}
          }
          // Try tool-specific exposed snapshot APIs (e.g., HomeworkTrackerSnapshot)
          for (const k in window) {
            if (k && k.endsWith('Snapshot') && window[k] && typeof window[k].restoreSnapshot === 'function') {
              try { window[k].restoreSnapshot(res.data); return true; } catch(e) {}
            }
          }
        }
      }
    } catch (e) {}
    return false;
  }

  async function trySave() {
    try {
      const key = makeKey();
      let snap = null;
      if (typeof window.prepareSnapshot === 'function') {
        try { snap = window.prepareSnapshot(); } catch(e) { snap = null; }
      }
      if (!snap) {
        for (const k in window) {
          if (k && k.endsWith('Snapshot') && window[k] && typeof window[k].prepareSnapshot === 'function') {
            try { snap = window[k].prepareSnapshot(); break; } catch(e) { snap = null; }
          }
        }
      }
      if (!snap) return false;
      if (window.electronSnapshot && typeof window.electronSnapshot.tempSave === 'function') {
        await window.electronSnapshot.tempSave(key, snap);
        return true;
      }
      // fallback to sessionStorage
      try { sessionStorage.setItem(key, JSON.stringify(snap)); return true; } catch(e) { return false; }
    } catch (e) { return false; }
  }

  // Wire events
  document.addEventListener('DOMContentLoaded', () => {
    // Attempt load silently
    tryLoad();

    // Save on visibility change to hidden and beforeunload
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') trySave();
    });
    window.addEventListener('beforeunload', () => { trySave(); });

    // Intercept link clicks that navigate away
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a');
      if (a && a.href && a.target !== '_blank' && !a.hasAttribute('data-no-autosave')) {
        trySave();
      }
    }, { passive: true });

    // Expose a helper to clear temp for dev
    window.__tempAutosave = { trySave, tryLoad };
  });
})();
