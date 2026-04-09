import http from 'http';

const API = 'http://localhost:5000';

const endpoints = [
  { method: 'GET', path: '/api/whatsapp/messages', name: 'WhatsApp Messages' },
  { method: 'GET', path: '/api/messages/whatsapp-groups', name: 'WhatsApp Groups' },
  { method: 'GET', path: '/api/messages/drafts', name: 'AI Drafts' },
  { method: 'GET', path: '/api/slack/messages', name: 'Slack Messages' },
  { method: 'GET', path: '/api/teams/messages/chats', name: 'Teams Chats' }
];

async function runTests() {
  console.log('--- Running Smoke Tests against ' + API + ' ---');
  let passed = 0;

  for (const ep of endpoints) {
    try {
      const resp = await new Promise((resolve, reject) => {
        const req = http.get(API + ep.path, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => resolve({ statusCode: res.statusCode, data }));
        });
        req.on('error', reject);
        req.end();
      });

      if (resp.statusCode >= 200 && resp.statusCode < 400) {
        console.log(`✅ PASS: ${ep.name} (${ep.path}) - Status: ${resp.statusCode}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${ep.name} (${ep.path}) - Status: ${resp.statusCode}`);
      }
    } catch (err) {
      console.log(`❌ ERROR: ${ep.name} (${ep.path}) - ${err.message}`);
    }
  }

  console.log(`--- Results: ${passed}/${endpoints.length} Passed ---`);
  process.exit(passed === endpoints.length ? 0 : 1);
}

runTests();
