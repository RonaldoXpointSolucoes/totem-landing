"use client";

import React, { useState, useEffect } from "react";
import { useUrlParamState } from "@/lib/navigation/useUrlParamState";
import { WhitelistUser } from "@/lib/auth/whitelistStore";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import {
  Users,
  UserPlus,
  Shield,
  Tag,
  Percent,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  Copy,
  ExternalLink,
  Search,
  AlertCircle,
  X,
  CreditCard,
  Share2,
} from "lucide-react";

export const TeamManager: React.FC = () => {
  const [users, setUsers] = useState<WhitelistUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useUrlParamState<string>("teamSearch", "");
  const [roleFilter, setRoleFilter] = useUrlParamState<"all" | "admin" | "seller">(
    "teamRole",
    "all",
    {
      validValues: ["all", "admin", "seller"] as const,
      writeDefaultToUrl: true,
    }
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  // Form State
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "seller">("seller");
  const [formCoupon, setFormCoupon] = useState("");
  const [formDiscount, setFormDiscount] = useState("10");
  const [formCommission, setFormCommission] = useState("8");
  const [formPix, setFormPix] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (json.ok) {
        setUsers(json.data || []);
      }
    } catch (err) {
      console.error("Erro ao carregar equipe:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleStatus = async (user: WhitelistUser) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, status: newStatus }),
      });
      const json = await res.json();
      if (json.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
        );
      }
    } catch (err) {
      console.error("Erro ao alternar status:", err);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover o acesso de "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
      }
    } catch (err) {
      console.error("Erro ao excluir usuário:", err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      const payload: any = {
        email: formEmail,
        name: formName,
        role: formRole,
        status: "active",
      };

      if (formRole === "seller") {
        if (!formCoupon.trim()) {
          setFormError("Informe o código do cupom de desconto para o vendedor.");
          setIsSubmitting(false);
          return;
        }
        payload.couponCode = formCoupon.trim().toUpperCase();
        payload.discountPercent = Number(formDiscount) || 10;
        payload.commissionPercent = Number(formCommission) || 8;
        payload.pixKey = formPix.trim();
        payload.phone = formPhone.trim();
      }

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.ok) {
        setShowAddModal(false);
        resetForm();
        loadUsers();
      } else {
        setFormError(json.error || "Erro ao salvar usuário.");
      }
    } catch (err: any) {
      setFormError("Erro de comunicação: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormEmail("");
    setFormName("");
    setFormRole("seller");
    setFormCoupon("");
    setFormDiscount("10");
    setFormCommission("8");
    setFormPix("");
    setFormPhone("");
    setFormError("");
  };

  const copyAffiliateLink = (couponCode: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://totempro.com.br";
    const link = `${origin}/monte-seu-totem?cupom=${couponCode}`;
    navigator.clipboard.writeText(link);
    setCopiedCoupon(couponCode);
    setTimeout(() => setCopiedCoupon(null), 2500);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.couponCode && u.couponCode.toLowerCase().includes(search.toLowerCase()));

    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalSellers = users.filter((u) => u.role === "seller").length;
  const activeSellers = users.filter((u) => u.role === "seller" && u.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Contas Google Autorizadas
            </div>
            <div className="text-2xl font-black text-white">{users.length}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Vendedores & Cupons Ativos
            </div>
            <div className="text-2xl font-black text-white">
              {activeSellers} <span className="text-xs font-normal text-slate-400">de {totalSellers}</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Acesso Vendedor
            </div>
            <div className="text-sm font-bold text-slate-200 mt-1">Portal Oficial do Vendedor</div>
          </div>
          <a
            href="/vendedor"
            target="_blank"
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-indigo-300 flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <span>Ver Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Barra de Ações: Filtro + Busca + Botão Adicionar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail do Google ou cupom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtros de Papel */}
          <div className="inline-flex p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setRoleFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                roleFilter === "all" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setRoleFilter("seller")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                roleFilter === "seller" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Vendedores
            </button>
            <button
              onClick={() => setRoleFilter("admin")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                roleFilter === "admin" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Admins
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Adicionar Conta Google</span>
          </button>
        </div>
      </div>

      {/* Tabela de Usuários da Whitelist */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="text-xs">Carregando contas da Whitelist...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Users className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-bold text-white">Nenhum usuário encontrado</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Nenhuma conta Google corresponde aos filtros aplicados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3.5 px-4">Usuário / Google</th>
                  <th className="py-3.5 px-4">Papel & Acesso</th>
                  <th className="py-3.5 px-4">Cupom & Desconto</th>
                  <th className="py-3.5 px-4">Comissão & PIX</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Usuário / Google */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {user.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{user.name}</div>
                          <div className="text-slate-400 text-[11px] font-mono flex items-center gap-1">
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Papel */}
                    <td className="py-4 px-4">
                      {user.role === "admin" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold text-[11px]">
                          <Shield className="w-3.5 h-3.5" />
                          <span>Administrador</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold text-[11px]">
                          <Tag className="w-3.5 h-3.5" />
                          <span>Vendedor / Afiliado</span>
                        </span>
                      )}
                    </td>

                    {/* Cupom & Desconto */}
                    <td className="py-4 px-4">
                      {user.couponCode ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-black text-xs tracking-wider">
                              {user.couponCode}
                            </span>
                            <button
                              onClick={() => copyAffiliateLink(user.couponCode!)}
                              title="Copiar link de divulgação deste vendedor"
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {copiedCoupon === user.couponCode && (
                              <span className="text-[10px] text-emerald-400 font-bold animate-in fade-in">
                                Copiado!
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Desconto cliente:{" "}
                            <span className="font-bold text-white">{user.discountPercent || 10}%</span> (no gabinete)
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Sem cupom</span>
                      )}
                    </td>

                    {/* Comissão & PIX */}
                    <td className="py-4 px-4">
                      {user.role === "seller" ? (
                        <div className="space-y-0.5">
                          <div className="text-slate-300 font-semibold">
                            Comissão:{" "}
                            <span className="text-cyan-400 font-bold">{user.commissionPercent || 8}%</span>
                          </div>
                          {user.pixKey && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                              <CreditCard className="w-3 h-3 text-slate-500" />
                              <span>PIX: {user.pixKey}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                          user.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                        }`}
                      >
                        {user.status === "active" ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Ativo</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-500" />
                            <span>Inativo</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Ações */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {user.couponCode && (
                          <button
                            onClick={() => copyAffiliateLink(user.couponCode!)}
                            title="Copiar Link de Afiliado"
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-indigo-600/20 text-slate-400 hover:text-indigo-400 transition-colors"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          title="Excluir acesso da Whitelist"
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Criação de Usuário na Whitelist */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cadastrar Conta Google na Whitelist</h3>
                <p className="text-xs text-slate-400">
                  Permita o acesso de novos administradores ou vendedores/influenciadores
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
              {/* E-mail do Google */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  E-mail da Conta Google <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="usuario@gmail.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  A pessoa usará este e-mail para logar no botão "Continuar com o Google".
                </span>
              </div>

              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Silva"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Cargo / Role */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Papel de Acesso</label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      formRole === "seller"
                        ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-300"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="seller"
                      checked={formRole === "seller"}
                      onChange={() => setFormRole("seller")}
                      className="hidden"
                    />
                    <Tag className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Vendedor / Afiliado</div>
                      <div className="text-[10px] opacity-75">Acessa /vendedor com cupons</div>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      formRole === "admin"
                        ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-300"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={formRole === "admin"}
                      onChange={() => setFormRole("admin")}
                      className="hidden"
                    />
                    <Shield className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Administrador</div>
                      <div className="text-[10px] opacity-75">Acesso total ao /admin</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Configurações de Vendedor */}
              {formRole === "seller" && (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                  <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Configurações do Cupom & Repasse</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Código do Cupom de Desconto <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: CARLOS10"
                      value={formCoupon}
                      onChange={(e) => setFormCoupon(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-emerald-400 placeholder-slate-600 uppercase focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        % Desconto no Gabinete
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={formDiscount}
                          onChange={(e) => setFormDiscount(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">
                          %
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        % Comissão do Vendedor
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={formCommission}
                          onChange={(e) => setFormCommission(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Chave PIX do Vendedor (para repasses)
                    </label>
                    <input
                      type="text"
                      placeholder="CPF, CNPJ, Telefone ou E-mail PIX"
                      value={formPix}
                      onChange={(e) => setFormPix(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Adicionar à Whitelist</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
