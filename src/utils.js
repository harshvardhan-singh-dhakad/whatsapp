export function simulateTypingDelay(text) {
    const minDelay = 1000; // 1 second min
    const maxDelay = 2000; // 2 seconds max
    const msPerChar = 5;  // Faster typing delay

    const calculated = text.length * msPerChar;
    const finalDelay = Math.min(Math.max(calculated, minDelay), maxDelay);

    return finalDelay;
}

export async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default { simulateTypingDelay, wait };
