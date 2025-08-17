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

const sanitizeFileName = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9-_]/g, "").slice(0, 60) || "evt";

const newId = () =>
  `${Date.now()}-${crypto.randomBytes(3).toString("base64url")}`;

async function writeJsonAtomically(file: string, data: unknown) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2));
  await fsp.rename(tmp, file);
}

export async function saveEvent(input: {
  provider: string;
  verified: boolean;
  headers: Record<string, any>;
  payload: any;
  forceId?: string;
}): Promise<StoredEvent> {
  const id = input.forceId || newId();
  const safe = sanitizeFileName(id);
  const file = path.join(DATA_DIR, `${safe}.json`);

  const stored: StoredEvent = {
    id,
    provider: input.provider,
    verified: input.verified,
    receivedAt: new Date().toISOString(),
    headers: input.headers || {},
    payload: input.payload,
  };

  await writeJsonAtomically(file, stored);
  return stored;
}

export async function listEvents(limit = 1000): Promise<StoredEvent[]> {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const files = (await fsp.readdir(DATA_DIR)).filter((f) => f.endsWith(".json"));
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
  const safe = sanitizeFileName(id);
  const file = path.join(DATA_DIR, `${safe}.json`);
  try {
    const s = await fsp.readFile(file, "utf8");
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function sanitizeForDocs(obj: any): any {
  if (!process.env.SANITIZE_FOR_DOCS) return obj;
  const clone = JSON.parse(JSON.stringify(obj));
  const walk = (o: any) => {
    if (!o || typeof o !== "object") return;
    for (const k of Object.keys(o)) {
      const key = k.toLowerCase();
      const v = o[k];
      if (
        /(email|phone|authorization|client.*ip|card|iban|pan|address|account|token)/.test(
          key
        )
      ) {
        o[k] = "[redacted]";
      } else if (typeof v === "object") {
        walk(v);
      }
    }
  };
  walk(clone);
  return clone;
}

export async function persist(): Promise<{ count: number }> {
  const all = await listEvents(100000);
  const lim = Number(process.env.DOCS_EVENTS_LIMIT || "500");
  for (const e of all) {
    const safe = sanitizeFileName(e.id);
    const file = path.join(DOCS_DIR, `${safe}.json`);
    await writeJsonAtomically(file, sanitizeForDocs(e));
  }
  const sliced = all.slice(0, lim).map((e) => sanitizeForDocs(e));
  await writeJsonAtomically(DOCS_INDEX, sliced);
  return { count: sliced.length };
}
