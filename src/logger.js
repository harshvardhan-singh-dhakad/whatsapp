import fs from 'fs';
import path from 'path';
import colors from 'colors';

const logDir = path.join(process.cwd(), 'logs');
const logFile = path.join(logDir, 'bot.log');

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logger = {
    info: (...args) => {
        const msg = args.join(' ');
        console.log(`[INFO] ${msg}`.cyan);
        appendToFile(`[INFO] ${msg}`);
    },
    success: (...args) => {
        const msg = args.join(' ');
        console.log(`[SUCCESS] ${msg}`.green);
        appendToFile(`[SUCCESS] ${msg}`);
    },
    warn: (...args) => {
        const msg = args.join(' ');
        console.log(`[WARN] ${msg}`.yellow);
        appendToFile(`[WARN] ${msg}`);
    },
    error: (...args) => {
        // Handle both strings and error objects
        const msg = args.map(arg => 
            arg instanceof Error ? arg.stack || arg.message : 
            (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg)
        ).join(' ');
        
        console.log(`[ERROR] ${msg}`.red);
        appendToFile(`[ERROR] ${msg}`);
    },
};

function appendToFile(msg) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`, 'utf8');
}

export default logger;
