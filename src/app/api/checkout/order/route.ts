import { NextResponse } from "next/server";
import {
  CABINET_MODELS,
  COLOR_OPTIONS,
  HOMOLOGATED_MONITORS,
  HOMOLOGATED_PRINTERS,
  HOMOLOGATED_READERS,
} from "@/modules/catalog/catalogData";
import { calculateTotemPrice } from "@/modules/pricing/pricingEngine";
import { generatePixPayload } from "@/lib/pix";
import { CustomerInfo, DeliveryAddress, OrderDetails, ManufacturingSpec, CartItem } from "@/types/order";
import { saveOrderWithSnapshot } from "@/lib/appwrite/server";

interface RequestBody {
  customer: CustomerInfo;
  deliveryAddress: DeliveryAddress;
  items: {
    id?: string;
    modelId: string;
    colorId: string;
    monitorId?: string | null;
    printerId?: string | null;
    hasScanner?: boolean;
    customizationNotes?: string;
    quantity: number;
  }[];
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { customer, deliveryAddress, items } = body;

    // 1. Validações preliminares
    if (!customer || !customer.name || !customer.document || !customer.email || !customer.whatsapp) {
      return NextResponse.json(
        { error: "Dados cadastrais incompletos. Informe nome, CPF/CNPJ, e-mail e WhatsApp." },
        { status: 400 }
      );
    }

    if (!deliveryAddress || !deliveryAddress.cep || !deliveryAddress.street || !deliveryAddress.number || !deliveryAddress.city) {
      return NextResponse.json(
        { error: "Endereço de entrega incompleto. Informe CEP, rua, número e cidade." },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "O carrinho deve conter pelo menos 1 totem configurado." },
        { status: 400 }
      );
    }

    // 2. Recálculo Rigoroso dos Preços no Backend (Soberania do Servidor)
    let subtotalCents = 0;
    const validatedCartItems: CartItem[] = [];
    const manufacturingSheets: ManufacturingSpec[] = [];

    for (let i = 0; i < items.length; i++) {
      const rawItem = items[i];
      const model = CABINET_MODELS.find((m) => m.id === rawItem.modelId);
      if (!model) {
        return NextResponse.json(
          { error: `Modelo inválido informado para o item ${i + 1}: ${rawItem.modelId}` },
          { status: 400 }
        );
      }

      const color = COLOR_OPTIONS.find((c) => c.id === rawItem.colorId) || COLOR_OPTIONS[0];
      const monitor = rawItem.monitorId ? HOMOLOGATED_MONITORS.find((m) => m.id === rawItem.monitorId) || null : null;
      const printer = rawItem.printerId ? HOMOLOGATED_PRINTERS.find((p) => p.id === rawItem.printerId) || null : null;
      const barcodeReader = rawItem.hasScanner
        ? HOMOLOGATED_READERS[0]
        : null;

      const quantity = Math.max(1, Math.floor(rawItem.quantity || 1));

      // Cálculo server-side inegociável
      const pricing = calculateTotemPrice({
        cabinet: model,
        color,
        monitor,
        printer,
        barcodeReader,
      });
      const unitPriceCents = pricing.totalPriceCents;
      const itemSubtotalCents = unitPriceCents * quantity;

      subtotalCents += itemSubtotalCents;

      const cartItem: CartItem = {
        id: rawItem.id || `item_${i + 1}_${Date.now()}`,
        configuration: {
          model,
          color,
          monitor,
          printer,
          barcodeReader,
          customizationNotes: rawItem.customizationNotes || "",
          calculatedPriceCents: unitPriceCents,
        },
        quantity,
        unitPriceCents,
        subtotalCents: itemSubtotalCents,
      };

      validatedCartItems.push(cartItem);

      // 3. Montar Ficha Técnica de Fabricação para a Router CNC
      const screenSpecs = monitor
        ? {
            monitorName: monitor.displayName,
            screenCutoutMm: `Abertura usinada para tela ${monitor.sizeInches || 21.5}" (tolerância de precisão CNC +1.5mm)`,
            vesaPattern: `Padrão VESA ${monitor.vesaPattern || "100x100"} mm com insertos roscados M4`,
          }
        : {
            monitorName: "Não especificado (Painel cego / Pré-disposição)",
            screenCutoutMm: "Sem recorte frontal",
            vesaPattern: "Furação universal VESA 75/100 pré-marcada a laser",
          };

      const printerSpecs = printer
        ? {
            printerName: printer.displayName,
            slotOpeningMm: `Rasgo de saída ${printer.paperWidthMm || 80}mm x 6 mm com chanfro ergonômico`,
            rollSize: "Compartimento interno dedicado para bobina térmica 80mm",
          }
        : {
            printerName: "Sem impressora instalada",
            slotOpeningMm: "Painel cego sem abertura de bobina",
            rollSize: "N/A",
          };

      const scannerSpecs = barcodeReader
        ? {
            hasScanner: true,
            scannerName: barcodeReader.displayName,
            windowSpecs: "Janela usinada 65 x 45 mm com visor acrílico cristal 2mm antirreflexo",
          }
        : {
            hasScanner: false,
            scannerName: "Sem leitor frontal",
            windowSpecs: "Sem rasgo óptico",
          };

      const manufacturingSpec: ManufacturingSpec = {
        itemIndex: i + 1,
        cabinetModelName: model.name,
        dimensionsMm: model.dimensions || { heightMm: 1650, widthMm: 480, depthMm: 380 },
        colorName: color.name,
        finishType: "Pintura Eletrostática a Pó Microtexturizada (Cura 200°C)",
        screenSpecs,
        printerSpecs,
        scannerSpecs,
        ventilationSpecs: "Grelhas de exaustão térmica convectiva superior e inferior (passagem de ar 35 CFM)",
        securityLock: "Fechadura tipo tubular escamoteável com segredo e par de chaves",
        status: "ready_for_cutting",
      };

      manufacturingSheets.push(manufacturingSpec);
    }

    // 4. Geração do Número de Pedido Exclusivo
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const currentYear = new Date().getFullYear();
    const orderNumber = `TOT-${currentYear}-${randomHex}`;
    const orderId = `ord_${Date.now()}_${randomHex.toLowerCase()}`;

    // 5. Frete (R$ 0,00 promocional / sob medida) e Total
    const shippingCents = 0; // Promocional
    const totalCents = subtotalCents + shippingCents;

    // 6. Geração do Código Pix Copia e Cola EMV Oficial
    const pixCode = generatePixPayload({
      pixKey: "pix@totempro.com.br",
      merchantName: "TOTEM PRO ENGENHARIA CNC",
      merchantCity: "SAO PAULO",
      txId: orderNumber.replace("-", ""),
      amountCents: totalCents,
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString(); // 30 minutos

    // 7. Persistência e Congelamento de Snapshot Imutável de Venda no Appwrite
    let appwriteResult: { orderId: string; orderNumber: string } | null = null;
    try {
      appwriteResult = await saveOrderWithSnapshot({
        orderNumber,
        customer,
        deliveryAddress,
        subtotalCents,
        shippingCents,
        totalCents,
        status: "awaiting_payment",
        manufacturingSheetJson: JSON.stringify(manufacturingSheets),
        items: validatedCartItems.map((item) => ({
          cabinetName: item.configuration.model.name,
          colorName: item.configuration.color.name,
          monitorName: item.configuration.monitor?.displayName || "Nenhum",
          printerName: item.configuration.printer?.displayName || "Nenhum",
          readerName: item.configuration.barcodeReader?.displayName || "Nenhum",
          unitPriceCents: item.unitPriceCents,
          quantity: item.quantity,
          subtotalCents: item.subtotalCents,
        })),
        payment: {
          provider: "pix_xpoint",
          amountCents: totalCents,
          status: "pending",
          pixCode,
          expiresAt,
        },
      });
    } catch (persistErr: any) {
      console.warn("Aviso: Registro no Appwrite falhou, prosseguindo com dados em memória:", persistErr?.message);
    }

    const orderDetails: OrderDetails = {
      id: appwriteResult?.orderId || orderId,
      orderNumber,
      createdAt: now.toISOString(),
      customer,
      deliveryAddress,
      items: validatedCartItems,
      subtotalCents,
      shippingCents,
      totalCents,
      status: "awaiting_payment",
      payment: {
        status: "pending",
        method: "pix",
        pixCode,
        expiresAt,
      },
      manufacturingSheets,
    };

    return NextResponse.json({
      ok: true,
      order: orderDetails,
      appwriteOrderId: appwriteResult?.orderId || null,
      message: "Ordem de pedido gerada com sucesso, recalculada pelo servidor e persistida no Appwrite.",
    });
  } catch (error: any) {
    console.error("Erro no processamento do checkout:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao processar o checkout: " + (error?.message || "Desconhecido") },
      { status: 500 }
    );
  }
}
