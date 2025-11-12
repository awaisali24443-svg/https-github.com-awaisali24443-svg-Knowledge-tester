
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import rateLimit from 'express-rate-limit';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Caching ---
let topicsData = null;

// --- Helper Functions ---
async function loadTopicsData() {
    if (topicsData) return topicsData;
    try {
        const dataPath = path.resolve(__dirname, 'data', 'topics.json');
        const data = await fs.readFile(dataPath, 'utf-8');
        topicsData = JSON.parse(data);
        console.log('Topics data loaded and cached successfully.');
        return topicsData;
    } catch (error) {
        console.error('FATAL: Could not load topics.json.', error);
        return { categories: [], topics: {} }; // Return default structure to prevent crashes
    }
}

// --- Express App Setup ---
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '/')));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
});

// --- API Routes ---

app.get('/api/topics', apiLimiter, async (req, res) => {
    try {
        const data = await loadTopicsData();
        res.json(data);
    } catch (error) {
        console.error('[API /api/topics] Error loading topics data:', error);
        res.status(500).json({ error: 'Failed to load server data.' });
    }
});

app.post('/api/generate-path', apiLimiter, async (req, res) => {
    const { goal } = req.body;

    if (!goal) {
        return res.status(400).json({ error: 'Learning goal is required.' });
    }

    console.log(`[API] Generating learning path for goal: "${goal}"`);

    const prompt = `A user wants to learn about "${goal}". Create a structured, beginner-friendly learning path for them. The path should consist of 4 to 6 logical steps that build on each other. For each step, provide a clear "name" and a specific "topic" string suitable for generating a quiz. For example, if the goal is "Learn about Ancient Rome", a good step would be: name: "The Roman Republic", topic: "The political structure, key figures, and major events of the Roman Republic".`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            path: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        topic: { type: Type.STRING }
                    },
                    required: ["name", "topic"]
                }
            }
        },
        required: ["path"]
    };

    try {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable is not set.");
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
                temperature: 0.5,
            }
        });

        const jsonResponse = JSON.parse(response.text);
        console.log(`[API] Successfully generated path for "${goal}"`);
        res.json(jsonResponse);

    } catch (error) {
        console.error(`[API /api/generate-path] Error generating learning path for goal "${goal}":`, error);
        res.status(500).json({ error: 'Failed to generate learning path from AI model.' });
    }
});

app.post('/api/generate', apiLimiter, async (req, res) => {
    const { topic, numQuestions, difficulty } = req.body;

    if (!topic || !numQuestions) {
        return res.status(400).json({ error: 'Topic and number of questions are required.' });
    }

    console.log(`[API] Generating quiz for topic: "${topic}"`);

    const prompt = `Generate a ${numQuestions}-question multiple-choice quiz about "${topic}". The difficulty should be ${difficulty}. For each question, provide a "question" text, an array of 4 "options", the "correctAnswerIndex" (0-3), and a brief "explanation" for why the correct answer is right. Ensure the options are distinct and plausible.`;

    const questionSchema = {
        type: Type.OBJECT,
        properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswerIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
        },
        required: ["question", "options", "correctAnswerIndex", "explanation"]
    };

    const schema = {
        type: Type.OBJECT,
        properties: {
            questions: {
                type: Type.ARRAY,
                items: questionSchema
            }
        },
        required: ["questions"]
    };

    try {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable is not set.");
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
                temperature: 0.7,
            },
        });
        
        const jsonResponse = JSON.parse(response.text);
        console.log(`[API] Successfully generated quiz for "${topic}"`);
        res.json(jsonResponse);

    } catch (error) {
        console.error(`[API /api/generate] Error generating quiz for topic "${topic}":`, error);
        res.status(500).json({ error: 'Failed to generate quiz from AI model.' });
    }
});


// Fallback to serve index.html for any other request (enables SPA routing)
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Server Start ---
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    loadTopicsData(); // Pre-cache data on startup
});
