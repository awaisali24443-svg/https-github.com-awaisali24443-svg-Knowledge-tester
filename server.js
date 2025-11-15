// --- IMPORTS & SETUP ---
import express from 'express';
import path from 'path';
import { fileURLToPath, URL } from 'url';
import 'dotenv/config';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import rateLimit from 'express-rate-limit';
import fs from 'fs/promises';
import http from 'http';
import { WebSocketServer } from 'ws';

// --- CONSTANTS & CONFIG ---
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let topicsCache = null;

// --- GEMINI API SETUP ---
let ai;
try {
    if (!process.env.API_KEY) {
        throw new Error('API_KEY is not defined in environment variables.');
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    console.log('GoogleGenAI initialized successfully.');
} catch (error) {
    console.error(`Failed to initialize GoogleGenAI: ${error.message}`);
    // The server will still start, but API calls will fail gracefully.
}

// --- GEMINI SCHEMAS ---

const levelGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        lesson: {
            type: Type.STRING,
            description: "A very short, single-paragraph lesson for this specific level, formatted in Markdown. It should build upon previous levels and be very focused."
        },
        questions: {
            type: Type.ARRAY,
            description: "An array of 2-3 multiple-choice questions based *only* on the provided lesson text.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 4 possible answers." },
                    correctAnswerIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING }
                },
                required: ["question", "options", "correctAnswerIndex", "explanation"]
            }
        }
    },
    required: ["lesson", "questions"]
};

const performanceAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        weakTopics: {
            type: Type.ARRAY,
            description: "An array of up to 3 topic names where the user has shown the weakest performance.",
            items: { type: Type.STRING }
        }
    },
    required: ["weakTopics"]
};


// --- GEMINI SERVICE FUNCTIONS ---

/**
 * Generates a game level (lesson + quiz) using the Gemini API.
 * @param {string} topic - The overall topic.
 * @param {number} level - The level number (1-100).
 * @returns {Promise<object>} The parsed level data.
 */
async function generateLevelContent(topic, level) {
    if (!ai) throw new Error("AI Service not initialized.");
    const prompt = `You are a friendly and encouraging AI tutor creating a 100-level learning game about "${topic}". The user, who is a complete beginner, is on Level ${level}.
    
    RULES:
    1. The difficulty must increase very gradually. Level 1 should be extremely simple. Level 100 should be for an expert.
    2. Generate a bite-sized, single-paragraph lesson for Level ${level}. This lesson MUST build upon the knowledge of the previous levels and introduce ONE new, small concept.
    3. Generate 2-3 simple multiple-choice questions that test understanding of *only the concepts in this specific lesson*.
    4. Your tone must be super encouraging, like a game.
    
    Generate the lesson and questions based on these rules and the provided JSON schema.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: levelGenerationSchema,
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error(`Gemini API Error (Level ${level} Generation for ${topic}):`, error);
        throw new Error('Failed to generate the next level. The AI may be busy or the topic is restricted.');
    }
}


/**
 * Analyzes user quiz history to find weak topics.
 * @param {Array<object>} history - The user's quiz history.
 * @returns {Promise<object>} The parsed analysis.
 */
async function analyzeUserPerformance(history) {
    if (!ai) throw new Error("AI Service not initialized. Check server configuration.");

    const historySummary = history.map(item => 
        `Topic: "${item.topic}", Score: ${item.score}/${item.totalQuestions}`
    ).join('; ');

    const prompt = `Analyze the following user quiz history: "${historySummary}". Identify up to 3 topics where the user consistently has the lowest scores (as a percentage). Focus on topics where they have multiple attempts or low scores on high-question-count quizzes. Do not suggest topics where they have a high score.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: performanceAnalysisSchema,
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error('Gemini API Error (Performance Analysis):', error);
        throw new Error('Failed to analyze user performance.');
    }
}


// --- EXPRESS ROUTER ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api', apiLimiter);

// --- API ENDPOINTS ---
app.get('/api/topics', async (req, res) => {
    if (topicsCache) {
        return res.json(topicsCache);
    }
    try {
        const filePath = path.join(__dirname, 'data', 'topics.json');
        const data = await fs.readFile(filePath, 'utf8');
        topicsCache = JSON.parse(data);
        res.json(topicsCache);
    } catch (err) {
        console.error('Failed to read topics.json:', err);
        res.status(500).json({ error: 'Failed to load topic data.' });
    }
});

app.post('/api/generate-level', async (req, res) => {
    const { topic, level } = req.body;
    if (!topic || level === undefined) {
        return res.status(400).json({ error: 'Missing required parameters.' });
    }
    try {
        const levelData = await generateLevelContent(topic, parseInt(level, 10));
        res.json(levelData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/analyze-performance', async (req, res) => {
    const { history } = req.body;
    if (!history || !Array.isArray(history)) {
        return res.status(400).json({ error: 'Missing or invalid history.' });
    }
    try {
        const analysisData = await analyzeUserPerformance(history);
        res.json(analysisData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- WEBSOCKET AURAL MODE ---
wss.on('connection', async (ws, req) => {
    let session;
    console.log('Client connected to WebSocket');

    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const systemInstruction = url.searchParams.get('systemInstruction') || 'You are a helpful AI tutor.';

        if (!ai) {
             ws.send(JSON.stringify({ type: 'error', message: 'AI Service is not initialized on the server.' }));
             ws.close();
             return;
        }

        session = await ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: systemInstruction,
            },
            callbacks: {
                onmessage: (message) => {
                    ws.send(JSON.stringify({ type: 'gemini_message', message }));
                },
                onerror: (e) => {
                    console.error('WebSocket session error:', e);
                    ws.send(JSON.stringify({ type: 'error', message: 'An error occurred in the AI session.' }));
                },
                onclose: () => {
                    console.log('WebSocket session closed.');
                },
            },
        });
    } catch (error) {
        console.error('Failed to create Live session:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to connect to the AI service.' }));
        ws.close();
        return;
    }

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'audio_input') {
                await session.sendRealtimeInput({ media: data.payload });
            }
        } catch (error) {
            console.error('Error processing client message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        if (session) {
            session.close();
        }
    });
});


// Fallback for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- SERVER START ---
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});