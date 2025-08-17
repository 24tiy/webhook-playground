import "dotenv/config";
import express, { Request, Response } from "express";
import path from "path";
import { saveEvent, listEventFiles, persist } from "./storage";
import { stripeWebhookHandler } from "./providers/stripe";
import { adyenWebhookHandler } from "./providers/adyen";
import { paypalWebhookHandler } from "./providers/paypal";

const app = express();
app.set("trust proxy", true);

const PORT = Number(process.env.PORT || 3000);
const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_ENDPOINT_SECRET || "";
const ADYEN_HMAC_KEY = process.env.ADYEN_HMAC_KEY || "";
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || "";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_ENV = (process.env.PAYPAL_ENV as "sandbox" | "live") || "sandbox";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization,Stripe-Signature");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

function requireAdmin(req: Request, res: Response, next: () => void) {
  const need = req.path.startsWith("/persist") || req.path.startsWith("/__");
  if (!need) return next();
  const ok = ADMIN_TOKEN && req.get("Authorization") === `Bearer ${ADMIN_TOKEN}`;
  if (ok) return next();
  res.status(401).json({ ok: false, error: "unauthorized" });
}

app.use(requireAdmin);

const stripeRaw = express.raw({ type: "application/json", limit: "1mb" });
const json = express.json({ limit: "1mb" });

app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.post("/webhooks/stripe", stripeRaw, stripeWebhookHandler(STRIPE_ENDPOINT_SECRET));
app.post("/webhooks/adyen", json, adyenWebhookHandler(ADYEN_HMAC_KEY));
app.post("/webhooks/paypal", json, paypalWebhookHandler({ webhookId: PAYPAL_WEBHOOK_ID, clientId: PAYPAL_CLIENT_ID, clientSecret: PAYPAL_CLIENT_SECRET, env: PAYPAL_ENV }));

app.post("/__test_write", json, async (req: Request, res: Response) => {
  const rec = saveEvent({ provider: "debug", verified: true, headers: req.headers as any, payload: { type: "debug.ping" } });
  res.json({ ok: true, id: rec.id });
});

app.get("/__diag", (_req, res) => {
  const dir = path.join(process.cwd(), "data", "events");
  const files = listEventFiles();
  res.json({ cwd: process.cwd(), dataDir: dir, files, count: files.length });
});

app.post("/persist", async (_req, res) => {
  try {
    const out = await persist();
    res.json({ ok: true, ...out });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.listen(PORT, () => {});
