import fs from 'fs';
import path from 'path';
import logger from './logger.js';

const MEMORY_FILE = path.join(process.cwd(), 'leads', 'conversations.json');
const MAX_HISTORY = 15;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let conversations = {};
try {
    if (fs.existsSync(MEMORY_FILE)) {
        conversations = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
        logger.info(`💾 Loaded ${Object.keys(conversations).length} active conversations from memory.`);
    }
} catch (error) {
    logger.error('❌ Failed to load memory file:', error);
}

function saveMemory() {
    try {
        if (!fs.existsSync(path.dirname(MEMORY_FILE))) {
            fs.mkdirSync(path.dirname(MEMORY_FILE), { recursive: true });
        }
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(conversations, null, 2));
    } catch (error) {
        logger.error('❌ Failed to save memory file:', error);
    }
}

function ensureEntry(phone) {
    if (!conversations[phone]) {
        conversations[phone] = {
            messages: [],
            lastActivity: Date.now(),
            profile: {},
            sessionMsgCount: 0,  // tracks total messages in current session (resets after cooldown)
        };
    }
    // Backwards compat: add field if missing
    if (conversations[phone].sessionMsgCount === undefined) {
        conversations[phone].sessionMsgCount = conversations[phone].messages.length;
    }
}

export function getHistory(phone) {
    if (!conversations[phone]) return [];
    const age = Date.now() - conversations[phone].lastActivity;
    if (age > MAX_AGE_MS) {
        delete conversations[phone];
        saveMemory();
        return [];
    }
    return conversations[phone].messages;
}

export function addMessage(phone, role, content) {
    ensureEntry(phone);
    conversations[phone].messages.push({ role, content });
    conversations[phone].lastActivity = Date.now();
    // Only count user messages towards the 40-message limit
    if (role === 'user') {
        conversations[phone].sessionMsgCount = (conversations[phone].sessionMsgCount || 0) + 1;
    }
    if (conversations[phone].messages.length > MAX_HISTORY) {
        conversations[phone].messages = conversations[phone].messages.slice(-MAX_HISTORY);
    }
    saveMemory();
}

export function getMessageCount(phone) {
    if (!conversations[phone]) return 0;
    return conversations[phone].sessionMsgCount || 0;
}

export function getSessionMessageCount(phone) {
    if (!conversations[phone]) return 0;
    return conversations[phone].sessionMsgCount || 0;
}

export function resetSessionMessageCount(phone) {
    if (conversations[phone]) {
        conversations[phone].sessionMsgCount = 0;
        saveMemory();
    }
}

export function clearHistory(phone) {
    delete conversations[phone];
    saveMemory();
}

export function getActiveCount() {
    return Object.keys(conversations).length;
}

// ── USER PROFILE ─────────────────────────────────────────────────────────────

/**
 * Get stored user profile for a phone number.
 * @param {string} phone
 * @returns {object}
 */
export function getProfile(phone) {
    return conversations[phone]?.profile || {};
}

/**
 * Merge new profile data for a user. Existing keys are preserved unless overwritten.
 * @param {string} phone
 * @param {object} updates - e.g. { businessType: 'Bakery', location: 'Indore' }
 */
export function updateProfile(phone, updates) {
    ensureEntry(phone);
    conversations[phone].profile = { ...conversations[phone].profile, ...updates };
    saveMemory();
}

export default {
    getHistory,
    addMessage,
    getMessageCount,
    getSessionMessageCount,
    resetSessionMessageCount,
    clearHistory,
    getActiveCount,
    getProfile,
    updateProfile,
};
