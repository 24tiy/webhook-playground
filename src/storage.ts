import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data", "events");
fs.mkdirSync(DATA_DIR, { recursive: true });

export type SavedEvent = {
  id: string;
  provider: "stripe" | "paypal" | "adyen" | "debug";
  verified: boolean;
  receivedAt: string;
  headers: Record<string, any>;
  payload: any;
};

export function persist(): Promise<void> {
  return Promise.resolve();
}

export function saveEvent(e: Omit<SavedEvent, "receivedAt">): SavedEvent {
  const id = e.id || `${Date.now()}-${randomId(4)}`;
  const rec: SavedEvent = {
    id,
    provider: e.provider,
    verified: e.verified,
    headers: e.headers,
    payload: e.payload,
    receivedAt: new Date().toISOString()
  };
  const file = path.join(DATA_DIR, `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(rec, null, 2));
  return rec;
}

export function listEvents(): SavedEvent[] {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".json"));
  const items: SavedEvent[] = [];
  for (const f of files) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8"));
      items.push(j);
    } catch {}
  }
  items.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
  return items;
}

export function getEventById(id: string): SavedEvent | null {
  const file = path.join(DATA_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function randomId(n = 6): string {
  return crypto.randomBytes(n).toString("base64url");
}
