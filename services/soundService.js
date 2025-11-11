// services/soundService.js
import { getSetting } from './configService.js';

let audioContext;
let sounds = {};
let ambientSource = null;
let isInitialized = false;

const soundFiles = {
    ambient: '/assets/sounds/ambient.mp3',
    click: '/assets/sounds/click.wav',
    hover: '/assets/sounds/hover.wav',
    transition: '/assets/sounds/transition.wav',
};

async function loadSound(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load sound: ${url}`);
        const arrayBuffer = await response.arrayBuffer();
        return await audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function init() {
    if (isInitialized || !getSetting('enableSound')) return;

    // Use a single AudioContext, create it on first user interaction if needed
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API is not supported in this browser.');
            return;
        }
    }
    
    // Resume context if it's suspended (common in modern browsers)
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    const loadingPromises = Object.entries(soundFiles).map(async ([name, path]) => {
        sounds[name] = await loadSound(path);
    });

    await Promise.all(loadingPromises);
    isInitialized = true;
    console.log("Sound service initialized and sounds loaded.");

    // Listen for settings changes to enable/disable sound on the fly
    window.addEventListener('settings-changed', (e) => {
        if (e.detail.key === 'enableSound') {
            if (e.detail.value) {
                if (!isInitialized) init();
                if (ambientSource) startAmbient(); // Resume ambient sound if it was playing
            } else {
                stopAmbient(true); // Force stop
            }
        }
    });
}

function playSound(name) {
    if (!isInitialized || !getSetting('enableSound') || !sounds[name] || !audioContext) return;
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = sounds[name];
    source.connect(audioContext.destination);
    source.start(0);
}

function startAmbient() {
    if (!isInitialized || !getSetting('enableSound') || !sounds.ambient || ambientSource || !audioContext) return;

    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    ambientSource = audioContext.createBufferSource();
    ambientSource.buffer = sounds.ambient;
    ambientSource.loop = true;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.3; // Lower volume for ambient track
    ambientSource.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    ambientSource.start(0);
}

function stopAmbient(force = false) {
    if (ambientSource && (force || !getSetting('enableSound'))) {
        ambientSource.stop();
        ambientSource.disconnect();
        ambientSource = null;
    }
}

export const soundService = {
    init,
    playSound,
    startAmbient,
    stopAmbient,
};