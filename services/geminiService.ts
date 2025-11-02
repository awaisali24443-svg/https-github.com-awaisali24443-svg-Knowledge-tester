
import { GoogleGenAI, Type } from "@google/genai";
import { NUM_QUESTIONS } from '../constants';
import type { QuizData } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const quizSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        question: {
          type: Type.STRING,
          description: 'The quiz question text.'
        },
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
          description: 'An array of 4 possible answers.'
        },
        correctAnswerIndex: {
          type: Type.INTEGER,
          description: 'The 0-based index of the correct answer in the options array.'
        },
        explanation: {
            type: Type.STRING,
            description: 'A brief explanation of why the correct answer is right.'
        }
      },
      required: ['question', 'options', 'correctAnswerIndex', 'explanation'],
    }
};


export const generateQuiz = async (topic: string): Promise<QuizData> => {
    const prompt = `Generate a quiz with ${NUM_QUESTIONS} multiple-choice questions about "${topic}". Each question should have 4 options. Provide a brief explanation for each correct answer.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: quizSchema,
            },
        });

        const jsonText = response.text.trim();
        const quizData = JSON.parse(jsonText) as QuizData;

        if (!Array.isArray(quizData) || quizData.length === 0) {
            throw new Error("Invalid quiz data format received from API.");
        }

        return quizData;

    } catch (error) {
        console.error("Error generating quiz with Gemini:", error);
        throw new Error("Failed to generate quiz. Please check the topic and try again.");
    }
};
