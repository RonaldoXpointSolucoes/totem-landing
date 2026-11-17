import {
  calculateTotemPrice,
  calculateSafeCardChargeCents,
  estimateMercadoPago10xFromCardCharge,
  formatBRL,
} from "@/modules/pricing/pricingEngine";
import {
  calculateSelectiveCouponDiscount,
  SelectiveCoupon,
} from "@/modules/pricing/couponEngine";
import {
  isItemKit,
  mergeServerCatalogKitItems,
  resolveKitEquipmentSummary,
} from "@/modules/catalog/kitDefaults";
import { CustomMonitorDimensions, MonitorOption } from "@/types/catalog";
import { CartItem, TotemConfiguration } from "@/types/order";
import {
  HydratedSharedCartResult,
  SharedCartItemInput,
  SharedCatalogInput,
  SharedCustomMonitorPayload,
  SharedKitSubItemFlag,
} from "@/types/sharedCart";

const SHARE_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function normalizeShareCode(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
}

export function generateShareCodeCandidate(): string {
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * SHARE_CODE_ALPHABET.length);
    suffix += SHARE_CODE_ALPHABET[idx];
  }
  return `MNT-${suffix}`;
}

function sanitizeCustomDimensions(
  dims?: Partial<CustomMonitorDimensions> | null
): CustomMonitorDimensions | undefined {
  if (!dims || typeof dims !== "object") return undefined;
  const num = (v: unknown, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.min(1000, Number(n.toFixed(2))) : fallback;
  };
  return {
    outerWidthCm: num(dims.outerWidthCm),
    outerHeightCm: num(dims.outerHeightCm),
    ...(dims.depthCm !== undefined ? { depthCm: num(dims.depthCm) } : {}),
    screenWidthCm: num(dims.screenWidthCm),
    screenHeightCm: num(dims.screenHeightCm),
    bezelTopCm: num(dims.bezelTopCm),
    bezelBottomCm: num(dims.bezelBottomCm),
    bezelLeftCm: num(dims.bezelLeftCm),
    bezelRightCm: num(dims.bezelRightCm),
    ...(typeof dims.productUrl === "string" && dims.productUrl.trim()
      ? { productUrl: dims.productUrl.trim().slice(0, 500) }
      : {}),
  };
}

function sanitizeCustomMonitorPayload(
  mon?: Partial<MonitorOption> | null
): SharedCustomMonitorPayload | null {
  if (!mon) return null;
  const isCustom = Boolean(mon.isCustom || String(mon.id || "").startsWith("custom-mon-") || mon.customDimensions);
  if (!isCustom) return null;

  return {
    id: mon.id ? String(mon.id).slice(0, 96) : `custom-mon-${Date.now()}`,
    brand: String(mon.brand || "Sob Medida").trim().slice(0, 64),
    model: String(mon.model || "Custom").trim().slice(0, 128),
    displayName: String(mon.displayName || "Monitor Sob Medida").trim().slice(0, 160),
    sizeInches: Number.isFinite(Number(mon.sizeInches)) ? Number(mon.sizeInches) : 21.5,
    vesaPattern: String(mon.vesaPattern || "100x100").trim().slice(0, 32),
    customDimensions: sanitizeCustomDimensions(mon.customDimensions),
  };
}

function buildCustomMonitorFromPayload(
  id: string,
  payload?: SharedCustomMonitorPayload | null,
  fallbackName?: string | null
): MonitorOption {
  const cleanId = id && String(id).trim() ? String(id).trim().slice(0, 96) : `custom-mon-${Date.now()}`;
  return {
    id: cleanId,
    brand: String(payload?.brand || "Sob Medida").trim().slice(0, 64),
    model: String(payload?.model || "Custom").trim().slice(0, 128),
    displayName: String(payload?.displayName || fallbackName || "Monitor Sob Medida").trim().slice(0, 160),
    sizeInches: Number.isFinite(Number(payload?.sizeInches)) ? Number(payload?.sizeInches) : 21.5,
    vesaPattern: String(payload?.vesaPattern || "100x100").trim().slice(0, 32),
    active: true,
    isCustom: true,
    priceAdjustmentCents: 0,
    customDimensions: sanitizeCustomDimensions(payload?.customDimensions),
  };
}

export function sanitizeSharedCartItemsInput(rawItems: unknown[]): SharedCartItemInput[] {
  if (!Array.isArray(rawItems)) return [];
  const sanitized: SharedCartItemInput[] = [];

  for (const raw of rawItems.slice(0, 20)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, any>;
    const modelId = typeof item.modelId === "string" ? item.modelId.trim() : "";
    const colorId = typeof item.colorId === "string" ? item.colorId.trim() : "";
    if (!modelId || !colorId) continue;

    const parsedQty = Math.floor(Number(item.quantity) || 1);
    const quantity = Math.max(1, Math.min(100, parsedQty));

    const kitItems: SharedKitSubItemFlag[] | undefined = Array.isArray(item.kitItems)
      ? item.kitItems
          .filter((k: any) => k && typeof k.id === "string" && k.id.trim())
          .map((k: any) => ({
            id: String(k.id).trim().slice(0, 64),
            ...(typeof k.name === "string" && k.name.trim()
              ? { name: k.name.trim().slice(0, 150) }
              : {}),
            ...(typeof k.category === "string" && k.category.trim()
              ? { category: k.category.trim().slice(0, 32) }
              : {}),
            selected: k.selected !== false,
          }))
      : undefined;

    const customMonitor = sanitizeCustomMonitorPayload(item.customMonitor || null);

    sanitized.push({
      modelId: modelId.slice(0, 64),
      colorId: colorId.slice(0, 64),
      monitorId: typeof item.monitorId === "string" && item.monitorId.trim() ? item.monitorId.trim().slice(0, 96) : null,
      cutoutMonitorId:
        typeof item.cutoutMonitorId === "string" && item.cutoutMonitorId.trim()
          ? item.cutoutMonitorId.trim().slice(0, 96)
          : null,
      cutoutMonitorName:
        typeof item.cutoutMonitorName === "string" && item.cutoutMonitorName.trim()
          ? item.cutoutMonitorName.trim().slice(0, 160)
          : null,
      ...(kitItems && kitItems.length > 0 ? { kitItems } : {}),
      ...(customMonitor ? { customMonitor } : {}),
      printerId: typeof item.printerId === "string" && item.printerId.trim() ? item.printerId.trim().slice(0, 64) : null,
      readerId: typeof item.readerId === "string" && item.readerId.trim() ? item.readerId.trim().slice(0, 64) : null,
      hasScanner: Boolean(item.hasScanner),
      includeAssemblyService: Boolean(item.includeAssemblyService),
      customizationNotes:
        typeof item.customizationNotes === "string"
          ? item.customizationNotes.trim().slice(0, 500)
          : "",
      quantity,
    });
  }

  return sanitized;
}

export function serializeCartItemsForShare(items: CartItem[]): SharedCartItemInput[] {
  if (!Array.isArray(items)) return [];

  return items.slice(0, 20).map((item) => {
    const cfg = item.configuration;
    const mon = cfg.monitor || null;
    const isCustomDirect = Boolean(mon?.isCustom || String(mon?.id || "").startsWith("custom-mon-"));
    const isCustomCutout = Boolean(
      mon?.cutoutMonitor?.isCustom || String(mon?.cutoutMonitor?.id || "").startsWith("custom-mon-")
    );
    const customMonitor = isCustomDirect
      ? sanitizeCustomMonitorPayload(mon)
      : isCustomCutout
      ? sanitizeCustomMonitorPayload(mon?.cutoutMonitor || null)
      : null;

    const kitItems: SharedKitSubItemFlag[] | undefined =
      mon && isItemKit(mon) && Array.isArray(mon.kitItems) && mon.kitItems.length > 0
        ? mon.kitItems.map((sub) => ({
            id: String(sub.id),
            ...(sub.name ? { name: sub.name } : {}),
            ...(sub.category ? { category: sub.category } : {}),
            selected: sub.selected !== false,
          }))
        : undefined;

    const qty = Math.max(1, Math.min(100, Math.floor(Number(item.quantity) || 1)));

    return {
      modelId: String(cfg.model.id),
      colorId: String(cfg.color.id),
      monitorId: mon?.id || null,
      cutoutMonitorId: mon?.cutoutMonitor?.id || null,
      cutoutMonitorName: mon?.cutoutMonitor?.displayName || null,
      ...(kitItems ? { kitItems } : {}),
      ...(customMonitor ? { customMonitor } : {}),
      printerId: cfg.printer?.id || null,
      readerId: cfg.barcodeReader?.id || null,
      hasScanner: Boolean(cfg.barcodeReader),
      includeAssemblyService: Boolean(cfg.includeAssemblyService && mon && isItemKit(mon)),
      customizationNotes: (cfg.customizationNotes || "").trim().slice(0, 500),
      quantity: qty,
    };
  });
}

function createUniqueCartItemId(seedIndex: number): string {
  const rand = Math.random().toString(36).substring(2, 8);
  return `totem-${Date.now()}-${seedIndex}-${rand}`;
}

export function hydrateSharedCartFromCatalog(
  rawItems: SharedCartItemInput[],
  catalog: SharedCatalogInput,
  coupon?: SelectiveCoupon | null
): HydratedSharedCartResult {
  const warnings: string[] = [];
  const hydratedItems: CartItem[] = [];

  for (let i = 0; i < rawItems.length; i++) {
    const raw = rawItems[i];
    const model =
      catalog.cabinetModels.find((m) => m.id === raw.modelId || m.slug === raw.modelId) || null;
    if (!model) {
      warnings.push(`Um modelo de gabinete (${raw.modelId}) não está mais disponível no catálogo atual.`);
      continue;
    }

    let color =
      catalog.colors.find((c) => c.id === raw.colorId || c.slug === raw.colorId) || null;
    if (!color) {
      color = catalog.colors[0] || null;
      if (!color) {
        warnings.push(`Nenhuma opção de cor disponível para ${model.name}.`);
        continue;
      }
      warnings.push(`A cor original de ${model.name} foi substituída pela cor padrão ${color.name}.`);
    }

    let resolvedMonitor: MonitorOption | null = null;
    if (raw.monitorId) {
      const catalogMatch = catalog.monitors.find(
        (m) =>
          m.id === raw.monitorId ||
          (raw.kitItems && raw.kitItems.length > 0 && isItemKit(m))
      );
      if (catalogMatch) {
        resolvedMonitor = { ...catalogMatch };
      } else if (String(raw.monitorId).startsWith("custom-mon-") || raw.customMonitor) {
        resolvedMonitor = buildCustomMonitorFromPayload(raw.monitorId, raw.customMonitor);
      } else {
        warnings.push(`O monitor selecionado anteriormente para ${model.name} não está mais ativo.`);
      }
    }

    let resolvedCutoutMonitor: MonitorOption | null = null;
    if (raw.cutoutMonitorId || (resolvedMonitor && isItemKit(resolvedMonitor) && raw.customMonitor)) {
      const cutoutMatch = raw.cutoutMonitorId
        ? catalog.monitors.find((m) => m.id === raw.cutoutMonitorId && !isItemKit(m))
        : undefined;
      if (cutoutMatch) {
        resolvedCutoutMonitor = { ...cutoutMatch };
      } else if (
        (raw.cutoutMonitorId && String(raw.cutoutMonitorId).startsWith("custom-mon-")) ||
        raw.customMonitor
      ) {
        resolvedCutoutMonitor = buildCustomMonitorFromPayload(
          raw.cutoutMonitorId || `custom-mon-${Date.now()}`,
          raw.customMonitor,
          raw.cutoutMonitorName
        );
      } else if (raw.cutoutMonitorId) {
        warnings.push(`O monitor de furação informado em ${model.name} precisará ser revisado.`);
      }
    }

    if (resolvedMonitor && isItemKit(resolvedMonitor)) {
      const mergedKit = mergeServerCatalogKitItems(resolvedMonitor, raw.kitItems);
      resolvedMonitor = {
        ...mergedKit,
        ...(resolvedCutoutMonitor ? { cutoutMonitor: resolvedCutoutMonitor } : {}),
      };
    }

    let resolvedPrinter = raw.printerId
      ? catalog.printers.find((p) => p.id === raw.printerId) || null
      : null;
    if (raw.printerId && !resolvedPrinter) {
      warnings.push(`A impressora configurada em ${model.name} não foi localizada no catálogo atual.`);
    }

    let resolvedReader = raw.readerId
      ? catalog.barcodeReaders.find((r) => r.id === raw.readerId) || null
      : raw.hasScanner
      ? catalog.barcodeReaders[0] || null
      : null;
    if (raw.readerId && !resolvedReader) {
      warnings.push(`O leitor configurado em ${model.name} não foi localizado no catálogo atual.`);
    }

    const quantity = Math.max(1, Math.min(100, Math.floor(Number(raw.quantity) || 1)));
    const isKit = isItemKit(resolvedMonitor);
    const includeAssemblyService = Boolean(raw.includeAssemblyService && isKit);

    const pricing = calculateTotemPrice({
      cabinet: model,
      color,
      monitor: resolvedMonitor,
      printer: resolvedPrinter,
      barcodeReader: resolvedReader,
      includeAssemblyService,
    });

    const configuration: TotemConfiguration = {
      model,
      color,
      monitor: resolvedMonitor,
      printer: resolvedPrinter,
      barcodeReader: resolvedReader,
      customizationNotes: (raw.customizationNotes || "").trim() || undefined,
      calculatedPriceCents: pricing.pixTotalPriceCents,
      includeAssemblyService,
      assemblyServicePriceCents: includeAssemblyService ? 99900 : 0,
    };

    hydratedItems.push({
      id: createUniqueCartItemId(i),
      configuration,
      quantity,
      unitPriceCents: pricing.pixTotalPriceCents,
      subtotalCents: pricing.pixTotalPriceCents * quantity,
    });
  }

  const itemsCount = hydratedItems.reduce((acc, it) => acc + it.quantity, 0);
  const pixSubtotalCents = hydratedItems.reduce((acc, it) => acc + it.subtotalCents, 0);

  const validCoupon = coupon && coupon.active ? coupon : null;
  const discountCalc = calculateSelectiveCouponDiscount(hydratedItems, validCoupon);
  const pixTotalCents = discountCalc.finalSubtotalCents;
  const cardTotalCents = calculateSafeCardChargeCents(pixTotalCents);

  return {
    items: hydratedItems,
    itemsCount,
    pixSubtotalCents,
    eligibleCabinetsSubtotalCents: discountCalc.eligibleCabinetsSubtotalCents,
    ineligibleSubtotalCents: discountCalc.ineligibleSubtotalCents,
    couponDiscountCents: discountCalc.isValid ? discountCalc.discountCents : 0,
    pixTotalCents,
    cardTotalCents,
    unavailableWarnings: warnings,
    coupon: discountCalc.isValid ? validCoupon : null,
  };
}

export function resolveCartConflictDecision(
  currentItems: CartItem[],
  incomingItems: CartItem[],
  decision: "replace" | "merge"
): CartItem[] {
  const stampedIncoming = incomingItems.map((it, idx) => ({
    ...it,
    id: createUniqueCartItemId(idx),
  }));

  if (decision === "replace") {
    return stampedIncoming;
  }

  return [...currentItems, ...stampedIncoming];
}

export function buildSharedWhatsappSummaryText(params: {
  shareUrl: string;
  title?: string;
  items: CartItem[];
  pixTotalCents: number;
  cardTotalCents: number;
  coupon?: SelectiveCoupon | null;
}): string {
  const { shareUrl, title, items, pixTotalCents, cardTotalCents, coupon } = params;
  const cleanTitle = (title || "").trim();

  const itemsLines = items
    .map((item, idx) => {
      const cfg = item.configuration;
      const kitEq = resolveKitEquipmentSummary({
        monitor: cfg.monitor,
        printerName: cfg.printer?.displayName,
        readerName: cfg.barcodeReader?.displayName,
      });
      const monitorText = kitEq.isKit
        ? kitEq.hasMonitorInKit
          ? kitEq.kitMonitorModel
          : cfg.monitor?.cutoutMonitor?.displayName || kitEq.cutoutMonitorName || "Monitor do Cliente"
        : cfg.monitor?.displayName || "Padrão";
      const printerText = kitEq.isKit
        ? kitEq.hasPrinterInKit
          ? "Impressora Térmica 80mm (no Kit)"
          : cfg.printer?.displayName || kitEq.cutoutPrinterName || "Impressora do Cliente"
        : cfg.printer?.displayName || "Padrão";

      return [
        `*${idx + 1}. ${item.quantity}x ${cfg.model.name}* (${cfg.color.name})`,
        `   • ${kitEq.isKit ? `Kit (${kitEq.selectedCount}/${kitEq.totalCount} itens)` : "Apenas Gabinete CNC"}`,
        `   • Monitor: ${monitorText}`,
        `   • Impressora: ${printerText}`,
        ...(cfg.includeAssemblyService ? [`   • + Montagem 100% Pronta de Fábrica`] : []),
      ].join("\n");
    })
    .join("\n\n");

  const card10xInfo = estimateMercadoPago10xFromCardCharge(cardTotalCents);
  const lines = [
    cleanTitle
      ? `🧩 *Montagem Totem Pro: ${cleanTitle}*`
      : `🧩 *Montagem Pronta — Totem Pro (X-Point)*`,
    ``,
    `Deixei esta configuração pronta no carrinho para você só entrar com sua conta, escolher o frete e finalizar:`,
    ``,
    itemsLines,
    ``,
    ...(coupon ? [`🏷️ *Cupom aplicado:* \`${coupon.code}\` (${coupon.discountPercent}% OFF no gabinete)`] : []),
    `⚡ *Total no PIX à vista:* ${formatBRL(pixTotalCents)} *(+ frete do CEP)*`,
    `💳 *No Cartão (1x):* ${formatBRL(cardTotalCents)} _(ou até 10x de ~${formatBRL(card10xInfo.buyer10xInstallmentCents)} • Total ~${formatBRL(card10xInfo.buyer10xTotalCents)} c/ juros do Mercado Pago + frete)_`,
    ``,
    `👉 *Abrir montagem pronta para finalizar:*`,
    shareUrl,
  ];

  return lines.join("\n");
}
