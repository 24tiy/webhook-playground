import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve("data/events");
fs.mkdirSync(DATA_DIR, { recursive: true });

export type SavedEvent = {
  id: string;
  provider: string;
  verified: boolean;
  receivedAt: string;
  headers: Record<string, any>;
  payload: any;
};

function fileId() {
  const ts = Date.now();
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rnd}`;
}

export function saveEvent(e: Omit<SavedEvent, "id" | "receivedAt">): SavedEvent {
  const id = fileId();
  const rec: SavedEvent = {
    id,
    provider: e.provider,
    verified: e.verified,
    receivedAt: new Date().toISOString(),
    headers: e.headers,
    payload: e.payload
  };
  const tmp = path.join(DATA_DIR, `${id}.json.tmp`);
  const fin = path.join(DATA_DIR, `${id}.json`);
  fs.writeFileSync(tmp, JSON.stringify(rec, null, 2));
  fs.renameSync(tmp, fin);
  return rec;
}

export function listEventFiles(limit = 200) {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".json"));
  files.sort((a, b) => (a < b ? 1 : -1));
  return files.slice(0, limit).map(f => path.join(DATA_DIR, f));
}
