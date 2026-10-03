import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      status: "healthy",
      service: "totem-landing",
      version: "0.1.2",
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    { status: 200 }
  );
}
