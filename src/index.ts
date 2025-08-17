import "dotenv/config";
import express from "express";
import path from "path";
import { saveEvent, listEvents, getEventById, persist } from "./storage";
import { stripeWebhookHandler } from "./providers/stripe";

const app = express();

app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,Stripe-Signature"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  next();
});

const PORT = Number(process.env.PORT || 3000);
const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_ENDPOINT_SECRET || "";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

function requireAdmin(req: express.Request, res: express.Response, next: any) {
  const need =
    req.path.startsWith("/persist") || req.path.startsWith("/__");
  if (!need) return next();
  if (ADMIN_TOKEN && req.get("Authorization") === `Bearer ${ADMIN_TOKEN}`)
    return next();
  return res.status(401).json({ ok: false, error: "unauthorized" });
}
app.use(requireAdmin);

app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json", limit: "1mb" }),
  stripeWebhookHandler(STRIPE_ENDPOINT_SECRET)
);

app.use(express.json({ limit: "1mb" }));

app.post("/__test_write", async (req, res) => {
  const saved = await saveEvent({
    provider: "debug",
    verified: false,
    headers: req.headers as any,
    payload: req.body && Object.keys(req.body).length ? req.body : { type: "debug.ping" },
  });
  res.json({ ok: true, id: saved.id });
});

app.get("/__diag", async (_req, res) => {
  const items = await listEvents(1000);
  res.json({
    cwd: process.cwd(),
    dataDir: path.join(process.cwd(), "data", "events"),
    files: items.map((x) => `${x.id}.json`),
    count: items.length,
  });
});

app.post("/persist", async (_req, res) => {
  const out = await persist();
  res.json({ ok: true, ...out });
});

app.get("/events", async (_req, res) => {
  res.json(await listEvents(200));
});
app.get("/events/:id", async (req, res) => {
  const e = await getEventById(req.params.id);
  if (!e) return res.status(404).end();
  res.json(e);
});

app.listen(PORT, () => {
  console.log(`Server on http://localhost:${PORT}`);
});
