// ============================================================
//  AdsVerse — Auto Follow-Up Scheduler  |  followUpManager.js
// ============================================================

import logger from './logger.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import conversationMemory from './conversationMemory.js';
import { LEAD_STATUS } from './leadManager.js';
import leadManager from './leadManager.js';

// ── AI Setup ─────────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = 'gemini-2.5-flash-lite';
const aiModel = genAI.getGenerativeModel({ model: MODEL_NAME });

// ── CONFIG ────────────────────────────────────────────────────────────────────
const CONFIG = {
    CHECK_INTERVAL_MS : 2  * 60 * 60 * 1000,   // Every 2 hours
    MAX_PER_RUN       : 10,
    BUSINESS_HOURS    : { start: 9, end: 23 },   // IST 9am–11pm
    TIMEZONE          : 'Asia/Kolkata',

    STAGES: [
        {
            stage        : 1,
            label        : 'First Follow-up',
            minSilenceMs : 12 * 60 * 60 * 1000,   // 12 hours
            maxSilenceMs : 36 * 60 * 60 * 1000,
        },
        {
            stage        : 2,
            label        : 'Second Follow-up',
            minSilenceMs : 48 * 60 * 60 * 1000,   // 2 days
            maxSilenceMs : 72 * 60 * 60 * 1000,
        },
        {
            stage        : 3,
            label        : 'Final Re-engagement',
            minSilenceMs : 96 * 60 * 60 * 1000,   // 4 days
            maxSilenceMs : Infinity,
        },
    ],
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function isBusinessHours() {
    const now  = new Date();
    const hour = parseInt(
        new Intl.DateTimeFormat('en-IN', {
            hour     : 'numeric',
            hour12   : false,
            timeZone : CONFIG.TIMEZONE,
        }).format(now),
        10
    );
    return hour >= CONFIG.BUSINESS_HOURS.start && hour < CONFIG.BUSINESS_HOURS.end;
}

function getEligibleStage(lead, now) {
    const excludedStatuses = [LEAD_STATUS.CONVERTED, LEAD_STATUS.LOST, LEAD_STATUS.PROPOSAL_SENT];
    if (excludedStatuses.includes(lead.status)) return null;

    const currentStage = lead.followUpStage || 0;
    const nextStage    = currentStage + 1;
    if (nextStage > CONFIG.STAGES.length) return null;

    const stageConfig = CONFIG.STAGES[nextStage - 1];
    const silenceMs   = now - new Date(lead.lastUpdated).getTime();

    if (silenceMs >= stageConfig.minSilenceMs && silenceMs < stageConfig.maxSilenceMs) {
        return { ...stageConfig, nextStage };
    }
    return null;
}

// ── DEDICATED FOLLOW-UP PROMPT ────────────────────────────────────────────────
function buildFollowUpPrompt(lead, stage, history) {
    const interests  = (lead.serviceInterests || []).join(', ') || 'digital marketing';
    const silenceHrs = Math.round((Date.now() - new Date(lead.lastUpdated).getTime()) / 3_600_000);
    const historyText = history.slice(-6).map(m =>
        `${m.role === 'user' ? 'Client' : 'Shivani'}: ${m.content}`
    ).join('\n');

    const stageInstructions = {
        1: `The client went silent ${silenceHrs} hours ago after showing interest in: ${interests}.
            Send a very brief, warm check-in — 1-2 sentences max.
            Ask ONE specific question about their business or the service they were interested in.
            Sound natural, like a colleague pinging. Don't pitch. Don't mention prices.`,

        2: `Client has been silent for ${silenceHrs} hours. They showed interest in: ${interests}.
            Acknowledge you haven't heard back casually.
            Share one real-world result/outcome for a business like theirs (invent a believable example).
            End with a soft "book a free call" suggestion: https://adsverse.in/contact
            Keep it to 2-3 sentences. Human, warm.`,

        3: `Final re-engagement. ${silenceHrs} hours of silence. Interest was: ${interests}.
            Send a short, respectful closing message.
            Let them know this is your last message, no pressure.
            Leave the door open: offer the free consultation link https://adsverse.in/contact
            1-3 sentences only. Be gracious, not pushy.`,
    };

    return `You are Shivani, a Senior Digital Marketing Executive at AdsVerse. You are writing a follow-up WhatsApp message to a potential client who has gone silent.

━━ CONTEXT ━━
Stage: ${stage} follow-up
Client interests: ${interests}
Silence duration: ~${silenceHrs} hours

━━ PREVIOUS CONVERSATION ━━
${historyText || '(No previous messages saved)'}

━━ YOUR TASK ━━
${stageInstructions[stage]}

━━ RULES ━━
- Sound like a real human sending a WhatsApp message, not a template.
- NO emojis. NO bullet points. 
- Match the language of previous messages (Hindi, English, or Hinglish).
- If no history, write in Hinglish.

━━ SHIVANI'S FOLLOW-UP MESSAGE ━━`;
}

// ── JID HELPER ────────────────────────────────────────────────────────────────
async function trySendMessage(client, phone, message) {
    const jidCus = phone.includes('@') ? phone : `${phone}@c.us`;
    try {
        await client.sendMessage(jidCus, message);
        return true;
    } catch (err) {
        if (err.message && (err.message.includes('No LID') || err.message.includes('invalid'))) {
            logger.warn(`⚠️ @c.us JID failed for ${phone}, skipping this follow-up cycle.`);
            return false;
        }
        throw err;
    }
}

// ── MAIN SCHEDULER ────────────────────────────────────────────────────────────
export function startFollowUpScheduler(client, leadManager) {
    logger.info('🚀 Auto-Followup Scheduler started.');

    const runFollowUpCycle = async () => {
        if (!isBusinessHours()) {
            logger.info('🕐 Follow-up skipped — outside business hours (IST).');
            return;
        }

        const allLeads = leadManager.getAllLeads();
        const now      = Date.now();
        let sentCount  = 0;

        logger.info(`🔍 Follow-up check: ${allLeads.length} total leads.`);

        for (const lead of allLeads) {
            if (sentCount >= CONFIG.MAX_PER_RUN) {
                logger.info(`⛔ MAX_PER_RUN reached.`);
                break;
            }

            try {
                const eligible = getEligibleStage(lead, now);
                if (!eligible) continue;

                logger.info(`🕒 [Stage ${eligible.nextStage}] Follow-up for ${lead.phone}`);

                const jid = lead.phone.includes('@') ? lead.phone : `${lead.phone}@c.us`;
                const history = conversationMemory.getHistory(jid);
                const prompt       = buildFollowUpPrompt(lead, eligible.nextStage, history);

                const result       = await aiModel.generateContent(prompt);
                const followUpMsg  = result.response.text()?.trim();
                if (!followUpMsg) continue;

                const sent = await trySendMessage(client, lead.phone, followUpMsg);
                if (!sent) continue;

                // Stage 3 with no reply → mark as Lost
                const newStatus = eligible.nextStage === 3
                    ? LEAD_STATUS.LOST
                    : lead.status;

                leadManager.updateLeadStatus(
                    lead.phone,
                    newStatus,
                    `[Auto] Stage ${eligible.nextStage} follow-up sent.`
                );
                leadManager.setFollowUpStage(lead.phone, eligible.nextStage);

                sentCount++;
                logger.info(`✅ [Stage ${eligible.nextStage}] Sent to ${lead.phone}`);

                await new Promise(r => setTimeout(r, 2000));

            } catch (err) {
                logger.error(`❌ Follow-up failed for ${lead.phone}:`, err);
            }
        }
    };

    runFollowUpCycle();
    setInterval(runFollowUpCycle, CONFIG.CHECK_INTERVAL_MS);
}
