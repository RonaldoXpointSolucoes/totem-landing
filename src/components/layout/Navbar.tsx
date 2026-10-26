"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, ArrowRight, ArrowLeft, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/modules/cart/CartContext";
import { Button } from "@/components/ui";
import { CustomerAuthModal } from "@/components/auth/CustomerAuthModal";

interface NavbarProps {
  className?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ className = "" }) => {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const [customer, setCustomer] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/customer/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.authenticated) {
          setCustomer(data.customer);
        }
      })
      .catch(() => {});
  }, []);

  const isConfigurator = pathname.startsWith("/monte-seu-totem") || pathname.startsWith("/configurador");
  const isCart = pathname.startsWith("/carrinho") || pathname.startsWith("/cart");
  const isCheckout = pathname.startsWith("/checkout");

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    if (pathname === "/") {
      e.preventDefault();
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header className={`sticky top-0 z-30 w-full border-b border-black/5 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 transition-colors duration-300 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logotipo Brand */}
        <Link
          href="/"
          onClick={handleLogoClick}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0058b6] to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#1d1d1f] dark:text-white leading-none">
              TOTEM<span className="text-[#0058b6] dark:text-cyan-400">PRO</span>
            </span>
            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium leading-tight">
              X-Point Engenharia
            </span>
          </div>
        </Link>

        {/* Links de Navegação Institucional */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <Link
            href="/#modelos"
            onClick={(e) => handleNavClick(e, "modelos")}
            className="hover:text-[#0058b6] dark:hover:text-white transition-colors"
          >
            Modelos
          </Link>
          <Link
            href="/#como-funciona"
            onClick={(e) => handleNavClick(e, "como-funciona")}
            className="hover:text-[#0058b6] dark:hover:text-white transition-colors"
          >
            Como Funciona
          </Link>
          <Link
            href="/#diferenciais"
            onClick={(e) => handleNavClick(e, "diferenciais")}
            className="hover:text-[#0058b6] dark:hover:text-white transition-colors"
          >
            Diferenciais
          </Link>
          <Link
            href="/#faq"
            onClick={(e) => handleNavClick(e, "faq")}
            className="hover:text-[#0058b6] dark:hover:text-white transition-colors"
          >
            Dúvidas (FAQ)
          </Link>
        </nav>

        {/* Ações / Utilitários do Header */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Botão de Carrinho com Badge Reativo */}
          <Link
            href="/carrinho"
            prefetch={false}
            className={`relative p-2.5 rounded-full border transition-all flex items-center justify-center ${
              isCart
                ? "border-[#0058b6] bg-blue-50 dark:bg-indigo-950/40 text-[#0058b6] dark:text-indigo-300"
                : "border-black/10 dark:border-slate-800 bg-[#f5f5f7] dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-slate-700"
            }`}
            title="Visualizar Carrinho"
            aria-label={totalItems > 0 ? `Carrinho de Compras (${totalItems})` : "Carrinho de Compras"}
          >
            <ShoppingCart className="w-4 h-4" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#0058b6] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md animate-in zoom-in-50">
                {totalItems}
              </span>
            )}
          </Link>

          {/* Área do Cliente: Minha Conta ou Entrar */}
          {customer ? (
            <Link
              href="/cliente"
              className="p-2 sm:px-3 sm:py-1.5 rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/60 text-[#0058b6] dark:text-cyan-400 hover:bg-blue-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Acessar Minha Conta e Compras"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {customer.name ? customer.name.split(" ")[0] : "Minha Conta"}
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="p-2 sm:px-3 sm:py-1.5 rounded-full border border-black/10 dark:border-slate-800 bg-[#f5f5f7] dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:border-black/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Entrar / Criar Conta"
              aria-label="Entrar na Conta"
            >
              <User className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span className="hidden sm:inline">Entrar</span>
            </button>
          )}

          {/* Botão Dinâmico de Contexto */}
          {isConfigurator ? (
            <Link href="/">
              <Button variant="outline" size="sm" className="font-semibold text-xs gap-1.5 shadow-sm">
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar à Página Inicial
              </Button>
            </Link>
          ) : isCart ? (
            <Link href="/monte-seu-totem">
              <Button variant="primary" size="sm" className="font-bold text-xs gap-1.5 shadow-md shadow-blue-500/20">
                Montar Outro Totem
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          ) : isCheckout ? (
            <Link href="/carrinho">
              <Button variant="outline" size="sm" className="font-semibold text-xs gap-1.5 shadow-sm">
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar ao Carrinho
              </Button>
            </Link>
          ) : (
            <Link
              href="/monte-seu-totem"
              prefetch={false}
              className="px-4 py-2 rounded-full bg-[#0062cc] hover:bg-[#0051a8] text-white font-semibold text-xs transition-all duration-200 shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              Montar meu Totem
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Modal de Autenticação do Cliente */}
      {isAuthModalOpen && (
        <CustomerAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(loggedCustomer) => {
            setCustomer(loggedCustomer);
            setIsAuthModalOpen(false);
          }}
        />
      )}
    </header>
  );
};
