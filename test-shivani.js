import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { buildPrompt } from './src/promptBuilder.js';

async function simulateGreeting() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const MODEL_NAME = 'gemini-2.5-flash';

    const userMessage = "hii kaise ho";
    const history = []; // Empty history for first message simulation
    const phoneNumber = "911234567890";

    const prompt = buildPrompt(userMessage, history, phoneNumber);

    console.log('--- GENERATING REPLY FOR: "hii kaise ho" ---');
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        
        const text = response.candidates[0].content.parts[0].text;
        
        console.log('\nShivani Replies:');
        console.log('----------------------------');
        console.log(text);
        console.log('----------------------------');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

simulateGreeting();
