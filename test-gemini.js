import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

async function testGemini() {
    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY missing in .env');
        return;
    }

    try {
        console.log('📡 Testing NEW Gemini SDK (@google/genai)...');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: "Say 'New SDK is WORKING' if you receive this." }] }]
        });
        
        const text = response.candidates[0].content.parts[0].text;
        
        console.log('\n✅ SUCCESS! New SDK responded:');
        console.log('----------------------------');
        console.log(text);
        console.log('----------------------------');
        
    } catch (error) {
        console.error('\n❌ FAILED to connect with New SDK:');
        console.error('Error:', error.message);
    }
}

testGemini();
