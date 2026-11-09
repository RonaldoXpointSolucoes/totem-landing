"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Printer,
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
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
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Terminal,
  Building2,
  Edit2,
  Eye,
  EyeOff,
  ExternalLink,
  QrCode,
} from "lucide-react";

interface CorreiosPickupAddress {
  id: string;
  label: string;
  senderName: string;
  cnpj: string;
  phone: string;
  email: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  isDefault?: boolean;
}

interface CorreiosApiBreadcrumb {
  step: number;
  totalSteps: number;
  code: string;
  title: string;
  status: "success" | "warning" | "error" | "skipped";
  summary: string;
  durationMs: number;
  timestamp: string;
  endpoint?: string;
  httpStatus?: number;
  details: string[];
  requestPayload?: any;
  responsePayload?: any;
  remediation?: string;
}

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
  pickupAddressId?: string;
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
  lastBreadcrumbs?: CorreiosApiBreadcrumb[];
  createdAt: string;
  updatedAt: string;
}

interface CorreiosLabelModalProps {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  onLabelSaved?: (shipment: CorreiosShipmentRecord) => void;
}

const LOCAL_STORAGE_LAST_PICKUP_KEY = "totem_last_correios_pickup_id";

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
  const codes: number[] = [104];
  let checksum = 104;

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    const safeCode = code >= 0 && code < 95 ? code : 0;
    codes.push(safeCode);
    checksum += safeCode * (i + 1);
  }

  codes.push(checksum % 103);
  codes.push(106);

  return codes.map((c) => CODE128B_PATTERNS[c] || "212222").join("");
}

function buildBarcodeSvgMarkup(value: string, height = 46): string {
  const pattern = encodeCode128B(value);
  let x = 0;
  const rects: string[] = [];

  for (let i = 0; i < pattern.length; i++) {
    const width = parseInt(pattern[i], 10) * 1.5;
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
  const [showActivationWizard, setShowActivationWizard] = useState(false);
  const [showCwsPassword, setShowCwsPassword] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingCws, setTestingCws] = useState(false);
  const [lookingUpCep, setLookingUpCep] = useState(false);
  const [lookingUpPickupCep, setLookingUpPickupCep] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "warn" | "error"; text: string } | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  const [copiedLog, setCopiedLog] = useState(false);

  // Estado da Trilha de Migalhas (Breadcrumbs de Diagnóstico da API)
  const [breadcrumbs, setBreadcrumbs] = useState<CorreiosApiBreadcrumb[]>([]);
  const [expandedStepNumbers, setExpandedStepNumbers] = useState<Set<number>>(new Set());
  const [showBreadcrumbsPanel, setShowBreadcrumbsPanel] = useState(false);

  // Gerenciador de Endereços de Coleta / Remetente
  const [pickupAddresses, setPickupAddresses] = useState<CorreiosPickupAddress[]>([
    {
      id: "pickup_xpoint_matriz",
      label: "Matriz X-Point — Praça Miguel Ortega, 340 (Parque Assunção)",
      senderName: "X-Point Soluções Tecnológicas Ltda",
      cnpj: "11040282000177",
      phone: "11991649959",
      email: "contato@xpointsolucoes.com.br",
      cep: "06754160",
      street: "Praça Miguel Ortega",
      number: "340",
      complement: "Loja 5",
      neighborhood: "Parque Assunção",
      city: "Taboão da Serra",
      state: "SP",
      isDefault: true,
    },
  ]);
  const [selectedPickupId, setSelectedPickupId] = useState<string>("pickup_xpoint_matriz");
  const [editingPickup, setEditingPickup] = useState<CorreiosPickupAddress | null>(null);
  const [isNewPickup, setIsNewPickup] = useState(false);

  // Configurações Reais do Contrato Correios X-Point
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
      cep: "06754160",
      street: "Praça Miguel Ortega",
      number: "340",
      complement: "Loja 5",
      neighborhood: "Parque Assunção",
      city: "Taboão da Serra",
      state: "SP",
    },
    cwsUser: "11040282000177",
    cwsPassword: "",
    hasCwsPassword: false,
    cwsIsVerified: false,
    cwsLastVerifiedAt: "",
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

  const activePickup =
    pickupAddresses.find((p) => p.id === selectedPickupId) || pickupAddresses[0];

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

            if (Array.isArray(json.contractConfig.pickupAddresses) && json.contractConfig.pickupAddresses.length > 0) {
              setPickupAddresses(json.contractConfig.pickupAddresses);
              let preferredId = json.contractConfig.selectedPickupAddressId;
              try {
                const localLast = localStorage.getItem(LOCAL_STORAGE_LAST_PICKUP_KEY);
                if (
                  localLast &&
                  json.contractConfig.pickupAddresses.some((p: CorreiosPickupAddress) => p.id === localLast)
                ) {
                  preferredId = localLast;
                }
              } catch {}
              setSelectedPickupId(preferredId || json.contractConfig.pickupAddresses[0].id);
            }
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
            if (Array.isArray(json.existingShipment.lastBreadcrumbs)) {
              setBreadcrumbs(json.existingShipment.lastBreadcrumbs);
            }
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

  const handleSelectPickupAddress = async (pickupId: string) => {
    setSelectedPickupId(pickupId);
    try {
      localStorage.setItem(LOCAL_STORAGE_LAST_PICKUP_KEY, pickupId);
    } catch {}

    const chosen = pickupAddresses.find((p) => p.id === pickupId);
    if (chosen) {
      setContractConfig((prev) => ({
        ...prev,
        senderName: chosen.senderName,
        cnpj: chosen.cnpj,
        senderPhone: chosen.phone,
        senderEmail: chosen.email,
        senderAddress: {
          cep: chosen.cep,
          street: chosen.street,
          number: chosen.number,
          complement: chosen.complement,
          neighborhood: chosen.neighborhood,
          city: chosen.city,
          state: chosen.state,
        },
      }));
    }

    try {
      await fetch(`/api/admin/orders/${orderId}/correios-label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_pickup_addresses",
          config: {
            pickupAddresses,
            selectedPickupAddressId: pickupId,
          },
        }),
      });
    } catch {}
  };

  const handleStartNewPickupAddress = () => {
    setIsNewPickup(true);
    setEditingPickup({
      id: `pickup_${Date.now()}`,
      label: "Novo Endereço de Coleta / Expedição",
      senderName: contractConfig.senderName || "X-Point Soluções Tecnológicas Ltda",
      cnpj: contractConfig.cnpj || "11040282000177",
      phone: contractConfig.senderPhone || "11991649959",
      email: contractConfig.senderEmail || "contato@xpointsolucoes.com.br",
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "SP",
    });
  };

  const handleStartEditPickupAddress = () => {
    if (!activePickup) return;
    setIsNewPickup(false);
    setEditingPickup({ ...activePickup });
  };

  const handleLookupPickupCep = async () => {
    if (!editingPickup) return;
    const clean = (editingPickup.cep || "").replace(/\D/g, "");
    if (clean.length !== 8) {
      setFeedback({ type: "warn", text: "Digite um CEP de coleta com 8 números para buscar no DNE." });
      return;
    }
    setLookingUpPickupCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data && !data.erro) {
        setEditingPickup((prev) =>
          prev
            ? {
                ...prev,
                cep: clean,
                street: data.logradouro || prev.street,
                neighborhood: data.bairro || prev.neighborhood,
                city: data.localidade || prev.city,
                state: data.uf || prev.state,
                label:
                  prev.label === "Novo Endereço de Coleta / Expedição" && data.logradouro
                    ? `Unidade ${data.bairro || data.localidade} — ${data.logradouro}`
                    : prev.label,
              }
            : null
        );
      } else {
        setFeedback({ type: "warn", text: `CEP ${clean} não encontrado no ViaCEP.` });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: "Erro ao consultar CEP de coleta: " + err?.message });
    } finally {
      setLookingUpPickupCep(false);
    }
  };

  const handleSavePickupAddressModal = async () => {
    if (!editingPickup) return;
    if (!editingPickup.cep || editingPickup.cep.replace(/\D/g, "").length !== 8 || !editingPickup.street || !editingPickup.city) {
      setFeedback({
        type: "error",
        text: "Preencha CEP (8 dígitos), Logradouro e Cidade para salvar o endereço de coleta.",
      });
      return;
    }

    const cleanPickup: CorreiosPickupAddress = {
      ...editingPickup,
      cep: editingPickup.cep.replace(/\D/g, ""),
      state: (editingPickup.state || "SP").toUpperCase(),
    };

    const nextList = isNewPickup
      ? [...pickupAddresses, cleanPickup]
      : pickupAddresses.map((p) => (p.id === cleanPickup.id ? cleanPickup : p));

    setPickupAddresses(nextList);
    setSelectedPickupId(cleanPickup.id);
    setEditingPickup(null);

    try {
      localStorage.setItem(LOCAL_STORAGE_LAST_PICKUP_KEY, cleanPickup.id);
    } catch {}

    setContractConfig((prev) => ({
      ...prev,
      senderName: cleanPickup.senderName,
      cnpj: cleanPickup.cnpj,
      senderPhone: cleanPickup.phone,
      senderEmail: cleanPickup.email,
      senderAddress: {
        cep: cleanPickup.cep,
        street: cleanPickup.street,
        number: cleanPickup.number,
        complement: cleanPickup.complement,
        neighborhood: cleanPickup.neighborhood,
        city: cleanPickup.city,
        state: cleanPickup.state,
      },
    }));

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/correios-label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_pickup_addresses",
          config: {
            pickupAddresses: nextList,
            selectedPickupAddressId: cleanPickup.id,
          },
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setFeedback({
          type: "success",
          text: `Endereço de coleta "${cleanPickup.label}" salvo e definido como padrão ativo!`,
        });
      }
    } catch {}
  };

  const handleDeletePickupAddress = async (pickupId: string) => {
    if (pickupAddresses.length <= 1) return;
    const nextList = pickupAddresses.filter((p) => p.id !== pickupId);
    const nextSelectedId = nextList[0].id;
    setPickupAddresses(nextList);
    setSelectedPickupId(nextSelectedId);
    setEditingPickup(null);

    try {
      localStorage.setItem(LOCAL_STORAGE_LAST_PICKUP_KEY, nextSelectedId);
      await fetch(`/api/admin/orders/${orderId}/correios-label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_pickup_addresses",
          config: {
            pickupAddresses: nextList,
            selectedPickupAddressId: nextSelectedId,
          },
        }),
      });
    } catch {}
  };

  const toggleBreadcrumbExpanded = (stepNum: number) => {
    setExpandedStepNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(stepNum)) next.delete(stepNum);
      else next.add(stepNum);
      return next;
    });
  };

  const handleLookupRecipientCep = async () => {
    const clean = (recipient.cep || "").replace(/\D/g, "");
    if (clean.length !== 8) {
      setFeedback({ type: "warn", text: "Digite um CEP com 8 dígitos para consultar no DNE/ViaCEP." });
      return;
    }
    setLookingUpCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data && !data.erro) {
        setRecipient((prev) => ({
          ...prev,
          cep: clean,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
        setFeedback({
          type: "success",
          text: `CEP ${formatCepMask(clean)} validado no DNE: ${data.logradouro || ""}, ${data.bairro || ""} — ${data.localidade}/${data.uf}.`,
        });
      } else {
        setFeedback({ type: "warn", text: `CEP ${clean} não localizado no ViaCEP.` });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: "Erro ao consultar ViaCEP: " + err?.message });
    } finally {
      setLookingUpCep(false);
    }
  };

  const handleSaveContractConfig = async () => {
    setSavingConfig(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/correios-label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_config",
          config: {
            ...contractConfig,
            pickupAddresses,
            selectedPickupAddressId: selectedPickupId,
          },
        }),
      });
      const json = await res.json();
      if (json.ok) {
        if (json.contractConfig) {
          setContractConfig((prev) => ({ ...prev, ...json.contractConfig }));
        }
        setFeedback({
          type: json.authCheck && !json.authCheck.ok ? "warn" : "success",
          text:
            json.authCheck && !json.authCheck.ok
              ? `Dados salvos! Aviso na validação do Token CWS: ${json.authCheck.error}`
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
          config: {
            ...contractConfig,
            pickupAddresses,
            selectedPickupAddressId: selectedPickupId,
          },
        }),
      });
      const json = await res.json();
      if (json.contractConfig) {
        setContractConfig((prev) => ({ ...prev, ...json.contractConfig }));
      }
      setFeedback({
        type: json.ok ? "success" : "error",
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
    setSubmittingMode(mode);
    setFeedback(null);

    const customSender = activePickup
      ? {
          name: activePickup.senderName,
          cnpj: activePickup.cnpj,
          phone: activePickup.phone,
          email: activePickup.email,
          cep: activePickup.cep,
          street: activePickup.street,
          number: activePickup.number,
          complement: activePickup.complement,
          neighborhood: activePickup.neighborhood,
          city: activePickup.city,
          state: activePickup.state,
        }
      : undefined;

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/correios-label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_label",
          mode,
          serviceCode,
          pickupAddressId: selectedPickupId,
          customSender,
          invoiceNumber,
          invoiceKey,
          observations,
          recipient,
          volumes,
        }),
      });
      const json = await res.json();

      if (Array.isArray(json.breadcrumbs)) {
        setBreadcrumbs(json.breadcrumbs);
        setShowBreadcrumbsPanel(true);

        const autoExpand = new Set<number>();
        for (const b of json.breadcrumbs as CorreiosApiBreadcrumb[]) {
          if (b.status === "error" || b.status === "warning") {
            autoExpand.add(b.step);
          }
        }
        setExpandedStepNumbers(autoExpand);

        const credFailed = (json.breadcrumbs as CorreiosApiBreadcrumb[]).some(
          (b) =>
            (b.code === "CONTRACT_CREDENTIALS" || b.code === "CWS_TOKEN_AUTH") &&
            b.status === "error"
        );
        if (credFailed) {
          setShowActivationWizard(true);
        }
      }

      if (json.shipment?.recipient) {
        setRecipient((prev) => ({
          ...prev,
          ...json.shipment.recipient,
        }));
      }

      if (!res.ok || !json.ok) {
        setFeedback({
          type: "error",
          text:
            json.message ||
            json.error ||
            "Falha ao lançar pré-postagem na API dos Correios. Confira abaixo a Trilha de Migalhas com o passo exato onde parou.",
        });
        return;
      }

      setGeneratedShipment(json.shipment);
      if (Array.isArray(json.shipment?.volumes)) {
        setVolumes(json.shipment.volumes);
      }

      setFeedback({
        type: "success",
        text: json.message,
      });

      if (onLabelSaved && json.shipment) {
        onLabelSaved(json.shipment);
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: "Erro de comunicação ao processar pré-postagem: " + err?.message,
      });
    } finally {
      setSubmittingMode(null);
    }
  };

  const handleCopyFullDiagnosticLog = async () => {
    const lines = [
      `=== LOG DE DIAGNÓSTICO EM MIGALHAS — CORREIOS CWS ===`,
      `Pedido: #${orderNumber} (${orderId})`,
      `Contrato: ${contractConfig.contractNumber} | Cartão: ${contractConfig.postcardNumber}`,
      `Data/Hora: ${new Date().toLocaleString("pt-BR")}`,
      ``,
      ...breadcrumbs.map((b) => {
        const icon =
          b.status === "success"
            ? "[OK]"
            : b.status === "warning"
            ? "[AJUSTADO]"
            : b.status === "error"
            ? "[FALHOU]"
            : "[PULADO]";
        const detailLines = (b.details || []).map((d) => `   • ${d}`).join("\n");
        const reqStr = b.requestPayload ? `\n   > Payload Enviado: ${JSON.stringify(b.requestPayload)}` : "";
        const resStr = b.responsePayload ? `\n   < Resposta CWS: ${JSON.stringify(b.responsePayload)}` : "";
        const remStr = b.remediation ? `\n   ! Solução: ${b.remediation}` : "";
        return `${icon} Etapa ${b.step}/${b.totalSteps} - ${b.title} (${b.durationMs}ms)\n   Resumo: ${b.summary}\n${detailLines}${reqStr}${resStr}${remStr}`;
      }),
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n\n"));
      setCopiedLog(true);
      setTimeout(() => setCopiedLog(false), 3000);
    } catch {}
  };

  /**
   * Abre janela de impressão com QR Code Oficial dos Correios e paginação A4 Retrato sem cortes!
   */
  const handlePrintLabels = async (
    format: "thermal_100x150" | "a4_full",
    shipmentToPrint?: CorreiosShipmentRecord
  ) => {
    const currentSender = activePickup
      ? {
          name: activePickup.senderName,
          cnpj: activePickup.cnpj,
          phone: activePickup.phone,
          email: activePickup.email,
          cep: activePickup.cep,
          street: activePickup.street,
          number: activePickup.number,
          complement: activePickup.complement,
          neighborhood: activePickup.neighborhood,
          city: activePickup.city,
          state: activePickup.state,
        }
      : {
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
        };

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
        sender: currentSender,
        recipient,
        volumes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

    const isSedex = activeShipment.serviceCode !== "03298";
    const serviceShort = isSedex ? "SEDEX" : "PAC";

    const pagesHtmlList: string[] = [];

    for (let idx = 0; idx < activeShipment.volumes.length; idx++) {
      const vol = activeShipment.volumes[idx];
      const realTracking = (vol.trackingCode || "").trim().toUpperCase();
      const hasRealTracking = Boolean(realTracking);

      const cepDestClean = (activeShipment.recipient.cep || "00000000").replace(/\D/g, "").padEnd(8, "0");
      const cepOrigClean = (activeShipment.sender.cep || "06754160").replace(/\D/g, "").padEnd(8, "0");

      // String estruturada do QR Code 2D Oficial dos Correios
      const qrPayloadMain = [
        `DEST:${cepDestClean}`,
        `ORIG:${cepOrigClean}`,
        `OBJ:${hasRealTracking ? realTracking : activeShipment.orderNumber}`,
        `SRV:${activeShipment.serviceCode}`,
        `CTR:${activeShipment.contractNumber}`,
        `CRT:${activeShipment.postcardNumber}`,
        `VOL:${idx + 1}/${activeShipment.volumes.length}`,
        `PESO:${vol.weightGrams || 16000}g`,
      ].join("|");

      let mainQrSvg = "";
      try {
        mainQrSvg = await QRCode.toString(qrPayloadMain, {
          type: "svg",
          margin: 0,
          width: 78,
          errorCorrectionLevel: "M",
        });
      } catch {}

      const trackingBarcodeSvg = hasRealTracking
        ? buildBarcodeSvgMarkup(realTracking, 44)
        : buildBarcodeSvgMarkup(activeShipment.orderNumber.replace(/[^A-Z0-9]/gi, ""), 38);
      const cepBarcodeSvg = buildBarcodeSvgMarkup(cepDestClean, 36);
      const weightKg = (Number(vol.weightGrams || 16000) / 1000).toFixed(2);
      const insuranceCode = isSedex ? "019 - VD" : "064 - VDS";

      const labelCard = `
        <div class="correios-label-sheet">
          <!-- Topo Padrão Correios: Logo/Contrato + QR Code 2D Oficial + Chancela SEDEX/PAC -->
          <div class="label-header">
            <div class="correios-brand">
              <div class="correios-title">CORREIOS • CONTRATO AG</div>
              <div class="contract-meta">
                Contrato: <strong>${activeShipment.contractNumber}</strong><br/>
                Cartão Postagem: <strong>${activeShipment.postcardNumber}</strong><br/>
                Origem: ${activeShipment.sender.city}/${activeShipment.sender.state} (${formatCepMask(activeShipment.sender.cep)})
              </div>
            </div>
            <div class="header-qr-box" title="QR Code 2D Oficial Correios">
              ${mainQrSvg}
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
            <div><strong>Dim:</strong> ${vol.lengthCm}x${vol.widthCm}x${vol.heightCm}cm</div>
            <div><strong>Seguro (${insuranceCode}):</strong> R$ ${Number(vol.declaredValueReais || 0).toFixed(2)}</div>
          </div>

          <!-- Código de Rastreio / Pré-Postagem -->
          <div class="tracking-section">
            ${
              hasRealTracking
                ? `<div class="tracking-number">${realTracking}</div>`
                : `<div class="tracking-pending">POSTAGEM CONTRATO ${activeShipment.contractNumber} • CARTÃO ${activeShipment.postcardNumber}</div>`
            }
            <div class="tracking-barcode">${trackingBarcodeSvg}</div>
            <div class="Signature-line">
              <span>Recebedor: _______________________________________ Assinatura: _____________________ Doc: ______________</span>
            </div>
          </div>

          <!-- Bloco DESTINATÁRIO com Código de Barras do CEP + QR Code Lateral -->
          <div class="recipient-section">
            <div class="recipient-tag">DESTINATÁRIO</div>
            <div class="recipient-grid">
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
                  &nbsp;<strong>${activeShipment.recipient.city} / ${activeShipment.recipient.state}</strong>
                </div>
                <div class="recipient-obs">
                  ${
                    activeShipment.observations
                      ? `Obs: ${activeShipment.observations} • ${vol.label}`
                      : `Conteúdo: ${vol.label}`
                  }
                </div>
              </div>
              <div class="cep-barcode-box">
                <div class="cep-barcode-title">CEP DESTINO: ${cepDestClean}</div>
                ${cepBarcodeSvg}
              </div>
            </div>
          </div>

          <!-- Bloco REMETENTE / COLETA -->
          <div class="sender-section">
            <div>
              <strong>REMETENTE:</strong> ${activeShipment.sender.name} • CNPJ: ${formatDocMask(activeShipment.sender.cnpj)}<br/>
              ${activeShipment.sender.street}, ${activeShipment.sender.number} ${
                activeShipment.sender.complement ? `(${activeShipment.sender.complement})` : ""
              } - ${activeShipment.sender.neighborhood} — <strong>CEP: ${formatCepMask(activeShipment.sender.cep)}</strong> • ${
                activeShipment.sender.city
              }/${activeShipment.sender.state} • Tel: ${activeShipment.sender.phone}
            </div>
          </div>
        </div>
      `;

      const showDeclaration = format === "a4_full" || includeDeclarationInPrint;
      const declarationCard = showDeclaration
        ? `
        <div class="cut-line">✂️ ------------------------------------------------ DOBRE OU RECORTE AQUI ------------------------------------------------ ✂️</div>
        <div class="declaration-sheet">
          <div class="decl-title">DECLARAÇÃO DE CONTEÚDO — CORREIOS (CONTRATO ${activeShipment.contractNumber})</div>
          <div class="decl-subtitle">
            Pedido #${activeShipment.orderNumber} • Objeto: <strong>${
              hasRealTracking ? realTracking : "Postagem Contrato " + activeShipment.contractNumber
            }</strong> • Volume ${idx + 1} de ${
              activeShipment.volumes.length
            } • Modalidade: ${activeShipment.serviceName} (${activeShipment.serviceCode})
          </div>
          <div class="decl-grid">
            <div class="decl-box">
              <div class="decl-box-header">REMETENTE / COLETA</div>
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
            Declaro que não me enquadro no conceito de contribuinte previsto no art. 4º da Lei Complementar nº 87/1996, uma vez que não realizo, com habitualidade ou em volume que caracterize intuito comercial, operações de circulação de mercadoria, ainda que se iniciem no exterior, ou estou dispensado da emissão da nota fiscal por força da legislação tributária vigente, responsabilizando-me, nos termos da lei e sob as penas legais, por informações inverídicas. Declaro ainda que não estou postando conteúdo inflamável, explosivo, causador de combustão espontânea, tóxico, corrosivo, gás ou qualquer outro conteúdo que constitua perigo, conforme o art. 13 da Lei Postal nº 6.538/78.
          </div>
          <div class="decl-sign">
            <div>${activeShipment.sender.city}/${activeShipment.sender.state}, ${new Date().toLocaleDateString("pt-BR")}</div>
            <div>_______________________________________________________<br/>Assinatura do Declarante / Remetente (${activeShipment.sender.name})</div>
          </div>
        </div>
      `
        : "";

      pagesHtmlList.push(`
        <div class="print-page-wrapper">
          ${labelCard}
          ${declarationCard}
        </div>
      `);
    }

    const printWindow = window.open("", "_blank", "width=980,height=860");
    if (!printWindow) {
      alert("Permita pop-ups no navegador para abrir a tela de impressão da etiqueta.");
      return;
    }

    const pageSizeRule =
      format === "thermal_100x150" && !includeDeclarationInPrint
        ? `@page { size: 100mm 150mm; margin: 0; }`
        : `@page { size: A4 portrait; margin: 7mm; }`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Etiqueta Correios - Pedido #${activeShipment.orderNumber}</title>
        <style>
          ${pageSizeRule}
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; }
          body { background: #e2e8f0; color: #000; padding: 12px; }
          .print-toolbar {
            max-width: 195mm; margin: 0 auto 12px auto; background: #0f172a; color: #fff;
            padding: 10px 16px; border-radius: 10px; display: flex; align-items: center; justify-content: space-between;
          }
          .print-toolbar button {
            background: #facc15; color: #0f172a; border: none; padding: 9px 16px;
            font-weight: 900; border-radius: 8px; cursor: pointer; font-size: 13px;
          }
          .print-page-wrapper {
            width: 192mm; max-width: 100%; background: #fff; margin: 0 auto 14px auto;
            padding: 4mm; page-break-inside: avoid !important; break-inside: avoid !important;
            page-break-after: always;
          }
          .print-page-wrapper:last-child {
            page-break-after: auto;
          }
          .correios-label-sheet {
            width: 112mm; background: #fff; border: 2px solid #000;
            margin: 0 auto; padding: 3mm; display: flex; flex-direction: column; gap: 1.5mm;
            page-break-inside: avoid !important; break-inside: avoid !important;
          }
          .label-header {
            display: flex; justify-content: space-between; align-items: center; gap: 2.5mm;
            border-bottom: 2px solid #000; padding-bottom: 2mm;
          }
          .correios-brand { flex: 1; }
          .correios-title { font-size: 11.5px; font-weight: 900; letter-spacing: 0.3px; margin-bottom: 1.5px; }
          .contract-meta { font-size: 8.5px; line-height: 1.3; }
          .header-qr-box {
            width: 19mm; height: 19mm; border: 1px solid #000; padding: 1mm;
            display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          }
          .header-qr-box svg { width: 100%; height: 100%; }
          .service-stamp {
            border: 2px solid #000; padding: 1.5mm 2.5mm; text-align: center; min-width: 26mm;
            display: flex; flex-direction: column; justify-content: center; flex-shrink: 0;
          }
          .stamp-sedex { background: #000; color: #fff; }
          .stamp-pac { background: #fff; color: #000; }
          .service-type { font-size: 14px; font-weight: 900; letter-spacing: 0.5px; }
          .service-code { font-size: 8.5px; font-weight: 700; }
          .volume-badge { font-size: 9px; font-weight: 900; margin-top: 1.5px; border-top: 1px solid currentColor; padding-top: 1px; }
          .metrics-bar {
            display: flex; flex-wrap: wrap; justify-content: space-between; gap: 3px;
            font-size: 8px; padding: 1mm 0; border-bottom: 1.5px solid #000;
          }
          .tracking-section {
            text-align: center; padding: 1.5mm 0; border-bottom: 2px solid #000;
          }
          .tracking-number { font-size: 15px; font-weight: 900; letter-spacing: 2px; margin-bottom: 1mm; font-family: monospace; }
          .tracking-pending { font-size: 9.5px; font-weight: 900; letter-spacing: 0.4px; margin-bottom: 1mm; }
          .tracking-barcode { width: 92%; margin: 0 auto; }
          .Signature-line {
            margin-top: 1.5mm; font-size: 7px; text-align: left; white-space: nowrap; overflow: hidden;
          }
          .recipient-section {
            border-bottom: 2px solid #000; padding: 1.5mm 0;
          }
          .recipient-tag {
            background: #000; color: #fff; font-size: 9.5px; font-weight: 900;
            padding: 0.8mm 2.2mm; display: inline-block; margin-bottom: 1mm; letter-spacing: 0.6px;
          }
          .recipient-grid {
            display: flex; justify-content: space-between; align-items: flex-end; gap: 2mm;
          }
          .recipient-info { flex: 1; }
          .recipient-name { font-size: 12px; font-weight: 900; text-transform: uppercase; line-height: 1.15; }
          .recipient-doc { font-size: 8.5px; margin: 1px 0; }
          .recipient-addr { font-size: 10.5px; font-weight: 700; line-height: 1.2; }
          .recipient-neigh { font-size: 9.5px; }
          .recipient-city { font-size: 11px; margin-top: 1mm; }
          .cep-highlight { font-size: 12.5px; font-weight: 900; font-family: monospace; border: 1.5px solid #000; padding: 0 3px; }
          .recipient-obs { font-size: 7.5px; margin-top: 1mm; color: #111; border-top: 1px dashed #888; padding-top: 0.8mm; }
          .cep-barcode-box { width: 38mm; flex-shrink: 0; text-align: center; }
          .cep-barcode-title { font-size: 7.5px; font-weight: 800; margin-bottom: 1px; font-family: monospace; }
          .sender-section { font-size: 8px; line-height: 1.3; padding-top: 1mm; }
          .cut-line {
            text-align: center; font-size: 8px; color: #475569; margin: 3mm 0; letter-spacing: 0.5px;
          }
          .declaration-sheet {
            width: 100%; background: #fff; border: 1.5px solid #000;
            padding: 3.5mm; font-size: 9px;
            page-break-inside: avoid !important; break-inside: avoid !important;
          }
          .decl-title { font-size: 11.5px; font-weight: 900; text-align: center; border-bottom: 1.5px solid #000; padding-bottom: 3px; }
          .decl-subtitle { font-size: 8.5px; text-align: center; padding: 3px 0 5px 0; }
          .decl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px; }
          .decl-box { border: 1px solid #000; padding: 4px 6px; line-height: 1.3; font-size: 8.5px; }
          .decl-box-header { font-weight: 900; background: #e2e8f0; padding: 1.5px 4px; margin-bottom: 3px; border-bottom: 1px solid #000; }
          .decl-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 8.5px; }
          .decl-table th, .decl-table td { border: 1px solid #000; padding: 3px 5px; text-align: left; }
          .decl-table th { background: #e2e8f0; font-weight: 900; }
          .decl-legal { font-size: 7.2px; line-height: 1.28; text-align: justify; border: 1px solid #000; padding: 4px; margin-bottom: 6px; }
          .decl-sign { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 6px; font-size: 8.5px; text-align: center; }
          @media print {
            body { background: #fff; padding: 0; }
            .print-toolbar { display: none !important; }
            .print-page-wrapper { margin: 0 auto; padding: 0; box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="print-toolbar">
          <div>
            <strong>Etiqueta Correios com QR Code — Pedido #${activeShipment.orderNumber}</strong>
            <div style="font-size: 11px; color: #cbd5e1;">
              Dica: No painel de impressão, mantenha o Layout como <strong>Retrato (Vertical)</strong> para caber Etiqueta + Declaração na mesma folha A4 sem cortes.
            </div>
          </div>
          <button onclick="window.print()">🖨️ IMPRIMIR AGORA</button>
        </div>
        ${pagesHtmlList.join("\n")}
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

  const hasFailedBreadcrumbs = breadcrumbs.some((b) => b.status === "error");

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
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 inline-flex items-center gap-1">
                  <QrCode className="w-3 h-3" />
                  <span>QR Code 2D Incluso</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                Pedido <strong className="text-white font-mono">#{orderNumber}</strong> • Coleta Ativa:{" "}
                <strong className="text-emerald-400">{activePickup?.label || contractConfig.senderName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {breadcrumbs.length > 0 && (
              <button
                type="button"
                onClick={() => setShowBreadcrumbsPanel((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  hasFailedBreadcrumbs
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                }`}
                title="Exibir ou ocultar a Trilha de Migalhas (Log de Execução da API Correios)"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Log Migalhas ({breadcrumbs.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowActivationWizard((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                showActivationWizard
                  ? "bg-amber-400 text-slate-950 border-amber-300"
                  : contractConfig.hasCwsPassword
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50"
              }`}
              title="Abrir Assistente Passo a Passo para configurar ou ativar o Módulo API Correios CWS"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>
                {contractConfig.hasCwsPassword
                  ? "Módulo API CWS Ativo"
                  : "Ativar API CWS (Passo a Passo)"}
              </span>
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-300 font-semibold">
                Validando dados reais do pedido e consultando DNE Correios...
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
                    ) : feedback.type === "warn" ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
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

              {/* ===================================================================== */}
              {/* ASSISTENTE COMPLETO PASSO A PASSO DE ATIVAÇÃO DO MÓDULO API CWS        */}
              {/* ===================================================================== */}
              {showActivationWizard && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border-2 border-amber-500/60 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-amber-400" />
                        <h3 className="text-sm font-black uppercase tracking-wider text-white">
                          Assistente Passo a Passo — Ativação do Módulo Oficial API Correios (CWS)
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        Siga os 3 passos abaixo para conectar seu contrato{" "}
                        <strong className="text-white">{contractConfig.contractNumber}</strong> diretamente ao sistema web
                        dos Correios e gerar códigos de rastreio automaticamente.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowActivationWizard(false)}
                      className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 self-start"
                    >
                      Fechar Assistente
                    </button>
                  </div>

                  {/* 3 Passos Visuais */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 text-xs">
                    {/* PASSO 1 */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-black text-[10px] uppercase">
                          Passo 1 • Concluído
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      <h4 className="font-extrabold text-white text-xs">
                        1. Dados do Contrato & Cartão
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Seu Contrato AG e Cartão de Postagem da X-Point já estão homologados:
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">
                            Contrato AG
                          </label>
                          <input
                            type="text"
                            value={contractConfig.contractNumber}
                            onChange={(e) =>
                              setContractConfig((p) => ({ ...p, contractNumber: e.target.value }))
                            }
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">
                            Cartão Postagem
                          </label>
                          <input
                            type="text"
                            value={contractConfig.postcardNumber}
                            onChange={(e) =>
                              setContractConfig((p) => ({ ...p, postcardNumber: e.target.value }))
                            }
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* PASSO 2 */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/90 border-2 border-amber-500/50 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-black text-[10px] uppercase">
                          Passo 2 • Credencial CWS
                        </span>
                        <a
                          href="https://cws.correios.com.br"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-cyan-300 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Abrir Portal CWS</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <h4 className="font-extrabold text-white text-xs">
                        2. Inserir Código de Acesso à API (Token)
                      </h4>
                      <ol className="text-[10px] text-slate-300 space-y-0.5 list-decimal list-inside leading-snug">
                        <li>Acesse <strong>cws.correios.com.br</strong> com seu login Meu Correios</li>
                        <li>Clique em <strong>Gestão de Acesso a API&apos;s</strong></li>
                        <li>Gere/copie o <strong>Código de Acesso</strong> e cole abaixo:</li>
                      </ol>
                      <div className="space-y-2 pt-1">
                        <div>
                          <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">
                            Usuário Meu Correios (idCorreios)
                          </label>
                          <input
                            type="text"
                            value={contractConfig.cwsUser}
                            onChange={(e) =>
                              setContractConfig((p) => ({ ...p, cwsUser: e.target.value }))
                            }
                            placeholder="Seu login ou CNPJ (11040282000177)"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase text-amber-300 mb-0.5">
                            Código de Acesso à API (Token CWS) *
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type={showCwsPassword ? "text" : "password"}
                              value={contractConfig.cwsPassword}
                              onChange={(e) =>
                                setContractConfig((p) => ({ ...p, cwsPassword: e.target.value }))
                              }
                              placeholder="Cole aqui a chave gerada no CWS"
                              className="w-full bg-slate-950 border border-amber-500/60 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCwsPassword((prev) => !prev)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                              title="Mostrar ou ocultar Token CWS"
                            >
                              {showCwsPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PASSO 3 */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 flex flex-col justify-between space-y-2.5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-black text-[10px] uppercase">
                            Passo 3 • Ativação
                          </span>
                          <Zap className="w-4 h-4 text-cyan-400" />
                        </div>
                        <h4 className="font-extrabold text-white text-xs">
                          3. Testar & Ativar Módulo CWS
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Clique no botão abaixo para salvar seu Token CWS e autenticar seu Cartão de Postagem{" "}
                          <strong className="text-white">{contractConfig.postcardNumber}</strong> ao vivo na API dos
                          Correios.
                        </p>
                      </div>

                      <div className="space-y-2 pt-1">
                        <button
                          type="button"
                          disabled={testingCws || savingConfig}
                          onClick={handleTestCwsConnection}
                          className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${testingCws ? "animate-spin" : ""}`} />
                          <span>
                            {testingCws
                              ? "Autenticando nos Correios..."
                              : "Salvar & Ativar Módulo API CWS"}
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={savingConfig}
                          onClick={handleSaveContractConfig}
                          className="w-full py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[11px] cursor-pointer"
                        >
                          {savingConfig ? "Salvando..." : "Apenas Salvar Dados"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===================================================================== */}
              {/* TRILHA DE MIGALHAS (BREADCRUMB LOG PASSO A PASSO DA API DOS CORREIOS) */}
              {/* ===================================================================== */}
              {showBreadcrumbsPanel && breadcrumbs.length > 0 && (
                <div
                  className={`p-4 rounded-2xl border-2 space-y-3 ${
                    hasFailedBreadcrumbs
                      ? "bg-rose-950/20 border-rose-500/50"
                      : "bg-emerald-950/20 border-emerald-500/50"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Terminal
                        className={`w-4 h-4 ${
                          hasFailedBreadcrumbs ? "text-rose-400" : "text-emerald-400"
                        }`}
                      />
                      <h3 className="text-xs font-black uppercase tracking-wider text-white">
                        Rastreamento em Migalhas da Execução API Correios (Passo a Passo)
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyFullDiagnosticLog}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedLog ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Log Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Log Completo</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowBreadcrumbsPanel(false)}
                        className="text-xs text-slate-400 hover:text-white px-2 py-1"
                      >
                        Ocultar
                      </button>
                    </div>
                  </div>

                  {/* Barra Visual Horizontal de Migalhas */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {breadcrumbs.map((b, idx) => {
                      const badgeStyle =
                        b.status === "success"
                          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                          : b.status === "warning"
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                          : b.status === "error"
                          ? "bg-rose-500/25 border-rose-500 text-rose-200 font-black"
                          : "bg-slate-800/80 border-slate-700 text-slate-400";

                      return (
                        <React.Fragment key={b.step}>
                          <button
                            type="button"
                            onClick={() => toggleBreadcrumbExpanded(b.step)}
                            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${badgeStyle}`}
                          >
                            <span>
                              {b.status === "success"
                                ? "✅"
                                : b.status === "warning"
                                ? "⚠️"
                                : b.status === "error"
                                ? "❌"
                                : "⏭️"}
                            </span>
                            <span>Etapa {b.step}</span>
                          </button>
                          {idx < breadcrumbs.length - 1 && (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Lista Detalhada de Cada Migalha */}
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {breadcrumbs.map((b) => {
                      const isExpanded = expandedStepNumbers.has(b.step);
                      const rowBorder =
                        b.status === "success"
                          ? "border-emerald-500/30 bg-slate-900/90"
                          : b.status === "warning"
                          ? "border-amber-500/40 bg-slate-900/90"
                          : b.status === "error"
                          ? "border-rose-500/70 bg-rose-950/30"
                          : "border-slate-800 bg-slate-900/50 opacity-75";

                      return (
                        <div
                          key={b.step}
                          className={`rounded-xl border p-3 text-xs transition-all ${rowBorder}`}
                        >
                          <div
                            onClick={() => toggleBreadcrumbExpanded(b.step)}
                            className="flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 ${
                                  b.status === "success"
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : b.status === "warning"
                                    ? "bg-amber-500/20 text-amber-300"
                                    : b.status === "error"
                                    ? "bg-rose-500 text-white"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {b.status === "success"
                                  ? "OK"
                                  : b.status === "warning"
                                  ? "AJUSTADO"
                                  : b.status === "error"
                                  ? "FALHOU"
                                  : "BLOQUEADO"}
                              </span>
                              <span className="font-extrabold text-white truncate">{b.title}</span>
                              {b.httpStatus && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">
                                  HTTP {b.httpStatus}
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-slate-400">
                                ({b.durationMs}ms)
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-400 shrink-0">
                              <span className="text-[10px] hidden sm:inline">
                                {isExpanded ? "Recolher" : "Ver detalhes"}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-300 mt-1 font-medium">{b.summary}</p>

                          {isExpanded && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 space-y-2 text-[11px]">
                              {b.details && b.details.length > 0 && (
                                <ul className="space-y-1 text-slate-300 list-disc list-inside">
                                  {b.details.map((d, di) => (
                                    <li key={di} className="leading-relaxed">
                                      {d}
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {b.remediation && (
                                <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-400/50 text-amber-200 font-semibold">
                                  💡 <strong>Como resolver:</strong> {b.remediation}
                                </div>
                              )}

                              {b.requestPayload && (
                                <details className="bg-slate-950 rounded-lg p-2 border border-slate-800">
                                  <summary className="cursor-pointer font-bold text-cyan-300 text-[10px] uppercase">
                                    Payload Enviado para API Correios
                                  </summary>
                                  <pre className="mt-1.5 text-[10px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(b.requestPayload, null, 2)}
                                  </pre>
                                </details>
                              )}

                              {b.responsePayload && (
                                <details
                                  className="bg-slate-950 rounded-lg p-2 border border-slate-800"
                                  open={b.status === "error"}
                                >
                                  <summary className="cursor-pointer font-bold text-amber-300 text-[10px] uppercase">
                                    Resposta Recebida da API Correios
                                  </summary>
                                  <pre className="mt-1.5 text-[10px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(b.responsePayload, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ===================================================================== */}
              {/* SEÇÃO DE ENDEREÇO DE COLETA / REMETENTE (COM CADASTRO & PERSISTÊNCIA) */}
              {/* ===================================================================== */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      <span>Endereço de Coleta / Remetente Ativo</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      ✓ Último Selecionado Salvo Automaticamente
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleStartEditPickupAddress}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Alterar Endereço</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStartNewPickupAddress}
                      className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Novo Endereço de Coleta</span>
                    </button>
                  </div>
                </div>

                {/* Seletor de Endereços de Coleta Cadastrados */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-5">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Selecionar Unidade de Coleta / Expedição:
                    </label>
                    <select
                      value={selectedPickupId}
                      onChange={(e) => handleSelectPickupAddress(e.target.value)}
                      className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-white font-bold cursor-pointer"
                    >
                      {pickupAddresses.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label} (CEP {formatCepMask(p.cep)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {activePickup && (
                    <div className="md:col-span-7 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="font-bold text-white">
                          {activePickup.senderName} •{" "}
                          <span className="font-mono text-slate-300">
                            CNPJ {formatDocMask(activePickup.cnpj)}
                          </span>
                        </div>
                        <div>
                          {activePickup.street}, nº {activePickup.number}{" "}
                          {activePickup.complement ? `(${activePickup.complement})` : ""} —{" "}
                          {activePickup.neighborhood} •{" "}
                          <strong className="text-emerald-300">
                            {activePickup.city}/{activePickup.state}
                          </strong>{" "}
                          • CEP:{" "}
                          <strong className="font-mono text-white">
                            {formatCepMask(activePickup.cep)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Formulário Inline de Cadastro / Edição de Endereço de Coleta */}
                {editingPickup && (
                  <div className="p-3.5 rounded-2xl bg-slate-900 border-2 border-emerald-500/50 space-y-3 text-xs mt-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-black text-emerald-300 uppercase text-[11px]">
                        {isNewPickup
                          ? "Cadastrar Novo Endereço de Coleta / Expedição"
                          : "Editar Endereço de Coleta Selecionado"}
                      </span>
                      <div className="flex items-center gap-2">
                        {!isNewPickup && pickupAddresses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeletePickupAddress(editingPickup.id)}
                            className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Excluir</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingPickup(null)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                          Identificação da Unidade (Apelido)
                        </label>
                        <input
                          type="text"
                          value={editingPickup.label}
                          onChange={(e) =>
                            setEditingPickup((p) => (p ? { ...p, label: e.target.value } : null))
                          }
                          placeholder="Ex: Fábrica CNC / Galpão 2"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                          Razão Social / Nome Remetente
                        </label>
                        <input
                          type="text"
                          value={editingPickup.senderName}
                          onChange={(e) =>
                            setEditingPickup((p) => (p ? { ...p, senderName: e.target.value } : null))
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                            CNPJ / CPF
                          </label>
                          <input
                            type="text"
                            value={editingPickup.cnpj}
                            onChange={(e) =>
                              setEditingPickup((p) => (p ? { ...p, cnpj: e.target.value } : null))
                            }
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                            Telefone
                          </label>
                          <input
                            type="text"
                            value={editingPickup.phone}
                            onChange={(e) =>
                              setEditingPickup((p) => (p ? { ...p, phone: e.target.value } : null))
                            }
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-emerald-300 mb-1">
                          CEP Coleta
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingPickup.cep}
                            onChange={(e) =>
                              setEditingPickup((p) => (p ? { ...p, cep: e.target.value } : null))
                            }
                            placeholder="06754160"
                            className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-2 py-1.5 text-emerald-300 font-mono font-bold"
                          />
                          <button
                            type="button"
                            disabled={lookingUpPickupCep}
                            onClick={handleLookupPickupCep}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 cursor-pointer"
                            title="Buscar endereço pelo CEP no DNE"
                          >
                            <Search className={`w-3.5 h-3.5 ${lookingUpPickupCep ? "animate-spin" : ""}`} />
                          </button>
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                          Logradouro (Rua / Praça / Av.)
                        </label>
                        <input
                          type="text"
                          value={editingPickup.street}
                          onChange={(e) =>
                            setEditingPickup((p) => (p ? { ...p, street: e.target.value } : null))
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                          Número
                        </label>
                        <input
                          type="text"
                          value={editingPickup.number}
                          onChange={(e) =>
                            setEditingPickup((p) => (p ? { ...p, number: e.target.value } : null))
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                          Complemento
                        </label>
                        <input
                          type="text"
                          value={editingPickup.complement}
                          onChange={(e) =>
                            setEditingPickup((p) => (p ? { ...p, complement: e.target.value } : null))
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                          Bairro
                        </label>
                        <input
                          type="text"
                          value={editingPickup.neighborhood}
                          onChange={(e) =>
                            setEditingPickup((p) =>
                              p ? { ...p, neighborhood: e.target.value } : null
                            )
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingPickup.city}
                          onChange={(e) =>
                            setEditingPickup((p) => (p ? { ...p, city: e.target.value } : null))
                          }
                          placeholder="Cidade"
                          className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white text-xs w-44"
                        />
                        <input
                          type="text"
                          maxLength={2}
                          value={editingPickup.state}
                          onChange={(e) =>
                            setEditingPickup((p) =>
                              p ? { ...p, state: e.target.value.toUpperCase() } : null
                            )
                          }
                          placeholder="UF"
                          className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-bold text-xs w-16 uppercase"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingPickup(null)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSavePickupAddressModal}
                          className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                        >
                          Salvar & Definir como Coleta Ativa
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Se já existe etiqueta/pré-postagem gerada, mostra barra de impressão rápida em 1 clique */}
              {generatedShipment && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/40 border-2 border-emerald-500/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {generatedShipment.mode === "cws_live"
                            ? "Pré-Postagem Oficial CWS Registrada"
                            : "Etiqueta com QR Code & Declaração Pronta"}
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
                          <strong>
                            {v.trackingCode ? v.trackingCode : "Aguardando Postagem / CWS"}
                          </strong>
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
                      <span>Imprimir A4 (Etiqueta + Declaração 1 Folha)</span>
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
                      Origem: {formatCepMask(activePickup?.cep || contractConfig.senderAddress.cep)}
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
                          CPF / CNPJ (Obrigatório API)
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
                          CEP Destino (DNE)
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={recipient.cep}
                            onChange={(e) => setRecipient((p) => ({ ...p, cep: e.target.value }))}
                            placeholder="00000-000"
                            className="w-full bg-slate-900 border border-cyan-500/40 rounded-xl px-2.5 py-2 text-cyan-300 font-mono font-bold"
                          />
                          <button
                            type="button"
                            disabled={lookingUpCep}
                            onClick={handleLookupRecipientCep}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 shrink-0 cursor-pointer"
                            title="Validar e preencher endereço pelo CEP na base DNE/ViaCEP"
                          >
                            <Search className={`w-3.5 h-3.5 ${lookingUpCep ? "animate-spin" : ""}`} />
                          </button>
                        </div>
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
                          placeholder="Sala, Galpão, Loja..."
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

                          {/* Medidas, Peso, Valor Declarado e Código Objeto Real */}
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
                                Rastreio Oficial
                              </label>
                              <input
                                type="text"
                                value={vol.trackingCode || ""}
                                placeholder="Emitido via API"
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
                      <span>Imprimir Declaração de Conteúdo na mesma folha A4 abaixo da etiqueta</span>
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

        {/* Rodapé Completo com Status do Módulo CWS & Botão de Ativação Passo a Passo */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-950 border-t border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px]">
              Contrato <strong className="text-white">{contractConfig.contractNumber}</strong> • Cartão{" "}
              <strong className="text-white">{contractConfig.postcardNumber}</strong>
            </span>

            {contractConfig.hasCwsPassword ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Módulo API CWS Configurado & Ativo</span>
                <button
                  type="button"
                  onClick={() => setShowActivationWizard((p) => !p)}
                  className="ml-1 underline text-[11px] text-emerald-200 cursor-pointer"
                >
                  (Gerenciar)
                </button>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold">
                  Módulo Simplificado Ativo
                </span>
                <button
                  type="button"
                  onClick={() => setShowActivationWizard(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] transition-all cursor-pointer shadow-sm"
                >
                  ⚡ Ativar Módulo API CWS Passo a Passo
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            {/* Botão 1: Gerar Etiqueta de Endereçamento Simplificada (Com QR Code, Sem depender de API) */}
            <button
              type="button"
              disabled={Boolean(submittingMode) || loading}
              onClick={() => handleGenerateLabel("simplified")}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 border border-amber-400/50 font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              title="Prepara a Etiqueta Oficial com QR Code + Declaração de Conteúdo em 1 Folha A4 usando dados reais"
            >
              <Zap className="w-4 h-4" />
              <span>
                {submittingMode === "simplified"
                  ? "Preparando..."
                  : "Gerar Etiqueta Simplificada (QR Code)"}
              </span>
            </button>

            {/* Botão 2: Lançar no Sistema dos Correios via API CWS + Rastrear Migalhas */}
            <button
              type="button"
              disabled={Boolean(submittingMode) || loading}
              onClick={() => handleGenerateLabel("cws_live")}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-400/20 transition-all cursor-pointer disabled:opacity-50"
              title="Conecta na API Oficial CWS dos Correios, valida as 7 etapas em formato de migalhas e gera o código de rastreio oficial"
            >
              <Send className="w-4 h-4" />
              <span>
                {submittingMode === "cws_live"
                  ? "Executando 7 Etapas CWS..."
                  : "Lançar na API Correios & Gerar Etiqueta"}
              </span>
            </button>

            {/* Botão 3: Imprimir Direto */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handlePrintLabels("a4_full")}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
              title="Abrir janela de impressão imediata da Etiqueta Correios com QR Code + Declaração de Conteúdo sem cortes"
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
