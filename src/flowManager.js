import fs from 'fs';
import path from 'path';

const FLOW_FILE = path.join(process.cwd(), 'leads', 'flow_states.json');

// Ensure leads directory exists
if (!fs.existsSync(path.join(process.cwd(), 'leads'))) {
    fs.mkdirSync(path.join(process.cwd(), 'leads'));
}

class FlowManager {
    constructor() {
        this.states = this.loadStates();
    }

    loadStates() {
        try {
            if (fs.existsSync(FLOW_FILE)) {
                return JSON.parse(fs.readFileSync(FLOW_FILE, 'utf8'));
            }
        } catch (e) {
            console.error('Error loading flow states:', e);
        }
        return {};
    }

    saveStates() {
        fs.writeFileSync(FLOW_FILE, JSON.stringify(this.states, null, 2));
    }

    getStep(phone) {
        return this.states[phone]?.step || 0;
    }

    setStep(phone, step, data = {}) {
        this.states[phone] = { 
            step, 
            lastUpdate: new Date().toISOString(),
            ...this.states[phone],
            ...data 
        };
        this.saveStates();
    }

    reset(phone) {
        delete this.states[phone];
        this.saveStates();
    }
}

export default new FlowManager();
