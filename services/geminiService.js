import { Type } from '@google/genai';

export async function generateQuiz(topic, numQuestions, difficulty = 'Medium') {
    // FIX #10: Use the difficulty parameter in the prompt.
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
    
    let abortController = new AbortController();
    const signal = abortController.signal;

    const promise = fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, schema }),
        signal
    }).then(async response => {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'An unknown server error occurred.' }));
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }
        
        // FIX #1: The server now sends a raw JSON string, so we parse it here.
        const parsedData = await response.json(); 

        // FIX #14: Basic validation of the returned data
        if (!parsedData.questions || !Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
            throw new Error("AI returned invalid or empty quiz data.");
        }
        // Further validation on each question
        for(const q of parsedData.questions) {
            if(!q.question || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correctAnswerIndex !== 'number' || !q.explanation) {
                 throw new Error("AI returned a malformed question object.");
            }
        }

        return parsedData;

    }).catch (error => {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
        } else {
          console.error("Error in generateQuiz service:", error);
        }
        // Re-throw the error so the calling module can handle it
        throw error;
    });

    return { promise, abort: () => abortController.abort() };
}