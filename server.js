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
const __dirname = path.dirname(__filename); // Corrected this line
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
const quizGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        questions: {
            type: Type.ARRAY,
            description: "An array of quiz questions.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING, description: "The question text." },
                    options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 4 possible answers." },
                    correctAnswerIndex: { type: Type.INTEGER, description: "The 0-based index of the correct answer in the options array." },
                    explanation: { type: Type.STRING, description: "A brief explanation for why the correct answer is correct." }
                },
                required: ["question", "options", "correctAnswerIndex", "explanation"]
            }
        }
    },
    required: ["questions"]
};

const learningPathSchema = {
    type: Type.OBJECT,
    properties: {
        path: {
            type: Type.ARRAY,
            description: "A comprehensive, granular array of learning steps.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "The name of the learning step/level." },
                    topic: { type: Type.STRING, description: "A concise, URL-friendly slug or keyword for the topic of this step." }
                },
                required: ["name", "topic"]
            }
        }
    },
    required: ["path"]
};


const mindMapNodeSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "The name of this node or concept." },
        children: {
            type: Type.ARRAY,
            description: "An array of child nodes, representing sub-concepts.",
            items: {
                type: Type.OBJECT, // Self-referential structure
                properties: {
                    name: { type: Type.STRING },
                    children: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                children: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING } } } } // Limit depth for schema simplicity
                            }
                        }
                    }
                }
            }
        }
    },
    required: ["name"]
};

const synthesisGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A concise, engaging title for the learning content." },
        summary: {
            type: Type.STRING,
            description: "A detailed summary of the key concepts, formatted in Markdown. Use headings (#), lists (*), and bold text (**).",
        },
        analogies: {
            type: Type.ARRAY,
            description: "An array of 2-3 powerful and relatable analogies that relate this complex topic to simpler, well-understood concepts.",
            items: { type: Type.STRING }
        },
        mind_map: {
            type: Type.OBJECT,
            description: "A hierarchical mind map of the topic, with a central root node and nested children.",
            properties: {
                root: mindMapNodeSchema
            },
            required: ["root"]
        }
    },
    required: ["title", "summary", "analogies", "mind_map"]
};


const socraticAssessmentSchema = {
    type: Type.OBJECT,
    properties: {
        isComplete: { type: Type.BOOLEAN, description: "True if the Socratic dialogue should end, false otherwise." },
        passed: { type: Type.BOOLEAN, description: "If isComplete is true, this indicates if the user demonstrated sufficient understanding." },
        assessment: { type: Type.STRING, description: "If isComplete is true, this is a final, qualitative summary of the user's understanding." },
        nextQuestion: { type: Type.STRING, description: "If isComplete is false, this is the next Socratic question to ask the user." },
    },
    required: ["isComplete"]
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
 * Generates a quiz using the Gemini API.
 * @param {string} topic - The quiz topic.
 * @param {number} numQuestions - The number of questions.
 * @param {string} difficulty - The difficulty level.
 * @param {string} [learningContext] - Optional text to base the quiz on.
 * @returns {Promise<object>} The parsed quiz data.
 */
async function generateQuizContent(topic, numQuestions, difficulty, learningContext) {
    if (!ai) throw new Error("AI Service not initialized. Check server configuration.");

    const toneInstruction = "Your tone should be friendly, encouraging, and natural, as if a helpful tutor is speaking. Phrase everything in simple, easy-to-understand language.";

    let prompt;
    if (learningContext && learningContext.trim()) {
        prompt = `${toneInstruction} Generate a ${difficulty} level multiple-choice quiz with exactly ${numQuestions} questions about "${topic}". The questions must be based *only* on the information provided in the following text: "${learningContext}". For each question, provide 4 options, the 0-based index of the correct answer, and a brief explanation. Ensure the content is accurate and educational.`;
    } else {
        prompt = `${toneInstruction} Generate a ${difficulty} level multiple-choice quiz with exactly ${numQuestions} questions about "${topic}". For each question, provide 4 options, the 0-based index of the correct answer, and a brief explanation. Ensure the content is accurate and educational.`;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: quizGenerationSchema,
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error('Gemini API Error (Quiz Generation):', error);
        throw new Error('Failed to generate quiz. The AI may have refused to generate content for this topic.');
    }
}

/**
 * Generates a learning path using the Gemini API.
 * @param {string} goal - The learning goal.
 * @returns {Promise<object>} The parsed learning path data.
 */
async function generateLearningPathContent(goal) {
    if (!ai) throw new Error("AI Service not initialized. Check server configuration.");
    const prompt = `Create a comprehensive, highly granular, step-by-step learning path for the goal: "${goal}". Break the topic down into at least 30 small, distinct, and logically ordered learning levels. For each level, provide a friendly and encouraging name and a concise, URL-friendly topic keyword. The output should be a single flat array of these levels. Do not group them into clusters.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: learningPathSchema,
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error('Gemini API Error (Learning Path):', error);
        throw new Error('Failed to generate learning path.');
    }
}

/**
 * Generates a full synthesis package for a topic.
 * @param {string} topic - The learning topic.
 * @returns {Promise<object>} The parsed synthesis content.
 */
async function generateSynthesisContent(topic) {
    if (!ai) throw new Error("AI Service not initialized. Check server configuration.");
    const prompt = `Adopt the persona of a friendly, enthusiastic, and patient tutor. Generate a comprehensive synthesis package for the topic: "${topic}". The entire package should be written in a natural, conversational, and easy-to-understand language, avoiding jargon where possible or explaining it simply. It must include a detailed summary in Markdown, 2-3 powerful and relatable analogies, and a hierarchical mind map with a root node and nested children.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: synthesisGenerationSchema,
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error('Gemini API Error (Synthesis Generation):', error);
        throw new Error('Failed to generate synthesis package.');
    }
}

/**
 * Generates speech from text using the Gemini API.
 * @param {string} text - The text to convert to speech.
 * @returns {Promise<string>} The base64 encoded audio data.
 */
async function generateSpeechContent(text) {
    if (!ai) throw new Error("AI Service not initialized. Check server configuration.");
    const prompt = `As a friendly tutor, say the following in an encouraging and clear voice: ${text}`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioData) {
            throw new Error("API did not return audio data.");
        }
        return audioData;
    } catch (error) {
        console.error('Gemini API Error (Speech Generation):', error);
        throw new Error('Failed to generate audio.');
    }
}

/**
 * Generates the next turn in a Socratic dialogue.
 * @param {string} summary - The lesson summary for context.
 * @param {Array<object>} history - The chat history.
 * @returns {Promise<object>} The parsed Socratic response.
 */
async function generateSocraticResponse(summary, history) {
    if (!ai) throw new Error("AI Service not initialized. Check server configuration.");
    const historyString = history.map(m => `${m.role}: ${m.parts[0].text}`).join('\n');

    const prompt = `You are a Socratic Tutor AI. Your goal is to test a user's understanding of a topic through a brief, 3-turn dialogue. You must be friendly, encouraging, and guide the user to discover concepts themselves rather than giving direct answers.
    
    CONTEXT: The user has just studied the following summary: "${summary}"
    
    RULES:
    1.  Your dialogue must not exceed 3 AI turns.
    2.  Start with a broad, open-ended question based on the summary.
    3.  Analyze the user's responses to ask insightful follow-up questions that probe their reasoning.
    4.  On your THIRD turn, you MUST end the conversation. Set "isComplete" to true.
    5.  When "isComplete" is true, you MUST provide a final "assessment" of the user's understanding and a boolean "passed" status. Passing requires a demonstrated grasp of the core concepts, not just keyword matching. Be encouraging even if they don't pass.
    6.  If the conversation is not complete, provide the "nextQuestion".
    
    Current chat history:
    ${historyString}
    
    Generate the next response based on these rules and the provided schema.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: socraticAssessmentSchema,
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error('Gemini API Error (Socratic Chat):', error);
        throw new Error('Failed to generate Socratic response.');
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

    const prompt = `Analyze the following user quiz history to identify areas for improvement. Based on the data, determine the top 2-3 topics where the user has the lowest average score or seems to be struggling the most. If all scores are high, return an empty array. History: [${historySummary}]. Return only a JSON object matching the provided schema.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
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


// --- EXPRESS APP SETUP ---
const app = express();
const server = http.createServer(app);

// --- MIDDLEWARE ---
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' })); // Increase limit for history payload
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
});
app.use('/api/', apiLimiter);
app.use(express.static(path.join(__dirname, '/')));


// --- API ROUTE HANDLERS ---
/**
 * Handles GET /api/topics
 */
async function handleGetTopics(req, res, next) {
    if (topicsCache) {
        return res.json(topicsCache);
    }
    try {
        const topicsPath = path.join(__dirname, 'data', 'topics.json');
        const data = await fs.readFile(topicsPath, 'utf8');
        topicsCache = JSON.parse(data);
        res.json(topicsCache);
    } catch (error) {
        console.error('Error reading topics.json:', error);
        next(new Error('Failed to load topics.'));
    }
}

/**
 * Handles POST /api/generate
 */
async function handleGenerateQuiz(req, res, next) {
    const { topic, numQuestions, difficulty, learningContext } = req.body;
    if (!topic || !numQuestions || !difficulty) {
        return res.status(400).json({ error: 'Missing required parameters: topic, numQuestions, difficulty.' });
    }
    try {
        const quizData = await generateQuizContent(topic, numQuestions, difficulty, learningContext);
        res.json(quizData);
    } catch (error) {
        next(error);
    }
}

/**
 * Handles POST /api/generate-path
 */
async function handleGeneratePath(req, res, next) {
    const { goal } = req.body;
    if (!goal) {
        return res.status(400).json({ error: 'Missing required parameter: goal.' });
    }
    try {
        const pathData = await generateLearningPathContent(goal);
        res.json(pathData);
    } catch (error) {
        next(error);
    }
}

/**
 * Handles POST /api/generate-synthesis
 */
async function handleGenerateSynthesis(req, res, next) {
    const { topic } = req.body;
    if (!topic) {
        return res.status(400).json({ error: 'Missing required parameter: topic.' });
    }
    try {
        const contentData = await generateSynthesisContent(topic);
        res.json(contentData);
    } catch (error) {
        next(error);
    }
}


/**
 * Handles POST /api/generate-speech
 */
async function handleGenerateSpeech(req, res, next) {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Missing required parameter: text.' });
    }
    try {
        const audioData = await generateSpeechContent(text);
        res.json({ audioData }); // Send as base64 string
    } catch (error) {
        next(error);
    }
}

/**
 * Handles POST /api/socratic-chat
 */
async function handleSocraticChat(req, res, next) {
    const { summary, history } = req.body;
    if (!summary || !history) {
        return res.status(400).json({ error: 'Missing required parameters: summary, history.' });
    }
    try {
        const responseData = await generateSocraticResponse(summary, history);
        res.json(responseData);
    } catch (error) {
        next(error);
    }
}


/**
 * Handles POST /api/analyze-performance
 */
async function handleAnalyzePerformance(req, res, next) {
    const { history } = req.body;
    if (!history || !Array.isArray(history)) {
        return res.status(400).json({ error: 'Missing or invalid required parameter: history.' });
    }
    try {
        const analysisData = await analyzeUserPerformance(history);
        res.json(analysisData);
    } catch (error) {
        next(error);
    }
}


// --- API ROUTER ---
const apiRouter = express.Router();
apiRouter.get('/topics', handleGetTopics);
apiRouter.post('/generate', handleGenerateQuiz);
apiRouter.post('/generate-path', handleGeneratePath);
apiRouter.post('/generate-synthesis', handleGenerateSynthesis);
apiRouter.post('/generate-speech', handleGenerateSpeech);
apiRouter.post('/socratic-chat', handleSocraticChat);
apiRouter.post('/analyze-performance', handleAnalyzePerformance);
app.use('/api', apiRouter);


// --- WEBSOCKET SERVER LOGIC ---
const wss = new WebSocketServer({ server });

/**
 * Handles a new WebSocket client connection for aural conversation.
 * @param {import('ws').WebSocket} ws - The WebSocket instance for the client.
 * @param {import('http').IncomingMessage} req - The HTTP request that initiated the connection.
 */
function setupWebSocketConnection(ws, req) {
    console.log('Client connected to WebSocket');

    if (!ai) {
        ws.send(JSON.stringify({ type: 'error', message: 'Server not configured with API key.' }));
        ws.close();
        return;
    }

    const defaultInstruction = 'You are a helpful and friendly AI tutor. Your goal is to assist the user with their questions in a clear and concise manner.';
    let systemInstruction = defaultInstruction;

    // Extract system instruction from query parameters
    try {
        const requestUrl = new URL(req.url, `ws://${req.headers.host}`);
        const instructionParam = requestUrl.searchParams.get('systemInstruction');
        if (instructionParam) {
            systemInstruction = decodeURIComponent(instructionParam);
            console.log('Using custom system instruction for Aural Tutor.');
        }
    } catch (e) {
        console.warn('Could not parse system instruction from URL, using default.');
    }

    let sessionPromise;
    try {
        sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Zephyr' },
                    },
                },
                systemInstruction: systemInstruction,
            },
            callbacks: {
                onopen: () => ws.send(JSON.stringify({ type: 'socket_open' })),
                onmessage: (message) => ws.send(JSON.stringify({ type: 'gemini_message', message })),
                onerror: (e) => ws.send(JSON.stringify({ type: 'error', message: e.message || 'An unknown error occurred' })),
                onclose: () => ws.send(JSON.stringify({ type: 'gemini_closed' })),
            }
        });

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString());
                if (data.type === 'audio_input' && sessionPromise) {
                    const session = await sessionPromise;
                    session.sendRealtimeInput({ media: data.payload });
                }
            } catch (e) {
                console.error('Error processing client message:', e);
            }
        });

        ws.on('close', async () => {
            console.log('Client disconnected');
            try {
                if (sessionPromise) {
                    const session = await sessionPromise;
                    session.close();
                }
            } catch (e) {
                console.error('Error closing Gemini session:', e);
            }
        });

    } catch (err) {
        console.error('Failed to connect to Gemini Live:', err);
        ws.send(JSON.stringify({ type: 'error', message: `Failed to connect to AI: ${err.message}` }));
        ws.close();
    }
}

wss.on('connection', setupWebSocketConnection);


// --- SPA FALLBACK & ERROR HANDLING ---
app.get(/^\/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Centralized error handler
app.use((err, req, res, next) => {
    console.error('Central Error Handler:', err.stack);
    res.status(500).json({ error: err.message || 'An internal server error occurred.' });
});

// --- SERVER START ---
server.listen(PORT, () => {
    console.log(`Server listening at http://localhost:${PORT}`);
});