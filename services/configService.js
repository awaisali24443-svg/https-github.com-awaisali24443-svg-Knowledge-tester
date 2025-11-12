import { GENERAL_SETTINGS_KEY } from '../constants.js';

const defaultSettings = {
    theme: 'cyber',
    enableSound: true,
    largeText: false,
    highContrast: false,
    dyslexiaFont: false,
};

let currentSettings = { ...defaultSettings };

function loadSettings() {
    try {
        const storedSettings = localStorage.getItem(GENERAL_SETTINGS_KEY);
        if (storedSettings) {
            // Merge stored settings with defaults to ensure all keys are present
            currentSettings = { ...defaultSettings, ...JSON.parse(storedSettings) };
        } else {
            currentSettings = { ...defaultSettings };
        }
    } catch (error) {
        console.warn("Could not access localStorage. Using default settings.", error);
        currentSettings = { ...defaultSettings };
    }
}

function saveSettings() {
    try {
        localStorage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify(currentSettings));
    } catch (error) {
        console.warn("Could not save settings to localStorage.", error);
    }
}

export function getSetting(key) {
    return currentSettings[key];
}

export function setSetting(key, value) {
    currentSettings[key] = value;
    saveSettings();
    window.dispatchEvent(new CustomEvent('settings-changed', { detail: { key, value } }));
}

export function getAllSettings() {
    return { ...currentSettings };
}

// Initial load when the module is imported
loadSettings();
