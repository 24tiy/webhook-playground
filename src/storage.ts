import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";

const dir = path.join(process.cwd(), "data", "events");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export type SavedEvent = {
  id: string;
  receivedAt: string;
  provider: string;
  verified: boolean;
  headers: any;
  payload: any;
};

const mem: SavedEvent[] = [];

export function saveEvent(e: Omit<SavedEvent, "id" | "receivedAt">): SavedEvent {
  const id = Date.now() + "-" + randomBytes(3).toString("hex");
  const receivedAt = new Date().toISOString();
  const rec: SavedEvent = { id, receivedAt, ...e };
  mem.push(rec);
  const file = path.join(dir, `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(rec, null, 2));
  return rec;
}

export function listEvents(limit = 100): SavedEvent[] {
  return mem.slice(-limit).reverse();
}
