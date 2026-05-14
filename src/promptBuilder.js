// ============================================================
//  AdsVerse — Shivani AI Expert  |  promptBuilder.js
//  Human-like, consultative, ROI-focused sales assistant
// ============================================================

// ── KNOWLEDGE BASE ──────────────────────────────────────────────────────────
const adsVerseKnowledge = `
ADSVERSE — www.adsverse.in
TAGLINE: Automate. Elevate. Dominate.
CONTACT: contact@adsverse.in | +91 9685123339 | Indore, INDIA
FREE CONSULTATION: https://adsverse.in/en/contact

SERVICES & PRICING:
- SEO: Local ₹9,600/mo | E-commerce ₹18,000/mo | On+Off-Page ₹14,400/mo | Audit ₹12,000 | Keyword Res ₹6,000
- PAID ADS: Google ₹12,000/mo | Meta ₹10,800/mo | LinkedIn ₹14,400/mo | Creatives ₹8,400/camp
- SOCIAL MEDIA: Full Mgmt ₹18,000/mo | IG Growth ₹6,000/mo | Influencer from ₹15,000 | Graphics ₹10,800/mo
- CONTENT: Blogs (4/mo) ₹12,000/mo | Reels (8/mo) ₹12,000/mo | Ebook ₹24,000
- BRANDING: Logo + Identity ₹30,000 | Social Graphics ₹10,800/mo
- WEB DEV: 5-Page Site ₹36,000 | E-commerce ₹96,000 | Maintenance ₹6,000/mo
- AUTOMATION: WhatsApp Bot from ₹14,400 | Starter Bot ₹14,400 | CRM ₹24,000 | Pro Bot ₹42,000
- ANALYTICS/ORM: GA4 Setup ₹9,000 | ORM ₹24,000/mo
- SHOOTS: Reel ₹1,200 | Basic Photo ₹6,000 | Premium (4hr + Drone) ₹18,000
NOTE: Ad budget is always separate from management fees.
FREE SEO TOOL: https://adsverse.in/en/tools/seo-audit
`;

// ── INTENT DETECTION ─────────────────────────────────────────────────────────
const intentMap = [
    { keywords: ['seo', 'rank', 'google pe', 'search'], tag: 'SEO', maxWords: 13 },
    { keywords: ['ads', 'google ads', 'meta ads', 'facebook ads', 'instagram ads'], tag: 'PAID_ADS', maxWords: 13 },
    { keywords: ['website', 'web', 'site banana', 'landing page'], tag: 'WEB_DEV', maxWords: 13 },
    { keywords: ['automation', 'chatbot', 'bot', 'whatsapp bot'], tag: 'AUTOMATION', maxWords: 13 },
    { keywords: ['price', 'pricing', 'kitna', 'cost', '₹', 'budget', 'rate', 'charge', 'paisa'], tag: 'PRICING', maxWords: 8 },
    { keywords: ['job', 'career', 'apply', 'internship', 'vacancy', 'hire', 'opening', 'joining', 'work with'], tag: 'RECRUITMENT', maxWords: 10 },
    { keywords: ['hi', 'hello', 'hii', 'hey', 'namaste', 'helo', 'good morning', 'good evening'], tag: 'GREETING', maxWords: 8 },
    { keywords: ['reputation', 'review', 'orm', 'analytics', 'ga4'], tag: 'ANALYTICS_ORM', maxWords: 13 },
    { keywords: ['social media', 'instagram', 'facebook page', 'insta', 'youtube'], tag: 'SOCIAL_MEDIA', maxWords: 13 },
    { keywords: ['branding', 'logo', 'brand identity'], tag: 'BRANDING', maxWords: 13 },
    { keywords: ['shoot', 'reel', 'photo', 'video', 'photography'], tag: 'SHOOTS', maxWords: 13 },
];

// ── RECRUITMENT DETECTION ─────────────────────────────────────────────────────
const recruitmentKeywords = ['job', 'career', 'apply', 'internship', 'vacancy', 'hire', 'hiring', 'opening', 'joining', 'work with you', 'placement', 'fresher', 'experience required', 'resume', 'cv'];

export function isRecruitmentQuery(message) {
    const lower = message.toLowerCase();
    return recruitmentKeywords.some(kw => lower.includes(kw));
}

// ── ESCALATION DETECTION ──────────────────────────────────────────────────────
const escalationKeywords = [
    'manager', 'owner', 'senior', 'boss', 'head',
    'incharge', 'in charge', 'in-charge',
    'baat karao', 'baat karwao', 'baat kara do', 'baat karwa do',
    'connect karo', 'connect karwao',
    'upar wale se', 'upar wale',
    'higher authority', 'supervisor', 'director', 'founder',
    'decision maker',
];

export function isEscalationRequest(message) {
    const lower = message.toLowerCase();
    return escalationKeywords.some(kw => lower.includes(kw));
}

// ── LANGUAGE DETECTION ────────────────────────────────────────────────────────
const hindiChars = /[\u0900-\u097F]/;  // Devanagari script
const hinglishWords = [
    'hai', 'hain', 'kya', 'kaise', 'karo', 'karna', 'chahiye', 'batao',
    'mujhe', 'humko', 'aapka', 'tumhara', 'nahi', 'bhi', 'aur', 'baat',
    'kaam', 'accha', 'theek', 'sahi', 'bohot', 'bahut', 'abhi', 'yeh',
    'woh', 'mera', 'tera', 'hamara', 'tumhare', 'kaisa', 'kitna', 'jaldi',
    'dekho', 'suno', 'bolo', 'pehle', 'baad', 'mein', 'par', 'ko', 'se',
    'haan', 'ji', 'arrey', 'yaar', 'bhai', 'didi', 'sir',
    'hoga', 'hogi', 'karenge', 'karogi', 'karega', 'dena', 'lena',
    'bol', 'bata', 'samajh', 'pata', 'milega', 'milegi', 'dikhao',
    'karwana', 'banwana', 'lagega', 'lagegi', 'raha', 'rahi', 'rhe',
    'toh', 'wala', 'wali', 'waale',
];

function detectLanguage(message) {
    // Contains Devanagari → Hindi
    if (hindiChars.test(message)) return 'hindi';

    const words = message.toLowerCase().split(/\s+/);
    const hinglishCount = words.filter(w => hinglishWords.includes(w)).length;
    const hinglishRatio = hinglishCount / words.length;

    // More than 25% Hinglish words → Hinglish
    if (hinglishRatio >= 0.25 || hinglishCount >= 2) return 'hinglish';

    return 'english';
}

export function getIntentTags(userMessage) {
    const lower = userMessage.toLowerCase();
    return intentMap
        .filter(i => i.keywords.some(kw => lower.includes(kw)))
        .map(i => i.tag);
}

function getMaxWords(userMessage) {
    const lower = userMessage.toLowerCase();
    const matched = intentMap.find(i => i.keywords.some(kw => lower.includes(kw)));
    return matched?.maxWords || 13;
}

// ── MAIN PROMPT BUILDER ──────────────────────────────────────────────────────
export function buildPrompt(userMessage, history, phoneNumber, userName = 'User', userProfile = {}) {
    const msgLower = userMessage.toLowerCase();
    const maxWords = getMaxWords(userMessage);
    const isPricingQuery = /price|pricing|cost|rate|charge|kitna|paisa|₹|budget/.test(msgLower);
    const isFarewell = /bye|tata|dhanyawad|thanks|thank you|good night|gn|done/.test(msgLower);
    const lang = detectLanguage(userMessage);

    const pricingRule = isPricingQuery
        ? `PRICING: Give ONE management fee for the relevant service. Explain that ad budget is separate.`
        : `PRICING: Do NOT mention ₹ prices unless directly asked.`;

    // Language instruction
    const langRule = {
        hindi: `Talk in HINDI/HINGLISH only. Use words like "bilkul", "zarur", "vaise" to vary your style.`,
        hinglish: `Reply in HINGLISH only (mix of Hindi + English). Use words like "actually", "vaise", "dekhie" to start.`,
        english: `Reply in ENGLISH only. Use words like "Look", "Basically", "Honestly" to start.`,
    }[lang];

    // Build user profile context
    const profileLines = Object.entries(userProfile).map(([k, v]) => `- ${k}: ${v}`).join('\n');
    const profileSection = profileLines
        ? `\nYou know about this person: \n${profileLines}\n`
        : '';

    const historyText = history.slice(-10).map(m =>
        `${m.role === 'user' ? userName : 'Shivani'}: ${m.content}`
    ).join('\n');

    return `You are Shivani from AdsVerse (digital marketing agency, Indore). You talk like a professional Consultant on WhatsApp — short, helpful, and moving toward a deal.

STRICT RULES:
1. REPLY UNDER ${maxWords} WORDS. No repetition of starters like "Got it", "Sure", "Haan". Vary your openers.
2. ${langRule}
3. GOAL: Fix a meeting or send them to www.adsverse.in.
4. If you have enough info (Business Name/Type & Goal), STOP asking questions. Pitch a free consultation: https://adsverse.in/en/contact or suggest visiting the site.
5. If user says "Bye" or signs off: STOP asking questions. Say a warm goodbye only.
6. PRICING: If asked about Ads, say our fee is ₹12k but daily/monthly spend for ads is their choice.
7. If user asks "Aap hi batao" or needs a suggestion: Suggest 1-2 relevant services from the knowledge base below (e.g., SEO Local @ ₹9,600/mo).
8. NO emojis. NO bullets. Max 2 short sentences.

OFF-TOPIC: Reply in 4-5 words and ask a business question.

${pricingRule}
${profileSection}
SERVICES & PRICING:
${adsVerseKnowledge}

CHAT HISTORY:
${historyText}

${userName.toUpperCase()} SAID: "${userMessage}"

SHIVANI'S CONSULTANT REPLY:`;
}
