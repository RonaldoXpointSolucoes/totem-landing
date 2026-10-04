"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import FaqPage from "../faq/page";

export default function DuvidasAliasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/faq");
  }, [router]);

  return <FaqPage />;
}
