"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CartItem, TotemConfiguration } from "@/types/order";
import {
  calculateSelectiveCouponDiscount,
  SelectiveCoupon,
  CouponDiscountCalculation,
} from "@/modules/pricing/couponEngine";
import {
  captureCampaignFromUrl,
  getPersistedCampaignTracking,
} from "@/lib/vouchers/campaignTracker";
import { CampaignTrackingData } from "@/types/voucher";

interface CartContextType {
  items: CartItem[];
  addItem: (configuration: TotemConfiguration, quantity?: number) => void;
  updateItem: (id: string, configuration: TotemConfiguration, quantity?: number) => void;
  duplicateItem: (id: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPriceCents: number; // Subtotal bruto sem desconto
  editingItem: CartItem | null;
  setEditingItem: (item: CartItem | null) => void;
  isInitialized: boolean;

  // Sistema de Cupons Seletivos
  appliedCoupon: SelectiveCoupon | null;
  couponDiscountCents: number;
  couponError: string | null;
  isApplyingCoupon: boolean;
  eligibleCabinetsSubtotalCents: number;
  ineligibleSubtotalCents: number;
  finalTotalPriceCents: number; // Valor final pós-desconto seletivo no gabinete
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;

  // Link Track & UTM Campaign Attribution
  campaignTracking: CampaignTrackingData | null;
}

const CART_STORAGE_KEY = "totem_pro_cart_items_v1";
const COUPON_STORAGE_KEY = "totem_pro_applied_coupon_v1";

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Cupons & Campanhas
  const [appliedCoupon, setAppliedCoupon] = useState<SelectiveCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [campaignTracking, setCampaignTracking] = useState<CampaignTrackingData | null>(null);

  // 1. Carregar itens, cupom e tracking de campanha na montagem
  useEffect(() => {
    try {
      const storedItems = localStorage.getItem(CART_STORAGE_KEY);
      if (storedItems) {
        const parsed = JSON.parse(storedItems);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }

      const storedCoupon = localStorage.getItem(COUPON_STORAGE_KEY);
      if (storedCoupon) {
        const parsedCoupon = JSON.parse(storedCoupon);
        if (parsedCoupon && parsedCoupon.code) {
          setAppliedCoupon(parsedCoupon);
        }
      }

      // Captura soberana de tracking e UTMs da URL
      const currentTracking = captureCampaignFromUrl();
      if (currentTracking) {
        setCampaignTracking(currentTracking);
        // Se a campanha trouxe um cupom/ref e ainda não há cupom aplicado
        if (currentTracking.refCode && !storedCoupon) {
          applyCoupon(currentTracking.refCode);
        }
      } else {
        const persisted = getPersistedCampaignTracking();
        if (persisted) setCampaignTracking(persisted);
      }
    } catch (err) {
      console.error("Falha ao recuperar dados do localStorage:", err);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // 2. Captura automática contínua de cupom via Query String (?cupom=, ?voucher=, ?ref=)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const queryCoupon =
      params.get("cupom") ||
      params.get("voucher") ||
      params.get("ref") ||
      params.get("influencer");

    if (queryCoupon && queryCoupon.trim()) {
      applyCoupon(queryCoupon.trim());
    }
  }, []);

  // 3. Persistir itens no localStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error("Falha ao salvar carrinho no localStorage:", err);
    }
  }, [items, isInitialized]);

  // 4. Persistir cupom no localStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      if (appliedCoupon) {
        localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(appliedCoupon));
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    } catch (err) {
      console.error("Falha ao salvar cupom no localStorage:", err);
    }
  }, [appliedCoupon, isInitialized]);

  // Aplicar Cupom com validação na API
  const applyCoupon = async (code: string): Promise<boolean> => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setCouponError("Digite o código do cupom.");
      return false;
    }

    setIsApplyingCoupon(true);
    setCouponError(null);

    try {
      const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(cleanCode)}`);
      const data = await res.json();

      if (data.ok && data.coupon) {
        setAppliedCoupon(data.coupon);
        setCouponError(null);
        return true;
      } else {
        const errorMsg = data.error || `Cupom "${cleanCode}" inválido ou expirado.`;
        setCouponError(errorMsg);
        return false;
      }
    } catch (err: any) {
      const errorMsg = "Erro ao validar cupom: " + err.message;
      setCouponError(errorMsg);
      return false;
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Remover Cupom
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  // Adicionar novo item
  const addItem = (configuration: TotemConfiguration, quantity: number = 1) => {
    const unitPrice = configuration.calculatedPriceCents;
    const newItem: CartItem = {
      id: "totem-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      configuration,
      quantity: Math.max(1, quantity),
      unitPriceCents: unitPrice,
      subtotalCents: unitPrice * Math.max(1, quantity),
    };

    setItems((prev) => [...prev, newItem]);
  };

  // Atualizar item existente
  const updateItem = (id: string, configuration: TotemConfiguration, quantity?: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = quantity !== undefined ? Math.max(1, quantity) : item.quantity;
          const unitPrice = configuration.calculatedPriceCents;
          return {
            ...item,
            configuration,
            quantity: newQty,
            unitPriceCents: unitPrice,
            subtotalCents: unitPrice * newQty,
          };
        }
        return item;
      })
    );
    setEditingItem(null);
  };

  // Duplicar configuração
  const duplicateItem = (id: string) => {
    const source = items.find((i) => i.id === id);
    if (!source) return;

    const duplicated: CartItem = {
      ...source,
      id: "totem-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      quantity: 1,
      subtotalCents: source.unitPriceCents,
    };

    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      const copy = [...prev];
      copy.splice(idx + 1, 0, duplicated);
      return copy;
    });
  };

  // Remover item
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (editingItem?.id === id) {
      setEditingItem(null);
    }
  };

  // Alterar quantidade
  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            quantity,
            subtotalCents: item.unitPriceCents * quantity,
          };
        }
        return item;
      })
    );
  };

  // Limpar carrinho
  const clearCart = () => {
    setItems([]);
    setEditingItem(null);
    setAppliedCoupon(null);
  };

  const totalItems = items.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalPriceCents = items.reduce((acc, curr) => acc + curr.subtotalCents, 0);

  // Recálculo do desconto seletivo via couponEngine
  const discountCalc = calculateSelectiveCouponDiscount(items, appliedCoupon);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateItem,
        duplicateItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPriceCents,
        editingItem,
        setEditingItem,
        isInitialized,
        appliedCoupon,
        couponDiscountCents: discountCalc.discountCents,
        couponError,
        isApplyingCoupon,
        eligibleCabinetsSubtotalCents: discountCalc.eligibleCabinetsSubtotalCents,
        ineligibleSubtotalCents: discountCalc.ineligibleSubtotalCents,
        finalTotalPriceCents: discountCalc.finalSubtotalCents,
        applyCoupon,
        removeCoupon,
        campaignTracking,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart deve ser utilizado dentro de um CartProvider");
  }
  return context;
};
