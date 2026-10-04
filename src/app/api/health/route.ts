import { NextResponse } from "next/server";
import { CORREIOS_CONTRACT_METADATA } from "@/modules/shipping/receiptGroundTruth";

export async function GET() {
  return NextResponse.json(
    {
      status: "healthy",
      service: "totem-landing",
      version: "0.3.0",
      subsystems: {
        shipping: {
          status: "healthy",
          antiFailureGuard: "active",
          verifiedAccuracy: CORREIOS_CONTRACT_METADATA.auditedAveragePrecision,
          contractNumber: CORREIOS_CONTRACT_METADATA.contractNumber,
        },
      },
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    { status: 200 }
  );
}

