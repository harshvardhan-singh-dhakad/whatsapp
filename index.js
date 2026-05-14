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
import stageManager from './src/conversationStage.js';
import { 
    buildPrompt, 
    STAGES, 
    isMediaMessage, 
    getMediaReply, 
    isHumanTrigger, 
    detectNewStage,
    isRecruitmentQuery 
} from './src/promptBuilder.js';
import { simulateTypingDelay } from './src/utils.js';
import { startFollowUpScheduler } from './src/followUpManager.js';

// ─── AI Setup ─────────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = 'gemini-2.5-flash-lite';
const aiModel = genAI.getGenerativeModel({ model: MODEL_NAME });

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const ADMIN_NUMBER = process.env.ADMIN_NUMBER;
const ADMIN_JID = ADMIN_NUMBER.includes('@') ? ADMIN_NUMBER : `${ADMIN_NUMBER}@c.us`;
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

// ─── GEMINI API CALL ────────────────────────────────────────────────────────
async function callGemini(systemPrompt, historyMessages) {
    try {
        const chat = aiModel.startChat({
            history: historyMessages,
            systemInstruction: systemPrompt,
        });

        const lastMessage = historyMessages[historyMessages.length - 1];
        const result = await chat.sendMessage(lastMessage.parts[0].text);
        return result.response.text()?.trim();
    } catch (err) {
        logger.error('❌ Gemini call failed:', err);
        throw err;
    }
}

// ─── ADMIN NOTIFICATION ──────────────────────────────────────────────────────
async function notifyAdmin(messageText) {
    if (!ADMIN_NUMBER) return;
    try {
        const adminChat = await client.getChatById(ADMIN_JID);
        await adminChat.sendMessage(messageText);
    } catch (e) {
        logger.error('Admin notify failed:', e.message);
    }
}

// ─── ADMIN COMMAND HANDLER ────────────────────────────────────────────────────
async function handleAdminCommand(command, msg) {
    const senderNumber = msg.from.split('@')[0];
    const body = command.trim();

    if (body === '!stats') {
        const stats = leadManager.getLeadStats();
        let summary = `*AdsVerse Bot Stats*\n\nTotal Leads: ${stats.total}\n\n`;
        Object.entries(stats.byStatus).forEach(([s, count]) => {
            summary += `  ${s}: ${count}\n`;
        });
        await msg.reply(summary);
    } else if (body === '!leads') {
        const leads = leadManager.getAllLeads().slice(-10);
        let reply = `*Recent Leads*\n\n`;
        leads.forEach((l, i) => {
            reply += `${i + 1}. +${l.phone} (${l.status})\n`;
        });
        await msg.reply(reply);
    } else if (body === '!flags') {
        const flags = stageManager.getAllHumanFlags();
        if (flags.length === 0) return await msg.reply('No pending human flags.');
        let reply = `*Human Needed Flags*\n\n`;
        flags.forEach(f => {
            reply += `+${f.phone}: ${f.humanNeededReason}\n`;
        });
        await msg.reply(reply);
    } else if (body === '!pause') {
        process.env.BOT_PAUSED = 'true';
        await msg.reply('⏸️ Bot paused globally.');
    } else if (body === '!resume') {
        process.env.BOT_PAUSED = 'false';
        await msg.reply('▶️ Bot resumed globally.');
    } else if (body.startsWith('!clear ')) {
        const num = body.split(' ')[1]?.replace('+', '');
        if (num) {
            stageManager.clearStage(num);
            conversationMemory.clearHistory(`${num}@c.us`);
            await msg.reply(`✅ Data cleared for ${num}`);
        }
    } else if (body.startsWith('!stage ')) {
        const num = body.split(' ')[1]?.replace('+', '');
        if (num) {
            const data = stageManager.getStageData(num);
            await msg.reply(`📍 Stage for ${num}: ${data.stage}\nNotes: ${data.notes || 'None'}`);
        }
    } else if (body === '!help') {
        await msg.reply(`*Admin Commands:*
!stats - Show bot stats
!leads - Show recent 10 leads
!flags - Show human needed flags
!pause - Pause bot globally
!resume - Resume bot globally
!clear [number] - Reset user stage/history
!stage [number] - Check user stage`);
    }
}

// ─── MAIN MESSAGE HANDLER ─────────────────────────────────────────────────────
async function handleIncomingMessage(msg) {
    if (msg.from === 'status@broadcast') return;

    const chat = await msg.getChat();
    const botNumber = client.info.wid.user;

    // Ignore group messages unless mentioned
    if (chat.isGroup) {
        const mentioned = msg.mentionedIds?.some(id => id.user === botNumber);
        if (!mentioned) return;
    }

    const phoneNumber = msg.from;
    const senderNumber = phoneNumber.split('@')[0];
    const isAdmin = senderNumber === ADMIN_NUMBER;

    // Admin commands
    if (isAdmin && msg.body.startsWith('!')) {
        await handleAdminCommand(msg.body, msg);
        return;
    }

    // Check if bot is paused globally
    if (process.env.BOT_PAUSED === 'true' && !isAdmin) return;

    // Media handling
    if (isMediaMessage(msg.type)) {
        const reply = getMediaReply(msg.type);
        if (reply) await msg.reply(reply);
        return;
    }

    // Recruitment handling
    if (isRecruitmentQuery(msg.body)) {
        await msg.reply('Please send your resume on email- careers@adsverse.in');
        return;
    }

    // Rate limiting
    const rateLimit = rateLimiter.isRateLimited(senderNumber);
    if (rateLimit.limited) return;

    // Stage handling
    const currentStage = stageManager.getStage(senderNumber);
    const stageData = stageManager.getStageData(senderNumber);

    // Human trigger check
    const { triggered, reason } = isHumanTrigger(msg.body);
    if (triggered && currentStage !== STAGES.HUMAN_NEEDED) {
        stageManager.flagForHuman(senderNumber, reason);
        if (process.env.NOTIFY_ADMIN_ON_FLAG === 'true') {
            await notifyAdmin(`🚨 Human needed: ${senderNumber}\nReason: ${reason}\nMessage: ${msg.body}`);
        }
        await msg.reply("Main abhi apni team ko connect kar raha hoon — Harshvardhan ji thodi der mein aapse baat karenge. Please wait karein. 🙏");
        return;
    }

    // Don't reply if human is already handling
    if (currentStage === STAGES.HUMAN_NEEDED && !isAdmin) return;

    try {
        await chat.sendStateTyping();

        const history = conversationMemory.getHistory(phoneNumber);
        
        // Add user message to memory before building prompt
        conversationMemory.addMessage(phoneNumber, 'user', msg.body);
        const updatedHistory = conversationMemory.getHistory(phoneNumber);

        const { systemPrompt, messages } = buildPrompt(
            msg.body,
            updatedHistory,
            currentStage,
            stageData.notes
        );

        let aiReply;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                aiReply = await callGemini(systemPrompt, messages);
                break;
            } catch (err) {
                retryCount++;
                if (retryCount === maxRetries) {
                    logger.error('❌ Gemini failed after max retries.');
                    if (process.env.NOTIFY_ADMIN_ON_FLAG === 'true') {
                        await notifyAdmin(`🚨 Bot error 3x for ${senderNumber}. Technical issue.`);
                    }
                    await msg.reply('Ek second, kuch technical issue aa gaya. Main thodi der mein reply karta hoon.');
                    return;
                }
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        if (!aiReply) return;

        // Save reply to memory
        conversationMemory.addMessage(phoneNumber, 'assistant', aiReply);

        // Detect and update stage
        const nextStage = detectNewStage(msg.body, currentStage);
        if (nextStage && nextStage !== currentStage) {
            stageManager.setStage(senderNumber, nextStage);
        }

        // Detect CLOSING from AI reply
        if (aiReply.includes('adsverse.in/contact') && stageManager.getStage(senderNumber) !== STAGES.CLOSED) {
            stageManager.setStage(senderNumber, STAGES.CLOSING);
        }

        // Notify admin on lead (CLOSED stage)
        if (stageManager.getStage(senderNumber) === STAGES.CLOSED && process.env.NOTIFY_ADMIN_ON_LEAD === 'true') {
            await notifyAdmin(`🎯 New Lead Closed! +${senderNumber} confirmed for strategy call.`);
        }

        // Lead capture for tracking
        leadManager.saveLead({
            phone: senderNumber,
            message: msg.body,
            aiReply: aiReply,
            status: stageManager.getStage(senderNumber)
        });

        const delay = simulateTypingDelay(aiReply);
        await new Promise(r => setTimeout(r, delay));
        await msg.reply(aiReply);

        logger.success(`Aryan replied to ${senderNumber} [Stage: ${stageManager.getStage(senderNumber)}]`);

    } catch (error) {
        logger.error(`❌ Process Error:`, error);
    } finally {
        await chat.clearState();
    }
}

// ─── BOT READY ────────────────────────────────────────────────────────────────
client.on('ready', () => {
    logger.success('✅ AdsVerse Aryan Bot is LIVE! 🚀');
    logger.info(`Admin: +${ADMIN_NUMBER}`);
    startFollowUpScheduler(client, leadManager);
});

client.on('message', handleIncomingMessage);

client.initialize();
