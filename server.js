const express = require('express');
const path = require('path');
const { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } = require('@google/genai');
const app = express();
const port = process.env.PORT || 10000;

// Middleware to parse JSON bodies
app.use(express.json());

// Initialize Gemini AI on the server with basic safety settings
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// Schemas for structured responses
const quizSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: { question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswerIndex: { type: Type.INTEGER }, explanation: { type: Type.STRING } },
        required: ['question', 'options', 'correctAnswerIndex', 'explanation']
    }
};
const learningPathSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        steps: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } }, required: ['title', 'description'] } }
    },
    required: ['title', 'steps']
};


// Secure server-side proxy endpoint for all Gemini API calls
app.post('/api/gemini/generate', async (req, res) => {
    const { type, payload } = req.body;
    let model, config;

    try {
        switch (type) {
            case 'quiz':
                model = 'gemini-2.5-flash';
                config = { responseMimeType: "application/json", responseSchema: quizSchema, temperature: 0.7, topP: 1, topK: 32, safetySettings };
                const response = await ai.models.generateContent({ model, contents: payload.prompt, config });
                res.json(JSON.parse(response.text));
                break;

            case 'study':
                model = 'gemini-2.5-flash';
                config = { temperature: 0.5, topP: 1, topK: 32, safetySettings };
                const responseStream = await ai.models.generateContentStream({ model, contents: payload.prompt, config });
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                for await (const chunk of responseStream) {
                    res.write(chunk.text);
                }
                res.end();
                break;

            case 'path':
                model = 'gemini-2.5-flash';
                const prompt = `A user wants to achieve the following goal: "${payload.goal}". Generate a structured learning path with 5-7 logical steps to help them achieve this. Each step should have a clear title and a short description. The path should start with fundamental concepts and progressively build up to more advanced topics.`;
                config = { responseMimeType: "application/json", responseSchema: learningPathSchema, safetySettings };
                const pathResponse = await ai.models.generateContent({ model, contents: prompt, config });
                res.json(JSON.parse(pathResponse.text));
                break;
                
            default:
                res.status(400).json({ message: 'Invalid generation type specified.' });
        }
    } catch (error) {
        console.error(`Error in /api/gemini/generate (${type}):`, error.message);
        // Improved Error Handling: Check for specific error types
        if (error.message.includes('SAFETY')) {
            res.status(400).json({ message: 'The request was blocked. This topic may be restricted.' });
        } else if (error instanceof SyntaxError) {
             res.status(500).json({ message: 'The AI returned an invalid format. Please try a different topic.' });
        } else {
            res.status(500).json({ message: 'An error occurred while communicating with the AI service.' });
        }
    }
});


// SECURE: Dynamically generate a configuration script with ONLY public Firebase keys
app.get('/config.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    window.process = {
      env: {
        // IMPORTANT: API_KEY is REMOVED from here and is only used on the server.
        FIREBASE_CONFIG: {
          apiKey: '${process.env.FIREBASE_API_KEY}',
          authDomain: '${process.env.FIREBASE_AUTH_DOMAIN}',
          projectId: '${process.env.FIREBASE_PROJECT_ID}',
          storageBucket: '${process.env.FIREBASE_STORAGE_BUCKET}',
          messagingSenderId: '${process.env.FIREBASE_MESSAGING_SENDER_ID}',
          appId: '${process.env.FIREBASE_APP_ID}'
        }
      }
    };
  `);
});

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '.')));

// Handle SPA routing by sending all other requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});