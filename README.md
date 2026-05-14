# 🚀 AdsVerse WhatsApp AI Automation v2.0

Ek **fully production-ready** WhatsApp automation bot — jo incoming messages ko padhta hai, **Gemini AI** se human-like reply generate karta hai, leads capture karta hai, aur conversation history yaad rakhta hai.

---

## ✨ Features (v2.0 — New!)

| Feature | Description |
|---|---|
| 🤖 AI Persona | "Aryan" — AdsVerse ka friendly consultant persona |
| 🧠 Conversation Memory | Har user ka 24-hour chat history yaad rakhta hai |
| 🛡️ Rate Limiting | Spam protection — 8 msg/min per user |
| 🔄 Auto Retry | AI failure pe 3x retry with exponential backoff |
| 📊 Lead CSV Export | Har lead automatically `leads/leads.csv` mein save |
| 📝 Detailed Logging | Color-coded terminal + `logs/bot.log` file |
| 📤 Fallback Messages | AI fail hone par bhi user ko reply milta hai |
| 🔌 Auto Reconnect | WhatsApp disconnect hone par auto restart |
| 📈 Live Stats | `stats.json` mein real-time bot statistics |
| 💬 Language Detection | Hindi, Hinglish, English — automatic match |

---

## 📁 Project Structure

```
adsverse-bot/
├── index.js              # Main bot entry point
├── package.json
├── .env                  # API keys (create from .env.example)
├── .env.example          # Template
│
├── src/
│   ├── logger.js         # Colored logging + file logging
│   ├── leadManager.js    # Lead capture (CSV + JSON)
│   ├── conversationMemory.js  # Per-user chat history
│   ├── rateLimiter.js    # Spam protection
│   ├── promptBuilder.js  # AI prompt construction
│   └── utils.js          # Helper functions
│
├── tools/
│   ├── viewLeads.js      # CLI: leads dekhne ke liye
│   └── showStats.js      # CLI: bot stats dekhne ke liye
│
├── leads/                # Auto-created
│   ├── leads.csv         # All leads (spreadsheet mein open karo)
│   └── leads.json        # Leads with full data
│
└── logs/                 # Auto-created
    └── bot.log           # Full activity log
```

---

## 🚀 Setup Guide (Step by Step)

### Step 1: Prerequisites

```bash
# Node.js v18+ required
node --version  # Should show v18.x.x or higher
```

Agar Node.js nahi hai: [nodejs.org](https://nodejs.org) se download karein.

---

### Step 2: Project Setup

```bash
# Folder mein jayen
cd adsverse-bot

# Dependencies install karein
npm install
```

> ⚠️ **Note:** `whatsapp-web.js` Chromium download karta hai (~200MB). First install slow hoga.

---

### Step 3: API Key Setup

```bash
# .env file banayein
cp .env.example .env
```

Ab `.env` file kholo aur apni Gemini API key daalo:

```env
GEMINI_API_KEY=your_actual_key_here
```

**Gemini API Key kahan milegi?**
👉 [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — Free hai!

---

### Step 4: Bot Start Karein

```bash
npm start
```

Aapko terminal mein ek **QR Code** dikhega. Use:
1. WhatsApp open karein
2. **Settings > Linked Devices > Link a Device**
3. QR code scan karein

```
✅ AdsVerse AI Bot is LIVE! 🚀
```

Yeh message aane ke baad bot fully ready hai!

---

## 📊 Leads Dekhne Ka Tarika

```bash
# Terminal mein leads dekhein
node tools/viewLeads.js

# Bot stats dekhein
node tools/showStats.js

# CSV Excel mein open karein
# leads/leads.csv file ko Excel/Google Sheets mein open karein
```

---

## ⚙️ Configuration Customize Karein

### AI Persona Change Karna
`src/promptBuilder.js` mein `SYSTEM_PROMPT` edit karein:
- Agent ka naam change karein
- Services update karein
- Pricing update karein
- Rules add/remove karein

### Rate Limit Change Karna
`src/rateLimiter.js` mein:
```js
const MAX_MESSAGES = 8;     // Max messages per window
const WINDOW_MS = 60000;    // Window duration (1 min)
```

### Conversation Memory Duration
`src/conversationMemory.js` mein:
```js
const MAX_HISTORY = 10;           // Last N messages
const MAX_AGE_MS = 24 * 60 * 60 * 1000;  // Reset after 24h
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| QR code nahi aa raha | Chromium install ho raha hoga, wait karein |
| "Session expired" error | `npm run reset-session` chalayein |
| AI replies nahi aa rahi | Gemini API key check karein `.env` mein |
| Bot crash ho gaya | `logs/bot.log` check karein error ke liye |
| WhatsApp ban ka darr | Rate limiting already enabled hai ✅ |

---

## 🛡️ Security Best Practices

1. **`.env` file ko kabhi GitHub pe push mat karein** — `.gitignore` mein already added hai
2. **`.wwebjs_auth/` folder backup karein** — WhatsApp session yahan store hai
3. **Dedicated WhatsApp number use karein** — personal number nahi

---

## 📈 Production Deployment (VPS/Server)

### PM2 ke saath run karein (recommended):

```bash
# PM2 install karein
npm install -g pm2

# Bot start karein
pm2 start index.js --name "adsverse-bot"

# Auto-restart on server reboot
pm2 startup
pm2 save

# Logs dekhein
pm2 logs adsverse-bot

# Bot status
pm2 status
```

---

## 📞 Support

**AdsVerse Team** | [www.adsverse.in](https://www.adsverse.in)

---

*Built with ❤️ for AdsVerse | Powered by Google Gemini AI + whatsapp-web.js*
# whatsapp
