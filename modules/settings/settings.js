import { getSetting, setSetting } from '../../services/configService.js';
import { GUEST_PROGRESS_KEY, GUEST_MISSIONS_KEY, GUEST_LIBRARY_KEY, GUEST_PATHS_KEY } from '../../constants.js';

// --- DOM ELEMENT REFERENCES ---
let themeSelect, soundToggle, backgroundToggle, largeTextToggle, highContrastToggle, dyslexiaFontToggle, clearGuestDataBtn;

// --- NAMED EVENT HANDLERS for proper cleanup ---
const handleThemeChange = (event) => {
    const newTheme = event.target.value;
    setSetting('theme', newTheme);
    document.body.dataset.theme = newTheme;
};

const handleSoundToggle = (e) => handleToggleChange(e, 'enableSound');
const handleBackgroundToggle = (e) => handleToggleChange(e, 'enable3DBackground');
const handleLargeTextToggle = (e) => handleToggleChange(e, 'largeText');
const handleHighContrastToggle = (e) => handleToggleChange(e, 'highContrast');
const handleDyslexiaFontToggle = (e) => handleToggleChange(e, 'dyslexiaFont');

function populateSettings() {
    themeSelect.value = getSetting('theme');
    soundToggle.checked = getSetting('enableSound');
    backgroundToggle.checked = getSetting('enable3DBackground');
    largeTextToggle.checked = getSetting('largeText');
    highContrastToggle.checked = getSetting('highContrast');
    dyslexiaFontToggle.checked = getSetting('dyslexiaFont');
    updateBodyClasses();
}

function handleToggleChange(event, settingKey) {
    setSetting(settingKey, event.target.checked);
    updateBodyClasses();
}

// FIX #17: This is reasonably efficient, but avoids unnecessary changes.
function updateBodyClasses() {
    const body = document.body;
    body.classList.toggle('large-text', getSetting('largeText'));
    body.classList.toggle('high-contrast', getSetting('highContrast'));
    body.classList.toggle('dyslexia-font', getSetting('dyslexiaFont'));
}

// FIX #18: Implement guest data clearing
function clearGuestData() {
    const keysToClear = [GUEST_PROGRESS_KEY, GUEST_MISSIONS_KEY, GUEST_LIBRARY_KEY, GUEST_PATHS_KEY];
    if (confirm("Are you sure you want to clear all guest progress and saved items? This cannot be undone.")) {
        keysToClear.forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.error(`Failed to remove key ${key}:`, e);
            }
        });
        alert("Guest data has been cleared.");
    }
}

function addEventListeners() {
    themeSelect.addEventListener('change', handleThemeChange);
    soundToggle.addEventListener('change', handleSoundToggle);
    backgroundToggle.addEventListener('change', handleBackgroundToggle);
    largeTextToggle.addEventListener('change', handleLargeTextToggle);
    highContrastToggle.addEventListener('change', handleHighContrastToggle);
    dyslexiaFontToggle.addEventListener('change', handleDyslexiaFontToggle);
    clearGuestDataBtn.addEventListener('click', clearGuestData);
}

// FIX #8: Properly remove all named event listeners
function removeEventListeners() {
    themeSelect.removeEventListener('change', handleThemeChange);
    soundToggle.removeEventListener('change', handleSoundToggle);
    backgroundToggle.removeEventListener('change', handleBackgroundToggle);
    largeTextToggle.removeEventListener('change', handleLargeTextToggle);
    highContrastToggle.removeEventListener('change', handleHighContrastToggle);
    dyslexiaFontToggle.removeEventListener('change', handleDyslexiaFontToggle);
    clearGuestDataBtn.removeEventListener('click', clearGuestData);
}

export function init(appState) {
    themeSelect = document.getElementById('theme-select');
    soundToggle = document.getElementById('sound-toggle');
    backgroundToggle = document.getElementById('background-toggle');
    largeTextToggle = document.getElementById('large-text-toggle');
    highContrastToggle = document.getElementById('high-contrast-toggle');
    dyslexiaFontToggle = document.getElementById('dyslexia-font-toggle');
    clearGuestDataBtn = document.getElementById('clear-guest-data-btn');

    populateSettings();
    addEventListeners();
    console.log("Settings module initialized.");
}

// FIX #22: destroy() now performs meaningful cleanup.
export function destroy() {
    removeEventListeners();
    console.log("Settings module destroyed and listeners removed.");
}