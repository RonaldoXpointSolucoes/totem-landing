"use client";

import React, { useState } from "react";
import { Modal, Input, Button, Badge } from "@/components/ui";
import { Wrench, CheckCircle2, ShieldAlert, ArrowRight, ExternalLink, RefreshCw } from "lucide-react";

interface ConfiguratorModalCustomizationProps {
  isOpen: boolean;
  onClose: () => void;
  cabinetModelId?: string;
  colorId?: string;
}

export const ConfiguratorModalCustomization: React.FC<ConfiguratorModalCustomizationProps> = ({
  isOpen,
  onClose,
  cabinetModelId = "cabinet-floor",
  colorId = "color-white",
}) => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [trackingInfo, setTrackingInfo] = useState<{ orderNumber: string; trackingUrl: string } | null>(null);

  // Campos
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [equipmentType, setEquipmentType] = useState<"monitor" | "printer" | "reader">("monitor");
  const [equipmentBrand, setEquipmentBrand] = useState("");
  const [equipmentModel, setEquipmentModel] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/customizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: customerName,
            whatsapp: customerWhatsapp,
            email: customerEmail,
          },
          cabinetModelId,
          colorId,
          equipmentType,
          equipmentBrand,
          equipmentModel,
          notes,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setTrackingInfo({
          orderNumber: json.orderNumber,
          trackingUrl: json.trackingUrl,
        });
        setSubmitted(true);
      } else {
        setErrorMsg(json.error || "Falha ao submeter solicitação.");
      }
    } catch (err: any) {
      setErrorMsg("Erro de conexão: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setErrorMsg("");
    setTrackingInfo(null);
    setEquipmentBrand("");
    setEquipmentModel("");
    setNotes("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title="Personalização Especial de Gabinete"
      description="Para equipamentos fora da lista homologada, nossa engenharia projeta o gabarito sob medida na Router CNC."
    >
      {submitted && trackingInfo ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white">Solicitação Enviada para Análise!</h4>
            <span className="text-xs font-mono font-bold text-indigo-400 mt-1 block">
              Código: {trackingInfo.orderNumber}
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
            Seu pedido entra como <strong>"Aguardando Análise Técnica"</strong>. Um engenheiro avaliará o modelo
            e emitirá o parecer com o orçamento de usinagem caso haja acréscimo.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <a
              href={trackingInfo.trackingUrl}
              target="_blank"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
            >
              <span>Acompanhar Orçamento</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <Button variant="outline" size="sm" onClick={handleReset} className="w-full sm:w-auto">
              Voltar ao Configurador
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Dados do Cliente */}
          <div className="space-y-2 p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400 block">
              Seus Dados para Contato da Engenharia
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                label="Seu Nome / Empresa"
                placeholder="Ex: Carlos Silva"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
              <Input
                label="WhatsApp"
                placeholder="(11) 99999-9999"
                value={customerWhatsapp}
                onChange={(e) => setCustomerWhatsapp(e.target.value)}
                required
              />
              <Input
                label="E-mail"
                placeholder="seu@email.com"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Tipo de Equipamento */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Tipo de Equipamento Especial:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "monitor", label: "Monitor / Tela" },
                { id: "printer", label: "Impressora" },
                { id: "reader", label: "Leitor / Outro" },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setEquipmentType(t.id as any)}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-colors ${
                    equipmentType === t.id
                      ? "border-indigo-500 bg-indigo-950/40 text-indigo-300"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Fabricante / Marca"
              placeholder="Ex: LG, Positivo, Elgin..."
              value={equipmentBrand}
              onChange={(e) => setEquipmentBrand(e.target.value)}
              required
            />
            <Input
              label="Modelo / Código Técnico"
              placeholder="Ex: 24MP400, i7 Pro..."
              value={equipmentModel}
              onChange={(e) => setEquipmentModel(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Observações Técnicas / Medidas / Abertura:
            </label>
            <textarea
              rows={3}
              placeholder="Descreva detalhes como tamanho de tela, posição de cabos ou necessidades de recorte..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border bg-slate-900/80 border-slate-700/80 text-slate-100 placeholder:text-slate-500 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              <strong>Regra de Segurança Comercial:</strong> O cliente nunca digita preços adicionais. O pedido
              é avaliado pela equipe técnica e retornado com a precificação oficial.
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Enviando...
                </>
              ) : (
                "Enviar para Engenharia"
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
