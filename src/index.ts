import "dotenv/config";
import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { stripeWebhookHandler } from "./providers/stripe.js";
import { paypalWebhookHandler } from "./providers/paypal.js";
import { adyenWebhookHandler } from "./providers/adyen.js";
import { listEvents, getEventById, saveEvent, persist } from "./storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = Number(process.env.PORT || 3000);

app.post("/webhooks/stripe", express.raw({ type: "*/*" }), stripeWebhookHandler({ endpointSecret: process.env.STRIPE_ENDPOINT_SECRET || "" }));

app.use(express.json({ limit: "1mb" }));

app.post(
  "/webhooks/paypal",
  paypalWebhookHandler({
    webhookId: process.env.PAYPAL_WEBHOOK_ID || "",
    clientId: process.env.PAYPAL_CLIENT_ID || "",
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || "",
    env: (process.env.PAYPAL_ENV as "sandbox" | "live") === "live" ? "live" : "sandbox"
  })
);

app.post("/webhooks/adyen", adyenWebhookHandler({ hmacKey: process.env.ADYEN_HMAC_KEY || "" }));

app.get("/", (_req, res) => res.json({ ok: true }));

app.get("/events", (_req, res) => res.json({ events: listEvents() }));

app.get("/events/:id", (req, res) => {
  const ev = getEventById(req.params.id);
  if (!ev) return res.status(404).json({ ok: false, error: "not_found" });
  res.json(ev);
});

app.post("/__test_write", (req, res) => {
  const rec = saveEvent({ provider: "test", verified: false, headers: req.headers as any, payload: req.body || { ping: true } });
  persist().catch(() => {});
  res.json({ ok: true, id: rec.id });
});

app.get("/__diag", (_req, res) => {
  res.json({
    cwd: process.cwd(),
    dataDir: path.join(process.cwd(), "data/events"),
    files: listEvents().map((e) => `${e.id}.json`),
    count: listEvents().length
  });
});

app.use("/dashboard", express.static(path.join(process.cwd(), "docs")));

app.post("/persist", async (_req, res) => {
  await persist().catch(() => {});
  res.json({ ok: true });
});

app.listen(PORT);
