"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme] = useState<Theme>("light");

  useEffect(() => {
    // Força tema claro uniforme em todo o site
    try {
      localStorage.removeItem("totem_pro_theme");
      const root = document.documentElement;
      root.classList.remove("dark");
      root.classList.add("light");
    } catch (e) {
      // Ignora erro em ambientes restritos de storage
    }
  }, []);

  const setTheme = () => {
    // Modo claro permanente
  };

  const toggleTheme = () => {
    // Modo claro permanente
  };

  return (
    <ThemeContext.Provider value={{ theme: "light", setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme deve ser usado dentro de um ThemeProvider");
  }
  return context;
}
