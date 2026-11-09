"use client";

import React, { useState, useEffect } from "react";
import {
  Printer,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Settings,
  RefreshCw,
  X,
  Plus,
  Trash2,
  FileText,
  Send,
  Zap,
  ShieldCheck,
  MapPin,
  Copy,
  Check,
} from "lucide-react";

interface CorreiosContentItem {
  conteudo: string;
  quantidade: number;
  valorReais: number;
}

interface CorreiosVolumeSpec {
  volumeIndex: number;
  totalVolumes: number;
  label: string;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
  weightGrams: number;
  declaredValueReais: number;
  trackingCode?: string;
  prepostagemId?: string;
  plpNumber?: string;
  status?: "draft" | "cws_registered" | "simplified_ready" | "posted";
  cwsMessage?: string;
  contentItems: CorreiosContentItem[];
}

interface CorreiosShipmentRecord {
  orderId: string;
  orderNumber: string;
  serviceCode: string;
  serviceName: string;
  contractNumber: string;
  postcardNumber: string;
  agency: string;
  mode: "cws_live" | "simplified";
  invoiceNumber?: string;
  invoiceKey?: string;
  observations?: string;
  sender: {
    name: string;
    cnpj: string;
    phone: string;
    email: string;
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  recipient: {
    name: string;
    document: string;
    phone: string;
    email: string;
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  volumes: CorreiosVolumeSpec[];
  officialLabelPdfBase64?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CorreiosLabelModalProps {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  onLabelSaved?: (shipment: CorreiosShipmentRecord) => void;
}

/**
 * Gerador determinístico de barras padrão Code-128B (SVG puro, escaneável por leitores ópticos)
 */
const CODE128B_PATTERNS = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","2331112"
];

function encodeCode128B(text: string): string {
  const clean = text.replace(/[^\x20-\x7E]/g, "").trim() || "00000000";
  const codes: number[] = [104]; // Start Code B
  let checksum = 104;

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    const safeCode = code >= 0 && code < 95 ? code : 0;
    codes.push(safeCode);
    checksum += safeCode * (i + 1);
  }

  codes.push(checksum % 103);
  codes.push(106); // Stop

  return codes.map((c) => CODE128B_PATTERNS[c] || "212222").join("");
}

function buildBarcodeSvgMarkup(value: string, height = 54): string {
  const pattern = encodeCode128B(value);
  let x = 0;
  const rects: string[] = [];

  for (let i = 0; i < pattern.length; i++) {
    const width = parseInt(pattern[i], 10) * 1.6;
    if (i % 2 === 0) {
      rects.push(`<rect x="${x.toFixed(1)}" y="0" width="${width.toFixed(1)}" height="${height}" fill="#000" />`);
    }
    x += width;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x.toFixed(1)} ${height}" width="100%" height="${height}" preserveAspectRatio="none">${rects.join("")}</svg>`;
}

function formatCepMask(cep: string): string {
  const d = (cep || "").replace(/\D/g, "");
  if (d.length === 8) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return cep || "00000-000";
}

function formatDocMask(doc: string): string {
  const d = (doc || "").replace(/\D/g, "");
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  return doc || "Não informado";
}

export default function CorreiosLabelModal({
  orderId,
  orderNumber,
  onClose,
  onLabelSaved,
}: CorreiosLabelModalProps) {
  const [loading, setLoading] = useState(true);
  const [submittingMode, setSubmittingMode] = useState<"cws_live" | "simplified" | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingCws, setTestingCws] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "warn" | "error"; text: string } | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  // Configurações do Contrato Correios
  const [contractConfig, setContractConfig] = useState({
    senderName: "X-Point Soluções Tecnológicas Ltda",
    cnpj: "11040282000177",
    contractNumber: "9912722993",
    postcardNumber: "0079659128",
    agency: "AC TABOAO DA SERRA - SE/SPM (00024489)",
    sedexServiceCode: "03220",
    pacServiceCode: "03298",
    senderPhone: "11991649959",
    senderEmail: "contato@xpointsolucoes.com.br",
    senderAddress: {
      cep: "06754000",
      street: "Av. Industrial",
      number: "04",
      complement: "Galpão 04 - X-Point Engenharia",
      neighborhood: "Parque Industrial",
      city: "Taboão da Serra",
      state: "SP",
    },
    cwsUser: "11040282000177",
    cwsPassword: "",
    hasCwsPassword: false,
  });

  // Dados da Pré-Postagem / Etiqueta
  const [serviceCode, setServiceCode] = useState("03220");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceKey, setInvoiceKey] = useState("");
  const [observations, setObservations] = useState("");
  const [recipient, setRecipient] = useState({
    name: "",
    document: "",
    phone: "",
    email: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "SP",
  });
  const [volumes, setVolumes] = useState<CorreiosVolumeSpec[]>([]);
  const [generatedShipment, setGeneratedShipment] = useState<CorreiosShipmentRecord | null>(null);
  const [includeDeclarationInPrint, setIncludeDeclarationInPrint] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadInitial() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/orders/${orderId}/correios-label`);
        const json = await res.json();
        if (!active) return;

        if (json.ok) {
          if (json.contractConfig) {
            setContractConfig((prev) => ({
              ...prev,
              ...json.contractConfig,
              senderAddress: {
                ...prev.senderAddress,
                ...(json.contractConfig.senderAddress || {}),
              },
            }));
          }
          if (json.defaultDraft) {
            setServiceCode(json.defaultDraft.serviceCode || "03220");
            setInvoiceNumber(json.defaultDraft.invoiceNumber || "");
            setInvoiceKey(json.defaultDraft.invoiceKey || "");
            setObservations(json.defaultDraft.observations || `Pedido #${orderNumber}`);
            if (json.defaultDraft.recipient) {
              setRecipient((prev) => ({ ...prev, ...json.defaultDraft.recipient }));
            }
            if (Array.isArray(json.defaultDraft.volumes)) {
              setVolumes(json.defaultDraft.volumes);
            }
          }
          if (json.existingShipment) {
            setGeneratedShipment(json.existingShipment);
          }
        } else {
          setFeedback({ type: "error", text: json.error || "Não foi possível carregar dados do pedido." });
        }
      } catch (err: any) {
        if (active) {
          setFeedback({ type: "error", text: "Erro ao carregar dados da etiqueta: " + err?.message });
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadInitial();
    return () => {
      active = false;
    };
  }, [orderId, orderNumber]);

  const handleSaveContractConfig = async () => {
    setSavingConfig(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/correios-label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_config",
          config: contractConfig,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        if (json.contractConfig) {
          setContractConfig((prev) => ({ ...prev, ...json.contractConfig }));
        }
        setFeedback({
          type: json.authCheck && !json.authCheck.ok ? "warn" : "success",
          text: json.authCheck && !json.authCheck.ok
            ? `Dados salvos! Aviso CWS: ${json.authCheck.error}`
            : json.message || "Configurações do Contrato Correios salvas!",
        });
      } else {
        setFeedback({ type: "error", text: json.error || "Falha ao salvar configurações." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: "Erro de rede: " + err?.message });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestCwsConnection = async () => {
    setTestingCws(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/correios-label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_cws_connection",
          config: contractConfig,
        }),
      });
      const json = await res.json();
      setFeedback({
        type: json.ok ? "success" : "warn",
        text: json.message || json.error || "Teste concluído.",
      });
    } catch (err: any) {
      setFeedback({ type: "error", text: "Erro ao testar conexão CWS: " + err?.message });
    } finally {
      setTestingCws(false);
    }
  };

  const handleApplyVolumePreset = (
    idx: number,
    preset: "balcao_16kg" | "parede_16kg" | "kit_balcao_22kg" | "kit_completo_26kg"
  ) => {
    setVolumes((prev) =>
      prev.map((v, i) => {
        if (i !== idx) return v;
        if (preset === "balcao_16kg") {
          return { ...v, lengthCm: 68, widthCm: 65, heightCm: 23, weightGrams: 16000 };
        }
        if (preset === "parede_16kg") {
          return { ...v, lengthCm: 90, widthCm: 45, heightCm: 20, weightGrams: 16000 };
        }
        if (preset === "kit_balcao_22kg") {
          return { ...v, lengthCm: 68, widthCm: 65, heightCm: 23, weightGrams: 22000 };
        }
        return { ...v, lengthCm: 96, widthCm: 45, heightCm: 42, weightGrams: 26000 };
      })
    );
  };

  const handleAddVolume = () => {
    setVolumes((prev) => {
      const nextTotal = prev.length + 1;
      const base = prev[prev.length - 1] || {
        label: "Gabinete Autoatendimento Totem Pro",
        lengthCm: 68,
        widthCm: 65,
        heightCm: 23,
        weightGrams: 16000,
        declaredValueReais: 1240,
        contentItems: [{ conteudo: "Gabinete Autoatendimento Totem Pro", quantidade: 1, valorReais: 1240 }],
      };
      const updated = prev.map((v, i) => ({ ...v, volumeIndex: i + 1, totalVolumes: nextTotal }));
      return [
        ...updated,
        {
          ...base,
          volumeIndex: nextTotal,
          totalVolumes: nextTotal,
          trackingCode: "",
          prepostagemId: undefined,
          status: "draft",
        },
      ];
    });
  };

  const handleRemoveVolume = (idx: number) => {
    if (volumes.length <= 1) return;
    setVolumes((prev) => {
      const filtered = prev.filter((_, i) => i !== idx);
      return filtered.map((v, i) => ({
        ...v,
        volumeIndex: i + 1,
        totalVolumes: filtered.length,
      }));
    });
  };

  const handleGenerateLabel = async (mode: "cws_live" | "simplified") => {
    if (!recipient.cep || recipient.cep.replace(/\D/g, "").length < 8) {
      setFeedback({
        type: "error",
        text: "Por favor, informe um CEP de destino válido (8 dígitos) antes de gerar a etiqueta.",
      });
      return;
    }
    if (!recipient.street || !recipient.city) {
      setFeedback({
        type: "error",
        text: "Por favor, preencha o logradouro e a cidade do destinatário.",
      });
      return;
    }

    setSubmittingMode(mode);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/correios-label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_label",
          mode,
          serviceCode,
          invoiceNumber,
          invoiceKey,
          observations,
          recipient,
          volumes,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setFeedback({
          type: "error",
          text: json.error || "Não foi possível gerar a etiqueta Correios.",
        });
        return;
      }

      setGeneratedShipment(json.shipment);
      if (Array.isArray(json.shipment?.volumes)) {
        setVolumes(json.shipment.volumes);
      }

      setFeedback({
        type: json.fallbackReason ? "warn" : "success",
        text: json.message,
      });

      if (onLabelSaved && json.shipment) {
        onLabelSaved(json.shipment);
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: "Erro de comunicação ao gerar etiqueta: " + err?.message,
      });
    } finally {
      setSubmittingMode(null);
    }
  };

  /**
   * Abre janela de impressão otimizada (Etiqueta Térmica 100x150mm ou A4 + Declaração de Conteúdo)
   */
  const handlePrintLabels = (format: "thermal_100x150" | "a4_full", shipmentToPrint?: CorreiosShipmentRecord) => {
    const activeShipment: CorreiosShipmentRecord = shipmentToPrint ||
      generatedShipment || {
        orderId,
        orderNumber,
        serviceCode,
        serviceName: serviceCode === "03298" ? "PAC CONTRATO AG" : "SEDEX CONTRATO AG",
        contractNumber: contractConfig.contractNumber,
        postcardNumber: contractConfig.postcardNumber,
        agency: contractConfig.agency,
        mode: "simplified",
        invoiceNumber,
        invoiceKey,
        observations,
        sender: {
          name: contractConfig.senderName,
          cnpj: contractConfig.cnpj,
          phone: contractConfig.senderPhone,
          email: contractConfig.senderEmail,
          cep: contractConfig.senderAddress.cep,
          street: contractConfig.senderAddress.street,
          number: contractConfig.senderAddress.number,
          complement: contractConfig.senderAddress.complement,
          neighborhood: contractConfig.senderAddress.neighborhood,
          city: contractConfig.senderAddress.city,
          state: contractConfig.senderAddress.state,
        },
        recipient,
        volumes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

    const isSedex = activeShipment.serviceCode !== "03298";
    const serviceShort = isSedex ? "SEDEX" : "PAC";

    const labelsHtml = activeShipment.volumes
      .map((vol, idx) => {
        const tracking =
          vol.trackingCode ||
          `${isSedex ? "AD" : "AP"}${orderNumber.replace(/\D/g, "").slice(-6).padStart(6, "8")}${idx + 1}00BR`;
        const trackingBarcodeSvg = buildBarcodeSvgMarkup(tracking, 58);
        const cepDestClean = (activeShipment.recipient.cep || "00000000").replace(/\D/g, "").padEnd(8, "0");
        const cepBarcodeSvg = buildBarcodeSvgMarkup(cepDestClean, 44);
        const weightKg = (Number(vol.weightGrams || 16000) / 1000).toFixed(2);
        const insuranceCode = isSedex ? "019 - VD" : "064 - VDS";

        const labelCard = `
          <div class="correios-label-sheet ${format === "thermal_100x150" ? "page-break" : ""}">
            <!-- Cabeçalho Contrato Correios -->
            <div class="label-header">
              <div class="correios-brand">
                <div class="correios-title">CORREIOS • CONTRATO AG</div>
                <div class="contract-meta">
                  Contrato: <strong>${activeShipment.contractNumber}</strong><br/>
                  Cartão Postagem: <strong>${activeShipment.postcardNumber}</strong><br/>
                  Agência: ${activeShipment.agency.split(" (")[0]}
                </div>
              </div>
              <div class="service-stamp ${isSedex ? "stamp-sedex" : "stamp-pac"}">
                <div class="service-type">${serviceShort}</div>
                <div class="service-code">Cód. ${activeShipment.serviceCode}</div>
                <div class="volume-badge">VOL ${idx + 1}/${activeShipment.volumes.length}</div>
              </div>
            </div>

            <!-- Linha NF / Pedido / Peso / Dimensões / Valor Declarado -->
            <div class="metrics-bar">
              <div><strong>Pedido:</strong> #${activeShipment.orderNumber}</div>
              <div><strong>NF:</strong> ${activeShipment.invoiceNumber || "Decl. Conteúdo"}</div>
              <div><strong>Peso:</strong> ${weightKg} kg</div>
              <div><strong>Dim (CxLxA):</strong> ${vol.lengthCm}x${vol.widthCm}x${vol.heightCm}cm</div>
              <div><strong>Seguro (${insuranceCode}):</strong> R$ ${Number(vol.declaredValueReais || 0).toFixed(2)}</div>
            </div>

            <!-- Código de Rastreio / Pré-Postagem -->
            <div class="tracking-section">
              <div class="tracking-number">${tracking}</div>
              <div class="tracking-barcode">${trackingBarcodeSvg}</div>
              <div class="Signature-line">
                <span>Recebedor: __________________________________________</span>
                <span>Assinatura: ______________________ Documento: _______________</span>
              </div>
            </div>

            <!-- Bloco DESTINATÁRIO -->
            <div class="recipient-section">
              <div class="recipient-tag">DESTINATÁRIO</div>
              <div class="recipient-body">
                <div class="recipient-info">
                  <div class="recipient-name">${activeShipment.recipient.name}</div>
                  <div class="recipient-doc">CPF/CNPJ: ${formatDocMask(activeShipment.recipient.document)} ${
                    activeShipment.recipient.phone ? `• Tel: ${activeShipment.recipient.phone}` : ""
                  }</div>
                  <div class="recipient-addr">
                    ${activeShipment.recipient.street}, nº ${activeShipment.recipient.number || "S/N"}
                    ${activeShipment.recipient.complement ? ` - ${activeShipment.recipient.complement}` : ""}
                  </div>
                  <div class="recipient-neigh">Bairro: ${activeShipment.recipient.neighborhood || "Centro"}</div>
                  <div class="recipient-city">
                    <span class="cep-highlight">${formatCepMask(activeShipment.recipient.cep)}</span>
                    &nbsp;—&nbsp;<strong>${activeShipment.recipient.city} / ${activeShipment.recipient.state}</strong>
                  </div>
                  ${
                    activeShipment.observations
                      ? `<div class="recipient-obs">Obs: ${activeShipment.observations} | Item: ${vol.label}</div>`
                      : `<div class="recipient-obs">Conteúdo: ${vol.label}</div>`
                  }
                </div>
                <div class="cep-barcode-box">
                  <div class="cep-barcode-title">CEP DESTINO: ${cepDestClean}</div>
                  ${cepBarcodeSvg}
                </div>
              </div>
            </div>

            <!-- Bloco REMETENTE -->
            <div class="sender-section">
              <div>
                <strong>REMETENTE:</strong> ${activeShipment.sender.name} • CNPJ: ${formatDocMask(activeShipment.sender.cnpj)}<br/>
                ${activeShipment.sender.street}, ${activeShipment.sender.number} (${
                  activeShipment.sender.complement || ""
                }) - ${activeShipment.sender.neighborhood}<br/>
                <strong>CEP: ${formatCepMask(activeShipment.sender.cep)}</strong> — ${activeShipment.sender.city}/${
                  activeShipment.sender.state
                } • Tel: ${activeShipment.sender.phone}
              </div>
            </div>
          </div>
        `;

        const declarationCard =
          format === "a4_full" || includeDeclarationInPrint
            ? `
          <div class="declaration-sheet page-break">
            <div class="decl-title">DECLARAÇÃO DE CONTEÚDO — CORREIOS (CONTRATO ${activeShipment.contractNumber})</div>
            <div class="decl-subtitle">
              Pedido #${activeShipment.orderNumber} • Objeto: <strong>${tracking}</strong> • Volume ${idx + 1} de ${
                activeShipment.volumes.length
              } • Modalidade: ${activeShipment.serviceName} (${activeShipment.serviceCode})
            </div>
            <div class="decl-grid">
              <div class="decl-box">
                <div class="decl-box-header">REMETENTE</div>
                <p><strong>Nome/Razão Social:</strong> ${activeShipment.sender.name}</p>
                <p><strong>CPF/CNPJ:</strong> ${formatDocMask(activeShipment.sender.cnpj)}</p>
                <p><strong>Endereço:</strong> ${activeShipment.sender.street}, ${activeShipment.sender.number} ${
                  activeShipment.sender.complement || ""
                } - ${activeShipment.sender.neighborhood}</p>
                <p><strong>Cidade/UF:</strong> ${activeShipment.sender.city}/${activeShipment.sender.state} • <strong>CEP:</strong> ${formatCepMask(
                  activeShipment.sender.cep
                )}</p>
              </div>
              <div class="decl-box">
                <div class="decl-box-header">DESTINATÁRIO</div>
                <p><strong>Nome/Razão Social:</strong> ${activeShipment.recipient.name}</p>
                <p><strong>CPF/CNPJ:</strong> ${formatDocMask(activeShipment.recipient.document)}</p>
                <p><strong>Endereço:</strong> ${activeShipment.recipient.street}, nº ${
                  activeShipment.recipient.number || "S/N"
                } ${activeShipment.recipient.complement || ""} - ${activeShipment.recipient.neighborhood}</p>
                <p><strong>Cidade/UF:</strong> ${activeShipment.recipient.city}/${activeShipment.recipient.state} • <strong>CEP:</strong> ${formatCepMask(
                  activeShipment.recipient.cep
                )}</p>
              </div>
            </div>
            <table class="decl-table">
              <thead>
                <tr>
                  <th>ITEM</th>
                  <th>CONTEÚDO / ESPECIFICAÇÃO TÉCNICA</th>
                  <th>QTD</th>
                  <th>PESO (KG)</th>
                  <th>VALOR (R$)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>01</td>
                  <td>${vol.label} (Pedido #${activeShipment.orderNumber})</td>
                  <td>1</td>
                  <td>${weightKg} kg</td>
                  <td>R$ ${Number(vol.declaredValueReais || 0).toFixed(2)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2"><strong>TOTAIS DO VOLUME ${idx + 1}/${activeShipment.volumes.length}</strong></td>
                  <td><strong>1</strong></td>
                  <td><strong>${weightKg} kg</strong></td>
                  <td><strong>R$ ${Number(vol.declaredValueReais || 0).toFixed(2)}</strong></td>
                </tr>
              </tfoot>
            </table>
            <div class="decl-legal">
              Declaro que não me enquadro no conceito de contribuinte previsto no art. 4º da Lei Complementar nº 87/1996, uma vez que não realizo, com habitualidade ou em volume que caracterize intuito comercial, operações de circulação de mercadoria, ainda que se iniciem no exterior, ou estou dispensado da emissão da nota fiscal por força da legislação tributária vigente, responsabilizando-me, nos termos da lei e sob as penas legais, por informações inverídicas.<br/>
              Declaro ainda que não estou postando conteúdo inflamável, explosivo, causador de combustão espontânea, tóxico, corrosivo, gás ou qualquer outro conteúdo que constitua perigo, conforme o art. 13 da Lei Postal nº 6.538/78.
            </div>
            <div class="decl-sign">
              <div>${activeShipment.sender.city}/${activeShipment.sender.state}, ${new Date().toLocaleDateString("pt-BR")}</div>
              <div>_______________________________________________________<br/>Assinatura do Declarante / Remetente (${activeShipment.sender.name})</div>
            </div>
          </div>
        `
            : "";

        return labelCard + declarationCard;
      })
      .join("\n");

    const printWindow = window.open("", "_blank", "width=960,height=820");
    if (!printWindow) {
      alert("Permita pop-ups no navegador para abrir a tela de impressão da etiqueta.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Etiqueta Correios - Pedido #${activeShipment.orderNumber}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; }
          body { background: #f1f5f9; color: #000; padding: 16px; }
          .print-toolbar {
            max-width: 820px; margin: 0 auto 16px auto; background: #0f172a; color: #fff;
            padding: 12px 18px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between;
          }
          .print-toolbar button {
            background: #facc15; color: #0f172a; border: none; padding: 10px 18px;
            font-weight: 900; border-radius: 8px; cursor: pointer; font-size: 14px;
          }
          .correios-label-sheet {
            width: 100mm; min-height: 145mm; background: #fff; border: 2px solid #000;
            margin: 0 auto 16px auto; padding: 3.5mm; display: flex; flex-direction: column; justify-content: space-between;
          }
          .label-header {
            display: flex; justify-content: space-between; align-items: stretch;
            border-bottom: 2px solid #000; padding-bottom: 2.5mm;
          }
          .correios-title { font-size: 12px; font-weight: 900; letter-spacing: 0.4px; margin-bottom: 2px; }
          .contract-meta { font-size: 9px; line-height: 1.35; }
          .service-stamp {
            border: 2px solid #000; padding: 2mm 3mm; text-align: center; min-width: 28mm;
            display: flex; flex-direction: column; justify-content: center;
          }
          .stamp-sedex { background: #000; color: #fff; }
          .stamp-pac { background: #fff; color: #000; }
          .service-type { font-size: 15px; font-weight: 900; letter-spacing: 0.5px; }
          .service-code { font-size: 9px; font-weight: 700; }
          .volume-badge { font-size: 10px; font-weight: 900; margin-top: 2px; border-top: 1px solid currentColor; padding-top: 1px; }
          .metrics-bar {
            display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px;
            font-size: 8.5px; padding: 1.8mm 0; border-bottom: 1.5px solid #000;
          }
          .tracking-section {
            text-align: center; padding: 2.5mm 0; border-bottom: 2px solid #000;
          }
          .tracking-number { font-size: 16px; font-weight: 900; letter-spacing: 2px; margin-bottom: 1.5mm; font-family: monospace; }
          .tracking-barcode { width: 92%; margin: 0 auto; }
          .Signature-line {
            margin-top: 2mm; font-size: 7.5px; text-align: left; display: flex; flex-direction: column; gap: 1.5mm;
          }
          .recipient-section {
            border-bottom: 2px solid #000; padding: 2mm 0; flex: 1;
          }
          .recipient-tag {
            background: #000; color: #fff; font-size: 10px; font-weight: 900;
            padding: 1mm 2.5mm; display: inline-block; margin-bottom: 1.5mm; letter-spacing: 0.8px;
          }
          .recipient-body { display: flex; flex-direction: column; gap: 2mm; }
          .recipient-name { font-size: 13px; font-weight: 900; text-transform: uppercase; line-height: 1.2; }
          .recipient-doc { font-size: 9px; margin: 1px 0; }
          .recipient-addr { font-size: 11px; font-weight: 700; line-height: 1.25; }
          .recipient-neigh { font-size: 10px; }
          .recipient-city { font-size: 12px; margin-top: 1mm; }
          .cep-highlight { font-size: 14px; font-weight: 900; font-family: monospace; border: 1.5px solid #000; padding: 0 3px; }
          .recipient-obs { font-size: 8px; margin-top: 1.5mm; color: #111; border-top: 1px dashed #999; padding-top: 1mm; }
          .cep-barcode-box { width: 68%; margin-top: 1mm; }
          .cep-barcode-title { font-size: 8px; font-weight: 700; margin-bottom: 1px; }
          .sender-section { font-size: 8.5px; line-height: 1.35; padding-top: 1.5mm; }
          .declaration-sheet {
            width: 190mm; max-width: 100%; background: #fff; border: 1.5px solid #000;
            margin: 12px auto; padding: 6mm; font-size: 10px;
          }
          .decl-title { font-size: 13px; font-weight: 900; text-align: center; border-bottom: 1.5px solid #000; padding-bottom: 4px; }
          .decl-subtitle { font-size: 10px; text-align: center; padding: 4px 0 8px 0; }
          .decl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
          .decl-box { border: 1px solid #000; padding: 6px; line-height: 1.4; font-size: 9.5px; }
          .decl-box-header { font-weight: 900; background: #e2e8f0; padding: 2px 4px; margin-bottom: 4px; border-bottom: 1px solid #000; }
          .decl-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9.5px; }
          .decl-table th, .decl-table td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
          .decl-table th { background: #e2e8f0; font-weight: 900; }
          .decl-legal { font-size: 8px; line-height: 1.35; text-align: justify; border: 1px solid #000; padding: 5px; margin-bottom: 10px; }
          .decl-sign { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 10px; font-size: 9.5px; text-align: center; }
          @media print {
            body { background: #fff; padding: 0; }
            .print-toolbar { display: none !important; }
            .page-break { page-break-after: always; }
          }
        </style>
      </head>
      <body>
        <div class="print-toolbar">
          <div>
            <strong>Etiqueta Correios pronta — Pedido #${activeShipment.orderNumber}</strong>
            <div style="font-size: 12px; color: #cbd5e1;">
              Contrato ${activeShipment.contractNumber} • Cartão ${activeShipment.postcardNumber} • ${activeShipment.volumes.length} volume(s)
            </div>
          </div>
          <button onclick="window.print()">🖨️ IMPRIMIR AGORA</button>
        </div>
        ${labelsHtml}
        <script>
          setTimeout(() => { window.print(); }, 350);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadOfficialCwsPdf = () => {
    if (!generatedShipment?.officialLabelPdfBase64) return;
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${generatedShipment.officialLabelPdfBase64}`;
    link.download = `rotulo-correios-${orderNumber}.pdf`;
    link.click();
  };

  const handleCopyTracking = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedTracking(code);
      setTimeout(() => setCopiedTracking(null), 2500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/90 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Cabeçalho do Modal */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-gradient-to-r from-amber-500/15 via-slate-900 to-cyan-500/10 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
              <Printer className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Etiqueta Correios & Pré-Postagem API
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  Contrato AG {contractConfig.contractNumber}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                  Cartão {contractConfig.postcardNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                Pedido <strong className="text-white font-mono">#{orderNumber}</strong> • Remetente:{" "}
                <span className="text-slate-200">{contractConfig.senderName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowConfigPanel((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                showConfigPanel
                  ? "bg-amber-400 text-slate-950 border-amber-300"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
              }`}
              title="Configurar credenciais e dados do Contrato Correios CWS"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dados do Contrato / API</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo Principal com Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-300 font-semibold">
                Carregando dados do pedido e contrato Correios...
              </p>
            </div>
          ) : (
            <>
              {/* Feedback de Operação */}
              {feedback && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-start justify-between gap-3 ${
                    feedback.type === "success"
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                      : feedback.type === "warn"
                      ? "bg-amber-950/40 border-amber-500/50 text-amber-200"
                      : "bg-rose-950/40 border-rose-500/50 text-rose-200"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {feedback.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <span className="font-semibold leading-relaxed">{feedback.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFeedback(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Painel Expansível: Configurações do Contrato Correios & Token API CWS */}
              {showConfigPanel && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Credenciais do Contrato Correios (API Oficial CWS)</span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Os dados do seu contrato já estão configurados. Para envio automático via API CWS, informe o
                        Código de Acesso à API gerado no portal{" "}
                        <strong className="text-slate-200">cws.correios.com.br</strong>.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={testingCws}
                        onClick={handleTestCwsConnection}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testingCws ? "animate-spin" : ""}`} />
                        <span>{testingCws ? "Testando..." : "Testar Conexão CWS"}</span>
                      </button>
                      <button
                        type="button"
                        disabled={savingConfig}
                        onClick={handleSaveContractConfig}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer disabled:opacity-50"
                      >
                        {savingConfig ? "Salvando..." : "Salvar Contrato"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Contrato AG Correios
                      </label>
                      <input
                        type="text"
                        value={contractConfig.contractNumber}
                        onChange={(e) =>
                          setContractConfig((p) => ({ ...p, contractNumber: e.target.value }))
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Cartão de Postagem
                      </label>
                      <input
                        type="text"
                        value={contractConfig.postcardNumber}
                        onChange={(e) =>
                          setContractConfig((p) => ({ ...p, postcardNumber: e.target.value }))
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Usuário Meu Correios (idCorreios)
                      </label>
                      <input
                        type="text"
                        value={contractConfig.cwsUser}
                        onChange={(e) => setContractConfig((p) => ({ ...p, cwsUser: e.target.value }))}
                        placeholder="Ex: 11040282000177"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-amber-300 mb-1">
                        Código de Acesso API (Token CWS)
                      </label>
                      <input
                        type="password"
                        value={contractConfig.cwsPassword}
                        onChange={(e) =>
                          setContractConfig((p) => ({ ...p, cwsPassword: e.target.value }))
                        }
                        placeholder="Token gerado em cws.correios.com.br"
                        className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Se já existe etiqueta/pré-postagem gerada, mostra barra de impressão rápida em 1 clique */}
              {generatedShipment && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/40 border-2 border-emerald-500/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {generatedShipment.mode === "cws_live"
                            ? "Pré-Postagem CWS Registrada"
                            : "Etiqueta Simplificada Pronta"}
                        </span>
                      </span>
                      <span className="text-xs font-extrabold text-white">
                        {generatedShipment.serviceName} (Cód. {generatedShipment.serviceCode})
                      </span>
                      <span className="text-xs text-slate-400">
                        • {generatedShipment.volumes.length} volume(s)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {generatedShipment.volumes.map((v, i) => (
                        <div
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-amber-300"
                        >
                          <span className="text-slate-400 font-sans text-[10px] font-bold">
                            Vol {i + 1}:
                          </span>
                          <strong>{v.trackingCode}</strong>
                          {v.trackingCode && (
                            <button
                              type="button"
                              onClick={() => handleCopyTracking(v.trackingCode!)}
                              className="text-slate-400 hover:text-white ml-1 cursor-pointer"
                              title="Copiar código de rastreio"
                            >
                              {copiedTracking === v.trackingCode ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePrintLabels("thermal_100x150", generatedShipment)}
                      className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Imprimir Etiqueta (100x150mm)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrintLabels("a4_full", generatedShipment)}
                      className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Imprimir A4 + Declaração Conteúdo</span>
                    </button>

                    {generatedShipment.officialLabelPdfBase64 && (
                      <button
                        type="button"
                        onClick={handleDownloadOfficialCwsPdf}
                        className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Baixar PDF Oficial CWS</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Grid Principal: 1. Destinatário & Serviço | 2. Volumes & Medidas */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* COLUNA ESQUERDA (5 cols): Destinatário & Modalidade do Contrato */}
                <div className="lg:col-span-5 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span>1. Destinatário & Serviço</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Origem: {formatCepMask(contractConfig.senderAddress.cep)}
                    </span>
                  </div>

                  {/* Seletor Rápido SEDEX (03220) vs PAC (03298) */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setServiceCode(contractConfig.sedexServiceCode || "03220")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        serviceCode !== "03298"
                          ? "bg-amber-500/20 border-amber-400 text-white shadow-sm"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-amber-300">SEDEX CONTRATO</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-300">
                          03220
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-0.5">Seguro 019 Incluso</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setServiceCode(contractConfig.pacServiceCode || "03298")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        serviceCode === "03298"
                          ? "bg-cyan-500/20 border-cyan-400 text-white shadow-sm"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-cyan-300">PAC CONTRATO</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-300">
                          03298
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-0.5">Seguro 064 VDS Incluso</p>
                    </button>
                  </div>

                  {/* Campos do Destinatário */}
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Nome / Razão Social do Destinatário
                      </label>
                      <input
                        type="text"
                        value={recipient.name}
                        onChange={(e) => setRecipient((p) => ({ ...p, name: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                          CPF / CNPJ
                        </label>
                        <input
                          type="text"
                          value={recipient.document}
                          onChange={(e) => setRecipient((p) => ({ ...p, document: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                          CEP Destino
                        </label>
                        <input
                          type="text"
                          value={recipient.cep}
                          onChange={(e) => setRecipient((p) => ({ ...p, cep: e.target.value }))}
                          placeholder="00000-000"
                          className="w-full bg-slate-900 border border-cyan-500/40 rounded-xl px-3 py-2 text-cyan-300 font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                          Logradouro (Rua / Av.)
                        </label>
                        <input
                          type="text"
                          value={recipient.street}
                          onChange={(e) => setRecipient((p) => ({ ...p, street: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                          Número
                        </label>
                        <input
                          type="text"
                          value={recipient.number}
                          onChange={(e) => setRecipient((p) => ({ ...p, number: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                          Bairro
                        </label>
                        <input
                          type="text"
                          value={recipient.neighborhood}
                          onChange={(e) => setRecipient((p) => ({ ...p, neighborhood: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                          Complemento
                        </label>
                        <input
                          type="text"
                          value={recipient.complement}
                          onChange={(e) => setRecipient((p) => ({ ...p, complement: e.target.value }))}
                          placeholder="Sala, Galpão, Bloco..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                          Cidade
                        </label>
                        <input
                          type="text"
                          value={recipient.city}
                          onChange={(e) => setRecipient((p) => ({ ...p, city: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                          UF
                        </label>
                        <input
                          type="text"
                          maxLength={2}
                          value={recipient.state}
                          onChange={(e) =>
                            setRecipient((p) => ({ ...p, state: e.target.value.toUpperCase() }))
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold uppercase"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                          Nº Nota Fiscal (Opcional)
                        </label>
                        <input
                          type="text"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          placeholder="Vazio = Decl. Conteúdo"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                          Observação na Etiqueta
                        </label>
                        <input
                          type="text"
                          value={observations}
                          onChange={(e) => setObservations(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUNA DIREITA (7 cols): Volumes (Caixas), Pesos, Dimensões e Rastreio */}
                <div className="lg:col-span-7 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Package className="w-4 h-4" />
                        <span>2. Volumes / Embalagens ({volumes.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleAddVolume}
                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Adicionar Volume</span>
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {volumes.map((vol, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-[11px]">
                                VOLUME {idx + 1}/{volumes.length}
                              </span>
                              <input
                                type="text"
                                value={vol.label}
                                onChange={(e) =>
                                  setVolumes((prev) =>
                                    prev.map((v, i) => (i === idx ? { ...v, label: e.target.value } : v))
                                  )
                                }
                                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-semibold text-xs w-56 sm:w-72"
                              />
                            </div>
                            {volumes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveVolume(idx)}
                                className="p-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 cursor-pointer"
                                title="Remover este volume"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Presets Rápidos Homologados pelos Comprovantes Reais */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="text-slate-400 font-bold">Presets Caixa:</span>
                            <button
                              type="button"
                              onClick={() => handleApplyVolumePreset(idx, "balcao_16kg")}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                            >
                              Balcão (68x65x23cm • 16kg)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyVolumePreset(idx, "kit_balcao_22kg")}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                            >
                              Kit Balcão (68x65x23cm • 22kg)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyVolumePreset(idx, "parede_16kg")}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                            >
                              Parede (90x45x20cm • 16kg)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyVolumePreset(idx, "kit_completo_26kg")}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                            >
                              Kit Reforçado (96x45x42cm • 26kg)
                            </button>
                          </div>

                          {/* Medidas, Peso, Valor Declarado e Código Objeto */}
                          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">
                                Comp. (cm)
                              </label>
                              <input
                                type="number"
                                value={vol.lengthCm}
                                onChange={(e) =>
                                  setVolumes((prev) =>
                                    prev.map((v, i) =>
                                      i === idx ? { ...v, lengthCm: Number(e.target.value) } : v
                                    )
                                  )
                                }
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">
                                Larg. (cm)
                              </label>
                              <input
                                type="number"
                                value={vol.widthCm}
                                onChange={(e) =>
                                  setVolumes((prev) =>
                                    prev.map((v, i) =>
                                      i === idx ? { ...v, widthCm: Number(e.target.value) } : v
                                    )
                                  )
                                }
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">
                                Alt. (cm)
                              </label>
                              <input
                                type="number"
                                value={vol.heightCm}
                                onChange={(e) =>
                                  setVolumes((prev) =>
                                    prev.map((v, i) =>
                                      i === idx ? { ...v, heightCm: Number(e.target.value) } : v
                                    )
                                  )
                                }
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">
                                Peso (kg)
                              </label>
                              <input
                                type="number"
                                step="0.5"
                                value={(vol.weightGrams / 1000).toFixed(1)}
                                onChange={(e) =>
                                  setVolumes((prev) =>
                                    prev.map((v, i) =>
                                      i === idx
                                        ? { ...v, weightGrams: Math.round(Number(e.target.value) * 1000) }
                                        : v
                                    )
                                  )
                                }
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase text-amber-300 mb-0.5">
                                Seguro VD (R$)
                              </label>
                              <input
                                type="number"
                                step="10"
                                value={vol.declaredValueReais}
                                onChange={(e) =>
                                  setVolumes((prev) =>
                                    prev.map((v, i) =>
                                      i === idx ? { ...v, declaredValueReais: Number(e.target.value) } : v
                                    )
                                  )
                                }
                                className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-2 py-1.5 text-amber-300 font-mono font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase text-cyan-300 mb-0.5">
                                Rastreio (Opcional)
                              </label>
                              <input
                                type="text"
                                value={vol.trackingCode || ""}
                                placeholder="Auto API / Etiqueta"
                                onChange={(e) =>
                                  setVolumes((prev) =>
                                    prev.map((v, i) =>
                                      i === idx ? { ...v, trackingCode: e.target.value.toUpperCase() } : v
                                    )
                                  )
                                }
                                className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg px-2 py-1.5 text-cyan-300 font-mono text-[11px]"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Opção de anexar Declaração de Conteúdo na Impressão */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <label className="inline-flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeDeclarationInPrint}
                        onChange={(e) => setIncludeDeclarationInPrint(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-amber-400 focus:ring-amber-400"
                      />
                      <span>Anexar Declaração de Conteúdo preenchida ao imprimir etiqueta</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Agência: <strong className="text-slate-200">AC Taboão da Serra (00024489)</strong>
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Rodapé com Botões de Ação Simplificada */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400">
            Contrato <strong className="text-white">{contractConfig.contractNumber}</strong> • Cartão{" "}
            <strong className="text-white">{contractConfig.postcardNumber}</strong> •{" "}
            {contractConfig.hasCwsPassword ? (
              <span className="text-emerald-400 font-bold">API CWS Configurada</span>
            ) : (
              <span className="text-amber-300 font-semibold">
                Modo Simplificado Ativo (Clique em &ldquo;Dados do Contrato / API&rdquo; se quiser inserir Token CWS)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            {/* Botão 1: Gerar Etiqueta Simplificada Direta & Imprimir */}
            <button
              type="button"
              disabled={Boolean(submittingMode) || loading}
              onClick={async () => {
                await handleGenerateLabel("simplified");
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 border border-amber-400/50 font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              title="Gera imediatamente a etiqueta no padrão do Contrato 9912722993 pronta para imprimir sem depender da API externa"
            >
              <Zap className="w-4 h-4" />
              <span>
                {submittingMode === "simplified"
                  ? "Gerando Etiqueta..."
                  : "Gerar Etiqueta Simplificada (1 Clique)"}
              </span>
            </button>

            {/* Botão 2: Lançar no Sistema dos Correios via API CWS + Gerar Etiqueta */}
            <button
              type="button"
              disabled={Boolean(submittingMode) || loading}
              onClick={() => handleGenerateLabel("cws_live")}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-400/20 transition-all cursor-pointer disabled:opacity-50"
              title="Conecta na API Oficial CWS dos Correios usando seu Contrato 9912722993, lança a pré-postagem e gera a etiqueta"
            >
              <Send className="w-4 h-4" />
              <span>
                {submittingMode === "cws_live"
                  ? "Lançando nos Correios..."
                  : "Lançar na API Correios & Gerar Etiqueta"}
              </span>
            </button>

            {/* Botão 3: Imprimir Direto */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handlePrintLabels("thermal_100x150")}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
              title="Abrir janela de impressão imediata da Etiqueta Correios"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Agora</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
