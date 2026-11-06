#!/usr/bin/env node
/**
 * Dispara o Resumo Executivo de Tomada de Decisão do Google Ads (Totem Pro)
 * da instância FoodNext (cc4efe36-f391-4b3d-a24c-ddcd8a293cf6 / 5511947758860)
 * para a instância do Ronaldo (5c78d358-d449-41c4-b396-a04ab20a39e4 / 5511975960999).
 *
 * Uso:
 *   node .agents/skills/totem-pro-ads-specialist/scripts/send-whatsapp-report.cjs --file <caminho_msg.txt>
 *   node .agents/skills/totem-pro-ads-specialist/scripts/send-whatsapp-report.cjs --text "Mensagem..."
 */

const fs = require('node:fs');
const path = require('node:path');

function loadLocalEnv() {
  const rootDir = path.resolve(__dirname, '../../../..');
  for (const envName of ['.env.local', '.env']) {
    const fullPath = path.join(rootDir, envName);
    if (!fs.existsSync(fullPath)) continue;
    const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadLocalEnv();

const WHATSAPP_API_URL = (process.env.WHATSAPP_API_URL || 'https://wh1ss8sy848ufj6zh8t492y7.69.62.92.212.sslip.io').replace(/\/+$/, '');
const FOODNEXT_INSTANCE_ID = process.env.WHATSAPP_INSTANCE_ID || 'cc4efe36-f391-4b3d-a24c-ddcd8a293cf6';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || 'sk_inst_c79464fa9eea45b0860033430a3cf30d';
const RONALDO_NUMBER = process.env.RONALDO_WHATSAPP_NUMBER || '5511975960999';
const RONALDO_INSTANCE_ID = process.env.RONALDO_INSTANCE_ID || '5c78d358-d449-41c4-b396-a04ab20a39e4';

function getMessageText() {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');
  if (fileIdx !== -1 && args[fileIdx + 1]) {
    return fs.readFileSync(path.resolve(args[fileIdx + 1]), 'utf8').trim();
  }
  const textIdx = args.indexOf('--text');
  if (textIdx !== -1 && args[textIdx + 1]) {
    return args[textIdx + 1].trim();
  }
  throw new Error('Uso: node send-whatsapp-report.cjs --file <arquivo.txt> ou --text "<mensagem>"');
}

async function sendViaMessageEndpoint(text) {
  const endpoint = `${WHATSAPP_API_URL}/message/sendText`;
  let lastError = 'Falha desconhecida';

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          apikey: WHATSAPP_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: RONALDO_NUMBER,
          text,
          instance: FOODNEXT_INSTANCE_ID,
        }),
        signal: AbortSignal.timeout(15000),
      });

      const bodyText = await response.text().catch(() => '');
      let parsed = null;
      try {
        parsed = JSON.parse(bodyText);
      } catch (_) {}

      if (response.ok) {
        return {
          ok: true,
          status: response.status,
          fromInstance: `FoodNext (${FOODNEXT_INSTANCE_ID})`,
          toInstance: `Ronaldo (${RONALDO_INSTANCE_ID})`,
          toNumber: RONALDO_NUMBER,
          response: parsed || bodyText,
          sentAt: new Date().toISOString(),
        };
      }
      lastError = `HTTP ${response.status}: ${bodyText.slice(0, 300)}`;
    } catch (err) {
      lastError = err?.message || 'Erro de rede';
    }

    if (attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }

  throw new Error(lastError);
}

async function main() {
  const text = getMessageText();
  const result = await sendViaMessageEndpoint(text);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error('[ERRO ENVIO WHATSAPP ADS]:', err.message);
  process.exit(1);
});
