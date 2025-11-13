import * as configService from '../../services/configService.js';
import { showConfirmationModal } from '../../services/modalService.js';
import { LOCAL_STORAGE_KEYS } from '../../constants.js';
import { showToast } from '../../services/toastService.js';
import { applyTheme } from '../../services/themeService.js';

let elements = {};

/**
 * Updates the visual state of the segmented theme toggle control.
 * Moves the indicator and sets ARIA attributes.
 * @param {HTMLElement} button - The theme button that should be active.
 * @param {boolean} [instant=false] - If true, applies changes without transition.
 */
function setActiveThemeButton(button, instant = false) {
    if (!button) return;

    elements.themeToggleButtons.forEach(btn => btn.setAttribute('aria-checked', 'false'));
    button.setAttribute('aria-checked', 'true');

    const indicator = elements.themeToggle.querySelector('.segmented-control-indicator');
    const containerRect = elements.themeToggle.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    
    const left = buttonRect.left - containerRect.left;
    const width = buttonRect.width;
    
    // Disable transition for initial load to prevent sliding from default position
    if (instant) {
        indicator.style.transition = 'none';
    }

    indicator.style.left = `${left}px`;
    indicator.style.width = `${width}px`;

    // Re-enable transition after a very short delay
    if (instant) {
        setTimeout(() => {
            indicator.style.transition = '';
        }, 50);
    }
}

/**
 * Loads current settings from the config service and updates the UI.
 */
function loadSettings() {
    const config = configService.getConfig();
    elements.soundToggle.checked = config.enableSound;

    const activeThemeButton = elements.themeToggle.querySelector(`button[data-theme="${config.theme}"]`);
    setActiveThemeButton(activeThemeButton, true); // Instant update on load
}

function handleSoundToggle() {
    configService.setConfig({ enableSound: elements.soundToggle.checked });
}

function handleThemeToggle(event) {
    const button = event.target.closest('button[data-theme]');
    if (button && button.getAttribute('aria-checked') !== 'true') {
        const newTheme = button.dataset.theme;
        
        setActiveThemeButton(button);
        applyTheme(newTheme);
        configService.setConfig({ theme: newTheme });
    }
}

async function handleClearData() {
    const confirmed = await showConfirmationModal({
        title: 'Confirm Data Deletion',
        message: 'Are you sure you want to delete all your saved questions, learning paths, quiz history, and application settings? This action cannot be undone.',
        confirmText: 'Yes, Delete Everything',
        cancelText: 'Cancel'
    });

    if (confirmed) {
        Object.values(LOCAL_STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        showToast('All application data has been cleared.', 'success');
        // Reload the app to apply default settings and clear state.
        setTimeout(() => window.location.reload(), 1000);
    }
}

export function init(appState) {
    elements = {
        soundToggle: document.getElementById('sound-toggle'),
        clearDataBtn: document.getElementById('clear-data-btn'),
        themeToggle: document.getElementById('theme-toggle-group'),
        themeToggleButtons: document.querySelectorAll('#theme-toggle-group button'),
    };

    loadSettings();

    elements.soundToggle.addEventListener('change', handleSoundToggle);
    elements.clearDataBtn.addEventListener('click', handleClearData);
    elements.themeToggle.addEventListener('click', handleThemeToggle);
}

export function destroy() {
    if(elements.soundToggle) elements.soundToggle.removeEventListener('change', handleSoundToggle);
    if(elements.clearDataBtn) elements.clearDataBtn.removeEventListener('click', handleClearData);
    if(elements.themeToggle) elements.themeToggle.removeEventListener('click', handleThemeToggle);
    elements = {}; // Clear references
}