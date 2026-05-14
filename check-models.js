import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function checkModels() {
    try {
        console.log("📡 Fetching available models...");
        // models.list() is generally available in the new SDK
        const result = await ai.models.list();
        console.log("✅ Available Models:");
        result.models.forEach(m => {
            if (m.name.includes('gemini')) {
                console.log(`- ${m.name}`);
            }
        });
    } catch (e) {
        console.error("❌ Error listing models:", e.message);
    }
}

checkModels();
