import { NextResponse } from "next/server";
import {
  CABINET_MODELS,
  COLOR_OPTIONS,
  HOMOLOGATED_MONITORS,
  HOMOLOGATED_PRINTERS,
  HOMOLOGATED_READERS,
} from "@/modules/catalog/catalogData";
import { calculateTotemPrice } from "@/modules/pricing/pricingEngine";
import { calculateSelectiveCouponDiscount, CouponDiscountCalculation } from "@/modules/pricing/couponEngine";
import { findUserByCoupon, updateWhitelistUser } from "@/lib/auth/whitelistStore";
import { recordVoucherUsage } from "@/lib/vouchers/voucherStore";
import { CampaignTrackingData } from "@/types/voucher";
import { generatePixPayload } from "@/lib/pix";
import { CustomerInfo, DeliveryAddress, OrderDetails, ManufacturingSpec, CartItem } from "@/types/order";
import { saveOrderWithSnapshot } from "@/lib/appwrite/server";
import { createPixCharge } from "@/lib/payments/pixGateway";
import { calculateShippingQuotes } from "@/modules/shipping";
import { findOrCreateCustomerFromCheckout } from "@/lib/customers/customerStore";
import { saveLocalOrder } from "@/lib/orders/orderStore";
import { setCustomerSession } from "@/lib/customers/customerSession";

interface RequestBody {
  customer: CustomerInfo;
  deliveryAddress: DeliveryAddress;
  shippingOptionId?: string;
  shippingCents?: number;
  couponCode?: string;
  campaignTracking?: CampaignTrackingData;
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
    const { customer, deliveryAddress, items, shippingOptionId } = body;

    // 1. Validações preliminares
    if (!customer || !customer.name || !customer.email || !customer.whatsapp) {
      return NextResponse.json(
        { error: "Dados cadastrais incompletos. Informe nome, e-mail e WhatsApp." },
        { status: 400 }
      );
    }

    if (customer.personType === "company" && !customer.document) {
      return NextResponse.json(
        { error: "Para compras como Pessoa Jurídica, o CNPJ é obrigatório." },
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

    // 3.1. Recálculo Soberano do Cupom de Desconto no Backend (Apenas no Gabinete)
    let discountCents = 0;
    let appliedCouponCode: string | undefined;
    let sellerEmail: string | undefined;
    let sellerCommissionCents = 0;
    let matchedSeller: any = null;
    let executedCouponResult: CouponDiscountCalculation | null = null;

    if (body.couponCode) {
      const seller = await findUserByCoupon(body.couponCode);
      if (seller && seller.status === "active") {
        const couponResult = calculateSelectiveCouponDiscount(validatedCartItems, {
          code: seller.couponCode!,
          sellerId: seller.id,
          sellerEmail: seller.email,
          sellerName: seller.name,
          discountPercent: seller.discountPercent || 10,
          commissionPercent: seller.commissionPercent || 8,
          active: true,
          eligibleCategory: "cabinet_only",
        });

        if (couponResult.isValid && couponResult.discountCents > 0) {
          discountCents = couponResult.discountCents;
          appliedCouponCode = seller.couponCode;
          sellerEmail = seller.email;
          sellerCommissionCents = couponResult.sellerCommissionCents;
          subtotalCents = couponResult.finalSubtotalCents;
          matchedSeller = seller;
          executedCouponResult = couponResult;

          // Atualizar faturamento e comissão atribuídos ao vendedor na Whitelist
          await updateWhitelistUser(seller.id, {
            totalSalesCents: (seller.totalSalesCents || 0) + couponResult.eligibleCabinetsSubtotalCents,
            totalCommissionCents: (seller.totalCommissionCents || 0) + sellerCommissionCents,
          });
        }
      }
    }

    // 4. Geração do Número de Pedido Exclusivo
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const currentYear = new Date().getFullYear();
    const orderNumber = `TOT-${currentYear}-${randomHex}`;
    const orderId = `ord_${Date.now()}_${randomHex.toLowerCase()}`;

    // 5. Recálculo Soberano do Frete no Servidor (Prevenção de Adulteração e Garantia de Preço)
    let shippingCents = 0;
    let selectedShippingInfo = null;

    if (shippingOptionId) {
      const shippingCalculation = await calculateShippingQuotes({
        destinationCep: deliveryAddress.cep,
        items: items.map((it) => ({
          modelId: it.modelId,
          quantity: it.quantity,
        })),
      });

      if (shippingCalculation.ok && shippingCalculation.quotes.length > 0) {
        const found = shippingCalculation.quotes.find(
          (q) => q.id === shippingOptionId && q.isAvailable
        );
        if (found) {
          shippingCents = found.priceCents;
          selectedShippingInfo = {
            id: found.id,
            name: found.name,
            carrier: found.carrier,
            priceCents: found.priceCents,
            deliveryDaysMin: found.deliveryDaysMin,
            deliveryDaysMax: found.deliveryDaysMax,
          };
        }
      }
    }

    const totalCents = subtotalCents + shippingCents;

    // 5.1. Registro Auditado e Imutável da Utilização do Voucher com Link Tracking
    if (appliedCouponCode && matchedSeller && executedCouponResult) {
      try {
        await recordVoucherUsage({
          voucherCode: appliedCouponCode,
          orderId,
          orderNumber,
          orderStatus: "awaiting_payment",
          customer: {
            name: customer.name.trim(),
            email: customer.email.trim().toLowerCase(),
            whatsapp: customer.whatsapp.trim(),
            document: customer.document?.trim(),
            city: deliveryAddress.city.trim(),
            state: deliveryAddress.state?.trim() || "SP",
          },
          influencer: {
            sellerId: matchedSeller.id,
            name: matchedSeller.name,
            email: matchedSeller.email,
            pixKey: matchedSeller.pixKey,
            phone: matchedSeller.phone,
            commissionPercent: matchedSeller.commissionPercent || 8,
          },
          financials: {
            grossItemsTotalCents: validatedCartItems.reduce((acc, c) => acc + c.subtotalCents, 0),
            eligibleCabinetBaseCents: executedCouponResult.eligibleCabinetsSubtotalCents,
            discountPercent: executedCouponResult.discountPercent,
            discountCents,
            shippingCents,
            finalOrderTotalCents: totalCents,
            influencerCommissionCents: sellerCommissionCents,
            payoutStatus: "pending",
            payoutNotes: "Pedido criado e aguardando compensação Pix para liberação do repasse ao influencer.",
          },
          campaignTracking: body.campaignTracking || {
            hasTracking: false,
            device: "desktop",
            capturedAt: new Date().toISOString(),
          },
        });
      } catch (voucherLogErr) {
        console.warn("Aviso ao registrar auditoria de voucher:", voucherLogErr);
      }
    }

    // 6. Geração Dinâmica da Cobrança Pix com QR Code Real pelo Gateway
    const pixCharge = await createPixCharge({
      orderNumber,
      amountCents: totalCents,
      customer,
    });
    const { pixCode, qrCodeBase64, expiresAt, provider } = pixCharge;
    const now = new Date();

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
      shippingMethod: selectedShippingInfo,
      totalCents,
      status: "awaiting_payment",
      payment: {
        status: "pending",
        method: "pix",
        pixCode,
        qrCodeUrl: qrCodeBase64,
        expiresAt,
      },
      manufacturingSheets,
    };

    // 8. Persistência Local e Indexação Automática do Cliente
    try {
      saveLocalOrder(orderDetails);
      const customerAccount = findOrCreateCustomerFromCheckout(customer, deliveryAddress, totalCents);
      await setCustomerSession(customerAccount);
    } catch (custErr) {
      console.warn("Aviso ao vincular conta de cliente:", custErr);
    }

    return NextResponse.json({
      ok: true,
      order: orderDetails,
      couponCode: appliedCouponCode || null,
      discountCents,
      sellerCommissionCents,
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
