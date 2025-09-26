/*
 * Session Wizard: theme.js
 * Responsibility: Persist and apply user theme preference using localStorage.
 * Integration: Provides a small API (setTheme) and keeps theme in sync across open pages via the storage event.
 * Notes: Executed early to avoid FOUC by setting [data-theme] before paint.
 */

// Shared key for localStorage so all modules use the same constant
const THEME_KEY = 'session-wizard-theme';
// Tracing flag key (set localStorage['session-wizard:trace']='1' to enable)
const TRACE_KEY = 'session-wizard:trace';
function traceEnabled() {
    try { return localStorage && localStorage.getItem(TRACE_KEY) === '1'; } catch (e) { return false; }
}

// Helper: resolve saved theme or OS preference
function getSavedTheme() {
    const stored = (() => { try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; } })();
    if (stored) return stored;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
}

// Immediately-invoked function to set initial theme and prevent flash
// Immediately apply the saved theme (or OS preference) early to avoid FOUC
(function() {
    const start = performance ? performance.now() : Date.now();
    const theme = getSavedTheme();
    document.documentElement.setAttribute('data-theme', theme);
    if (traceEnabled()) console.log('[theme] initial apply', theme, 'took', (performance ? performance.now() : Date.now()) - start, 'ms');
})();

// Re-apply the saved theme on lifecycle events that can follow service-worker responses
// or late-running scripts. This defends against cached pages or late inline scripts
// that might unintentionally change the attribute after initial load.
function applySavedThemeAndIcon() {
    const start = performance ? performance.now() : Date.now();
    const theme = getSavedTheme() || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeToggleIcon(theme);
    if (traceEnabled()) console.log('[theme] applySavedThemeAndIcon', theme, 'took', (performance ? performance.now() : Date.now()) - start, 'ms');
}

window.addEventListener('pageshow', applySavedThemeAndIcon);
window.addEventListener('load', applySavedThemeAndIcon);
   // Service worker hooks removed — PWA support archived. Theme will still reapply on visibility/page events.

// Defensive re-apply: if some late-running script or cached inline script overwrote the
// theme after initial load, reapply saved theme after a short delay and when the page
// becomes visible. This is a defensive hack for PWA/service-worker race conditions.
function reapplySavedThemeDeferred() {
    // immediate reapply (already done elsewhere) but also schedule one later
    applySavedThemeAndIcon();
    try {
        window.setTimeout(() => { const s=performance?performance.now():Date.now(); applySavedThemeAndIcon(); if (traceEnabled()) console.log('[theme] deferred reapply at', (performance?performance.now():Date.now())-s, 'ms'); }, 150);
        window.setTimeout(() => { const s=performance?performance.now():Date.now(); applySavedThemeAndIcon(); if (traceEnabled()) console.log('[theme] deferred reapply at', (performance?performance.now():Date.now())-s, 'ms'); }, 600);
    } catch (e) { /* ignore */ }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reapplySavedThemeDeferred();
});

// Run defensive reapply soon after the script loads to cover cached pages with late scripts
reapplySavedThemeDeferred();

// Theme toggle initialization
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    // Sync theme and icon on load
    const savedTheme = getSavedTheme();
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    });
}

// Update the theme toggle button's icon and accessibility labels
function updateThemeToggleIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    // Update visual icon and accessibility state
    if (theme === 'dark') {
        themeToggle.innerHTML = '☀️';
        themeToggle.setAttribute('aria-label', 'Switch to light theme');
        themeToggle.setAttribute('title', 'Switch to light theme');
        themeToggle.setAttribute('aria-pressed', 'true');
    } else {
        themeToggle.innerHTML = '🌙';
        themeToggle.setAttribute('aria-label', 'Switch to dark theme');
        themeToggle.setAttribute('title', 'Switch to dark theme');
        themeToggle.setAttribute('aria-pressed', 'false');
    }
}

// Programmatic setter to centralize behavior and ensure all parts of the app stay in sync.
function setTheme(newTheme) {
    if (!newTheme) return;
    document.documentElement.setAttribute('data-theme', newTheme);
    try { localStorage.setItem(THEME_KEY, newTheme); } catch (e) { /* ignore storage failures (e.g., private mode) */ }
    updateThemeToggleIcon(newTheme);
    // Dispatch an app-level event so other modules can react if needed
    try {
        window.dispatchEvent(new CustomEvent('session-wizard:theme-changed', { detail: { theme: newTheme } }));
    } catch (e) {
        // CustomEvent may fail in some odd contexts; ignore
    }
}

// Keep theme in sync across multiple open windows/tabs for the same origin.
window.addEventListener('storage', (evt) => {
    if (!evt || evt.key !== THEME_KEY) return;
    const newTheme = evt.newValue || 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    updateThemeToggleIcon(newTheme);
});

// Initialize the theme toggle when the DOM is ready
document.addEventListener('DOMContentLoaded', initThemeToggle);
