import "dotenv/config";
import express from "express";
import path from "path";
import { stripeWebhookHandler } from "./providers/stripe";
import { adyenWebhookHandler } from "./providers/adyen";
import { paypalWebhookHandler } from "./providers/paypal";
import { getEventById, listEvents, persist } from "./storage";

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
app.use(express.static(path.join(process.cwd(), "docs")));

app.post("/webhooks/adyen", adyenWebhookHandler(ADYEN_HMAC_KEY));
app.post("/webhooks/paypal", paypalWebhookHandler({ webhookId: PAYPAL_WEBHOOK_ID, clientId: PAYPAL_CLIENT_ID, clientSecret: PAYPAL_CLIENT_SECRET, env: PAYPAL_ENV }));

app.get("/events", (_req, res) => { res.json(listEvents()); });
app.get("/events/:id", (req, res) => { const ev = getEventById(req.params.id); if (!ev) return res.status(404).json({ ok: false, error: "not_found" }); res.json(ev); });

app.post("/persist", async (_req, res) => { await persist(); res.json({ ok: true }); });

app.listen(PORT, () => {});
