
import { getSetting, setSetting, getAllSettings } from '../../services/configService.js';
import { LIBRARY_KEY_GUEST, LEARNING_PATH_PROGRESS_GUEST, LEARNING_PATHS_KEY_GUEST } from '../../constants.js';
import { modalService } from '../../services/modalService.js';
import { toastService } from '../../services/toastService.js';

let elements = {};
const eventHandlers = {};

function setupEventHandlers() {
    eventHandlers.handleThemeChange = (e) => setSetting('theme', e.target.value);
    eventHandlers.handleToggleChange = (e) => {
        const key = e.target.dataset.key;
        if (key) {
            setSetting(key, e.target.checked);
        }
    };

    eventHandlers.handleClearData = async () => {
        const confirmed = await modalService.confirm({
            title: 'Clear All Guest Data?',
            message: 'This will permanently remove your saved library items and all learning path progress. This action cannot be undone.',
            confirmText: 'Yes, Clear Data',
            cancelText: 'Cancel'
        });

        if (confirmed) {
            try {
                localStorage.removeItem(LIBRARY_KEY_GUEST);
                localStorage.removeItem(LEARNING_PATH_PROGRESS_GUEST);
                localStorage.removeItem(LEARNING_PATHS_KEY_GUEST);
                toastService.show("Your guest data has been cleared.");
            } catch (error) {
                console.error("Failed to clear guest data:", error);
                toastService.show("There was an error clearing your data.");
            }
        }
    };
}

function bindEvents() {
    elements.themeSelect?.addEventListener('change', eventHandlers.handleThemeChange);
    elements.soundToggle?.addEventListener('change', eventHandlers.handleToggleChange);
    elements.largeTextToggle?.addEventListener('change', eventHandlers.handleToggleChange);
    elements.highContrastToggle?.addEventListener('change', eventHandlers.handleToggleChange);
    elements.dyslexiaFontToggle?.addEventListener('change', eventHandlers.handleToggleChange);
    elements.clearDataBtn?.addEventListener('click', eventHandlers.handleClearData);
}

function unbindEvents() {
    elements.themeSelect?.removeEventListener('change', eventHandlers.handleThemeChange);
    elements.soundToggle?.removeEventListener('change', eventHandlers.handleToggleChange);
    elements.largeTextToggle?.removeEventListener('change', eventHandlers.handleToggleChange);
    elements.highContrastToggle?.removeEventListener('change', eventHandlers.handleToggleChange);
    elements.dyslexiaFontToggle?.removeEventListener('change', eventHandlers.handleToggleChange);
    elements.clearDataBtn?.removeEventListener('click', eventHandlers.handleClearData);
}

export function init() {
    elements = {
        themeSelect: document.getElementById('theme-select'),
        soundToggle: document.getElementById('sound-toggle'),
        largeTextToggle: document.getElementById('large-text-toggle'),
        highContrastToggle: document.getElementById('high-contrast-toggle'),
        dyslexiaFontToggle: document.getElementById('dyslexia-font-toggle'),
        clearDataBtn: document.getElementById('clear-guest-data-btn'),
    };

    // Assign data-key attributes for generic toggle handler
    elements.soundToggle.dataset.key = 'enableSound';
    elements.largeTextToggle.dataset.key = 'largeText';
    elements.highContrastToggle.dataset.key = 'highContrast';
    elements.dyslexiaFontToggle.dataset.key = 'dyslexiaFont';
    
    // Load current settings into UI
    const settings = getAllSettings();
    elements.themeSelect.value = settings.theme;
    elements.soundToggle.checked = settings.enableSound;
    elements.largeTextToggle.checked = settings.largeText;
    elements.highContrastToggle.checked = settings.highContrast;
    elements.dyslexiaFontToggle.checked = settings.dyslexiaFont;
    
    setupEventHandlers();
    bindEvents();
}

export function destroy() {
    unbindEvents();
    elements = {};
}
