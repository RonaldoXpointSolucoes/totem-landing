import { siteConfig } from "../src/config/site";

async function main() {
  const expectedVersion = siteConfig.version;
  console.log("=================================================");
  console.log(`🌐 VERIFICAÇÃO DE DEPLOY EM PRODUÇÃO AO VIVO (Esperado: v${expectedVersion})`);
  console.log("=================================================");

  // 1. Health check
  const healthRes = await fetch("https://totem.xpointsolucoes.com.br/api/health", {
    headers: { "Cache-Control": "no-cache" },
  });
  const healthData = await healthRes.json();
  console.log("Health API Version:", healthData.version);

  // 2. Admin page
  const adminHtml = await fetch("https://totem.xpointsolucoes.com.br/admin", {
    headers: { "Cache-Control": "no-cache" },
  }).then((r) => r.text());

  const scriptMatches = [...adminHtml.matchAll(/src="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
  let foundInScript = false;

  for (const s of scriptMatches) {
    const js = await fetch("https://totem.xpointsolucoes.com.br" + s, {
      headers: { "Cache-Control": "no-cache" },
    }).then((r) => r.text());
    if (js.includes(expectedVersion)) {
      console.log(`✓ Encontrado '${expectedVersion}' no bundle estático: ${s}`);
      foundInScript = true;
      break;
    }
  }

  // 3. Homepage
  const homeHtml = await fetch("https://totem.xpointsolucoes.com.br/", {
    headers: { "Cache-Control": "no-cache" },
  }).then((r) => r.text());

  const homeScripts = [...homeHtml.matchAll(/src="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
  let foundInHomeScript = false;

  for (const s of homeScripts) {
    const js = await fetch("https://totem.xpointsolucoes.com.br" + s, {
      headers: { "Cache-Control": "no-cache" },
    }).then((r) => r.text());
    if (js.includes(expectedVersion)) {
      console.log(`✓ Encontrado '${expectedVersion}' no bundle da home: ${s}`);
      foundInHomeScript = true;
      break;
    }
  }

  console.log("=================================================");
  if (healthData.version === expectedVersion && (foundInScript || foundInHomeScript)) {
    console.log(`🎉 SUCESSO TOTAL: A versão ${expectedVersion} está 100% NO AR em produção!`);
  } else {
    console.log("⚠️ Aguardando sincronização de cache.");
  }
}

main().catch(console.error);

