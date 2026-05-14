import 'dotenv/config';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

import logger from './src/logger.js';
import leadManager from './src/leadManager.js';
import conversationMemory from './src/conversationMemory.js';
import rateLimiter from './src/rateLimiter.js';
import { buildPrompt, getIntentTags, isRecruitmentQuery, isEscalationRequest } from './src/promptBuilder.js';
import { simulateTypingDelay } from './src/utils.js';
import { startFollowUpScheduler } from './src/followUpManager.js';

// ─── AI Setup ─────────────────────────────────────────────────────────────────
const genAI     = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = 'gemini-2.5-flash-lite';
const aiModel   = genAI.getGenerativeModel({ model: MODEL_NAME });

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const ADMIN_ID  = process.env.ADMIN_NUMBER;
const ADMIN_JID = ADMIN_ID.includes('@') ? ADMIN_ID : `${ADMIN_ID}@c.us`;
const MAX_MESSAGES_PER_SESSION = 40;
const COOLDOWN_MINUTES = 120; // 2 hours

// ─── WhatsApp Client ──────────────────────────────────────────────────────────
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));

// ─── GEMINI WITH RETRY ────────────────────────────────────────────────────────
async function generateWithRetry(prompt, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await aiModel.generateContent(prompt);
            return result.response.text()?.trim();
        } catch (err) {
            if (attempt === retries) throw err;
            logger.warn(`⚠️ Gemini attempt ${attempt} failed, retrying in ${attempt}s...`);
            await new Promise(r => setTimeout(r, attempt * 1000));
        }
    }
}

// ─── USER PROFILE EXTRACTION ─────────────────────────────────────────────────
function extractProfileHints(message) {
    const updates = {};
    const lower   = message.toLowerCase();

    if (/restaurant|dhaba|hotel|cafe|food|catering/.test(lower))       updates.businessType = 'Food & Restaurant';
    else if (/shop|store|retail|kapda|clothing|fashion/.test(lower))   updates.businessType = 'Retail';
    else if (/doctor|clinic|hospital|medical|health/.test(lower))      updates.businessType = 'Healthcare';
    else if (/school|college|coaching|education|institute/.test(lower)) updates.businessType = 'Education';
    else if (/real estate|property|flat|builder|plot/.test(lower))     updates.businessType = 'Real Estate';
    else if (/startup|app|software|tech|saas/.test(lower))             updates.businessType = 'Tech/Startup';
    else if (/salon|beauty|spa|parlour/.test(lower))                   updates.businessType = 'Beauty & Wellness';
    else if (/gym|fitness|yoga|trainer/.test(lower))                   updates.businessType = 'Fitness';

    const cityMatch = message.match(/\b(mumbai|delhi|bangalore|bengaluru|pune|indore|hyderabad|chennai|kolkata|ahmedabad|jaipur|surat|lucknow|nagpur|bhopal)\b/i);
    if (cityMatch) updates.location = cityMatch[0];

    const budgetMatch = message.match(/(₹\s*\d[\d,]*|\d+\s*k\s*(per\s*month)?|\d+\s*thousand|\d+\s*lakh)/i);
    if (budgetMatch) updates.budget = budgetMatch[0];

    if (/jaldi|urgent|asap|abhi chahiye|this week|is hafte/.test(lower)) updates.urgency = 'High';

    return updates;
}

// ─── MAIN MESSAGE HANDLER ─────────────────────────────────────────────────────
async function handleIncomingMessage(msg) {
    if (msg.from.includes('@g.us')) return;
    if (msg.fromMe || msg.from === 'status@broadcast') return;

    const phoneNumber  = msg.from;
    const cleanedPhone = phoneNumber.replace('@c.us', '').replace('@lid', '');
    const isAdmin      = phoneNumber === ADMIN_JID;
    const chat         = await msg.getChat();

    // ── ADMIN COMMANDS ────────────────────────────────────────────────────────
    if (isAdmin) {
        const body = msg.body.trim();

        if (body === '!stats') {
            const stats = leadManager.getLeadStats();
            let summary = `*AdsVerse Sales Report*\n\n`;
            summary += `Total Leads: ${stats.total}\n\n`;
            Object.entries(stats.byStatus).forEach(([s, count]) => {
                if (count > 0) summary += `  ${s}: ${count}\n`;
            });
            if (stats.topInterests.length > 0) {
                summary += `\nTop Interests:\n`;
                stats.topInterests.forEach(({ tag, count }) => {
                    summary += `  ${tag}: ${count}\n`;
                });
            }
            await msg.reply(summary);
            return;
        }

        if (body === '!leads') {
            const leads = leadManager.getAllLeads()
                .filter(l => l.status !== 'Lost' && l.status !== 'Converted')
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .slice(0, 5);
            if (leads.length === 0) {
                await msg.reply('No active leads right now.');
                return;
            }
            let reply = `*Top Active Leads*\n\n`;
            leads.forEach((l, i) => {
                reply += `${i + 1}. +${l.phone}\n`;
                reply += `   Status: ${l.status} | Score: ${l.score || 0}/100\n`;
                reply += `   Interest: ${(l.serviceInterests || []).join(', ') || 'General'}\n`;
                reply += `   Last msg: "${(l.lastMessage || '').substring(0, 40)}"\n\n`;
            });
            await msg.reply(reply);
            return;
        }

        if (body.startsWith('!convert ')) {
            const phone = body.replace('!convert ', '').replace('+', '').trim();
            const result = leadManager.updateLeadStatus(phone, 'Converted', 'Marked by admin');
            await msg.reply(result ? `✅ +${phone} marked as Converted.` : `❌ Lead not found: ${phone}`);
            return;
        }

        if (body.startsWith('!lost ')) {
            const phone = body.replace('!lost ', '').replace('+', '').trim();
            const result = leadManager.updateLeadStatus(phone, 'Lost', 'Marked by admin');
            await msg.reply(result ? `✅ +${phone} marked as Lost.` : `❌ Lead not found: ${phone}`);
            return;
        }

        if (body.startsWith('!pause ')) {
            const parts = body.split(' ');
            const phone = parts[1]?.replace('+', '').trim();
            const mins  = parseInt(parts[2]) || 120;
            const until = leadManager.pauseAutomation(phone, mins);
            await msg.reply(until ? `⏸️ Automation paused for +${phone} until ${until}` : `❌ Lead not found.`);
            return;
        }

        if (body === '!report') {
            const stats = leadManager.getLeadStats();
            const report = `*Daily Digest — AdsVerse Bot*\n\nDate: ${new Date().toLocaleDateString('en-IN')}\n\nTotal Leads: ${stats.total}\nNew: ${stats.byStatus['New Lead'] || 0}\nEngaged: ${stats.byStatus['Engaged'] || 0}\nQualified: ${stats.byStatus['Qualified'] || 0}\nConverted: ${stats.byStatus['Converted'] || 0}\nLost: ${stats.byStatus['Lost'] || 0}`;
            await msg.reply(report);
            return;
        }
    }

    // ── USER COMMANDS ─────────────────────────────────────────────────────────
    if (msg.body === '!reset') {
        conversationMemory.clearHistory(phoneNumber);
        await msg.reply('History cleared. Starting fresh.');
        return;
    }

    // ── RECRUITMENT SHORT-CIRCUIT (no AI, fixed reply) ────────────────────────
    if (isRecruitmentQuery(msg.body)) {
        await msg.reply('Please send your resume on email- careers@adsverse.in');
        logger.info(`📩 Recruitment query auto-handled for ${cleanedPhone}`);
        return;
    }

    // ── ESCALATION HANDLER (manager/owner/senior request) ────────────────────
    if (isEscalationRequest(msg.body)) {
        await msg.reply('Ji, main aapki baat karati hun.');

        leadManager.pauseAutomation(cleanedPhone, 600); // 10 hours
        logger.info(`⬆️ Escalation triggered for ${cleanedPhone} — paused for 10 hours.`);

        const chatLink = `https://wa.me/${cleanedPhone}`;
        await client.sendMessage(ADMIN_JID,
            `*Escalation Alert*\n+${cleanedPhone} wants to talk to manager/senior.\nLast msg: "${msg.body.substring(0, 100)}"\n${chatLink}\n\nBot paused 10hrs for this number.`
        );
        return;
    }

    // ── RATE LIMITING ─────────────────────────────────────────────────────────
    const rateLimit = rateLimiter.isRateLimited(cleanedPhone);
    if (rateLimit.limited) return;

    // ── AUTOMATION PAUSED? (per-user, escalation or admin pause) ──────────────
    if (leadManager.isAutomationPaused(cleanedPhone)) {
        // Pause expired? Reset message counter and continue
        // If still paused, skip
        logger.info(`⏸️ Automation paused for ${cleanedPhone}, skipping.`);
        return;
    }

    // ── 40-MESSAGE LIMIT CHECK ────────────────────────────────────────────────
    const sessionCount = conversationMemory.getSessionMessageCount(cleanedPhone);
    if (sessionCount >= MAX_MESSAGES_PER_SESSION) {
        // Hit 40 messages — pause for 2 hours, but KEEP memory
        leadManager.pauseAutomation(cleanedPhone, COOLDOWN_MINUTES);
        conversationMemory.resetSessionMessageCount(cleanedPhone);
        logger.info(`🛑 ${cleanedPhone} hit ${MAX_MESSAGES_PER_SESSION} msgs — 2hr cooldown started. Memory kept.`);
        return;  // Don't reply this time, cooldown starts NOW
    }

    try {
        await chat.sendStateTyping();

        const history     = conversationMemory.getHistory(cleanedPhone);
        const userProfile = conversationMemory.getProfile(cleanedPhone);

        // Extract profile hints
        const profileUpdates = extractProfileHints(msg.body);
        if (Object.keys(profileUpdates).length > 0) {
            conversationMemory.updateProfile(cleanedPhone, profileUpdates);
        }

        // Get user's display name
        const contact  = await msg.getContact();
        const userName = contact.pushname || contact.name || 'User';

        // Build prompt — history is always included (memory never cleared by cooldown)
        const workingStatus = isWorkingHours()
            ? ''
            : '[NOTICE: It is late night. Mention you will personally follow up tomorrow morning.]';
        const prompt = buildPrompt(msg.body, history, cleanedPhone, userName, { ...userProfile, ...profileUpdates }) + `\n\n${workingStatus}`;

        let aiReply;
        try {
            aiReply = await generateWithRetry(prompt);
        } catch (err) {
            logger.error('❌ Gemini failed after retries:', err);
            await msg.reply('Ek second, kuch technical issue aa gaya. Main thodi der mein reply karti hoon.');
            return;
        }

        if (!aiReply) return;

        // Lead Tracking & Intent detection
        const intents = getIntentTags(msg.body);
        const currentCount = conversationMemory.getSessionMessageCount(cleanedPhone);
        const { isNewLead, lead } = leadManager.saveLead({
            phone           : cleanedPhone,
            message         : msg.body,
            aiReply,
            messageCount    : currentCount + 1,
            detectedIntents : intents,
        });

        // Admin alerts (score-based)
        if (lead.score >= 60 && !lead.adminNotified) {
            const chatLink = `https://wa.me/${cleanedPhone}`;
            await client.sendMessage(ADMIN_JID,
                `*Hot Lead Alert!* Score: ${lead.score}/100\n+${cleanedPhone}\nInterest: ${intents.join(', ') || 'General'}\nMsg: "${msg.body.substring(0, 80)}"\n${chatLink}`
            );
            leadManager.saveLead({ phone: cleanedPhone, message: msg.body, aiReply, messageCount: lead.messageCount, detectedIntents: intents, adminNotified: true });
        }

        // Save to memory (this increments sessionMsgCount for 'user' role)
        conversationMemory.addMessage(cleanedPhone, 'user', msg.body);
        conversationMemory.addMessage(cleanedPhone, 'assistant', aiReply);

        const delay = simulateTypingDelay(aiReply);
        await new Promise(r => setTimeout(r, delay));
        await msg.reply(aiReply);

        logger.success(`👩‍💼 Shivani replied to ${cleanedPhone} (msg #${currentCount + 1}, score: ${lead.score || 0})`);

    } catch (error) {
        logger.error(`❌ Process Error:`, error);
    } finally {
        await chat.clearState();
    }
}

// ─── CATCH-UP UNREAD MESSAGES ─────────────────────────────────────────────────
async function catchUpUnreadMessages() {
    logger.info('📥 Checking for unread overnight messages...');
    const chats       = await client.getChats();
    const unreadChats = chats.filter(chat => chat.unreadCount > 0);

    if (unreadChats.length === 0) {
        logger.info('✅ No unread messages found.');
        return;
    }

    logger.info(`📬 Found ${unreadChats.length} unread chat(s). Processing...`);
    for (const chat of unreadChats) {
        const messages = await chat.fetchMessages({ limit: chat.unreadCount });
        for (const msg of messages) {
            await handleIncomingMessage(msg);
            await new Promise(r => setTimeout(r, 2000));
        }
        await chat.sendSeen();
    }
}

// ─── BOT READY ────────────────────────────────────────────────────────────────
client.on('ready', async () => {
    logger.success('✅ AdsVerse Shivani Bot is LIVE! 👩‍💼🚀');
    logger.info(`Admin: +${ADMIN_ID}`);
    await catchUpUnreadMessages();
    startFollowUpScheduler(client, leadManager);
});

client.on('auth_failure', (msg) => logger.error(`❌ [AUTH FAILURE]:`, msg));
client.on('disconnected', (reason) => logger.warn(`⚠️ [DISCONNECTED]: ${reason}`));

// ─── UTILS ────────────────────────────────────────────────────────────────────
function isWorkingHours() {
    const hours = new Date().getHours();
    return hours >= 9 && hours < 23;
}

client.on('message', handleIncomingMessage);
client.initialize();
