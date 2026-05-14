import { buildPrompt } from './src/promptBuilder.js';

const userMessage = "Hello, what are your services?";
const history = [];
const phoneNumber = "911234567890";

console.log("--- Test 1: Default User Name ---");
const prompt1 = buildPrompt(userMessage, history, phoneNumber);
if (prompt1.includes("User is the user") && prompt1.includes("━━ USER JUST SAID ━━")) {
    console.log("✅ Default 'User' name works correctly.");
} else {
    console.log("❌ Default 'User' name failed.");
    console.log("Snippet:", prompt1.split('\n').filter(l => l.includes("is the user") || l.includes("JUST SAID")).join('\n'));
}

console.log("\n--- Test 2: Dynamic User Name (Rahul) ---");
const userName2 = "Rahul";
const prompt2 = buildPrompt(userMessage, history, phoneNumber, userName2);
if (prompt2.includes("Rahul is the user") && prompt2.includes("━━ RAHUL JUST SAID ━━")) {
    console.log("✅ Dynamic 'Rahul' name works correctly.");
} else {
    console.log("❌ Dynamic 'Rahul' name failed.");
    console.log("Snippet:", prompt2.split('\n').filter(l => l.includes("is the user") || l.includes("JUST SAID")).join('\n'));
}

console.log("\n--- Test 3: History Formatting ---");
const history3 = [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hello' }];
const prompt3 = buildPrompt(userMessage, history3, phoneNumber, "Anita");
if (prompt3.includes("Anita: Hi") && prompt3.includes("Shivani: Hello")) {
    console.log("✅ History formatting with dynamic name works correctly.");
} else {
    console.log("❌ History formatting failed.");
    // console.log("Recent history:", prompt3.split('━━ CONVERSATION SO FAR ━━')[1].split('━━')[0]);
}
