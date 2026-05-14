const fs = require('fs');
const path = require('path');
const colors = require('colors');

const statsPath = path.join(process.cwd(), 'stats.json');

function showStats() {
    console.log('\n📊 --- ADSVERSE BOT STATISTICS ---\n'.bold.cyan);

    if (!fs.existsSync(statsPath)) {
        console.log('❌ Stats file not found! Start the bot first.'.yellow);
        return;
    }

    try {
        const data = fs.readFileSync(statsPath, 'utf8');
        const stats = JSON.parse(data);

        console.log(`⏱️  UPTIME: ${stats.uptime || 'Unknown'}`.green);
        console.log(`📩 RECEIVED: ${stats.messagesReceived || 0}`.white);
        console.log(`✅ REPLIED: ${stats.messagesReplied || 0}`.white);
        console.log(`❌ ERRORS: ${stats.errorsCount || 0}`.red);
        console.log(`🎯 TOTAL LEADS: ${stats.totalLeads || 0}`.cyan);
        console.log(`📝 LAST UPDATED: ${stats.lastUpdated || 'Never'}`.gray);

        console.log('\n--------------------------------------'.gray);
        console.log(`💡 Status: The bot is currently running!`.bold.green);
        console.log('--------------------------------------\n'.gray);

    } catch (e) {
        console.log(`❌ Error reading stats: ${e.message}`.red);
    }
}

showStats();
