import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

async function listModels() {
    try {
        const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
        // SDK might not have listModels, but we can try to generate a small content to test the name
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
        const result = await model.generateContent("hi");
        console.log("Success with gemini-2.0-flash-lite:", result.response.text());
    } catch (e) {
        console.error("Error with gemini-2.0-flash-lite:", e.message);
    }

    try {
        const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-lite" });
        const result = await model.generateContent("hi");
        console.log("Success with gemini-1.5-flash-lite:", result.response.text());
    } catch (e) {
        console.error("Error with gemini-1.5-flash-lite:", e.message);
    }
}

listModels();
