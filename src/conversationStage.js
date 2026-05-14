import fs from 'fs';
import path from 'path';
import logger from './logger.js';

const STAGES_FILE = path.join(process.cwd(), 'leads', 'stages.json');

// Ensure the leads directory exists
const leadsDir = path.join(process.cwd(), 'leads');
if (!fs.existsSync(leadsDir)) {
    fs.mkdirSync(leadsDir, { recursive: true });
}

class StageManager {
    constructor() {
        this.stages = new Map();
        this.loadStages();
    }

    loadStages() {
        try {
            if (fs.existsSync(STAGES_FILE)) {
                const data = JSON.parse(fs.readFileSync(STAGES_FILE, 'utf8'));
                Object.entries(data).forEach(([phone, stageData]) => {
                    this.stages.set(phone, stageData);
                });
                logger.info(`Loaded ${this.stages.size} conversation stages from file.`);
            }
        } catch (error) {
            logger.error('Failed to load stages:', error);
            this.stages = new Map();
        }
    }

    saveStages() {
        try {
            const data = Object.fromEntries(this.stages);
            fs.writeFileSync(STAGES_FILE, JSON.stringify(data, null, 2));
        } catch (error) {
            logger.error('Failed to save stages:', error);
        }
    }

    getStage(phoneNumber) {
        return this.stages.get(phoneNumber)?.stage || 'GREETING';
    }

    setStage(phoneNumber, stage) {
        const currentData = this.stages.get(phoneNumber) || { notes: '', createdAt: new Date().toISOString() };
        this.stages.set(phoneNumber, {
            ...currentData,
            stage,
            updatedAt: new Date().toISOString()
        });
        this.saveStages();
        logger.info(`Stage updated for ${phoneNumber}: ${stage}`);
    }

    getStageData(phoneNumber) {
        return this.stages.get(phoneNumber) || { stage: 'GREETING', updatedAt: null, notes: '' };
    }

    setNotes(phoneNumber, notes) {
        const currentData = this.stages.get(phoneNumber) || { stage: 'GREETING', createdAt: new Date().toISOString() };
        this.stages.set(phoneNumber, {
            ...currentData,
            notes,
            updatedAt: new Date().toISOString()
        });
        this.saveStages();
    }

    flagForHuman(phoneNumber, reason) {
        const currentData = this.stages.get(phoneNumber) || { notes: '', createdAt: new Date().toISOString() };
        this.stages.set(phoneNumber, {
            ...currentData,
            stage: 'HUMAN_NEEDED',
            humanNeededReason: reason,
            updatedAt: new Date().toISOString()
        });
        this.saveStages();
        logger.warn(`Human flagged for ${phoneNumber}: ${reason}`);
    }

    getAllHumanFlags() {
        return Array.from(this.stages.entries())
            .filter(([_, data]) => data.stage === 'HUMAN_NEEDED')
            .map(([phone, data]) => ({ phone, ...data }));
    }

    clearStage(phoneNumber) {
        this.stages.delete(phoneNumber);
        this.saveStages();
        logger.info(`Stage cleared for ${phoneNumber}`);
    }
}

const stageManager = new StageManager();
export default stageManager;
