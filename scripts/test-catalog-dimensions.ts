import { CABINET_MODELS } from "../src/modules/catalog/catalogData";
import { ShippingOptionId, ShippingQuote } from "../src/types/shipping";

console.log("🧪 Testando catálogo de gabinetes e dimensões de expedição...");

let hasError = false;

for (const model of CABINET_MODELS) {
  console.log(`\n📦 Verificando modelo: ${model.name} (${model.id})`);
  
  if (!model.weightKg || model.weightKg <= 0) {
    console.error(`❌ Erro: weightKg inválido para ${model.id}: ${model.weightKg}`);
    hasError = true;
  } else {
    console.log(`  ✓ Peso líquido: ${model.weightKg} kg`);
  }

  if (!model.package) {
    console.error(`❌ Erro: package não definido para ${model.id}`);
    hasError = true;
    continue;
  }

  const { heightCm, widthCm, depthCm, grossWeightKg } = model.package;
  if (!heightCm || !widthCm || !depthCm || !grossWeightKg) {
    console.error(`❌ Erro: dimensões de embalagem incompletas para ${model.id}:`, model.package);
    hasError = true;
  } else {
    console.log(`  ✓ Dimensões de embalagem: ${heightCm}x${widthCm}x${depthCm} cm`);
    console.log(`  ✓ Peso bruto embalado: ${grossWeightKg} kg`);
  }

  if (grossWeightKg < (model.weightKg || 0)) {
    console.error(`❌ Erro: Peso bruto (${grossWeightKg}) menor que peso líquido (${model.weightKg}) em ${model.id}`);
    hasError = true;
  }

  // Verifica cubagem industrial (m3) e peso cubado Correios (CxLxA / 6000)
  const volumeM3 = (heightCm * widthCm * depthCm) / 1_000_000;
  const correiosCubicKg = (heightCm * widthCm * depthCm) / 6000;
  const carrierCubicKg = volumeM3 * 300; // Fator rodoviário padrão 300kg/m3

  console.log(`  ✓ Volume: ${volumeM3.toFixed(3)} m³ | Cubado Correios: ${correiosCubicKg.toFixed(2)} kg | Cubado Rodoviário: ${carrierCubicKg.toFixed(2)} kg`);
}

if (hasError) {
  console.error("\n❌ Falha na validação de catálogo e dimensões!");
  process.exit(1);
} else {
  console.log("\n✅ Todos os modelos de gabinete possuem pesos e dimensões válidos para logística.");
}
