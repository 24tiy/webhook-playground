import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { stripeWebhookHandler } from "./providers/stripe";
import { paypalWebhookHandler } from "./providers/paypal";
import { adyenWebhookHandler } from "./providers/adyen";
import { saveEvent, listEvents, persist } from "./storage";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const AUTH_TOKEN = process.env.AUTH_TOKEN || "";
const STRICT = (process.env.STRICT_VERIFY || "true").toLowerCase() !== "false";

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!AUTH_TOKEN) return res.status(500).json({ ok: false, error: "AUTH_TOKEN not set" });
  const h = String(req.headers.authorization || "");
  const got = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (got !== AUTH_TOKEN) return res.status(401).json({ ok: false, error: "unauthorized" });
  next();
}

app.get("/__diag", (req, res) => {
  const dataDir = path.resolve(process.cwd(), "data/events");
  const files = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter(f => f.endsWith(".json")) : [];
  res.json({ cwd: process.cwd(), dataDir, files, count: files.length });
});

app.post("/__test_write", requireAuth, express.json(), async (req, res) => {
  const rec = saveEvent({ provider: "debug", verified: false, headers: {}, payload: { ping: true } });
  await persist().catch(() => {});
  res.json({ ok: true, id: rec.id });
});

app.get("/events", (req, res) => {
  res.json(listEvents());
});

app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler({
    endpointSecret: process.env.STRIPE_ENDPOINT_SECRET || ""
  })
);

app.post(
  "/webhooks/paypal",
  express.json(),
  paypalWebhookHandler({
    webhookId: process.env.PAYPAL_WEBHOOK_ID || "",
    clientId: process.env.PAYPAL_CLIENT_ID || "",
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || "",
    env: (process.env.PAYPAL_ENV as "sandbox" | "live") || "sandbox"
  })
);

app.post(
  "/webhooks/adyen",
  express.json(),
  adyenWebhookHandler({
    hmacKey: process.env.ADYEN_HMAC_KEY || "",
    allowlistCurrencies: (process.env.ADYEN_ALLOWLIST_CURRENCIES || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
  })
);

app.listen(PORT, () => {});
