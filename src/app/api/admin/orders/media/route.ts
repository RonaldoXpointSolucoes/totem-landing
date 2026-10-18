import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { Client, Storage, ID, Permission, Role } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";
import { getAuthSession, LEGACY_ADMIN_COOKIE, LEGACY_SECRET } from "@/lib/auth/session";

const ORDER_MEDIA_BUCKET_ID = "order_execution_media";

async function verifyAdminAuth(): Promise<boolean> {
  const session = await getAuthSession();
  if (session && session.role === "admin") return true;

  const cookieStore = await cookies();
  const token = cookieStore.get(LEGACY_ADMIN_COOKIE)?.value;
  return token === LEGACY_SECRET;
}

function getServerStorage(): Storage {
  const client = new Client()
    .setEndpoint(APPWRITE_CONFIG.endpoint)
    .setProject(APPWRITE_CONFIG.projectId)
    .setKey(APPWRITE_CONFIG.apiKey);

  return new Storage(client);
}

async function ensureOrderMediaBucket(storage: Storage) {
  try {
    await storage.getBucket(ORDER_MEDIA_BUCKET_ID);
  } catch {
    await storage.createBucket(
      ORDER_MEDIA_BUCKET_ID,
      "Anexos e Mídias da Ordem de Execução (Fotos e Vídeos)",
      [Permission.read(Role.any())],
      false,
      true,
      50 * 1024 * 1024,
      ["jpg", "jpeg", "png", "webp", "gif", "svg", "mp4", "webm", "mov", "m4v", "ogg", "pdf"]
    );
  }
}

export async function POST(req: Request) {
  const isAuth = await verifyAdminAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const caption = String(formData.get("caption") || "").trim();
    const orderNumber = String(formData.get("orderNumber") || "ORDER").replace(/[^a-zA-Z0-9_-]/g, "");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { ok: false, error: "Nenhum arquivo válido enviado para anexo da Ordem de Execução." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const buffer = Buffer.from(arrayBuffer);

    const rawName = file.name || `anexo-${Date.now()}`;
    const ext = (path.extname(rawName) || ".png").toLowerCase();
    const cleanBase = path
      .basename(rawName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 48);
    const safeFileName = `${orderNumber}_${Date.now()}_${cleanBase}${ext}`;

    const mime = (file.type || "").toLowerCase();
    const isVideo =
      mime.startsWith("video/") || [".mp4", ".webm", ".mov", ".m4v", ".ogg"].includes(ext);
    const isImage =
      mime.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext);
    const mediaType: "image" | "video" | "document" = isVideo
      ? "video"
      : isImage
      ? "image"
      : "document";

    // 1. Tenta salvar no Appwrite Storage (persistente em nuvem / container-proof)
    let fileUrl = "";
    let fileId = `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const storage = getServerStorage();
      await ensureOrderMediaBucket(storage);

      const appwriteFileId = ID.unique();
      const inputFile = InputFile.fromBuffer(uint8, safeFileName);
      const uploaded = await storage.createFile(
        ORDER_MEDIA_BUCKET_ID,
        appwriteFileId,
        inputFile,
        [Permission.read(Role.any())]
      );

      fileId = uploaded.$id;
      fileUrl = `${APPWRITE_CONFIG.endpoint}/storage/buckets/${ORDER_MEDIA_BUCKET_ID}/files/${uploaded.$id}/view?project=${APPWRITE_CONFIG.projectId}`;
    } catch (storageErr: any) {
      console.warn("Aviso ao enviar para Appwrite Storage (usando fallback local):", storageErr?.message);
    }

    // 2. Também salva cópia local em public/uploads/orders para cache rápido e fallback offline
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "orders");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const localFilePath = path.join(uploadsDir, safeFileName);
      fs.writeFileSync(localFilePath, buffer);
      if (!fileUrl) {
        fileUrl = `/uploads/orders/${safeFileName}`;
      }
    } catch (localErr) {
      console.warn("Aviso ao salvar cópia local do anexo:", localErr);
    }

    if (!fileUrl) {
      return NextResponse.json(
        { ok: false, error: "Não foi possível armazenar o arquivo de mídia." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      attachment: {
        id: fileId,
        type: mediaType,
        url: fileUrl,
        fileName: rawName,
        mimeType: file.type || (isVideo ? "video/mp4" : "image/png"),
        sizeBytes: file.size || buffer.length,
        caption: caption || rawName,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Erro no upload de mídia da Ordem de Execução:", error);
    return NextResponse.json(
      { ok: false, error: "Falha ao processar upload de mídia: " + (error?.message || "Erro interno") },
      { status: 500 }
    );
  }
}
