import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { saveEvent, listEvents, getEventById, persist } from "./storage";
import { stripeWebhookHandler } from "./providers/stripe";
import { adyenWebhookHandler } from "./providers/adyen";
import { paypalWebhookHandler } from "./providers/paypal";

const app = express();

const PORT = Number(process.env.PORT || 3000);
const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_ENDPOINT_SECRET || "";
const ADYEN_HMAC_KEY = process.env.ADYEN_HMAC_KEY || "";
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || "";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_ENV = (process.env.PAYPAL_ENV || "sandbox") as "sandbox" | "live";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.post("/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhookHandler(STRIPE_ENDPOINT_SECRET));
app.use(express.json({ type: ["application/json", "text/plain"] }));

app.post("/webhooks/adyen", adyenWebhookHandler(ADYEN_HMAC_KEY));
app.post("/webhooks/paypal", paypalWebhookHandler({ webhookId: PAYPAL_WEBHOOK_ID, clientId: PAYPAL_CLIENT_ID, clientSecret: PAYPAL_CLIENT_SECRET, env: PAYPAL_ENV }));

app.get("/events", (_req, res) => { res.json(listEvents()); });
app.get("/events/:id", (req, res) => { const ev = getEventById(req.params.id); if (!ev) return res.status(404).json({ ok: false, error: "not_found" }); res.json(ev); });

app.get("/__diag", (_req, res) => {
  const cwd = process.cwd();
  const dataDir = path.join(cwd, "data", "events");
  let files: string[] = [];
  try { files = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter(f => f.endsWith(".json")) : []; } catch {}
  res.json({ cwd, dataDir, files, count: files.length });
});

app.post("/__test_write", (_req, res) => {
  const rec = saveEvent({ provider: "debug", verified: false, headers: {}, payload: { ping: true } });
  res.json({ ok: true, id: rec.id });
});

app.use(express.static(path.join(process.cwd(), "docs")));
app.all("/persist", async (_req, res) => { await persist(); res.json({ ok: true }); });

app.listen(PORT, () => {});
