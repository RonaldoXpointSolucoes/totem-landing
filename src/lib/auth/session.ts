import { cookies } from "next/headers";
import { WhitelistUser } from "./whitelistStore";

export const AUTH_COOKIE_NAME = "totem_auth_session";
export const LEGACY_ADMIN_COOKIE = "totem_admin_token";
export const LEGACY_SECRET = "xpt_totem_admin_session_auth_token_99";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: "admin" | "seller";
  couponCode?: string;
  expiresAt: number;
}

export function encodeSession(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString("base64url");
}

export function decodeSession(token: string): SessionPayload | null {
  try {
    const json = Buffer.from(token, "base64url").toString("utf-8");
    const parsed = JSON.parse(json);
    if (parsed && parsed.email && parsed.role && parsed.expiresAt > Date.now()) {
      return parsed;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function setAuthSession(user: WhitelistUser): Promise<void> {
  const cookieStore = await cookies();
  const sessionPayload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    couponCode: user.couponCode,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 dias
  };

  const token = encodeSession(sessionPayload);

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  // Se for admin, mantemos também o legacy cookie para compatibilidade
  if (user.role === "admin") {
    cookieStore.set(LEGACY_ADMIN_COOKIE, LEGACY_SECRET, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  }
}

export async function clearAuthSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  cookieStore.delete(LEGACY_ADMIN_COOKIE);
}

export async function getAuthSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (token) {
    const session = decodeSession(token);
    if (session) return session;
  }

  // Fallback para admin autenticado via legacy token
  const legacyToken = cookieStore.get(LEGACY_ADMIN_COOKIE)?.value;
  if (legacyToken === LEGACY_SECRET) {
    return {
      userId: "user-admin-legacy",
      email: "admin@totempro.com.br",
      name: "Administrador Totem Pro",
      role: "admin",
      expiresAt: Date.now() + 1000 * 60 * 60 * 24,
    };
  }

  return null;
}
