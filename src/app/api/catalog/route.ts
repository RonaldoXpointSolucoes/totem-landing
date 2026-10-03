import { NextResponse } from "next/server";
import { getAppwriteCatalog } from "@/lib/appwrite/server";
import {
  CABINET_MODELS,
  COLOR_OPTIONS,
  HOMOLOGATED_MONITORS,
  HOMOLOGATED_PRINTERS,
  HOMOLOGATED_READERS,
} from "@/modules/catalog/catalogData";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dynamicCatalog = await getAppwriteCatalog();
    return NextResponse.json({
      ok: true,
      source: "appwrite_database",
      data: dynamicCatalog,
    });
  } catch (error: any) {
    console.warn("Falha ao carregar catálogo dinâmico do Appwrite, utilizando fallback local:", error?.message);
    return NextResponse.json({
      ok: true,
      source: "fallback_static",
      data: {
        cabinetModels: CABINET_MODELS,
        colors: COLOR_OPTIONS,
        monitors: HOMOLOGATED_MONITORS,
        printers: HOMOLOGATED_PRINTERS,
        barcodeReaders: HOMOLOGATED_READERS,
      },
    });
  }
}
