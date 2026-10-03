import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getAllCatalogAdmin,
  updateCatalogItemAdmin,
  createCatalogItemAdmin,
  deleteCatalogItemAdmin,
} from "@/lib/appwrite/server";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";

const COOKIE_NAME = "totem_admin_token";
const SESSION_SECRET = "xpt_totem_admin_session_auth_token_99";

async function verifyAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token === SESSION_SECRET;
}

export async function GET() {
  const isAuth = await verifyAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const catalog = await getAllCatalogAdmin();
    return NextResponse.json({ ok: true, data: catalog });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Erro ao buscar catálogo: " + error?.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const isAuth = await verifyAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { collectionType, documentId, updates } = await req.json();

    if (!collectionType || !documentId || !updates) {
      return NextResponse.json(
        { ok: false, error: "Parâmetros insuficientes: informe collectionType, documentId e updates." },
        { status: 400 }
      );
    }

    const colMap: Record<string, string> = {
      models: APPWRITE_CONFIG.collections.cabinetModels,
      colors: APPWRITE_CONFIG.collections.colors,
      monitors: APPWRITE_CONFIG.collections.monitors,
      printers: APPWRITE_CONFIG.collections.printers,
      readers: APPWRITE_CONFIG.collections.barcodeReaders,
    };

    const targetCollection = colMap[collectionType];
    if (!targetCollection) {
      return NextResponse.json({ ok: false, error: "Coleção inválida." }, { status: 400 });
    }

    const updatedDoc = await updateCatalogItemAdmin(targetCollection, documentId, updates);

    return NextResponse.json({
      ok: true,
      message: "Item atualizado com sucesso no Appwrite.",
      data: updatedDoc,
    });
  } catch (error: any) {
    console.error("Erro na atualização do catálogo:", error);
    return NextResponse.json(
      { ok: false, error: "Falha na atualização: " + error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const isAuth = await verifyAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { collectionType, data } = await req.json();

    const colMap: Record<string, string> = {
      models: APPWRITE_CONFIG.collections.cabinetModels,
      colors: APPWRITE_CONFIG.collections.colors,
      monitors: APPWRITE_CONFIG.collections.monitors,
      printers: APPWRITE_CONFIG.collections.printers,
      readers: APPWRITE_CONFIG.collections.barcodeReaders,
    };

    const targetCollection = colMap[collectionType];
    if (!targetCollection || !data) {
      return NextResponse.json({ ok: false, error: "Dados ou coleção inválidos." }, { status: 400 });
    }

    const newDoc = await createCatalogItemAdmin(targetCollection, data);

    return NextResponse.json({
      ok: true,
      message: "Novo item cadastrado no Appwrite.",
      data: newDoc,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Falha ao criar item: " + error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const isAuth = await verifyAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { collectionType, documentId } = await req.json();

    const colMap: Record<string, string> = {
      models: APPWRITE_CONFIG.collections.cabinetModels,
      colors: APPWRITE_CONFIG.collections.colors,
      monitors: APPWRITE_CONFIG.collections.monitors,
      printers: APPWRITE_CONFIG.collections.printers,
      readers: APPWRITE_CONFIG.collections.barcodeReaders,
    };

    const targetCollection = colMap[collectionType];
    if (!targetCollection || !documentId) {
      return NextResponse.json({ ok: false, error: "Parâmetros inválidos para exclusão." }, { status: 400 });
    }

    await deleteCatalogItemAdmin(targetCollection, documentId);

    return NextResponse.json({
      ok: true,
      message: "Item excluído com sucesso do catálogo.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Falha ao excluir item: " + error?.message },
      { status: 500 }
    );
  }
}
