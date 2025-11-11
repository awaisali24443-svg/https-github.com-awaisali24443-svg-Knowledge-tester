
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import rateLimit from 'express-rate-limit';

const app = express();
const port = process.env.PORT || 3000;

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Basic security middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// FIX #1: Critical - Add rate limiting to the API endpoint
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 50, // Limit each IP to 50 requests per windowMs
	standardHeaders: true, 
	legacyHeaders: false, 
    message: { error: "Too many requests from this IP, please try again after 15 minutes." }
});

app.post('/api/generate', apiLimiter, async (req, res) => {
    try {
        const { prompt, schema } = req.body;
        
        // FIX #28: Basic input validation and sanitization
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0 || prompt.length > 1000) {
            return res.status(400).json({ error: "Invalid or missing prompt." });
        }
        if (!schema) {
            return res.status(400).json({ error: "Invalid or missing schema." });
        }
        
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            throw new Error('API_KEY environment variable not set');
        }

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const finishReason = response.candidates?.[0]?.finishReason;
        const text = response.text;

        // FIX #13: Better error handling for different finish reasons
        if (finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
             let errorMessage = "The AI response was stopped for an unexpected reason.";
             if(finishReason === 'SAFETY') {
                 errorMessage = "The request was blocked due to safety concerns. Please try a different topic.";
             } else if (finishReason === 'RECITATION') {
                 errorMessage = "The request was blocked due to recitation concerns.";
             }
             return res.status(400).json({ error: errorMessage });
        }
        
        if (!text) {
            return res.status(500).json({ error: "The AI returned an empty response." });
        }

        // FIX #20: Validate that the response is valid JSON before sending
        try {
            JSON.parse(text); // Try parsing to see if it's valid
        } catch (e) {
            console.error("AI returned non-JSON text:", text);
            return res.status(500).json({ error: "The AI generated an invalid data format. Please try again." });
        }

        // FIX #1: Send the raw JSON string directly.
        res.setHeader('Content-Type', 'application/json');
        res.send(text);

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        res.status(500).json({ error: 'Failed to generate quiz from AI service.' });
    }
});

// Serve the main index.html for any other GET request to support SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
