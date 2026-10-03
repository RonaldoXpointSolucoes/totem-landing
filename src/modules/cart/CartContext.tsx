"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CartItem, TotemConfiguration } from "@/types/order";

interface CartContextType {
  items: CartItem[];
  addItem: (configuration: TotemConfiguration, quantity?: number) => void;
  updateItem: (id: string, configuration: TotemConfiguration, quantity?: number) => void;
  duplicateItem: (id: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPriceCents: number;
  editingItem: CartItem | null;
  setEditingItem: (item: CartItem | null) => void;
}

const CART_STORAGE_KEY = "totem_pro_cart_items_v1";

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. Carregar itens do localStorage na montagem
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (err) {
      console.error("Falha ao recuperar carrinho do localStorage:", err);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // 2. Persistir no localStorage sempre que items mudar
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error("Falha ao salvar carrinho no localStorage:", err);
    }
  }, [items, isInitialized]);

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

  // Duplicar configuração (Crucial para compras B2B em lote de 5, 10 ou mais totens idênticos)
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
  };

  const totalItems = items.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalPriceCents = items.reduce((acc, curr) => acc + curr.subtotalCents, 0);

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
