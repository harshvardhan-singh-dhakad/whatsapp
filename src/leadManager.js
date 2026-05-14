// ============================================================
//  AdsVerse — Lead Manager  |  leadManager.js
// ============================================================

import fs   from 'fs';
import path from 'path';

// ── PATHS ────────────────────────────────────────────────────────────────────

const leadsDir  = path.join(process.cwd(), 'leads');
const LEADS_JSON = path.join(leadsDir, 'leads.json');
const LEADS_CSV  = path.join(leadsDir, 'leads.csv');
const ERROR_LOG  = path.join(leadsDir, 'errors.log');

// ── LEAD STATUS LIFECYCLE ────────────────────────────────────────────────────
//   New Lead → Engaged → Qualified → Proposal Sent → Converted  /  Lost

export const LEAD_STATUS = {
    NEW:           'New Lead',
    ENGAGED:       'Engaged',        // replied more than once
    QUALIFIED:     'Qualified',      // expressed clear interest in a service
    PROPOSAL_SENT: 'Proposal Sent',  // consultation link shared
    CONVERTED:     'Converted',      // became a client
    LOST:          'Lost',           // went cold / unsubscribed
};

// ── CSV HEADER ───────────────────────────────────────────────────────────────

const CSV_HEADER =
    'Date,Time,Phone,First Message,Last Message,AI Reply Preview,Message Count,Service Interest,Status,Last Updated\n';

// ── INIT ─────────────────────────────────────────────────────────────────────

if (!fs.existsSync(leadsDir)) fs.mkdirSync(leadsDir, { recursive: true });
if (!fs.existsSync(LEADS_CSV)) fs.writeFileSync(LEADS_CSV, CSV_HEADER, 'utf8');

// ── IN-MEMORY STORE ──────────────────────────────────────────────────────────

/** @type {Record<string, LeadRecord>} */
let leadsMap = {};

// ── INTERNAL HELPERS ─────────────────────────────────────────────────────────

function logError(context, error) {
    const line = `[${new Date().toISOString()}] [${context}] ${error?.message || error}\n`;
    try { fs.appendFileSync(ERROR_LOG, line, 'utf8'); } catch (_) {}
    console.error(line.trim());
}

function sanitizeCSV(str = '', maxLen = 120) {
    return String(str)
        .replace(/"/g, "'")
        .replace(/,/g, ' ')
        .replace(/\n/g, ' ')
        .trim()
        .substring(0, maxLen);
}

/** Rewrite the entire CSV from leadsMap (keeps CSV in sync with JSON) */
function rebuildCSV() {
    try {
        const rows = Object.values(leadsMap).map(lead => {
            const created = new Date(lead.firstContact);
            return [
                `"${created.toLocaleDateString('en-IN')}"`,
                `"${created.toLocaleTimeString('en-IN')}"`,
                `"${lead.phone}"`,
                `"${sanitizeCSV(lead.firstMessage)}"`,
                `"${sanitizeCSV(lead.lastMessage || lead.firstMessage)}"`,
                `"${sanitizeCSV(lead.lastAiReply)}"`,
                `"${lead.messageCount}"`,
                `"${(lead.serviceInterests || []).join(' | ')}"`,
                `"${lead.status}"`,
                `"${lead.lastUpdated || lead.firstContact}"`,
            ].join(',');
        });

        fs.writeFileSync(LEADS_CSV, CSV_HEADER + rows.join('\n') + '\n', 'utf8');
    } catch (e) {
        logError('rebuildCSV', e);
    }
}

function persistJSON() {
    try {
        fs.writeFileSync(LEADS_JSON, JSON.stringify(leadsMap, null, 2), 'utf8');
    } catch (e) {
        logError('persistJSON', e);
    }
}

/** Calculate a lead quality score (0-100) based on engagement signals */
function calculateScore(lead, detectedIntents = []) {
    let score = 0;

    // Engagement volume: up to 25 points
    score += Math.min((lead.messageCount || 1) * 5, 25);

    // Pricing intent: strong buying signal
    if (detectedIntents.includes('PRICING')) score += 25;

    // Service-specific interest
    const serviceIntents = ['SEO', 'PAID_ADS', 'AUTOMATION', 'WEB_DEV', 'SOCIAL_MEDIA', 'BRANDING'];
    if (detectedIntents.some(i => serviceIntents.includes(i))) score += 15;

    // Multiple service interests = higher intent
    if ((lead.serviceInterests || []).length > 1) score += 10;

    // Urgency keywords in last message
    const lastMsg = (lead.lastMessage || '').toLowerCase();
    if (/jaldi|urgent|asap|next month|is mahine|jald|abhi chahiye/.test(lastMsg)) score += 15;

    // Budget mentioned
    if (/budget|kitna|₹|\d+k|thousand|lakh/.test(lastMsg)) score += 10;

    return Math.min(score, 100);
}

/** Auto-advance status based on engagement signals */
function deriveStatus(lead, detectedIntents = []) {
    const lockedStatuses = [
        LEAD_STATUS.PROPOSAL_SENT,
        LEAD_STATUS.CONVERTED,
        LEAD_STATUS.LOST,
    ];
    if (lockedStatuses.includes(lead.status)) return lead.status;

    const score = calculateScore(lead, detectedIntents);
    if (score >= 55 || detectedIntents.includes('PRICING')) {
        return LEAD_STATUS.QUALIFIED;
    }
    if (lead.messageCount >= 2) {
        return LEAD_STATUS.ENGAGED;
    }
    return LEAD_STATUS.NEW;
}


// ── LOAD ON STARTUP ───────────────────────────────────────────────────────────

function loadLeads() {
    try {
        if (fs.existsSync(LEADS_JSON)) {
            const raw = fs.readFileSync(LEADS_JSON, 'utf8');
            leadsMap = JSON.parse(raw);
        }
    } catch (e) {
        logError('loadLeads', e);
        leadsMap = {};
    }
}

loadLeads();

// ── PUBLIC API ────────────────────────────────────────────────────────────────

/**
 * Save or update a lead after each message exchange.
 *
 * @param {object} params
 * @param {string}   params.phone          - WhatsApp number
 * @param {string}   params.message        - Lead's latest message
 * @param {string}   params.aiReply        - Shivani's reply (preview saved)
 * @param {number}   params.messageCount   - Total messages so far
 * @param {string[]} [params.detectedIntents] - Intent tags from buildPrompt (e.g. ['SEO','PRICING'])
 * @param {boolean}  [params.adminNotified]  - Whether admin was alerted
 *
 * @returns {{ isNewLead: boolean, lead: LeadRecord }}
 */
export function saveLead({ phone, message, aiReply, messageCount, detectedIntents = [], adminNotified }) {
    const isNewLead = !leadsMap[phone];
    const now       = new Date().toISOString();

    if (isNewLead) {
        leadsMap[phone] = {
            phone,
            firstMessage:    message,
            firstContact:    now,
            lastMessage:     message,
            lastAiReply:     aiReply.substring(0, 120),
            lastUpdated:     now,
            messageCount:    1,
            serviceInterests: detectedIntents,
            status:          LEAD_STATUS.NEW,
            score:           0,
            adminNotified:   adminNotified || false,
            followUpSent:    false,
            followUpStage:   0
        };
    } else {
        const lead = leadsMap[phone];

        // Merge new service interests (deduplicated)
        const merged = Array.from(new Set([...(lead.serviceInterests || []), ...detectedIntents]));

        lead.lastMessage     = message;
        lead.lastAiReply     = aiReply.substring(0, 120);
        lead.lastUpdated     = now;
        lead.messageCount    = messageCount;
        lead.serviceInterests = merged;
        lead.status          = deriveStatus(lead, detectedIntents);
        lead.score           = calculateScore(lead, detectedIntents);
        
        if (adminNotified !== undefined) lead.adminNotified = adminNotified;
    }

    persistJSON();
    rebuildCSV();

    return { isNewLead, lead: leadsMap[phone] };
}

/**
 * Manually update the status of a lead.
 * Use this when you send a proposal, close a deal, or mark as lost.
 *
 * @param {string} phone
 * @param {string} newStatus  - Use LEAD_STATUS constants
 * @param {string} [note]     - Optional note (stored in lead record)
 */
export function updateLeadStatus(phone, newStatus, note = '') {
    if (!leadsMap[phone]) {
        logError('updateLeadStatus', `Phone not found: ${phone}`);
        return null;
    }

    const validStatuses = Object.values(LEAD_STATUS);
    if (!validStatuses.includes(newStatus)) {
        logError('updateLeadStatus', `Invalid status: ${newStatus}`);
        return null;
    }

    leadsMap[phone].status      = newStatus;
    leadsMap[phone].lastUpdated = new Date().toISOString();
    if (note) leadsMap[phone].note = note;

    persistJSON();
    rebuildCSV();

    return leadsMap[phone];
}

/**
 * Persist the latest follow-up stage reached for a lead.
 * @param {string} phone 
 * @param {number} stage 
 */
export function setFollowUpStage(phone, stage) {
    if (!leadsMap[phone]) return null;
    
    leadsMap[phone].followUpStage = stage;
    leadsMap[phone].lastUpdated = new Date().toISOString();
    
    persistJSON();
    rebuildCSV();
    return leadsMap[phone];
}

/**
 * Record a message as being sent by the AI to prevent self-pausing.
 * @param {string} phone 
 * @param {string} message 
 */
export function markAsAiSent(phone, message) {
    if (!leadsMap[phone]) return;
    // We store a normalized version of the message to compare
    leadsMap[phone].lastAiSentBody = message.trim().toLowerCase();
}

/**
 * Check if a message was just sent by the AI.
 * @param {string} phone 
 * @param {string} message 
 * @returns {boolean}
 */
export function isAiSent(phone, message) {
    const lead = leadsMap[phone];
    if (!lead || !lead.lastAiSentBody) return false;
    // Normalize BOTH to ensure matching even with whitespace or case changes
    const incoming = message.trim().toLowerCase();
    return lead.lastAiSentBody === incoming;
}

/**
 * Get a single lead by phone number.
 * @param {string} phone
 * @returns {LeadRecord | null}
 */
export function getLead(phone) {
    return leadsMap[phone] || null;
}

/**
 * Get all leads, optionally filtered by status.
 * @param {string} [filterStatus] - Optional LEAD_STATUS value
 * @returns {LeadRecord[]}
 */
export function getAllLeads(filterStatus) {
    const all = Object.values(leadsMap);
    if (!filterStatus) return all;
    return all.filter(l => l.status === filterStatus);
}

/**
 * Get leads interested in a specific service.
 * @param {string} intentTag  - e.g. 'SEO', 'AUTOMATION', 'PAID_ADS'
 * @returns {LeadRecord[]}
 */
export function getLeadsByServiceInterest(intentTag) {
    return Object.values(leadsMap).filter(l =>
        (l.serviceInterests || []).includes(intentTag)
    );
}

/**
 * Summary stats for dashboard / logging.
 * @returns {LeadStats}
 */
export function getLeadStats() {
    const all = Object.values(leadsMap);
    const byStatus = Object.values(LEAD_STATUS).reduce((acc, s) => {
        acc[s] = all.filter(l => l.status === s).length;
        return acc;
    }, {});

    // Top service interests
    const interestCount = {};
    all.forEach(l => (l.serviceInterests || []).forEach(i => {
        interestCount[i] = (interestCount[i] || 0) + 1;
    }));

    return {
        total:          all.length,
        byStatus,
        topInterests:   Object.entries(interestCount)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([tag, count]) => ({ tag, count })),
    };
}

/** @deprecated Use getAllLeads().length */
export function getTotalLeads() {
    return Object.keys(leadsMap).length;
}

// ── AUTOMATION PAUSE (in-memory) ──────────────────────────────────────────────
const pausedUntil = {};  // phone → timestamp

export function pauseAutomation(phone, minutes = 600) {
    const cleanPhone = phone.replace('@c.us', '').replace('@lid', '');
    const until = Date.now() + minutes * 60 * 1000;
    pausedUntil[cleanPhone] = until;
    const resumeTime = new Date(until).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    return resumeTime;
}

export function isAutomationPaused(phone) {
    const cleanPhone = phone.replace('@c.us', '').replace('@lid', '');
    const until = pausedUntil[cleanPhone];
    if (!until) return false;
    if (Date.now() >= until) {
        delete pausedUntil[cleanPhone];
        return false;
    }
    return true;
}

export default {
    saveLead,
    updateLeadStatus,
    setFollowUpStage,
    getLead,
    getAllLeads,
    getLeadsByServiceInterest,
    getLeadStats,
    getTotalLeads,
    pauseAutomation,
    isAutomationPaused,
    LEAD_STATUS,
};
