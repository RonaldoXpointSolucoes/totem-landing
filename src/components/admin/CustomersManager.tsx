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
} from "lucide-react";
import { Card, Button } from "@/components/ui";

export const CustomersManager: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/customers");
      const json = await res.json();
      if (json.ok) {
        setCustomers(json.customers || []);
      }
    } catch (err) {
      console.error("Erro ao carregar clientes no admin:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.whatsapp?.includes(q) ||
      c.whatsappFormatted?.includes(q) ||
      c.document?.includes(q)
    );
  });

  const totalSpentAll = customers.reduce((acc, c) => acc + (c.totalSpentCents || 0), 0);

  return (
    <div className="space-y-6">
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
            <p className="text-2xl font-black text-cyan-400 mt-1">
              {customers.reduce((acc, c) => acc + (c.totalOrdersCount || 0), 0)}
            </p>
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
            placeholder="Buscar por nome, WhatsApp ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
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
          <span>Atualizar Clientes</span>
        </Button>
      </div>

      {/* Tabela de Clientes */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Cliente</th>
                <th className="p-3.5">Contato / WhatsApp</th>
                <th className="p-3.5">Origem / Acesso</th>
                <th className="p-3.5">Pedidos</th>
                <th className="p-3.5">Total Gasto</th>
                <th className="p-3.5 text-right">Ação Direta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Nenhum cliente cadastrado até o momento. Conforme as compras forem finalizadas, os clientes aparecerão aqui.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const cleanPhone = cust.whatsapp?.replace(/\D/g, "");
                  const waLink = cleanPhone ? `https://wa.me/55${cleanPhone}` : null;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-800/40 transition-colors">
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

                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          {cust.whatsappFormatted ? (
                            <p className="flex items-center gap-1.5 text-slate-200">
                              <Smartphone className="w-3 h-3 text-emerald-400" />
                              <span>{cust.whatsappFormatted}</span>
                            </p>
                          ) : (
                            <p className="text-slate-500 text-[11px]">—</p>
                          )}
                          {cust.email && (
                            <p className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <Mail className="w-3 h-3 text-blue-400" />
                              <span>{cust.email}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                          {cust.loginMethod === "whatsapp"
                            ? "WhatsApp"
                            : cust.loginMethod === "google"
                            ? "Google"
                            : "Checkout"}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-white">{cust.totalOrdersCount || 0} pedido(s)</span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-emerald-400">{formatBRL(cust.totalSpentCents || 0)}</span>
                      </td>

                      <td className="p-3.5 text-right">
                        {waLink ? (
                          <a
                            href={`${waLink}?text=Ol%C3%A1%2C%20${encodeURIComponent(
                              cust.name || ""
                            )}!%20Somos%20da%20equipe%20TotemPro%20X-Point%20Engenharia.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
