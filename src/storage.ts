import fs from "fs";
import path from "path";
import { spawn } from "child_process";

type RecordLike = { provider: string; verified: boolean; headers: any; payload: any };
type Saved = RecordLike & { id: string; receivedAt: string };

const dir = path.join(process.cwd(), "data", "events");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function saveEvent(rec: RecordLike): Saved {
  const id = genId();
  const obj: Saved = { id, receivedAt: new Date().toISOString(), ...rec };
  const p = path.join(dir, `${id}.json`);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
  return obj;
}

export function listEvents(): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith(".json"));
}

export function getEventById(id: string): Saved | null {
  const p = path.join(dir, `${id}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

export async function persist(): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = process.platform === "win32" ? "npm.cmd" : "npm";
    const child = spawn(cmd, ["run", "persist"], { stdio: "inherit" });
    child.on("exit", code => code === 0 ? resolve() : reject(new Error(String(code))));
  });
}
