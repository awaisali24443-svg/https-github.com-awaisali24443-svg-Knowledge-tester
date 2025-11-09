import * as progressService from '../../services/progressService.js';
import { SceneManager } from '../../services/threeManager.js';
import { logOut } from '../../services/authService.js';

let sceneManager;
let initialProfileState = { username: '', bio: '' };

// --- DOM Elements ---
const usernameInput = document.getElementById('username');
const profileBioInput = document.getElementById('profile-bio');
const saveProfileBtn = document.getElementById('save-profile-btn');
const profilePictureImg = document.getElementById('profile-picture');
const editPictureBtn = document.getElementById('edit-picture-btn');
const resetProgressBtn = document.getElementById('reset-progress-btn');
const goProBtn = document.getElementById('go-pro-btn');

// Theme Selector
const themeSelector = document.getElementById('theme-selector');
const themes = ['dark', 'light', 'cyber'];

// General Toggles
const soundToggle = document.getElementById('sound-toggle');

// Accessibility Toggles
const largeTextToggle = document.getElementById('large-text-toggle');
const highContrastToggle = document.getElementById('high-contrast-toggle');
const dyslexiaFontToggle = document.getElementById('dyslexia-font-toggle');
const reduceMotionToggle = document.getElementById('reduce-motion-toggle');

// --- Profile Management ---
function checkProfileChanges() {
    const hasChanged = usernameInput.value !== initialProfileState.username || profileBioInput.value !== initialProfileState.bio;
    saveProfileBtn.disabled = !hasChanged;
}

async function loadProfile() {
    const progress = await progressService.getProgress();
    if (progress) {
        initialProfileState.username = progress.username || '';
        initialProfileState.bio = progress.bio || '';
        usernameInput.value = initialProfileState.username;
        profileBioInput.value = initialProfileState.bio;
        profilePictureImg.src = progress.pictureURL || 'https://avatar.iran.liara.run/public/boy';
    }
    usernameInput.disabled = false;
    profileBioInput.disabled = false;
    
    // Initially, the save button should be disabled as no changes have been made.
    saveProfileBtn.disabled = true;

    // Add listeners to check for changes
    usernameInput.addEventListener('input', checkProfileChanges);
    profileBioInput.addEventListener('input', checkProfileChanges);
}

function setSaveLoading(isLoading) {
    const btnText = saveProfileBtn.querySelector('.btn-text');
    const spinner = saveProfileBtn.querySelector('.spinner');
    saveProfileBtn.disabled = isLoading;
    btnText.classList.toggle('hidden', isLoading);
    spinner.classList.toggle('hidden', !isLoading);
}

async function saveProfile() {
    setSaveLoading(true);
    const profileData = {
        username: usernameInput.value.trim(),
        bio: profileBioInput.value.trim(),
        pictureURL: profilePictureImg.src
    };
    try {
        await progressService.updateUserProfile(profileData);
        // Update the initial state to the new saved state
        initialProfileState.username = profileData.username;
        initialProfileState.bio = profileData.bio;
        window.showToast('✅ Profile saved successfully!');
        await window.updateHeaderStats(); // To reflect potential username change
    } catch (error) {
        window.showToast('❌ Failed to save profile.', 'error');
    } finally {
        setSaveLoading(false);
        // After attempting to save, disable the button again
        saveProfileBtn.disabled = true;
    }
}

async function editProfilePicture() {
    const newUrl = await window.showConfirmationModal({
        title: "Edit Profile Picture",
        text: "Enter a new image URL for your profile picture:",
        confirmText: "Save",
        isPrompt: true,
        promptValue: profilePictureImg.src
    });

    if (newUrl) {
        profilePictureImg.src = newUrl;
        // Since this is a change, enable the save button
        saveProfileBtn.disabled = false; 
    }
}

// --- General Settings ---
function loadGeneralSettings() {
    const settings = JSON.parse(localStorage.getItem('generalSettings') || '{}');
    soundToggle.checked = settings.soundEnabled ?? true; // Default to true if not set
}

function handleGeneralSettingsChange(e) {
    const { id, checked } = e.target;
    const settings = JSON.parse(localStorage.getItem('generalSettings') || '{}');

    if (id === 'sound-toggle') {
        settings.soundEnabled = checked;
    }

    localStorage.setItem('generalSettings', JSON.stringify(settings));
}


// --- Accessibility ---
function loadAccessibilitySettings() {
    const settings = JSON.parse(localStorage.getItem('accessibilitySettings') || '{}');
    largeTextToggle.checked = settings.largeText || false;
    highContrastToggle.checked = settings.highContrast || false;
    dyslexiaFontToggle.checked = settings.dyslexiaFont || false;
    reduceMotionToggle.checked = settings.reduceMotion || false;
}

function handleAccessibilityChange(e) {
    const { id, checked } = e.target;
    const settings = JSON.parse(localStorage.getItem('accessibilitySettings') || '{}');
    let bodyClass = '';
    let settingKey = '';

    switch (id) {
        case 'large-text-toggle': bodyClass = 'large-text'; settingKey = 'largeText'; break;
        case 'high-contrast-toggle': bodyClass = 'high-contrast'; settingKey = 'highContrast'; break;
        case 'dyslexia-font-toggle': bodyClass = 'dyslexia-font'; settingKey = 'dyslexiaFont'; break;
        case 'reduce-motion-toggle': bodyClass = 'reduce-motion'; settingKey = 'reduceMotion'; break;
    }

    if (bodyClass) {
        document.body.classList.toggle(bodyClass, checked);
        settings[settingKey] = checked;
        localStorage.setItem('accessibilitySettings', JSON.stringify(settings));
    }
}


// --- Data Management ---
async function handleResetProgress() {
    const isConfirmed = await window.showConfirmationModal({
        title: "Confirm Data Reset",
        text: "Are you sure you want to reset ALL your progress? This will reset your XP, levels, and achievements, but will not delete your account. This action cannot be undone.",
        confirmText: "Reset Progress",
    });

    if (isConfirmed) {
        try {
            await progressService.resetUserProgress();
            await window.showConfirmationModal({
                title: "Progress Reset",
                text: "Your progress has been reset. You will now be logged out.",
                isAlert: true
            });
            await logOut();
            window.location.hash = '#login';
        } catch (error) {
            window.showToast("An error occurred while resetting progress.", "error");
        }
    }
}

async function handleGoPro() {
    await window.showConfirmationModal({
        title: "Feature Coming Soon!",
        text: "Pro features are currently in development. Thank you for your interest!",
        isAlert: true
    });
}

// --- Initialization ---
async function init() {
    await loadProfile();
    loadGeneralSettings();
    loadAccessibilitySettings();

    const savedTheme = localStorage.getItem('selectedTheme') || 'light';
    if (themes.includes(savedTheme)) {
      themeSelector.value = savedTheme;
    }

    themeSelector?.addEventListener('change', (e) => {
      const selectedTheme = e.target.value;
      document.body.classList.add('theme-transitioning');
      document.documentElement.setAttribute('data-theme', selectedTheme);
      localStorage.setItem('selectedTheme', selectedTheme);
      setTimeout(() => document.body.classList.remove('theme-transitioning'), 150);
    });

    saveProfileBtn?.addEventListener('click', saveProfile);
    editPictureBtn?.addEventListener('click', editProfilePicture);
    resetProgressBtn?.addEventListener('click', handleResetProgress);
    goProBtn?.addEventListener('click', handleGoPro);
    
    soundToggle?.addEventListener('change', handleGeneralSettingsChange);
    largeTextToggle?.addEventListener('change', handleAccessibilityChange);
    highContrastToggle?.addEventListener('change', handleAccessibilityChange);
    dyslexiaFontToggle?.addEventListener('change', handleAccessibilityChange);
    reduceMotionToggle?.addEventListener('change', handleAccessibilityChange);

    const canvas = document.querySelector('.background-canvas');
    if (canvas && window.THREE) {
        sceneManager = new SceneManager(canvas);
        sceneManager.init('calmGeometric');
    }
}

function cleanup() {
    if (sceneManager) {
        sceneManager.destroy();
        sceneManager = null;
    }
}

const observer = new MutationObserver((mutationsList, obs) => {
    if (!document.querySelector('.settings-container')) {
        cleanup();
        obs.disconnect();
    }
});
observer.observe(document.getElementById('root-container'), { childList: true, subtree: true });

init();