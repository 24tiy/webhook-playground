import fs from "fs";
import path from "path";
import { exec } from "child_process";

const DATA_DIR = path.join(process.cwd(), "data");
const EVENTS_DIR = path.join(DATA_DIR, "events");

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  if (!fs.existsSync(EVENTS_DIR)) fs.mkdirSync(EVENTS_DIR);
}

export type EventRecord = {
  id: string;
  provider: string;
  verified: boolean;
  receivedAt: string;
  headers: Record<string, unknown>;
  payload: unknown;
};

export function saveEvent(e: Omit<EventRecord, "id" | "receivedAt">) {
  ensure();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const file = path.join(EVENTS_DIR, `${id}.json`);
  const rec: EventRecord = { id, receivedAt: new Date().toISOString(), ...e };
  fs.writeFileSync(file, JSON.stringify(rec, null, 2), "utf8");
  return rec;
}

export function listEvents(): EventRecord[] {
  ensure();
  const files = fs.existsSync(EVENTS_DIR) ? fs.readdirSync(EVENTS_DIR).filter(f => f.endsWith(".json")) : [];
  const list = files.map(f => JSON.parse(fs.readFileSync(path.join(EVENTS_DIR, f), "utf8")));
  return list.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
}

export function getEventById(id: string): EventRecord | null {
  const file = path.join(EVENTS_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function persist(): Promise<void> {
  return new Promise((resolve) => {
    exec('git add data && git commit -m "events" || true && git push origin main', () => resolve());
  });
}
