import "dotenv/config";
import express, { Request, Response } from "express";
import path from "path";
import { saveEvent, persist, listEvents } from "./storage";
import { stripeWebhookHandler } from "./providers/stripe";
import { adyenWebhookHandler } from "./providers/adyen";
import { paypalWebhookHandler } from "./providers/paypal";

const app = express();
app.set("trust proxy", true);

const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_ENDPOINT_SECRET || "";
const ADYEN_HMAC_KEY = process.env.ADYEN_HMAC_KEY || "";
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || "";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_ENV = (process.env.PAYPAL_ENV as "sandbox" | "live") || "sandbox";
const PORT = Number(process.env.PORT || 3000);

app.use((req, res, next) => {
  res.header("access-control-allow-origin", "*");
  res.header("access-control-allow-methods", "GET,POST,OPTIONS");
  res.header("access-control-allow-headers", "*");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const stripeRaw = express.raw({ type: "application/json" });
const json = express.json({ limit: "1mb" });

app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.post("/webhooks/stripe", stripeRaw, stripeWebhookHandler(STRIPE_ENDPOINT_SECRET));

app.post("/webhooks/adyen", json, adyenWebhookHandler(ADYEN_HMAC_KEY));

app.post("/webhooks/paypal", json, paypalWebhookHandler({
  webhookId: PAYPAL_WEBHOOK_ID,
  clientId: PAYPAL_CLIENT_ID,
  clientSecret: PAYPAL_CLIENT_SECRET,
  env: PAYPAL_ENV
}));

app.post("/__test_write", json, async (req: Request, res: Response) => {
  const rec = saveEvent({ provider: "test", verified: true, headers: req.headers as any, payload: { ping: true } });
  res.json({ ok: true, id: rec.id });
});

app.get("/__diag", (_req, res) => {
  const dir = path.join(process.cwd(), "data", "events");
  const files = listEvents();
  res.json({ cwd: process.cwd(), dataDir: dir, files, count: files.length });
});

app.post("/persist", async (_req, res) => {
  try {
    await persist();
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.listen(PORT, () => {});
