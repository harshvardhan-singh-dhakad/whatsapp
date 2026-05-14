require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // We can use a lower level client or the SDK's internal fetcher if we want,
        // but let's try a simple model call first with a different model name.
        
        console.log('📡 Fetching list of available models for your API key...');
        // Note: SDK doesn't have a direct listModels method, but we can try common ones.
        
        const models = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-2.0-flash-exp",
            "gemini-pro"
        ];
        
        for (const modelName of models) {
            try {
                console.log(`\n🔍 Checking model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hi");
                console.log(`✅ ${modelName} is working!`);
                return; // Stop if we find one
            } catch (e) {
                console.log(`❌ ${modelName} failed: ${e.message.substring(0, 150)}...`);
            }
        }
    } catch (e) {
        console.error('Critical Error:', e.message);
    }
}

listModels();
