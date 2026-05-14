const fs = require('fs');
const path = require('path');
const colors = require('colors');

const leadsPath = path.join(process.cwd(), 'leads', 'leads.json');

function viewLeads() {
    console.log('\n🔍 --- ADSVERSE LEAD VIEWER ---\n'.bold.cyan);

    if (!fs.existsSync(leadsPath)) {
        console.log('❌ No leads found yet!'.yellow);
        return;
    }

    try {
        const data = fs.readFileSync(leadsPath, 'utf8');
        const leads = JSON.parse(data);
        const leadsList = Object.values(leads);

        if (leadsList.length === 0) {
            console.log('📝 Leads list is empty.'.gray);
            return;
        }

        console.log(`📊 TOTAL LEADS: ${leadsList.length}`.bold.green);
        console.log('--------------------------------------------------'.gray);

        leadsList.forEach((lead, i) => {
            console.log(`${i+1}. [${lead.phone}] - ${lead.status || 'New'}`.cyan);
            console.log(`   Contacted: ${new Date(lead.firstContact).toLocaleString('en-IN')}`.gray);
            console.log(`   Message: ${lead.firstMessage.substring(0, 50)}...`.white);
            console.log('--------------------------------------------------'.gray);
        });

        console.log(`\n💡 Tip: Check "leads/leads.csv" for spreadsheet view.\n`.gray);

    } catch (e) {
        console.log(`❌ Error reading leads: ${e.message}`.red);
    }
}

viewLeads();
