import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { stripeWebhookHandler } from "./providers/stripe";
import { paypalWebhookHandler } from "./providers/paypal";
import { adyenWebhookHandler } from "./providers/adyen";
import { listEvents, persist, saveEvent } from "./storage";

const app = express();

const PORT = Number(process.env.PORT || 3000);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_ENDPOINT_SECRET || "";
const PAYPAL_ENV = (process.env.PAYPAL_ENV as "sandbox" | "live") || "sandbox";
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || "";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const ADYEN_HMAC_KEY = process.env.ADYEN_HMAC_KEY || "";

app.use(helmet());
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 120
  })
);

const jsonParser = express.json({ limit: "1mb" });
const rawStripe = express.raw({ type: "application/json", limit: "1mb" });

function adminAuth(req: Request, res: Response, next: NextFunction) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (ADMIN_TOKEN) {
    if (token && token === ADMIN_TOKEN) return next();
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  if (process.env.NODE_ENV === "production") {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  next();
}

app.get("/events", async (_req, res) => {
  const list = await listEvents();
  res.json(list);
});

app.get("/__diag", adminAuth, async (_req, res) => {
  const list = await listEvents();
  res.json(list.__diag);
});

app.post("/__test_write", adminAuth, jsonParser, async (req, res) => {
  const rec = await saveEvent({
    provider: "debug",
    verified: false,
    headers: {},
    payload: req.body && Object.keys(req.body).length ? req.body : { ping: true }
  });
  res.json({ ok: true, id: rec.id });
});

app.post("/persist", adminAuth, async (_req, res) => {
  await persist();
  res.json({ ok: true });
});

app.post("/webhooks/stripe", rawStripe, stripeWebhookHandler(STRIPE_ENDPOINT_SECRET));
app.post(
  "/webhooks/paypal",
  jsonParser,
  paypalWebhookHandler({
    env: PAYPAL_ENV,
    webhookId: PAYPAL_WEBHOOK_ID,
    clientId: PAYPAL_CLIENT_ID,
    clientSecret: PAYPAL_CLIENT_SECRET
  })
);
app.post("/webhooks/adyen", jsonParser, adyenWebhookHandler({ hmacKey: ADYEN_HMAC_KEY }));

app.listen(PORT, () => {
  process.stdout.write(`listening on http://localhost:${PORT}\n`);
});
