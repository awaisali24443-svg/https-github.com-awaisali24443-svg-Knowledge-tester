// server.js
import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
// Serve static files from the root directory
app.use(express.static(path.resolve()));

// Gemini AI setup
// Ensure API_KEY is set in your environment
if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelConfig = {
    model: "gemini-2.5-flash",
};

// API Endpoint for quiz generation
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, schema } = req.body;

        // FIX: #28 - Basic input validation and sanitization
        if (!prompt || typeof prompt !== 'string' || !schema) {
            return res.status(400).json({ error: 'Prompt and schema are required' });
        }
        const sanitizedPrompt = prompt.trim();
        if (sanitizedPrompt.length === 0 || sanitizedPrompt.length > 200) {
            return res.status(400).json({ error: 'Prompt must be between 1 and 200 characters.' });
        }

        const response = await ai.models.generateContent({
            model: modelConfig.model,
            contents: sanitizedPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });
        
        // FIX: #13 - More robust error checking from the API response itself
        if (!response.text) {
             console.error('API Error: No text in response', response);
             let errorMessage = 'The AI returned an empty or invalid response.';
             const finishReason = response?.candidates?.[0]?.finishReason;
             switch(finishReason) {
                case 'SAFETY':
                    errorMessage = 'The request was blocked for safety reasons. Please try a different topic.';
                    break;
                case 'MAX_TOKENS':
                    errorMessage = 'The AI response was too long and was cut off. This is an issue with the model.';
                    break;
                case 'RECITATION':
                     errorMessage = 'The request was blocked due to potential recitation issues.';
                     break;
             }
             return res.status(500).json({ error: errorMessage });
        }
        
        // FIX: #1 - Send the raw JSON string from Gemini, don't re-wrap it.
        // The client expects a JSON string, so set content type appropriately.
        res.setHeader('Content-Type', 'application/json');
        res.send(response.text);

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate content from AI.' });
    }
});

// Fallback to index.html for single-page application routing
app.get('*', (req, res) => {
    res.sendFile(path.resolve('index.html'));
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});