
let configSvc;
let audioCtx = null;
let isInitialized = false;

/**
 * Initializes the audio context.
 * Note: Browsers require user interaction before AudioContext can run.
 */
function getContext() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
    }
    return audioCtx;
}

/**
 * Initializes the sound service.
 * @param {object} configService - A reference to the configService module.
 */
export function init(configService) {
    if (isInitialized) return;
    configSvc = configService;
    isInitialized = true;
}

/**
 * Plays a synthesized tone.
 * @param {number} freq - Frequency in Hz.
 * @param {string} type - Oscillator type (sine, square, sawtooth, triangle).
 * @param {number} duration - Duration in seconds.
 * @param {number} startTime - Delay before starting.
 * @param {number} volume - Volume level (0-1).
 */
function playTone(freq, type, duration, startTime = 0, volume = 0.1) {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime + startTime;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    // Envelope to prevent clicking and provide shape
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02); // Quick Attack
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration); // Decay to near silence

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.1); // Stop slightly after decay to ensure silence
}

/**
 * Plays a frequency sweep (slide).
 */
function playSweep(startFreq, endFreq, duration, type = 'sine', volume = 0.1) {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.1);
}

/**
 * Plays a sound effect.
 * @param {'correct'|'incorrect'|'click'|'start'|'finish'|'hover'|'achievement'|'flip'} soundName
 */
export function playSound(soundName) {
    // 1. Haptic Feedback (Always run if available)
    if (navigator.vibrate) {
        try {
            switch (soundName) {
                case 'click': navigator.vibrate(5); break; 
                case 'correct': navigator.vibrate([50, 30, 50]); break;
                case 'incorrect': navigator.vibrate(150); break;
                case 'achievement': navigator.vibrate([50, 50, 50, 50, 100]); break;
                case 'start': navigator.vibrate(20); break;
                case 'finish': navigator.vibrate(50); break;
            }
        } catch(e) {}
    }

    // 2. Audio Feedback
    if (!configSvc) return; // Safety check
    const { enableSound } = configSvc.getConfig();
    if (!enableSound) return;

    const ctx = getContext();
    
    // Ensure context is running (browsers auto-suspend it until interaction)
    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }

    switch (soundName) {
        case 'click':
            // High, short "tick" - Louder
            playTone(800, 'sine', 0.08, 0, 0.4);
            break;

        case 'hover':
            // Very subtle "pop"
            playTone(400, 'triangle', 0.03, 0, 0.1);
            break;

        case 'correct':
            // Major 3rd "Ding-Dong"
            playTone(523.25, 'sine', 0.3, 0, 0.4); // C5
            playTone(659.25, 'sine', 0.4, 0.1, 0.4); // E5
            break;

        case 'incorrect':
            // Low "Buzz" - Louder and raspier
            playTone(150, 'sawtooth', 0.3, 0, 0.3);
            playTone(145, 'sawtooth', 0.3, 0.05, 0.3); // Dissonance
            break;

        case 'start':
            // "Power Up" Sweep
            playSweep(200, 800, 0.3, 'sine', 0.3);
            break;

        case 'finish':
            // Major Triad Arpeggio
            playTone(523.25, 'sine', 0.4, 0, 0.3);   // C5
            playTone(659.25, 'sine', 0.4, 0.1, 0.3); // E5
            playTone(783.99, 'sine', 0.6, 0.2, 0.3); // G5
            break;

        case 'achievement':
            // Fast energetic sequence
            playTone(523.25, 'square', 0.1, 0, 0.15);
            playTone(659.25, 'square', 0.1, 0.08, 0.15);
            playTone(783.99, 'square', 0.1, 0.16, 0.15);
            playTone(1046.50, 'square', 0.4, 0.24, 0.15); // C6
            break;

        case 'flip':
            // Quick low sweep "Swish"
            playSweep(300, 100, 0.15, 'triangle', 0.2);
            break;
    }
}
