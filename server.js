const express = require('express');
const path = require('path');
const { GoogleGenAI, Type } = require('@google/genai');
const app = express();
const port = process.env.PORT || 10000;

// Middleware to parse JSON bodies
app.use(express.json());

// Initialize Gemini AI on the server
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schemas for structured responses (moved from client to server)
const quizSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: { question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswerIndex: { type: Type.INTEGER }, explanation: { type: Type.STRING } },
        required: ['question', 'options', 'correctAnswerIndex', 'explanation']
    }
};
const flashcardSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: { term: { type: Type.STRING }, definition: { type: Type.STRING } },
        required: ['term', 'definition']
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

    try {
        switch (type) {
            case 'quiz': {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash', contents: payload.prompt,
                    config: { responseMimeType: "application/json", responseSchema: quizSchema, temperature: 0.7, topP: 1, topK: 32 }
                });
                res.json(JSON.parse(response.text));
                break;
            }
            case 'study': {
                const responseStream = await ai.models.generateContentStream({
                    model: 'gemini-2.5-flash', contents: payload.prompt,
                    config: { temperature: 0.5, topP: 1, topK: 32 }
                });
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                for await (const chunk of responseStream) {
                    res.write(chunk.text);
                }
                res.end();
                break;
            }
            case 'flashcards': {
                const prompt = `Based on the following study guide, generate a set of 5-10 key flashcards (term and definition) that cover the most important concepts.\n\nStudy Guide:\n---\n${payload.guideContent}\n---\n\nGenerate the flashcards in the required JSON format.`;
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema: flashcardSchema }
                });
                res.json(JSON.parse(response.text));
                break;
            }
            case 'path': {
                 const prompt = `A user wants to achieve the following goal: "${payload.goal}". Generate a structured learning path with 5-7 logical steps to help them achieve this. Each step should have a clear title and a short description. The path should start with fundamental concepts and progressively build up to more advanced topics.`;
                 const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema: learningPathSchema }
                });
                res.json(JSON.parse(response.text));
                break;
            }
            default:
                res.status(400).json({ message: 'Invalid generation type specified.' });
        }
    } catch (error) {
        console.error(`Error in /api/gemini/generate (${type}):`, error);
        res.status(500).json({ message: 'An error occurred while communicating with the AI service.' });
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

// Add route for PWA icon
app.get('/icon.svg', (req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='#1f1f1f'/><text x='50' y='65' font-family='Inter, sans-serif' font-size='50' font-weight='800' fill='#2dd4bf' text-anchor='middle'>KT</text></svg>`);
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