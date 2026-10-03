"use client";

import React, { useState } from "react";
import { Modal, Input, Button, Badge } from "@/components/ui";
import { Wrench, CheckCircle2, ShieldAlert } from "lucide-react";

interface ConfiguratorModalCustomizationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfiguratorModalCustomization: React.FC<ConfiguratorModalCustomizationProps> = ({
  isOpen,
  onClose,
}) => {
  const [submitted, setSubmitted] = useState(false);
  const [equipmentType, setEquipmentType] = useState("monitor");
  const [equipmentBrand, setEquipmentBrand] = useState("");
  const [equipmentModel, setEquipmentModel] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
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
      description="Para equipamentos fora da lista homologada, nossa engenharia projeta o gabarito sob medida."
    >
      {submitted ? (
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white">Solicitação Enviada para Análise!</h4>
          <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
            Seu pedido entra como <strong>"Aguardando Análise Técnica"</strong>. Um engenheiro avaliará o modelo
            e adicionará o parecer com o orçamento de usinagem caso haja acréscimo.
          </p>
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={handleReset}>
              Voltar ao Configurador
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
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
                  onClick={() => setEquipmentType(t.id)}
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
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Enviar para Engenharia
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
