import React from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout";
import { Footer } from "@/components/marketing";
import { SharedAssemblyLoader } from "@/components/cart/SharedAssemblyLoader";
import { getSharedCartByCode } from "@/lib/cart/sharedCartStore";
import { formatBRL } from "@/modules/pricing/pricingEngine";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const result = await getSharedCartByCode(code, { incrementViews: false });

  if (!result) {
    return {
      title: "Montagem Compartilhada — Totem Pro",
      description:
        "Monte seu totem de autoatendimento sob medida com furação CNC milimétrica na X-Point Engenharia.",
    };
  }

  const { assembly } = result;
  const summaryNames = assembly.items
    .map((it) => `${it.quantity}x ${it.configuration.model.name} (${it.configuration.color.name})`)
    .join(" + ");

  const title = assembly.title
    ? `${assembly.title} — Montagem Totem Pro`
    : `Montagem Pronta (${assembly.itemsCount} ${assembly.itemsCount === 1 ? "totem" : "totens"}) — Totem Pro`;

  const description = `${summaryNames} • ${formatBRL(assembly.pixTotalCents)} no PIX à vista. Abra para selecionar sua conta, entrega e pagamento.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function SharedAssemblyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const result = await getSharedCartByCode(code, { incrementViews: true });

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#090a0f] text-[#1d1d1f] dark:text-slate-100 transition-colors duration-300">
      <Navbar />
      <main className="flex-1">
        <SharedAssemblyLoader
          code={code}
          initialAssembly={result?.assembly || null}
          initialCheckedOnServer={true}
        />
      </main>
      <Footer />
    </div>
  );
}
