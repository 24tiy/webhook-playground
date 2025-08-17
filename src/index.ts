import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { ENV, ENABLED } from "./lib/env";
import { log } from "./lib/logger";
import { saveEvent, listEvents, getEventById, persist } from "./storage";
import { stripeWebhookHandler } from "./providers/stripe";
import { paypalWebhookHandler } from "./providers/paypal";
import { adyenWebhookHandler } from "./providers/adyen";
import { authRequired } from "./middleware/auth";

const app = express();
app.set("trust proxy", true);

app.use((req, res, next) => {
  if (req.path === "/webhooks/stripe") {
    bodyParser.raw({ type: "*/*" })(req, res, () => {
      (req as any).rawBody = req.body;
      try {
        (req as any).body = JSON.parse(req.body.toString("utf8"));
      } catch {}
      next();
    });
  } else {
    bodyParser.json({ limit: "1mb" })(req, res, next);
  }
});

app.use(cors());

app.get("/__diag", (_req, res) => {
  const events = listEvents();
  res.json({
    cwd: process.cwd(),
    dataDir: `${process.cwd()}/data/events`,
    files: events.map(e => `${e.id}.json`),
    count: events.length
  });
});

app.post("/__test_write", authRequired, (req, res) => {
  const rec = saveEvent({
    id: "",
    provider: "debug",
    verified: false,
    headers: {},
    payload: req.body && Object.keys(req.body).length ? req.body : { ping: true }
  });
  persist().catch(() => {});
  res.json({ ok: true, id: rec.id });
});

app.get("/events", (_req, res) => res.json(listEvents()));
app.get("/events/:id", (req, res) => {
  const ev = getEventById(req.params.id);
  if (!ev) return res.status(404).json({ ok: false, error: "not_found" });
  res.json(ev);
});

app.post("/webhooks/stripe", stripeWebhookHandler());
app.post("/webhooks/paypal", paypalWebhookHandler());
app.post("/webhooks/adyen", adyenWebhookHandler());

app.get("/", (_req, res) => res.json({ ok: true, name: "webhook-playground" }));

app.listen(ENV.PORT, () => {
  log.info({ port: ENV.PORT, enabled: ENABLED }, "Server started");
});
