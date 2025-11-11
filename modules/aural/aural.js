import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

// --- State Management ---
let ai;
let sessionPromise;
let microphoneStream;
let inputAudioContext, outputAudioContext;
let scriptProcessor;
let sources = new Set();
let nextStartTime = 0;
let currentInputTranscription = '';
let currentModelTranscription = '';
let isConnecting = false;

// --- DOM Elements ---
let elements = {};

// --- Audio Utility Functions (as per guidelines) ---
function encode(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data, ctx, sampleRate, numChannels) {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- UI & State Update Functions ---
function setUIState(state, message) {
    elements.orb.className = `orb-${state}`;
    elements.status.textContent = message;
}

function addTranscriptionEntry(text, sender) {
    if (!text.trim()) return;
    const entry = document.createElement('div');
    entry.className = `transcription-entry ${sender}`;
    entry.textContent = text;
    elements.log.appendChild(entry);
    elements.log.parentElement.scrollTop = elements.log.parentElement.scrollHeight;
}

// --- Core Aural Logic ---
async function startConversation() {
    if (isConnecting) return;
    isConnecting = true;

    setUIState('connecting', 'Connecting to AI...');
    elements.controlBtn.textContent = 'Connecting...';
    elements.controlBtn.disabled = true;

    try {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        inputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        
        microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    isConnecting = false;
                    elements.controlBtn.disabled = false;
                    elements.controlBtn.textContent = 'Stop Conversation';
                    setUIState('listening', 'Listening...');
                    
                    const source = inputAudioContext.createMediaStreamSource(microphoneStream);
                    scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromise.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };

                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContext.destination);
                },
                onmessage: async (message) => handleServerMessage(message),
                onerror: (e) => {
                    console.error('Session error:', e);
                    setUIState('idle', 'Session error. Please try again.');
                    stopConversation();
                },
                onclose: () => {
                    console.log('Session closed.');
                    setUIState('idle', 'Session ended.');
                    stopConversation();
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
            },
        });
    } catch (error) {
        console.error('Failed to start conversation:', error);
        setUIState('idle', 'Could not access microphone.');
        stopConversation();
        isConnecting = false;
    }
}

async function handleServerMessage(message) {
    // Handle transcriptions
    if (message.serverContent?.inputTranscription) {
        currentInputTranscription += message.serverContent.inputTranscription.text;
    }
    if (message.serverContent?.outputTranscription) {
        currentModelTranscription += message.serverContent.outputTranscription.text;
        setUIState('speaking', 'Speaking...');
    }
    if(message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
        setUIState('speaking', 'Speaking...');
    } else if (currentInputTranscription && !currentModelTranscription) {
        setUIState('thinking', 'Thinking...');
    }

    if (message.serverContent?.turnComplete) {
        addTranscriptionEntry(currentInputTranscription, 'user');
        addTranscriptionEntry(currentModelTranscription, 'model');
        currentInputTranscription = '';
        currentModelTranscription = '';
        setUIState('listening', 'Listening...');
    }

    // Handle audio playback
    const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
    if (audioData) {
        nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
        const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
        const source = outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputAudioContext.destination);
        source.addEventListener('ended', () => sources.delete(source));
        source.start(nextStartTime);
        nextStartTime += audioBuffer.duration;
        sources.add(source);
    }

    // Handle interruptions
    if (message.serverContent?.interrupted) {
        for (const source of sources.values()) {
            source.stop();
            sources.delete(source);
        }
        nextStartTime = 0;
    }
}

function stopConversation() {
    sessionPromise?.then(session => session.close());
    sessionPromise = null;

    microphoneStream?.getTracks().forEach(track => track.stop());
    microphoneStream = null;

    scriptProcessor?.disconnect();
    scriptProcessor = null;
    
    inputAudioContext?.close();
    outputAudioContext?.close();
    inputAudioContext = null;
    outputAudioContext = null;

    for (const source of sources.values()) {
        source.stop();
    }
    sources.clear();
    nextStartTime = 0;

    isConnecting = false;
    elements.controlBtn.textContent = 'Start Conversation';
    elements.controlBtn.disabled = false;
    setUIState('idle', 'Press start to talk to the AI');
}

function handleControlButtonClick() {
    if (sessionPromise || isConnecting) {
        stopConversation();
    } else {
        startConversation();
    }
}

export function init() {
    elements = {
        orb: document.getElementById('aural-orb'),
        status: document.getElementById('aural-status'),
        controlBtn: document.getElementById('aural-control-btn'),
        log: document.querySelector('.transcription-log'),
    };
    elements.controlBtn.addEventListener('click', handleControlButtonClick);
    console.log("Aural module initialized.");
}

export function destroy() {
    stopConversation();
    if (elements.controlBtn) {
        elements.controlBtn.removeEventListener('click', handleControlButtonClick);
    }
    console.log("Aural module destroyed.");
}
