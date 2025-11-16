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

// --- API