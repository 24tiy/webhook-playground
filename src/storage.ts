import fs from "fs";
import { promises as fsp } from "fs";
import path from "path";
import crypto from "crypto";

export type StoredEvent = {
  id: string;
  provider: string;
  verified: boolean;
  receivedAt: string;
  headers: Record<string, any>;
  payload: any;
};

const DATA_DIR = path.join(process.cwd(), "data", "events");
const DOCS_DIR = path.join(process.cwd(), "docs", "events");
const DOCS_INDEX = path.join(process.cwd(), "docs", "events.json");

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function newId() {
  return `${Date.now()}-${crypto.randomBytes(3).toString("base64url")}`;
}

function safeName(s: string) {
  const v = s.toLowerCase().replace(/[^a-z0-9-_]/g, "").slice(0, 60);
  return v || "evt";
}

async function writeJsonAtomically(file: string, data: unknown) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2));
  await fsp.rename(tmp, file);
}

function redactHeaders(h: Record<string, any>) {
  const deny = new Set([
    "authorization",
    "cookie",
    "set-cookie",
    "stripe-signature",
    "paypal-transmission-sig",
    "paypal-auth-algo",
    "paypal-cert-url",
    "paypal-transmission-id",
    "paypal-transmission-time",
    "x-api-key",
    "x-signature",
    "x-hmac-signature"
  ]);
  const out: Record<string, any> = {};
  for (const k of Object.keys(h || {})) {
    const low = k.toLowerCase();
    if (deny.has(low)) continue;
    if (low.includes("secret") || low.includes("token")) continue;
    out[k] = h[k];
  }
  return out;
}

function redactPayload(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redactPayload);
  const out: any = {};
  for (const k of Object.keys(obj)) {
    const low = k.toLowerCase();
    if (
      low.includes("secret") ||
      low.includes("token") ||
      low.includes("password") ||
      low.includes("client_secret")
    ) {
      continue;
    }
    out[k] = redactPayload(obj[k]);
  }
  return out;
}

export function saveEvent(input: { provider: string; verified: boolean; headers: Record<string, any>; payload: any; forceId?: string }) {
  ensureDir(DATA_DIR);
  const id = input.forceId || newId();
  const rec: StoredEvent = {
    id,
    provider: input.provider,
    verified: input.verified,
    receivedAt: new Date().toISOString(),
    headers: input.headers || {},
    payload: input.payload
  };
  const file = path.join(DATA_DIR, `${safeName(id)}.json`);
  fs.writeFileSync(file, JSON.stringify(rec, null, 2), "utf8");
  return rec;
}

export function listEventFiles() {
  ensureDir(DATA_DIR);
  return fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".json"));
}

export async function listEvents(limit = 1000): Promise<StoredEvent[]> {
  ensureDir(DATA_DIR);
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".json"));
  const items: StoredEvent[] = [];
  for (const f of files) {
    try {
      const s = await fsp.readFile(path.join(DATA_DIR, f), "utf8");
      items.push(JSON.parse(s));
    } catch {}
  }
  items.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
  return items.slice(0, limit);
}

export async function getEventById(id: string): Promise<StoredEvent | null> {
  const file = path.join(DATA_DIR, `${safeName(id)}.json`);
  try {
    const s = await fsp.readFile(file, "utf8");
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export async function persist() {
  const all = await listEvents(100000);
  const lim = Number(process.env.DOCS_EVENTS_LIMIT || "500");
  for (const e of all) {
    const file = path.join(DOCS_DIR, `${safeName(e.id)}.json`);
    const safe = { id: e.id, receivedAt: e.receivedAt, provider: e.provider, verified: !!e.verified, headers: redactHeaders(e.headers || {}), payload: redactPayload(e.payload || {}) };
    await writeJsonAtomically(file, safe);
  }
  const forIndex = all.slice(0, lim).map(e => {
    const t = (e as any)?.payload?.type || (e as any)?.payload?.eventCode || (e as any)?.payload?.event_type || "";
    return { id: e.id, receivedAt: e.receivedAt, provider: e.provider, verified: !!e.verified, type: t };
  });
  await writeJsonAtomically(DOCS_INDEX, forIndex);
  return { count: forIndex.length };
}
