"use client";

import React from "react";
import Link from "next/link";
import {
  Cpu,
  Store,
  Stethoscope,
  ShoppingCart,
  Wrench,
  ArrowRight,
  Layers,
  Award,
} from "lucide-react";

export function SeoAuthoritySection() {
  return (
    <section
      aria-labelledby="seo-authority-heading"
      className="py-16 md:py-24 border-t border-black/5 dark:border-slate-800/80 bg-[#fbfbfd] dark:bg-[#0b0d14] text-[#1d1d1f] dark:text-slate-100 transition-colors"
    >
      <div className="max-w-6xl mx-auto px-4 space-y-14">
        {/* Cabeçalho Semântico H2 */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-[#0058b6] dark:text-cyan-400">
            Engenharia Nacional • Guia Especializado de Autoatendimento
          </span>
          <h2
            id="seo-authority-heading"
            className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#1d1d1f] dark:text-white"
          >
            Fabricante de Gabinete para Totem de Autoatendimento Sob Medida
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            A <strong>Totem Pro (X-Point Engenharia)</strong> é fabricante nacional especializada em{" "}
            <strong>gabinetes para totem de autoatendimento</strong> de piso, parede e balcão com usinagem computadorizada em{" "}
            <strong>Router CNC de precisão submilimétrica</strong>. Projetados para receber monitores touchscreen industriais,
            impressoras térmicas de cupom fiscal e leitores ópticos 2D das principais marcas homologadas no Brasil.
          </p>
        </div>

        {/* Grid de Aplicações por Segmento (H3 Semânticos para Caudas Longas no Google) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <article className="p-6 rounded-3xl bg-white dark:bg-slate-900/70 border border-black/5 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-700 dark:text-orange-400 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white">
              Totem para Restaurante, Fast-Food e Açaí
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Elimine filas no caixa e aumente o ticket médio em até 30% em hamburguerias, pizzarias, cafeterias e lojas de açaí.
              Compatível com cardápio digital touch, pagamento via PinPad TEF/PIX e impressão automática de comanda na cozinha.
            </p>
            <Link
              href="/monte-seu-totem?modelo=cabinet-floor"
              prefetch={false}
              className="inline-flex items-center gap-1 py-1 text-xs font-bold text-[#0058b6] dark:text-cyan-400 hover:underline pt-1"
            >
              Configurar Totem de Piso
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </article>

          <article className="p-6 rounded-3xl bg-white dark:bg-slate-900/70 border border-black/5 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white">
              Totem de Senha para Clínicas e Hospitais
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Ideal para recepção de laboratórios, clínicas médicas, odontológicas e cartórios. Modelos compactos de balcão e
              parede para retirada de senhas de atendimento, triagem rápida e check-in de pacientes com alta durabilidade.
            </p>
            <Link
              href="/monte-seu-totem?modelo=cabinet-countertop"
              prefetch={false}
              className="inline-flex items-center gap-1 py-1 text-xs font-bold text-[#0058b6] dark:text-cyan-400 hover:underline pt-1"
            >
              Configurar Totem de Balcão
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </article>

          <article className="p-6 rounded-3xl bg-white dark:bg-slate-900/70 border border-black/5 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white">
              Self-Checkout para Mercados e Varejo
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Gabinetes com janela dedicada para leitor de código de barras 1D/2D e QR Code embutido (Honeywell, Elgin Flash,
              Bematech), suporte para máquina de cartão e impressora fiscal de 80mm para minimercados e lojas de conveniência.
            </p>
            <Link
              href="/monte-seu-totem?modelo=cabinet-wall"
              prefetch={false}
              className="inline-flex items-center gap-1 py-1 text-xs font-bold text-[#0058b6] dark:text-cyan-400 hover:underline pt-1"
            >
              Configurar Totem de Parede
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </article>

          <article className="p-6 rounded-3xl bg-white dark:bg-slate-900/70 border border-black/5 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white">
              Software Houses e Integradores PDV
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Fornecemos gabinetes industriais em escala para empresas de software de autoatendimento e automação comercial.
              Compre apenas a estrutura mecânica usinada sob medida para os periféricos que você já revende ao seu cliente.
            </p>
            <Link
              href="/modelos"
              className="inline-flex items-center gap-1 py-1 text-xs font-bold text-[#0058b6] dark:text-cyan-400 hover:underline pt-1"
            >
              Ver Catálogo de Gabinetes
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </article>
        </div>

        {/* Tabela Comparativa Semântica (Otimizada para Featured Snippet / Posição Zero do Google) */}
        <div className="bg-white dark:bg-slate-900/80 border border-black/5 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#1d1d1f] dark:text-white">
                Quanto custa um Totem de Autoatendimento no Brasil?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Compare o custo real de aquisição entre um totem fechado tradicional e a montagem inteligente Totem Pro:
              </p>
            </div>
            <Link
              href="/monte-seu-totem"
              prefetch={false}
              className="px-5 py-2.5 rounded-full bg-[#0062cc] hover:bg-[#0051a8] text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shrink-0 shadow-md shadow-blue-500/20"
            >
              Simular Orçamento Online
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <th className="py-3 pr-4 font-bold">Modalidade de Compra</th>
                  <th className="py-3 px-4 font-bold">Equipamentos Inclusos</th>
                  <th className="py-3 px-4 font-bold">Investimento Médio</th>
                  <th className="py-3 pl-4 font-bold">Economia Real</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                <tr>
                  <td className="py-3.5 pr-4 font-bold text-[#1d1d1f] dark:text-white">
                    1. Apenas o Gabinete Totem Pro (Balcão, Parede ou Piso)
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    Gabinete em MaDeFibra BP 15mm usinado na Router CNC para encaixar seus próprios periféricos
                  </td>
                  <td className="py-3.5 px-4 font-extrabold text-emerald-800 dark:text-emerald-400">
                    A partir de R$ 950 à vista no PIX
                  </td>
                  <td className="py-3.5 pl-4 font-semibold text-emerald-800 dark:text-emerald-400">
                    Até 70% de economia (use peças próprias)
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 pr-4 font-bold text-[#1d1d1f] dark:text-white">
                    2. Gabinete + Kit Completo de Hardware Homologado
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    Gabinete CNC + Computador All-in-One Touch 23.8&quot; + Impressora Térmica 80mm + Leitor 2D + Cabos
                  </td>
                  <td className="py-3.5 px-4 font-extrabold text-[#0058b6] dark:text-cyan-400">
                    A partir de R$ 4.900 à vista (ou 10x)
                  </td>
                  <td className="py-3.5 pl-4 font-semibold text-emerald-800 dark:text-emerald-400">
                    Mais de 50% de economia vs. mercado
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 pr-4 font-medium text-slate-600 dark:text-slate-400">
                    3. Totem Tradicional de Revenda Fechada
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                    Equipamento proprietário fechado com manutenção restrita à fábrica
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-400 line-through">
                    R$ 8.900 a R$ 14.500
                  </td>
                  <td className="py-3.5 pl-4 text-slate-600 dark:text-slate-400">
                    Sem economia (alto markup intermediário)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Especificações Técnicas de Engenharia & Links Internos Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-[#0058b6] dark:text-cyan-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white">
                Homologado para Elgin, Epson, Bematech e Gertec
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Furação VESA 75x75 e 100x100 para monitores touch de 15.6&quot; a 23.8&quot;, berço interno para impressoras
                Epson TM-T20X, Elgin i9, Bematech MP-4200 TH e leitores 2D fixos.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white">
                Você Mesmo Monta ou Recebe Montado
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Montagem intuitiva em menos de 30 minutos com marcações CNC exatas, ou opção de contratação do serviço de
                montagem industrial para receber o totem pronto para ligar na tomada.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-700 dark:text-purple-400 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white">
                Envio Seguro para Todo o Brasil
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Cálculo de frete em tempo real via Correios (PAC e SEDEX) e transportadoras homologadas para todas as capitais
                e interior do Brasil com embalagem reforçada.
              </p>
            </div>
          </div>
        </div>

        {/* Silo de Navegação Semântica para Indexação Profunda */}
        <nav
          aria-label="Links Rápidos de Modelos e Soluções de Totem de Autoatendimento"
          className="pt-6 border-t border-black/5 dark:border-slate-800/80 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
        >
          <Link href="/modelos" className="py-1.5 px-1 hover:text-[#0058b6] dark:hover:text-cyan-400 transition-colors">
            Modelos de Totem de Autoatendimento
          </Link>
          <Link
            href="/monte-seu-totem?modelo=cabinet-floor"
            className="py-1.5 px-1 hover:text-[#0058b6] dark:hover:text-cyan-400 transition-colors"
          >
            Gabinete Totem de Piso
          </Link>
          <Link
            href="/monte-seu-totem?modelo=cabinet-wall"
            className="py-1.5 px-1 hover:text-[#0058b6] dark:hover:text-cyan-400 transition-colors"
          >
            Gabinete Totem de Parede
          </Link>
          <Link
            href="/monte-seu-totem?modelo=cabinet-countertop"
            className="py-1.5 px-1 hover:text-[#0058b6] dark:hover:text-cyan-400 transition-colors"
          >
            Gabinete Totem de Balcão
          </Link>
          <Link href="/como-funciona" className="py-1.5 px-1 hover:text-[#0058b6] dark:hover:text-cyan-400 transition-colors">
            Como Montar um Totem (-50%)
          </Link>
          <Link href="/diferenciais" className="py-1.5 px-1 hover:text-[#0058b6] dark:hover:text-cyan-400 transition-colors">
            Usinagem Router CNC
          </Link>
          <Link href="/faq" className="py-1.5 px-1 hover:text-[#0058b6] dark:hover:text-cyan-400 transition-colors">
            Perguntas Frequentes (FAQ)
          </Link>
        </nav>
      </div>
    </section>
  );
}
