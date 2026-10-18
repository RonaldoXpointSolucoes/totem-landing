"use client";

import React, { useState, useEffect } from "react";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import {
  Users,
  Search,
  MessageCircle,
  Mail,
  Smartphone,
  Package,
  Calendar,
  DollarSign,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Edit2,
  Trash2,
  X,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MapPin,
  Clock,
} from "lucide-react";
import { Card, Button } from "@/components/ui";

interface CustomerData {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  whatsappFormatted: string;
  document?: string;
  personType: "individual" | "company";
  loginMethod: string;
  totalOrdersCount: number;
  totalSpentCents: number;
  lastOrderNumber?: string;
  lastOrderDate?: string;
  lastOrderStatus?: string;
  lastOrderTotalCents?: number;
  notes?: string;
  defaultAddress?: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
}

export const CustomersManager: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Estados de Edição
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    whatsapp: "",
    document: "",
    personType: "individual" as "individual" | "company",
    notes: "",
    cep: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Estados de Exclusão
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/customers");
      const json = await res.json();
      if (json.ok) {
        setCustomers(json.customers || []);
      } else {
        setFeedbackMsg({ type: "error", text: json.error || "Erro ao carregar clientes." });
      }
    } catch (err: any) {
      console.error("Erro ao carregar clientes no admin:", err);
      setFeedbackMsg({ type: "error", text: "Erro ao conectar com o servidor." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Abre modal de edição preenchendo o formulário
  const handleOpenEdit = (customer: CustomerData) => {
    setEditingCustomer(customer);
    const addr = customer.defaultAddress || {};
    setEditForm({
      name: customer.name || "",
      email: customer.email || "",
      whatsapp: customer.whatsappFormatted || customer.whatsapp || "",
      document: customer.document || "",
      personType: customer.personType || "individual",
      notes: customer.notes || "",
      cep: addr.cep || "",
      street: addr.street || "",
      number: addr.number || "",
      neighborhood: addr.neighborhood || "",
      city: addr.city || "",
      state: addr.state || "",
    });
  };

  // Salva edições no backend
  const handleSaveCustomer = async () => {
    if (!editingCustomer) return;
    setIsSavingEdit(true);

    try {
      const res = await fetch("/api/admin/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCustomer.id,
          name: editForm.name,
          email: editForm.email,
          whatsapp: editForm.whatsapp,
          document: editForm.document,
          personType: editForm.personType,
          notes: editForm.notes,
          defaultAddress: {
            cep: editForm.cep,
            street: editForm.street,
            number: editForm.number,
            neighborhood: editForm.neighborhood,
            city: editForm.city,
            state: editForm.state,
          },
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setFeedbackMsg({ type: "success", text: `Cliente "${editForm.name}" atualizado com sucesso!` });
        setEditingCustomer(null);
        await loadCustomers();
      } else {
        setFeedbackMsg({ type: "error", text: json.error || "Falha ao salvar cliente." });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: "Erro ao salvar alterações: " + err.message });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Executa a exclusão no backend
  const handleConfirmDelete = async () => {
    if (!deletingCustomer) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/customers?id=${deletingCustomer.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (json.ok) {
        setFeedbackMsg({ type: "success", text: `Cliente "${deletingCustomer.name}" excluído com sucesso.` });
        setDeletingCustomer(null);
        await loadCustomers();
      } else {
        setFeedbackMsg({ type: "error", text: json.error || "Falha ao excluir cliente." });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: "Erro ao excluir cliente: " + err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.whatsapp?.includes(q) ||
      c.whatsappFormatted?.includes(q) ||
      c.document?.includes(q) ||
      c.lastOrderNumber?.toLowerCase().includes(q)
    );
  });

  const totalSpentAll = customers.reduce((acc, c) => acc + (c.totalSpentCents || 0), 0);
  const totalOrdersAll = customers.reduce((acc, c) => acc + (c.totalOrdersCount || 0), 0);

  // Formatação de status de pedido
  const formatStatus = (status?: string) => {
    switch (status) {
      case "paid":
      case "pago":
        return { label: "Pago", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
      case "in_production":
        return { label: "Em Produção CNC", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
      case "shipped":
        return { label: "Enviado", bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" };
      case "delivered":
        return { label: "Entregue", bg: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
      case "cancelled":
        return { label: "Cancelado", bg: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
      default:
        return { label: "Aguardando Pgto", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-lg ${
            feedbackMsg.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/5"
              : "bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-rose-500/5"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header e Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-slate-900 border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Clientes</p>
            <p className="text-2xl font-black text-white mt-1">{customers.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume em Compras</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{formatBRL(totalSpentAll)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Totens Vendidos</p>
            <p className="text-2xl font-black text-cyan-400 mt-1">{totalOrdersAll}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Barra de Busca e Atualização */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, WhatsApp, e-mail ou pedido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadCustomers}
          disabled={isLoading}
          className="text-xs font-semibold gap-1.5 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Sincronizar com Pedidos</span>
        </Button>
      </div>

      {/* Tabela de Clientes com Consistência de Último Pedido e Ações CRUD */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Cliente</th>
                <th className="p-3.5">Contato / WhatsApp</th>
                <th className="p-3.5">Origem</th>
                <th className="p-3.5">Último Pedido</th>
                <th className="p-3.5">Histórico</th>
                <th className="p-3.5">Total Gasto</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const cleanPhone = cust.whatsapp?.replace(/\D/g, "");
                  const waLink = cleanPhone ? `https://wa.me/55${cleanPhone}` : null;
                  const st = formatStatus(cust.lastOrderStatus);

                  return (
                    <tr key={cust.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* 1. Cliente */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center shrink-0">
                            {cust.name ? cust.name.slice(0, 2).toUpperCase() : "CL"}
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs">{cust.name || "Cliente sem nome"}</p>
                            {cust.document && (
                              <p className="text-[10px] text-slate-400 font-mono">Doc: {cust.document}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Contato / WhatsApp */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          {cust.whatsappFormatted || cust.whatsapp ? (
                            <p className="flex items-center gap-1.5 text-slate-200">
                              <Smartphone className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>{cust.whatsappFormatted || cust.whatsapp}</span>
                            </p>
                          ) : (
                            <p className="text-slate-500 text-[11px]">—</p>
                          )}
                          {cust.email && (
                            <p className="flex items-center gap-1.5 text-slate-400 text-[11px] truncate max-w-[200px]" title={cust.email}>
                              <Mail className="w-3 h-3 text-blue-400 shrink-0" />
                              <span className="truncate">{cust.email}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 3. Origem / Acesso */}
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                          {cust.loginMethod === "whatsapp"
                            ? "WhatsApp"
                            : cust.loginMethod === "google"
                            ? "Google"
                            : "Checkout"}
                        </span>
                      </td>

                      {/* 4. Último Pedido (Garantia de Consistência) */}
                      <td className="p-3.5">
                        {cust.lastOrderNumber ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-white text-[11px] bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                                #{cust.lastOrderNumber}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${st.bg}`}>
                                {st.label}
                              </span>
                            </div>
                            {cust.lastOrderDate && (
                              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{new Date(cust.lastOrderDate).toLocaleDateString("pt-BR")}</span>
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs italic">Nenhum pedido</span>
                        )}
                      </td>

                      {/* 5. Histórico de Pedidos */}
                      <td className="p-3.5">
                        <span className="font-bold text-white">{cust.totalOrdersCount || 0} pedido(s)</span>
                      </td>

                      {/* 6. Total Gasto */}
                      <td className="p-3.5">
                        <span className="font-bold text-emerald-400">{formatBRL(cust.totalSpentCents || 0)}</span>
                      </td>

                      {/* 7. Ações: WhatsApp + Editar + Excluir */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {waLink && (
                            <a
                              href={`${waLink}?text=Ol%C3%A1%2C%20${encodeURIComponent(
                                cust.name || ""
                              )}!%20Somos%20da%20equipe%20TotemPro%20X-Point%20Engenharia.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors"
                              title="Conversar no WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cust)}
                            className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors"
                            title="Editar Dados do Cliente"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingCustomer(cust)}
                            className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                            title="Excluir Cliente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ======================================================== */}
      {/* MODAL: EDITAR CLIENTE (SaaS Glassmorphism) */}
      {/* ======================================================== */}
      {editingCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setEditingCustomer(null)}
        >
          <div
            className="bg-slate-900 border-2 border-indigo-500/40 rounded-3xl shadow-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-4 animate-in zoom-in-95 duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Editar Cliente</h3>
                  <p className="text-[11px] text-slate-400">
                    Atualize os dados e garanta consistência com os pedidos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário de Edição */}
            <div className="space-y-3.5 text-xs">
              {/* Nome */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Nome do cliente ou empresa..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Contatos em Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="email@cliente.com..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    value={editForm.whatsapp}
                    onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                    placeholder="(11) 99999-8888"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Documento e Tipo de Pessoa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">CPF ou CNPJ</label>
                  <input
                    type="text"
                    value={editForm.document}
                    onChange={(e) => setEditForm({ ...editForm, document: e.target.value })}
                    placeholder="000.000.000-00 ou CNPJ..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Tipo de Pessoa</label>
                  <select
                    value={editForm.personType}
                    onChange={(e) =>
                      setEditForm({ ...editForm, personType: e.target.value as "individual" | "company" })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="individual">Pessoa Física (CPF)</option>
                    <option value="company">Pessoa Jurídica (CNPJ)</option>
                  </select>
                </div>
              </div>

              {/* Endereço Principal */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Endereço de Entrega Principal</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <input
                      type="text"
                      value={editForm.cep}
                      onChange={(e) => setEditForm({ ...editForm, cep: e.target.value })}
                      placeholder="CEP..."
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-[11px]"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={editForm.street}
                      onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                      placeholder="Logradouro / Rua..."
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-[11px]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1">
                    <input
                      type="text"
                      value={editForm.number}
                      onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                      placeholder="Nº..."
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-[11px]"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="text"
                      value={editForm.neighborhood}
                      onChange={(e) => setEditForm({ ...editForm, neighborhood: e.target.value })}
                      placeholder="Bairro..."
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-[11px]"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="text"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      placeholder="Cidade..."
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-[11px]"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="text"
                      value={editForm.state}
                      onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                      placeholder="UF..."
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Observações Internas */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Notas Internas / Histórico Comercial
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Informações adicionais do cliente, restrições de entrega ou histórico de contato..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-[11px]"
                />
              </div>
            </div>

            {/* Rodapé de Ações do Modal */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingCustomer(null)}
                disabled={isSavingEdit}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveCustomer}
                disabled={isSavingEdit}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {isSavingEdit ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE CLIENTE */}
      {/* ======================================================== */}
      {deletingCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setDeletingCustomer(null)}
        >
          <div
            className="bg-slate-900 border-2 border-rose-500/40 rounded-3xl shadow-2xl p-6 w-full max-w-md space-y-4 animate-in zoom-in-95 duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Excluir Cliente?</h3>
                <p className="text-xs text-slate-400">Esta ação remove o cadastro de acesso deste cliente.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <p className="font-bold text-white">{deletingCustomer.name}</p>
              <p className="text-slate-400">{deletingCustomer.email || deletingCustomer.whatsapp}</p>
              {deletingCustomer.totalOrdersCount > 0 && (
                <div className="pt-2 mt-2 border-t border-slate-800 text-amber-400 text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Atenção: Este cliente possui {deletingCustomer.totalOrdersCount} pedido(s) registrado(s) (
                    {formatBRL(deletingCustomer.totalSpentCents)}). O histórico dos pedidos continuará preservado no
                    financeiro.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingCustomer(null)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sim, Excluir Cliente</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
