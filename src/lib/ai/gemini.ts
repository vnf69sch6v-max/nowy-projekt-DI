// =========================================
// Gemini AI via Firebase Vertex AI
// =========================================

import { getVertexAI, getGenerativeModel, GenerativeModel } from '@firebase/vertexai';
import { getFirebaseApp } from '../firebase';

/**
 * Get a Gemini model instance via Firebase Vertex AI
 * @param modelName - Model name (default: gemini-2.0-flash)
 */
export function getGeminiModel(modelName = 'gemini-2.0-flash'): GenerativeModel {
    const app = getFirebaseApp();
    const vertexAI = getVertexAI(app);
    return getGenerativeModel(vertexAI, { model: modelName });
}

/**
 * Simple text generation helper
 */
export async function generateText(prompt: string, modelName = 'gemini-2.0-flash'): Promise<string> {
    const model = getGeminiModel(modelName);
    const result = await model.generateContent(prompt);
    return result.response.text();
}

/**
 * Streaming text generation
 */
export async function* streamText(prompt: string, modelName = 'gemini-2.0-flash'): AsyncGenerator<string> {
    const model = getGeminiModel(modelName);
    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
            yield text;
        }
    }
}
