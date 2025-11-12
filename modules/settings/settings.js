import { getSetting, setSetting, getAllSettings } from '../../services/configService.js';
import { LIBRARY_KEY_GUEST, LEARNING_PATH_PROGRESS_GUEST } from '../../constants.js';
import { modalService } from '../../services/modalService.js';
import { toastService } from '../../services/toastService.js';

let themeSelect, soundToggle;
let largeTextToggle, highContrastToggle, dyslexiaFontToggle;
let clearDataBtn;

const handleThemeChange = (e) => setSetting('theme', e.target.value);
const handleToggleChange = (e) => {
    const key = e.target.dataset.key;
    if (key) {
        setSetting(key, e.target.checked);
    }
};

const handleClearData = async () => {
    const confirmed = await modalService.confirm({
        title: 'Clear All Guest Data?',
        message: 'This will permanently remove your saved library items and learning path progress. This action cannot be undone.',
        confirmText: 'Yes, Clear Data',
        cancelText: 'Cancel'
    });

    if (confirmed) {
        try {
            localStorage.removeItem(LIBRARY_KEY_GUEST);
            localStorage.removeItem(LEARNING_PATH_PROGRESS_GUEST);
            // Add any other guest-related keys here in the future
            toastService.show("Your guest data has been cleared.");
        } catch (error) {
            console.error("Failed to clear guest data:", error);
            toastService.show("There was an error clearing your data.");
        }
    }
};

export function init() {
    themeSelect = document.getElementById('theme-select');
    soundToggle = document.getElementById('sound-toggle');
    largeTextToggle = document.getElementById('large-text-toggle');
    highContrastToggle = document.getElementById('high-contrast-toggle');
    dyslexiaFontToggle = document.getElementById('dyslexia-font-toggle');
    clearDataBtn = document.getElementById('clear-guest-data-btn');

    soundToggle.dataset.key = 'enableSound';
    largeTextToggle.dataset.key = 'largeText';
    highContrastToggle.dataset.key = 'highContrast';
    dyslexiaFontToggle.dataset.key = 'dyslexiaFont';
    
    const settings = getAllSettings();
    themeSelect.value = settings.theme;
    soundToggle.checked = settings.enableSound;
    largeTextToggle.checked = settings.largeText;
    highContrastToggle.checked = settings.highContrast;
    dyslexiaFontToggle.checked = settings.dyslexiaFont;
    
    themeSelect.addEventListener('change', handleThemeChange);
    soundToggle.addEventListener('change', handleToggleChange);
    largeTextToggle.addEventListener('change', handleToggleChange);
    highContrastToggle.addEventListener('change', handleToggleChange);
    dyslexiaFontToggle.addEventListener('change', handleToggleChange);
    clearDataBtn.addEventListener('click', handleClearData);
}

export function destroy() {
    themeSelect.removeEventListener('change', handleThemeChange);
    soundToggle.removeEventListener('change', handleToggleChange);
    largeTextToggle.removeEventListener('change', handleToggleChange);
    highContrastToggle.removeEventListener('change', handleToggleChange);
    dyslexiaFontToggle.removeEventListener('change', handleToggleChange);
    clearDataBtn.removeEventListener('click', handleClearData);
    console.log("Settings module destroyed.");
}
