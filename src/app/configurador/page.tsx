"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MonteSeuTotemPage from "../monte-seu-totem/page";

function ConfiguradorRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    const target = qs ? `/monte-seu-totem?${qs}` : "/monte-seu-totem";
    router.replace(target);
  }, [router, searchParams]);

  return <MonteSeuTotemPage />;
}

export default function ConfiguradorAliasPage() {
  return (
    <Suspense fallback={null}>
      <ConfiguradorRedirect />
    </Suspense>
  );
}
