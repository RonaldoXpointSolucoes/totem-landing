import fs from "fs";
import path from "path";

export interface WhitelistUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: "admin" | "seller";
  couponCode?: string;
  discountPercent?: number; // Ex: 10 para 10%
  commissionPercent?: number; // Ex: 8 para 8%
  pixKey?: string;
  phone?: string;
  status: "active" | "inactive";
  createdAt: string;
  totalSalesCents?: number;
  totalCommissionCents?: number;
}

const DATA_DIR = path.join(process.cwd(), "src", "data");
const WHITELIST_FILE = path.join(DATA_DIR, "whitelist_users.json");

// Usuários iniciais com permissão garantida
const DEFAULT_WHITELIST: WhitelistUser[] = [
  {
    id: "user-admin-ronaldo",
    email: "ronaldo.xpointsolucoes@gmail.com",
    name: "Ronaldo Clemente",
    avatarUrl: "",
    role: "admin",
    status: "active",
    createdAt: "2026-10-01T10:00:00.000Z",
  },
  {
    id: "user-admin-root",
    email: "xpointengenharia@gmail.com",
    name: "X-Point Engenharia",
    avatarUrl: "",
    role: "admin",
    status: "active",
    createdAt: "2026-10-01T10:00:00.000Z",
  },
  {
    id: "user-admin-dev",
    email: "admin@totempro.com.br",
    name: "Administrador TotemPro",
    avatarUrl: "",
    role: "admin",
    status: "active",
    createdAt: "2026-10-01T10:00:00.000Z",
  },
  {
    id: "user-seller-demo",
    email: "vendedor@totempro.com.br",
    name: "Carlos Vendedor",
    avatarUrl: "",
    role: "seller",
    couponCode: "CARLOS10",
    discountPercent: 10,
    commissionPercent: 8,
    pixKey: "11988887777",
    phone: "(11) 98888-7777",
    status: "active",
    createdAt: "2026-10-05T14:00:00.000Z",
    totalSalesCents: 99000,
    totalCommissionCents: 7920,
  },
];

function ensureStorage(): WhitelistUser[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(WHITELIST_FILE)) {
      fs.writeFileSync(WHITELIST_FILE, JSON.stringify(DEFAULT_WHITELIST, null, 2), "utf-8");
      return DEFAULT_WHITELIST;
    }

    const content = fs.readFileSync(WHITELIST_FILE, "utf-8");
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_WHITELIST;
  } catch (err) {
    console.error("Erro ao ler whitelist_users.json:", err);
    return DEFAULT_WHITELIST;
  }
}

function saveStorage(users: WhitelistUser[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(WHITELIST_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao salvar whitelist_users.json:", err);
  }
}

export async function getWhitelistUsers(): Promise<WhitelistUser[]> {
  return ensureStorage();
}

export async function findUserByEmail(email: string): Promise<WhitelistUser | null> {
  const users = ensureStorage();
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email.trim().toLowerCase() === normalized) || null;
}

export async function findUserByCoupon(couponCode: string): Promise<WhitelistUser | null> {
  const users = ensureStorage();
  const normalized = couponCode.trim().toUpperCase();
  return users.find((u) => u.couponCode?.trim().toUpperCase() === normalized && u.status === "active") || null;
}

export async function addWhitelistUser(
  user: Omit<WhitelistUser, "id" | "createdAt">
): Promise<{ ok: boolean; user?: WhitelistUser; error?: string }> {
  const users = ensureStorage();
  const normalizedEmail = user.email.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { ok: false, error: "E-mail do Google inválido." };
  }

  if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    return { ok: false, error: `O e-mail ${normalizedEmail} já está cadastrado na whitelist.` };
  }

  if (user.role === "seller" && user.couponCode) {
    const normalizedCoupon = user.couponCode.trim().toUpperCase();
    if (users.some((u) => u.couponCode?.toUpperCase() === normalizedCoupon)) {
      return { ok: false, error: `O cupom ${normalizedCoupon} já está em uso por outro vendedor.` };
    }
  }

  const newUser: WhitelistUser = {
    ...user,
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    email: normalizedEmail,
    name: user.name.trim() || normalizedEmail.split("@")[0],
    couponCode: user.couponCode ? user.couponCode.trim().toUpperCase() : undefined,
    discountPercent: user.discountPercent !== undefined ? Math.max(1, Math.min(100, user.discountPercent)) : 10,
    commissionPercent: user.commissionPercent !== undefined ? Math.max(1, Math.min(100, user.commissionPercent)) : 8,
    status: user.status || "active",
    createdAt: new Date().toISOString(),
    totalSalesCents: 0,
    totalCommissionCents: 0,
  };

  users.unshift(newUser);
  saveStorage(users);
  return { ok: true, user: newUser };
}

export async function updateWhitelistUser(
  id: string,
  updates: Partial<WhitelistUser>
): Promise<{ ok: boolean; user?: WhitelistUser; error?: string }> {
  const users = ensureStorage();
  const index = users.findIndex((u) => u.id === id);

  if (index === -1) {
    return { ok: false, error: "Usuário não encontrado." };
  }

  if (updates.couponCode) {
    const normalizedCoupon = updates.couponCode.trim().toUpperCase();
    const existing = users.find((u) => u.id !== id && u.couponCode?.toUpperCase() === normalizedCoupon);
    if (existing) {
      return { ok: false, error: `O cupom ${normalizedCoupon} já está em uso por outro vendedor.` };
    }
    updates.couponCode = normalizedCoupon;
  }

  if (updates.email) {
    updates.email = updates.email.trim().toLowerCase();
  }

  users[index] = { ...users[index], ...updates };
  saveStorage(users);
  return { ok: true, user: users[index] };
}

export async function deleteWhitelistUser(id: string): Promise<boolean> {
  const users = ensureStorage();
  const filtered = users.filter((u) => u.id !== id);
  if (filtered.length === users.length) return false;
  saveStorage(filtered);
  return true;
}
