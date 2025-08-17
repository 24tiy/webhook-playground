const fs = require("fs");
const path = require("path");

const srcDir = path.join(process.cwd(), "data", "events");
const outDir = path.join(process.cwd(), "docs", "events");
const indexFile = path.join(process.cwd(), "docs", "events.json");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function redactHeaders(h) {
  const deny = new Set(["authorization","cookie","set-cookie","stripe-signature","paypal-transmission-sig","paypal-auth-algo","paypal-cert-url","paypal-transmission-id","paypal-transmission-time","x-api-key","x-signature","x-hmac-signature"]);
  const out = {};
  for (const k of Object.keys(h || {})) {
    const low = k.toLowerCase();
    if (deny.has(low)) continue;
    if (low.includes("secret") || low.includes("token")) continue;
    out[k] = h[k];
  }
  return out;
}

function redactPayload(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redactPayload);
  const out = {};
  for (const k of Object.keys(obj)) {
    const low = k.toLowerCase();
    if (low.includes("secret") || low.includes("token") || low.includes("password") || low.includes("client_secret")) continue;
    out[k] = redactPayload(obj[k]);
  }
  return out;
}

function readAll() {
  if (!fs.existsSync(srcDir)) return [];
  return fs.readdirSync(srcDir).filter(f => f.endsWith(".json")).map(f => {
    try { return JSON.parse(fs.readFileSync(path.join(srcDir, f), "utf8")); } catch { return null; }
  }).filter(Boolean);
}

const items = readAll().sort((a, b) => a.receivedAt < b.receivedAt ? 1 : -1);
const forIndex = [];
for (const it of items) {
  const safe = {
    id: it.id,
    receivedAt: it.receivedAt,
    provider: it.provider,
    verified: !!it.verified,
    headers: redactHeaders(it.headers || {}),
    payload: redactPayload(it.payload || {})
  };
  fs.writeFileSync(path.join(outDir, `${it.id}.json`), JSON.stringify(safe, null, 2), "utf8");
  const type = safe.payload?.type || safe.payload?.eventCode || safe.payload?.event_type || "";
  forIndex.push({ id: safe.id, receivedAt: safe.receivedAt, provider: safe.provider, verified: safe.verified, type });
}
fs.writeFileSync(indexFile, JSON.stringify(forIndex, null, 2), "utf8");
console.log(JSON.stringify({ ok: true, count: forIndex.length }));
