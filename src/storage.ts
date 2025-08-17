import fs from "fs";
import path from "path";
import crypto from "crypto";

type EventRecord = {
  id: string;
  receivedAt: string;
  provider: string;
  verified: boolean;
  headers: any;
  payload: any;
};

const dataDir = path.join(process.cwd(), "data/events");
const docsDir = path.join(process.cwd(), "docs/events");

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

export function saveEvent(input: { provider: string; verified: boolean; headers: any; payload: any }): EventRecord {
  ensureDir(dataDir);
  const id = `${Date.now()}-${crypto.randomBytes(3).toString("base64url")}`;
  const rec: EventRecord = {
    id,
    receivedAt: new Date().toISOString(),
    provider: input.provider,
    verified: !!input.verified,
    headers: input.headers,
    payload: input.payload
  };
  fs.writeFileSync(path.join(dataDir, `${id}.json`), JSON.stringify(rec, null, 2));
  return rec;
}

export function listEvents(): EventRecord[] {
  ensureDir(dataDir);
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".json"));
  const list: EventRecord[] = [];
  for (const f of files) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf8"));
      list.push(j);
    } catch {}
  }
  list.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
  return list;
}

export function getEventById(id: string): EventRecord | null {
  const p = path.join(dataDir, `${id}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

export async function persist(): Promise<void> {
  ensureDir(dataDir);
  ensureDir(docsDir);
  for (const f of fs.readdirSync(dataDir)) {
    if (f.endsWith(".json")) {
      fs.copyFileSync(path.join(dataDir, f), path.join(docsDir, f));
    }
  }
  const list = listEvents();
  fs.writeFileSync(path.join(process.cwd(), "docs/events.json"), JSON.stringify(list, null, 2));
}
