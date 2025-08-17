import fs from "fs";
import path from "path";
import crypto from "crypto";

const dataDir = path.resolve(process.cwd(), "data/events");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

type SaveInput = { provider: string; verified: boolean; headers: any; payload: any };

const seen = new Set<string>();

function tryEventKey(provider: string, payload: any) {
  const id = payload?.id || payload?.eventId || payload?.pspReference || null;
  return id ? `${provider}:${id}` : null;
}

export function saveEvent(input: SaveInput) {
  const key = tryEventKey(input.provider, input.payload);
  if (key && seen.has(key)) {
    const id = `${Date.now()}-dup-${Math.random().toString(36).slice(2, 6)}`;
    const record = { id, provider: input.provider, verified: input.verified, receivedAt: new Date().toISOString(), headers: input.headers, payload: input.payload, duplicateOf: key };
    const fp = path.join(dataDir, `${id}.json`);
    fs.writeFileSync(fp, JSON.stringify(record, null, 2));
    return { id };
  }
  if (key) seen.add(key);

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const record = { id, provider: input.provider, verified: input.verified, receivedAt: new Date().toISOString(), headers: input.headers, payload: input.payload };
  const fp = path.join(dataDir, `${id}.json`);
  fs.writeFileSync(fp, JSON.stringify(record, null, 2));
  return { id };
}

export function listEvents() {
  if (!fs.existsSync(dataDir)) return [];
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".json"));
  const list = files.map(f => {
    try { return JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf8")); } catch { return null; }
  }).filter(Boolean) as any[];
  list.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
  return list;
}

export function getEventById(id: string) {
  const fp = path.join(dataDir, `${id}.json`);
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, "utf8")); } catch { return null; }
}

export async function persist() {
  const docsDir = path.resolve(process.cwd(), "docs");
  const targetDir = path.join(docsDir, "events");
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".json"));
  for (const f of files) {
    const src = path.join(dataDir, f);
    const dst = path.join(targetDir, f);
    fs.copyFileSync(src, dst);
  }
  const list = listEvents();
  fs.writeFileSync(path.join(docsDir, "events.json"), JSON.stringify(list, null, 2));
}
