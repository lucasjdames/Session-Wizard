/*
 * Session Wizard: main.js
 * Purpose: Lightweight dashboard bootstrap logic (e.g., dynamic year stamp)
 * Scope: Runs on the root index.html only; no side effects beyond DOM content updates.
 */
console.log('Session Wizard main.js loaded');

// Set the current year in footer
function setYear() {
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setYear();
});

// Prefetch tool assets on user intent (hover or touchstart)
// Removed PWA prefetching: not needed in desktop builds and caused file:// errors.

// Navigation prefetch removed for desktop app. Prefetching using absolute or
// file:// URLs caused file-not-found errors when running from the filesystem.
