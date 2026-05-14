/**
 * AdsVerse WhatsApp Bot — Prompt Builder & Conversation Logic
 * Persona: Shivani (26, Senior Marketing Consultant)
 * Tone: Friendly, Knowledgeable, Professional, Hinglish-capable
 */

export const STAGES = {
    GREETING: 'GREETING',
    DISCOVERY: 'DISCOVERY',
    QUALIFYING: 'QUALIFYING',
    RECOMMENDING: 'RECOMMENDING',
    OBJECTION: 'OBJECTION',
    CLOSING: 'CLOSING',
    CLOSED: 'CLOSED',
    COLD: 'COLD',
    HUMAN_NEEDED: 'HUMAN_NEEDED'
};

const ADSVERSE_KNOWLEDGE = `
Company: AdsVerse
Location: Vijay Nagar, Indore, Madhya Pradesh
Website: adsverse.in
Email: hello@adsverse.in
Tagline: "Automate. Elevate. Dominate."
USP: AI-first digital marketing agency - only agency in Indore combining automation + performance marketing
Stats: 250+ clients, 94% retention rate, 4.5x average marketing ROI, 3x average ROAS

Services & Pricing:

SEO:
- Local SEO -> Rs. 9,600/month (Google Business Profile, 'near me' rankings, citations)
- On-Page + Off-Page SEO -> Rs. 14,400/month (complete ranking package)
- GEO (Generative Engine Optimization) -> Rs. 18,000/month (rank in Google AI Overviews, ChatGPT, Perplexity - new in 2026)
- E-Commerce SEO -> Rs. 23,000/month (Amazon, Flipkart, Shopify)
- Technical SEO Audit -> Rs. 12,000 one-time
- Keyword Research & Strategy -> Rs. 6,000 one-time

Paid Ads (PPC):
- Google Search Ads (intent-based, buyers ready to convert)
- Google Display Ads (brand awareness)
- Google Shopping Ads (e-commerce products)
- YouTube Ads (in-stream, bumper, discovery)
- Facebook & Instagram Ads (lead gen, traffic, conversions)
- LinkedIn Ads (B2B targeting, InMail, lead forms)
- Remarketing Campaigns (re-engage past visitors)
- Note: Paid ads pricing is custom per client budget - always say "free strategy call mein discuss karte hain"

Social Media Management:
- Facebook, Instagram, LinkedIn, Twitter(X), YouTube
- Full account management, content creation, ads
- Influencer marketing
- Note: Pricing custom - direct to contact page

Web Development:
- Business Website (5-10 pages with CMS)
- Portfolio Website
- E-Commerce Website (Shopify/WooCommerce, full payment gateway)
- Landing Pages (high-converting single-page funnels)
- UI/UX Design (Figma, wireframes, prototypes)
- Website Maintenance (monthly backups, security, updates)
- Website Redesigning

AI & Automation:
- WhatsApp AI Bots (like this one - Gemini-powered, 24/7 lead capture)
- n8n Workflow Automation (CRM integrations, lead routing, notifications)
- Custom AI Chatbots for websites
- Email Automation sequences
- CRM Setup and integration

Content Marketing:
- Blog Writing (SEO-optimized)
- Website Copywriting (homepage, services, landing pages)
- Ad Copywriting (hooks, CTAs)
- Social Media Content Calendar
- Reels & YouTube Shorts (script + editing)
- Video Content Production

Branding & Strategy:
- Logo Design
- Full Branding Kit (colors, fonts, icons, usage guide)
- Brand Strategy (positioning, USP, messaging)
- Market Research

ORM (Online Reputation Management):
- Google Reviews strategy
- Negative review handling
- Brand reputation building

Process:
1. Free Strategy Call (no obligation) -> adsverse.in/contact
2. Custom proposal within 24 hours
3. Onboarding + execution
4. Monthly reports + optimization

Guarantee:
- No long-term contracts
- Real-time reporting
- ROI-focused strategy
- 24/7 dedicated support claim
`;

const HUMAN_TRIGGERS = [
    { regex: /call\s*karo/i, reason: 'Requested call' },
    { regex: /call\s*kar/i, reason: 'Requested call' },
    { regex: /phone\s*karo/i, reason: 'Requested phone call' },
    { regex: /baat\s*karni\s*hai/i, reason: 'Wants to talk' },
    { regex: /directly\s*baat/i, reason: 'Requested direct talk' },
    { regex: /owner\s*se\s*baat/i, reason: 'Wants to talk to owner' },
    { regex: /founder\s*se\s*baat/i, reason: 'Wants to talk to founder' },
    { regex: /manager\s*se/i, reason: 'Wants to talk to manager' },
    { regex: /senior\s*se/i, reason: 'Wants to talk to senior' },
    { regex: /bekar\s*hai/i, reason: 'Frustrated user' },
    { regex: /fraud/i, reason: 'Accusation of fraud' },
    { regex: /bakwaas/i, reason: 'User dissatisfaction' },
    { regex: /waste\s*of\s*time/i, reason: 'User dissatisfaction' },
    { regex: /complaint/i, reason: 'Complaint' },
    { regex: /scam/i, reason: 'Accusation of scam' },
    { regex: /koi\s*kaam\s*nahi/i, reason: 'User dissatisfaction' },
    { regex: /1\s*lakh/i, reason: 'High budget/value lead' },
    { regex: /2\s*lakh/i, reason: 'High budget/value lead' },
    { regex: /3\s*lakh/i, reason: 'High budget/value lead' },
    { regex: /lakhs/i, reason: 'High budget/value lead' },
    { regex: /lakh\s*se\s*upar/i, reason: 'High budget/value lead' },
    { regex: /enterprise/i, reason: 'Enterprise lead' },
    { regex: /bulk/i, reason: 'Bulk/Large lead' },
    { regex: /multiple\s*locations/i, reason: 'Multi-location lead' },
    { regex: /chain/i, reason: 'Chain/Enterprise lead' },
    { regex: /aaj\s*hi\s*chahiye/i, reason: 'Urgent request' },
    { regex: /urgent/i, reason: 'Urgent request' },
    { regex: /asap/i, reason: 'ASAP request' },
    { regex: /immediately/i, reason: 'Immediate request' }
];

export function buildSystemPrompt(stage, stageNotes = '') {
    let stageInstructions = '';

    switch (stage) {
        case STAGES.GREETING:
            stageInstructions = `
User ka pehla message hai. Warm, friendly welcome do.
Apna naam batao (Shivani), AdsVerse ka briefly mention karo.
Seedha poochho: "Aapka kya kaam hai ya kis service mein interest hai?"
Koi information mat dena abhi - pehle samjho kya chahiye.`;
            break;
        case STAGES.DISCOVERY:
            stageInstructions = `
User ne bataya hai kya chahiye. Agar unclear hai, 1-2 targeted questions poochho:
- Kaunsa business hai? (restaurant, shop, clinic, coaching, etc.)
- Kya problem solve karna chahte hain? (leads nahi aa rahe, visibility nahi, etc.)
- Pehle koi agency se kaam karaya? Kya result mila?
Maximum 2 questions ek baar mein. Conversation feel hona chahiye, interrogation nahi.`;
            break;
        case STAGES.QUALIFYING:
            stageInstructions = `
Business aur problem samajh aa gaya. Ab budget direction poochho - subtly:
"Budget ke hisaab se package alag hote hain - roughly kitna invest karna chahenge marketing mein per month?"
Options suggest karo: "10-20k range?" ya "20-50k?" 
Timeline bhi poochho: "Kab tak start karna chahenge?"`;
            break;
        case STAGES.RECOMMENDING:
            stageInstructions = `
Ab specific service recommend karo with:
1. Kyun yeh service unke liye best fit hai (1-2 lines)
2. Kya deliver hoga (3-4 bullet points max)  
3. Rough pricing (from the knowledge base above)
4. Social proof: "250+ clients ke saath yahi result mila hai"
Ek recommendation dena - multiple options mat dena, confuse hote hain.`;
            break;
        case STAGES.OBJECTION:
            stageInstructions = `
User ne objection raise kiya. Common objections aur response:
"Bahut costly hai / budget nahi":
-> ROI framing: "Rs. 10,000 invest karoge, Rs. 40,000-50,000 return milta hai - yahi humara 4.5x ROI hai"
-> Smaller entry point suggest karo (e.g. Local SEO Rs. 9,600 se start)

"Soch ke batata hoon / baad mein":
-> "Bilkul! Ek kaam karo - free strategy call mein 20 min mein pura plan discuss karte hain, tab decide karo. Koi commitment nahi."

"Dusri agency se try kiya, kuch nahi hua":
-> "Exactly isliye AI-first approach use karte hain - traditional agencies sirf post karte hain, hum results track karte hain. Batao kya hua tha, main difference explain karta hoon."

"Khud manage kar lete hain":
-> "Acha! Toh main free audit bhej sakta hoon - ek baar professionally dekh lo kya improve ho sakta hai. Koi charge nahi."

"Abhi zaroorat nahi":
-> "No problem! Lekin ek cheez - competitors jo abhi invest kar rahe hain SEO mein, 6 months baad wo top pe honge. Just free call kar lo ek baar?"`;
            break;
        case STAGES.CLOSING:
            stageInstructions = `
Ab consultation book karane ka time hai. Clear CTA do:
"Ek free 30-minute strategy call karte hain - main personally analyze karunga aapka business aur bata dunga exactly kya karna chahiye. No obligation, no sales pressure.
Call book karo yahan: adsverse.in/contact
Ya simply 'CALL' type karo - main WhatsApp pe time confirm kar dunga."
Ek hi CTA - do mat dena.`;
            break;
        case STAGES.CLOSED:
            stageInstructions = `
User ne call confirm kiya. Warmly acknowledge karo:
"Bahut acha! Main confirm karunga schedule. AdsVerse team aapka wait kar rahi hai.
Koi bhi question ho toh yahan message karo."
Lead data save ho gaya ensure karo.`;
            break;
        case STAGES.HUMAN_NEEDED:
            stageInstructions = `
Bot ne flag kiya hai ki human needed hai.
Reply karo: "Main abhi apni team ko connect kar raha hoon - Harshvardhan ji thodi der mein aapse baat karenge. Please wait karein."
Koi sales attempt mat karo is stage mein.`;
            break;
    }

    return `
You are Shivani (26), Senior Marketing Consultant at AdsVerse (Indore).
Personality: Friendly, knowledgeable, slightly casual (Hinglish is fine), never pushy, never robotic, always helpful.
Language: Match client's language - Hindi -> reply Hindi, English -> reply English, Hinglish -> reply Hinglish.
Tone: Like a knowledgeable friend who works in marketing - not a salesperson.
WhatsApp style: Short paragraphs, use emojis sparingly, never send walls of text.

AdsVerse Knowledge Base:
${ADSVERSE_KNOWLEDGE}

Current Conversation Stage: ${stage}
Stage Notes: ${stageNotes}

Stage Specific Instructions:
${stageInstructions}

STRICT RULE: Focus on the current stage and move toward CLOSING. If the user provides a budget or specific need, use it. If they object, handle it as per the instructions.
`;
}

export function buildPrompt(userMessage, conversationHistory, stage, stageNotes) {
    const systemPrompt = buildSystemPrompt(stage, stageNotes);
    const messages = conversationHistory.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
    }));

    return { systemPrompt, messages };
}

export function detectNewStage(userMessage, currentStage) {
    const lower = userMessage.toLowerCase();

    if (/costly|expensive|mehnga|budget nahi|soch ke|baad mein|dusri agency|khud manage|zaroorat nahi/i.test(lower)) {
        return STAGES.OBJECTION;
    }

    if (/call|appointment|book|confirm|hanji|done|thik hai/i.test(lower) && currentStage === STAGES.CLOSING) {
        return STAGES.CLOSED;
    }

    if (/kya recommend karte ho|best service|suggest karo|konsa acha hai/i.test(lower)) {
        return STAGES.RECOMMENDING;
    }

    if (/budget|kitna lagega|paisa|investment/i.test(lower) && (currentStage === STAGES.DISCOVERY || currentStage === STAGES.GREETING)) {
        return STAGES.QUALIFYING;
    }

    if (currentStage === STAGES.GREETING && lower.length > 5) {
        return STAGES.DISCOVERY;
    }

    return null;
}

export function isMediaMessage(messageType) {
    return ['image', 'audio', 'video', 'document', 'sticker', 'location', 'vcard', 'ptt'].includes(messageType);
}

export function getMediaReply(messageType) {
    switch (messageType) {
        case 'image':
            return "Aapki image dekhi! Iske baare mein detail mein baat karte hain - batao kya requirement hai? Main help karunga.";
        case 'audio':
        case 'ptt':
            return "Voice note mila! Abhi text mein reply nahi kar sakta audio ke liye - please type mein batao ya seedha call karein: adsverse.in/contact";
        case 'video':
            return "Video mila! Yeh main dekh lunga - filhal batao aapka main requirement kya hai?";
        case 'document':
            return "Document mila! Isko detail mein review karenge - best hoga ek strategy call pe discuss karein: adsverse.in/contact";
        case 'location':
            return "Location share ki! Hum Vijay Nagar, Indore mein hain - in-person meeting bhi kar sakte hain. Call schedule karte hain? adsverse.in/contact";
        case 'vcard':
            return "Contact mila! Agar kisi ko AdsVerse se connect karna chahte hain toh directly forward kar sakte hain: adsverse.in";
        case 'sticker':
            return null;
        default:
            return null;
    }
}

export function isHumanTrigger(messageText) {
    for (const trigger of HUMAN_TRIGGERS) {
        if (trigger.regex.test(messageText)) {
            return { triggered: true, reason: trigger.reason };
        }
    }
    return { triggered: false, reason: null };
}

export function isRecruitmentQuery(message) {
    const recruitmentKeywords = ['job', 'career', 'apply', 'internship', 'vacancy', 'hire', 'hiring', 'opening', 'joining', 'work with you', 'placement', 'fresher', 'resume', 'cv'];
    const lower = message.toLowerCase();
    return recruitmentKeywords.some(kw => lower.includes(kw));
}

export function isEscalationRequest(message) {
    return isHumanTrigger(message).triggered;
}

export function getIntentTags(userMessage) {
    return [];
}
