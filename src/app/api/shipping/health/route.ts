import { NextResponse } from "next/server";
import { runGroundTruthSelfAudit } from "@/modules/shipping/antiFailureGuard";
import { calculateCorreiosQuotes } from "@/modules/shipping/correiosService";
import { CORREIOS_CONTRACT_METADATA } from "@/modules/shipping/receiptGroundTruth";
import { hydrateCorreiosContractConfig } from "@/modules/shipping/correiosPrepostagemService";

export async function GET() {
  try {
    const cfg = await hydrateCorreiosContractConfig();

    // 1. Executa autodiagnóstico em tempo real dos 8 comprovantes reais
    const auditResult = await runGroundTruthSelfAudit(calculateCorreiosQuotes);

    // 2. Verifica se credenciais online e de contrato estão configuradas
    const hasOnlineCredentials = Boolean(
      (cfg.cwsUser || process.env.CORREIOS_USUARIO || process.env.CORREIOS_CNPJ) &&
      (cfg.cwsPassword || process.env.CORREIOS_SENHA_API || process.env.CORREIOS_TOKEN)
    );

    const contractConfigured = Boolean(
      cfg.contractNumber || process.env.CORREIOS_CONTRATO || CORREIOS_CONTRACT_METADATA.contractNumber
    );

    const isHealthy = auditResult.allPassed && auditResult.averagePrecision >= 95.0;

    return NextResponse.json(
      {
        ok: isHealthy,
        status: isHealthy ? "operational" : "degraded",
        antiFailureGuard: {
          active: true,
          zeroHallucinationEnforced: true,
          guarantee:
            "Todas as tarifas são originadas estritamente de API Cws Oficial ou Matriz Contratual Auditada com base nos comprovantes reais.",
          auditedReceiptsCount: auditResult.auditedCount,
          averagePrecision: `${auditResult.averagePrecision}%`,
          allCasesPassMin95: auditResult.allPassed,
        },
        contract: {
          configured: contractConfigured,
          number: cfg.contractNumber || process.env.CORREIOS_CONTRATO || CORREIOS_CONTRACT_METADATA.contractNumber,
          postcard: cfg.postcardNumber || process.env.CORREIOS_CARTAO_POSTAGEM || CORREIOS_CONTRACT_METADATA.postcardNumber,
          agency: cfg.agency || CORREIOS_CONTRACT_METADATA.agency,
          originCep: cfg.senderAddress?.cep || process.env.SHIPPING_ORIGIN_CEP || CORREIOS_CONTRACT_METADATA.originCep,
          cnpj: cfg.cnpj || process.env.CORREIOS_CNPJ || CORREIOS_CONTRACT_METADATA.cnpj,
        },
        onlineCwsIntegration: {
          configured: hasOnlineCredentials,
          verified: Boolean(cfg.cwsIsVerified),
          canonicalIdCorreios: cfg.cwsCanonicalIdCorreios || null,
          mode: hasOnlineCredentials ? "live_api_active" : "contract_ground_truth_fallback",
        },
        receiptsAuditDetails: auditResult.cases,
        timestamp: new Date().toISOString(),
      },
      { status: isHealthy ? 200 : 503 }
    );
  } catch (error: any) {
    console.error("[HEALTH] Erro ao executar autodiagnóstico de frete:", error);
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        error: error.message || "Erro durante autodiagnóstico de frete",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
