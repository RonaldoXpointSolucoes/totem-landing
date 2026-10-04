import { calculateCorreiosQuotes } from "../src/modules/shipping/correiosService";

interface ReceiptTestCase {
  id: string;
  objeto: string;
  cidadeUf: string;
  cep: string;
  serviceId: "correios_sedex" | "correios_pac";
  serviceLabel: string;
  dimensoesCm: [number, number, number]; // [H, W, D]
  pesoRealKg: number;
  valorDeclaradoReais: number;
  comprovanteBaseReais: number;
  comprovanteSeguroReais: number;
  comprovanteTotalReais: number;
}

const RECEIPT_CASES: ReceiptTestCase[] = [
  {
    id: "COMPROVANTE 1",
    objeto: "AD912900624BR",
    cidadeUf: "Paulínia - SP",
    cep: "13140-610",
    serviceId: "correios_sedex",
    serviceLabel: "SEDEX CONTRATO AG",
    dimensoesCm: [68, 65, 23],
    pesoRealKg: 16,
    valorDeclaradoReais: 1240.0,
    comprovanteBaseReais: 45.89,
    comprovanteSeguroReais: 12.14,
    comprovanteTotalReais: 58.03,
  },
  {
    id: "COMPROVANTE 2 - OBJETO 1",
    objeto: "AD883725560BR",
    cidadeUf: "Cidreira - RS",
    cep: "95595-000",
    serviceId: "correios_sedex",
    serviceLabel: "SEDEX CONTRATO AG",
    dimensoesCm: [90, 45, 20],
    pesoRealKg: 16,
    valorDeclaradoReais: 1140.0,
    comprovanteBaseReais: 208.2,
    comprovanteSeguroReais: 11.22,
    comprovanteTotalReais: 219.42,
  },
  {
    id: "COMPROVANTE 2 - OBJETO 2",
    objeto: "AD883737464BR",
    cidadeUf: "Cajamar - SP",
    cep: "07792-820",
    serviceId: "correios_sedex",
    serviceLabel: "SEDEX CONTRATO AG",
    dimensoesCm: [68, 65, 23],
    pesoRealKg: 22,
    valorDeclaradoReais: 7890.0,
    comprovanteBaseReais: 45.89,
    comprovanteSeguroReais: 77.74,
    comprovanteTotalReais: 123.63,
  },
  {
    id: "COMPROVANTE 2 - OBJETO 3",
    objeto: "AD883788383BR",
    cidadeUf: "Guarulhos - SP",
    cep: "07084-220",
    serviceId: "correios_sedex",
    serviceLabel: "SEDEX CONTRATO AG",
    dimensoesCm: [90, 45, 20],
    pesoRealKg: 16,
    valorDeclaradoReais: 990.0,
    comprovanteBaseReais: 47.96,
    comprovanteSeguroReais: 9.64,
    comprovanteTotalReais: 57.6,
  },
  {
    id: "COMPROVANTE 3",
    objeto: "AD869362607BR",
    cidadeUf: "Santana de Parnaíba - SP",
    cep: "06544-300",
    serviceId: "correios_sedex",
    serviceLabel: "SEDEX CONTRATO AG",
    dimensoesCm: [96, 45, 42],
    pesoRealKg: 26,
    valorDeclaradoReais: 1790.0,
    comprovanteBaseReais: 99.64,
    comprovanteSeguroReais: 17.64,
    comprovanteTotalReais: 117.28,
  },
  {
    id: "COMPROVANTE 4",
    objeto: "AP480970991BR",
    cidadeUf: "Caldas Novas - GO",
    cep: "75680-013",
    serviceId: "correios_pac",
    serviceLabel: "PAC CONTRATO AG",
    dimensoesCm: [90, 45, 20],
    pesoRealKg: 16,
    valorDeclaradoReais: 1520.0,
    comprovanteBaseReais: 130.3,
    comprovanteSeguroReais: 14.94,
    comprovanteTotalReais: 145.24,
  },
  {
    id: "COMPROVANTE 5 - OBJETO 1",
    objeto: "AP562222213BR",
    cidadeUf: "Natal - RN",
    cep: "59075-700",
    serviceId: "correios_pac",
    serviceLabel: "PAC CONTRATO AG",
    dimensoesCm: [90, 45, 41],
    pesoRealKg: 30,
    valorDeclaradoReais: 1980.0,
    comprovanteBaseReais: 260.39,
    comprovanteSeguroReais: 19.54,
    comprovanteTotalReais: 279.93,
  },
  {
    id: "COMPROVANTE 5 - OBJETO 2",
    objeto: "AD963834575BR",
    cidadeUf: "Guarapuava - PR",
    cep: "85035-010",
    serviceId: "correios_sedex",
    serviceLabel: "SEDEX CONTRATO AG",
    dimensoesCm: [90, 45, 20],
    pesoRealKg: 16,
    valorDeclaradoReais: 1450.0,
    comprovanteBaseReais: 176.69,
    comprovanteSeguroReais: 14.24,
    comprovanteTotalReais: 190.93,
  },
];

async function runValidation() {
  console.log("=========================================================================================");
  console.log("🔍 AUDITORIA E VALIDAÇÃO DE PRECISÃO DOS COMPROVANTES REAIS DE ENVIO DOS CORREIOS");
  console.log("Cliente: X POINT SOLUCOES TECNOLOGICAS LTDA | Contrato: 9912722993 | Cartão: 0079659128");
  console.log("Origem: AC TABOAO DA SERRA - SE/SPM (CEP 06754-000)");
  console.log("Meta de Precisão Mínima Exigida: 95.0%\n");

  let totalPrecisionSum = 0;
  let allPass95 = true;

  console.log(
    "| N° | Comprovante | Destino | Serviço | Vlr Real (R$) | Vlr API (R$) | Dif (R$) | Precisão (%) | Status |"
  );
  console.log(
    "|---|-------------|---------|---------|---------------|--------------|----------|--------------|--------|"
  );

  for (let i = 0; i < RECEIPT_CASES.length; i++) {
    const c = RECEIPT_CASES[i];
    const [h, w, d] = c.dimensoesCm;
    const cubicKg = Number(((h * w * d) / 6000).toFixed(2));
    const maxDim = Math.max(h, w, d);
    const sumDim = h + w + d;

    const quotes = await calculateCorreiosQuotes({
      destinationCep: c.cep,
      totalGrossWeightKg: c.pesoRealKg,
      totalCubicWeightKg: cubicKg,
      maxDimensionCm: maxDim,
      sumDimensionsCm: sumDim,
      itemCount: 1,
      hasOversizedItem: false,
      declaredValueCents: Math.round(c.valorDeclaradoReais * 100),
    });

    const matchedQuote = quotes.find((q) => q.id === c.serviceId);
    if (!matchedQuote) {
      throw new Error(`Cotação para ${c.serviceId} não encontrada no caso ${c.id}`);
    }

    const calculatedTotalReais = matchedQuote.priceCents / 100;
    const realTotalReais = c.comprovanteTotalReais;
    const diffReais = calculatedTotalReais - realTotalReais;
    const absDiff = Math.abs(diffReais);
    const precision = Math.max(0, 100 - (absDiff / realTotalReais) * 100);

    totalPrecisionSum += precision;
    const isAbove95 = precision >= 95.0;
    if (!isAbove95) allPass95 = false;

    console.log(
      `| ${i + 1} | ${c.objeto} | ${c.cidadeUf.padEnd(20)} | ${c.serviceId === "correios_sedex" ? "SEDEX" : "PAC"} | R$ ${realTotalReais.toFixed(2).padStart(8)} | R$ ${calculatedTotalReais.toFixed(2).padStart(8)} | R$ ${diffReais.toFixed(2).padStart(6)} | ${precision.toFixed(2).padStart(11)}% | ${isAbove95 ? "✅ PASS" : "❌ FAIL"} |`
    );
  }

  const averagePrecision = totalPrecisionSum / RECEIPT_CASES.length;
  console.log("=========================================================================================");
  console.log(`\n📊 RESULTADO FINAL DA AUDITORIA:`);
  console.log(`✓ Total de Comprovantes Auditados: ${RECEIPT_CASES.length}`);
  console.log(`✓ Média Geral de Precisão da API: ${averagePrecision.toFixed(2)}%`);
  console.log(`✓ Todos os envios com precisão >= 95%: ${allPass95 ? "SIM ✅" : "NÃO ❌"}\n`);

  if (!allPass95) {
    console.error("❌ ERRO: Um ou mais envios não atingiram a precisão mínima de 95%!");
    process.exit(1);
  } else {
    console.log("🎉 SUCESSO ABSOLUTO! A API atingiu precisão contratual superior a 95% em todos os comprovantes reais!");
  }
}

runValidation().catch((err) => {
  console.error("Erro fatal na validação:", err);
  process.exit(1);
});
