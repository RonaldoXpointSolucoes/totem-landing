"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import CarrinhoPage from "../carrinho/page";

export default function CartAliasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/carrinho");
  }, [router]);

  return <CarrinhoPage />;
}
