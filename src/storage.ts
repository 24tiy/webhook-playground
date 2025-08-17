import path from "path";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";

type SaveArgs = {
  provider: string;
  verified: boolean;
  headers: Record<string, any>;
  payload: any;
};

const DATA_DIR = path.join(process.cwd(), "data", "events");
const DOCS_DIR = path.join(process.cwd(), "docs", "events");
const RETAIN_MAX = Number(process.env.RETAIN_MAX || 500);

async function atomicWriteJSON(dir: string, name: string, data: any) {
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `${name}.tmp`);
  const fin = path.join(dir, `${name}.json`);
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), { encoding: "utf8", mode: 0o644 });
  await fs.rename(tmp, fin);
}

async function cleanup(dir: string) {
  try {
    const files = (await fs.readdir(dir)).filter(f => f.endsWith(".json")).sort();
    if (files.length <= RETAIN_MAX) return;
    const toDelete = files.slice(0, files.length - RETAIN_MAX);
    for (const f of toDelete) {
      try {
        await fs.unlink(path.join(dir, f));
      } catch {}
    }
  } catch {}
}

export async function saveEvent(args: SaveArgs) {
  const id = `${Date.now()}-${randomUUID().slice(0, 6)}`;
  const record = {
    id,
    receivedAt: new Date().toISOString(),
    provider: args.provider,
    verified: args.verified,
    headers: args.headers || {},
    payload: args.payload
  };
  await atomicWriteJSON(DATA_DIR, id, record);
  await cleanup(DATA_DIR);
  return record;
}

export async function listEvents() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const files = (await fs.readdir(DATA_DIR)).filter(f => f.endsWith(".json"));
  const items: any[] = [];
  for (const f of files) {
    try {
      const j = JSON.parse(await fs.readFile(path.join(DATA_DIR, f), "utf8"));
      items.push(j);
    } catch {}
  }
  items.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
  return {
    items,
    __diag: {
      cwd: process.cwd(),
      dataDir: DATA_DIR,
      files,
      count: files.length
    }
  };
}

export async function getEventById(id: string) {
  const p = path.join(DATA_DIR, `${id}.json`);
  const raw = await fs.readFile(p, "utf8");
  return JSON.parse(raw);
}

export async function persist() {
  await fs.mkdir(DOCS_DIR, { recursive: true });
  const files = (await fs.readdir(DATA_DIR).catch(() => [] as string[])).filter(f => f.endsWith(".json"));
  for (const f of files) {
    const src = path.join(DATA_DIR, f);
    const dst = path.join(DOCS_DIR, f);
    try {
      await fs.copyFile(src, dst);
    } catch {}
  }
  const docsFiles = (await fs.readdir(DOCS_DIR)).filter(f => f.endsWith(".json"));
  const list: any[] = [];
  for (const f of docsFiles) {
    try {
      const j = JSON.parse(await fs.readFile(path.join(DOCS_DIR, f), "utf8"));
      list.push(j);
    } catch {}
  }
  list.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
  await fs.writeFile(path.join(process.cwd(), "docs", "events.json"), JSON.stringify(list, null, 2), "utf8");
}
