import { GoogleGenAI, Type } from '@google/genai';

export async function generateQuiz(topic, numQuestions, difficulty = 'Medium') {
    const prompt = `Generate a quiz with ${numQuestions} multiple-choice questions about "${topic}". The difficulty should be ${difficulty}. For each question, provide 4 options, the index of the correct answer, and a brief explanation for why it's correct.`;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            questions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswerIndex: { type: Type.INTEGER },
                        explanation: { type: Type.STRING }
                    },
                    required: ["question", "options", "correctAnswerIndex", "explanation"]
                }
            }
        },
        required: ["questions"]
    };

    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            throw new Error('API_KEY is not configured in the environment.');
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

        if (finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
             let errorMessage = "The AI response was stopped for an unexpected reason.";
             if(finishReason === 'SAFETY') {
                 errorMessage = "The request was blocked due to safety concerns. Please try a different topic.";
             } else if (finishReason === 'RECITATION') {
                 errorMessage = "The request was blocked due to recitation concerns.";
             }
             throw new Error(errorMessage);
        }
        
        if (!text) {
            throw new Error("The AI returned an empty response.");
        }

        const parsedData = JSON.parse(text);

        if (!parsedData.questions || !Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
            throw new Error("AI returned invalid or empty quiz data.");
        }

        for(const q of parsedData.questions) {
            if(!q.question || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correctAnswerIndex !== 'number' || !q.explanation) {
                 throw new Error("AI returned a malformed question object.");
            }
        }

        return parsedData;

    } catch (error) {
        console.error("Error in generateQuiz service:", error);
        throw error;
    }
}