// Shared theme functionality for Session Wizard

// Immediately-invoked function to set initial theme and prevent flash
(function() {
    const THEME_KEY = 'session-wizard-theme';
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

// Theme toggle initialization
function initThemeToggle() {
    const THEME_KEY = 'session-wizard-theme';
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    // Sync theme and icon on load
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
        updateThemeToggleIcon(newTheme);
    });
}

// Update the theme toggle button's icon and accessibility labels
function updateThemeToggleIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    if (theme === 'dark') {
        themeToggle.innerHTML = '☀️';
        themeToggle.setAttribute('aria-label', 'Switch to light theme');
        themeToggle.setAttribute('title', 'Switch to light theme');
    } else {
        themeToggle.innerHTML = '🌙';
        themeToggle.setAttribute('aria-label', 'Switch to dark theme');
        themeToggle.setAttribute('title', 'Switch to dark theme');
    }
}

// Initialize the theme toggle when the DOM is ready
document.addEventListener('DOMContentLoaded', initThemeToggle);
