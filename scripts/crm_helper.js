const https = require('https');

const API_BASE = 'owckk0k8w8soo40w40owc4ss.69.62.92.212.sslip.io';
const BOARD_ID = '8c88ef42-855a-4704-9032-70ec67f674d0';
const TOKEN = 'xpt_crm_live_5ba23c68238fdc9946ca1600e0f34b6288c3debb';

function apiRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const options = {
      hostname: API_BASE,
      path: `/api/v1/crm${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    if (dataString) {
      options.headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = https.request(options, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(resData);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: resData });
        }
      });
    });

    req.on('error', reject);
    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
}

async function listCards() {
  const res = await apiRequest(`/boards/${BOARD_ID}/cards`);
  return res.data?.cards || res.data?.data || [];
}

async function getCard(id) {
  const res = await apiRequest(`/cards/${id}`);
  return res.data?.data || res.data;
}

async function moveCard(id, stage) {
  const res = await apiRequest(`/cards/${id}/move`, 'POST', { stage });
  return res;
}

module.exports = { apiRequest, listCards, getCard, moveCard, BOARD_ID };

if (require.main === module) {
  const action = process.argv[2] || 'list';
  if (action === 'list') {
    listCards().then(cards => {
      console.log('Total cards encontrados:', cards.length);
      const dev = cards.filter(c => c.status === 'development' || c.stage_id === 'development');
      console.log('Em Desenvolvimento:', dev.length);
      dev.forEach((c, idx) => {
        console.log(`[${idx}] ${c.title} | ID: ${c.id} | status: ${c.status} | stage: ${c.stage_id}`);
      });
    }).catch(console.error);
  } else if (action === 'move') {
    const id = process.argv[3];
    const stage = process.argv[4] || 'testing';
    moveCard(id, stage).then(res => console.log('Move res:', res)).catch(console.error);
  }
}
