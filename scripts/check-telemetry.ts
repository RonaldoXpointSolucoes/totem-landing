/**
 * Script de Diagnóstico e Análise de Falhas de Navegação e Erros
 * Uso: npx ts-node scripts/check-telemetry.ts [--remote]
 * Totem Pro — X-Point Soluções
 */

import fs from "fs";
import path from "path";

async function main() {
  const isRemote = process.argv.includes("--remote");
  console.log("==================================================================");
  console.log(`🔍 [DIAGNÓSTICO DE TELEMETRIA] Analisando ambiente: ${isRemote ? "PRODUÇÃO REMOTA (totem.xpointsolucoes.com.br)" : "LOCAL (src/data/telemetry_errors.json)"}`);
  console.log("==================================================================\n");

  let errors: any[] = [];
  let stats: any = null;

  if (isRemote) {
    try {
      const res = await fetch("https://totem.xpointsolucoes.com.br/api/telemetry/errors?key=totem_telemetry_diag_live_2026&limit=50");
      const data = await res.json();
      if (!data.ok) {
        console.error("❌ Falha na resposta da API remota:", data);
        return;
      }
      errors = data.errors || [];
      stats = data.stats || null;
    } catch (err: any) {
      console.error("❌ Erro de conexão com a API de produção:", err.message);
      return;
    }
  } else {
    const file = path.join(process.cwd(), "src", "data", "telemetry_errors.json");
    if (!fs.existsSync(file)) {
      console.log("ℹ️ Nenhum arquivo telemetry_errors.json encontrado localmente ainda.");
      return;
    }
    const raw = fs.readFileSync(file, "utf-8");
    errors = JSON.parse(raw);
  }

  const unresolved = errors.filter((e) => !e.resolved);
  const critical = errors.filter((e) => e.severity === "critical" && !e.resolved);
  const navigation = errors.filter((e) => e.type === "navigation_error" && !e.resolved);
  const apiFailures = errors.filter((e) => e.type === "api_network_failure" && !e.resolved);

  console.log(`📊 Total de Ocorrências: ${errors.length}`);
  console.log(`🚨 Pendentes / Não Resolvidos: ${unresolved.length}`);
  console.log(`🔴 Críticos: ${critical.length}`);
  console.log(`🧭 Falhas de Navegação & Rotas: ${navigation.length}`);
  console.log(`⚡ Falhas de API / Rede: ${apiFailures.length}\n`);

  if (unresolved.length === 0) {
    console.log("✅ SISTEMA 100% LIMPO: Nenhuma falha pendente para análise!");
    return;
  }

  console.log("------------------------------------------------------------------");
  console.log("📋 Ocorrências Pendentes Mais Recentes:");
  console.log("------------------------------------------------------------------");

  unresolved.slice(0, 10).forEach((err, idx) => {
    console.log(`\n[${idx + 1}] ID: ${err.id} | Tipo: ${err.type} | Gravidade: ${err.severity.toUpperCase()}`);
    console.log(`   Rota: ${err.pathname} (URL: ${err.url})`);
    console.log(`   Mensagem: ${err.message}`);
    console.log(`   Ocorrências: ${err.occurrences}x | Última: ${err.lastSeen}`);
    console.log(`   Dispositivo: ${err.device?.type || "desktop"} (${err.device?.screen || "n/a"})`);
    if (err.breadcrumbs && err.breadcrumbs.length > 0) {
      console.log(`   Passos anteriores (Breadcrumbs):`);
      err.breadcrumbs.forEach((b: any) => {
        console.log(`     - [${b.timestamp}] (${b.category}): ${b.message}`);
      });
    }
    if (err.stack) {
      console.log(`   Stack trace:`);
      console.log(`     ${err.stack.split("\n").slice(0, 3).join("\n     ")}`);
    }
  });

  console.log("\n==================================================================");
}

main().catch(console.error);
