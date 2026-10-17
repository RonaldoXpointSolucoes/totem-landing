import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { calculateTotemPrice } from "@/modules/pricing/pricingEngine";
import { calculateSelectiveCouponDiscount, CouponDiscountCalculation } from "@/modules/pricing/couponEngine";
import { findUserByCoupon, updateWhitelistUser } from "@/lib/auth/whitelistStore";
import { recordVoucherUsage } from "@/lib/vouchers/voucherStore";
import { CampaignTrackingData } from "@/types/voucher";
import { CustomerInfo, DeliveryAddress, OrderDetails, ManufacturingSpec, CartItem } from "@/types/order";
import { saveOrderWithSnapshot, getAppwriteCatalog } from "@/lib/appwrite/server";
import { checkoutStatusToken, createMercadoPagoPayment, requirePaymentConfiguration } from "@/lib/payments/mercadoPago";
import { updateMercadoPagoPayment } from "@/lib/payments/mercadoPagoStore";
import { calculateShippingQuotes } from "@/modules/shipping";
import { findOrCreateCustomerFromCheckout } from "@/lib/customers/customerStore";
import { saveLocalOrder } from "@/lib/orders/orderStore";
import { setCustomerSession } from "@/lib/customers/customerSession";

interface RequestBody {
  paymentMethod?: "pix" | "credit_card";
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
    readerId?: string | null;
    hasScanner?: boolean;
    customizationNotes?: string;
    quantity: number;
  }[];
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { customer, deliveryAddress, items, shippingOptionId } = body;
    const paymentMethod = body.paymentMethod || "pix";
    if (!["pix", "credit_card"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Forma de pagamento inválida." }, { status: 400 });
    }
    try {
      requirePaymentConfiguration();
    } catch {
      return NextResponse.json({ error: "Pagamento temporariamente indisponível. Tente novamente em instantes." }, { status: 503 });
    }

    // 1. Validações preliminares
    if (!customer || !customer.name || !customer.email || !customer.whatsapp) {
      return NextResponse.json(
        { error: "Dados cadastrais incompletos. Informe nome, e-mail e WhatsApp." },
        { status: 400 }
      );
    }

    if (!customer.document || customer.document.replace(/\D/g, "").length !== (customer.personType === "company" ? 14 : 11)) {
      return NextResponse.json(
        { error: "Informe o CPF ou CNPJ do comprador para processar o pagamento." },
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

    // 2. Recálculo Rigoroso dos Preços no Backend (Soberania do Servidor com Catálogo Appwrite)
    let liveCatalog: Awaited<ReturnType<typeof getAppwriteCatalog>> | null = null;
    try {
      liveCatalog = await getAppwriteCatalog();
    } catch {
      liveCatalog = null;
    }

    if (!liveCatalog?.cabinetModels?.length || !liveCatalog.colors?.length) {
      return NextResponse.json({ error: "Catálogo indisponível para confirmar os preços. Tente novamente." }, { status: 503 });
    }
    const catalogCabinets = liveCatalog.cabinetModels;
    const catalogColors = liveCatalog.colors;
    const catalogMonitors = liveCatalog.monitors;
    const catalogPrinters = liveCatalog.printers;
    const catalogReaders = liveCatalog.barcodeReaders;

    let subtotalCents = 0;
    const validatedCartItems: CartItem[] = [];
    const manufacturingSheets: ManufacturingSpec[] = [];

    for (let i = 0; i < items.length; i++) {
      const rawItem = items[i];
      const model =
        catalogCabinets.find((m: any) => m.id === rawItem.modelId || m.slug === rawItem.modelId);
      if (!model) {
        return NextResponse.json(
          { error: `Modelo inválido informado para o item ${i + 1}: ${rawItem.modelId}` },
          { status: 400 }
        );
      }

      const color =
        catalogColors.find((c: any) => c.id === rawItem.colorId || c.slug === rawItem.colorId);
      if (!color) return NextResponse.json({ error: "Acabamento inválido no carrinho." }, { status: 400 });
      const monitor = rawItem.monitorId
        ? catalogMonitors.find((m: any) => m.id === rawItem.monitorId) || null
        : null;
      const printer = rawItem.printerId
        ? catalogPrinters.find((p: any) => p.id === rawItem.printerId) || null
        : null;
      const barcodeReader = rawItem.readerId
        ? catalogReaders.find((r: any) => r.id === rawItem.readerId) || null
        : rawItem.hasScanner
        ? catalogReaders[0]
        : null;
      if ((rawItem.monitorId && !monitor) || (rawItem.printerId && !printer) || (rawItem.readerId && !barcodeReader)) {
        return NextResponse.json({ error: "Equipamento indisponível no catálogo. Revise o carrinho." }, { status: 400 });
      }

      if (!Number.isInteger(rawItem.quantity) || rawItem.quantity < 1 || rawItem.quantity > 100) {
        return NextResponse.json({ error: "Quantidade inválida no carrinho." }, { status: 400 });
      }
      const quantity = rawItem.quantity;

      // Cálculo server-side inegociável
      const pricing = calculateTotemPrice({
        cabinet: model,
        color,
        monitor,
        printer,
        barcodeReader,
      });
      const unitPriceCents = paymentMethod === "credit_card" ? pricing.cardTotalPriceCents : pricing.pixTotalPriceCents;
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
    const randomHex = randomBytes(6).toString("hex").toUpperCase();
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

    if (!selectedShippingInfo) {
      return NextResponse.json({ error: "Selecione uma opção de entrega válida e recalcule o frete." }, { status: 400 });
    }

    const totalCents = subtotalCents + shippingCents;
    if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
      return NextResponse.json({ error: "Valor do pedido inválido." }, { status: 400 });
    }

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
            payoutNotes: "Pedido criado e aguardando confirmação do pagamento para liberação do repasse ao influencer.",
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

    // Persist the immutable price snapshot before contacting the payment provider.
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
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
          provider: "mercadopago",
          method: paymentMethod,
          amountCents: totalCents,
          status: "pending",
          pixCode: "",
          expiresAt,
        },
      });
    } catch (persistErr: any) {
      console.error("Não foi possível persistir o pedido antes do pagamento.");
      return NextResponse.json({ error: "Não foi possível salvar o pedido. Nenhuma cobrança foi iniciada. Tente novamente." }, { status: 503 });
    }

    const payment = await createMercadoPagoPayment({
      orderId: appwriteResult!.orderId, orderNumber, amountCents: totalCents, customer, method: paymentMethod,
    });
    await updateMercadoPagoPayment(appwriteResult!.orderId, {
      pix_code: payment.pixCode, expires_at: payment.expiresAt,
      gateway_payment_id: "gatewayPaymentId" in payment ? payment.gatewayPaymentId : "",
      gateway_preference_id: "gatewayPreferenceId" in payment ? payment.gatewayPreferenceId : "",
      checkout_url: "checkoutUrl" in payment ? payment.checkoutUrl : "",
    });

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
      payment: { ...payment, statusToken: checkoutStatusToken(appwriteResult!.orderId) },
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
      { error: "Não foi possível concluir o pedido. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}
