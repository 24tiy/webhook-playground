import { Router, json, raw } from "express";
import { saveEvent, listEvents } from "./storage.js";
import { stripeProvider } from "./providers/stripe.js";
import { paypalProvider } from "./providers/paypal.js";
import { adyenProvider } from "./providers/adyen.js";
import { githubProvider } from "./providers/github.js";
import { telegramProvider } from "./providers/telegram.js";

export const router = Router();

const stripe = stripeProvider(process.env.STRIPE_ENDPOINT_SECRET || "");
const paypal = paypalProvider({
  webhookId: process.env.PAYPAL_WEBHOOK_ID || "",
  clientId: process.env.PAYPAL_CLIENT_ID || "",
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || "",
  env: ((process.env.PAYPAL_ENV || "sandbox") as "sandbox" | "live")
});
const adyen = adyenProvider(process.env.ADYEN_HMAC_KEY || "");
const github = githubProvider(process.env.GITHUB_SECRET || "");
const telegram = telegramProvider(process.env.TELEGRAM_SECRET || "");

router.post("/webhook/stripe", raw({ type: "*/*" }), async (req, res) => {
  const verified = await stripe.verify(req);
  const rec = saveEvent({ provider: stripe.identify(), verified, headers: req.headers, payload: tryParseRaw(req) });
  res.json({ ok: true, id: rec.id, verified });
});

router.post("/webhook/paypal", json({ type: "*/*" }), async (req, res) => {
  const verified = await paypal.verify(req);
  const rec = saveEvent({ provider: paypal.identify(), verified, headers: req.headers, payload: req.body });
  res.json({ ok: true, id: rec.id, verified });
});

router.post("/webhook/adyen", json({ type: "*/*" }), async (req, res) => {
  const verified = await adyen.verify(req);
  const rec = saveEvent({ provider: adyen.identify(), verified, headers: req.headers, payload: req.body });
  res.json({ ok: true, id: rec.id, verified });
});

router.post("/webhook/github", json({ type: "*/*" }), async (req, res) => {
  const verified = await github.verify(req);
  const rec = saveEvent({ provider: github.identify(), verified, headers: req.headers, payload: req.body });
  res.json({ ok: true, id: rec.id, verified });
});

router.post("/webhook/telegram", json({ type: "*/*" }), async (req, res) => {
  const verified = await telegram.verify(req);
  const rec = saveEvent({ provider: telegram.identify(), verified, headers: req.headers, payload: req.body });
  res.json({ ok: true, id: rec.id, verified });
});

router.get("/events", (req, res) => {
  const rows = listEvents(200).map(e => {
    const v = e.verified ? "✔" : "✖";
    return `<tr><td>${e.receivedAt}</td><td>${e.provider}</td><td>${v}</td><td><pre>${escapeHtml(JSON.stringify(e.payload, null, 2))}</pre></td></tr>`;
  }).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Events</title><style>body{font-family:ui-monospace,Menlo,monospace;padding:16px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;vertical-align:top}th{background:#f7f7f7}pre{margin:0;white-space:pre-wrap;word-wrap:break-word}</style></head><body><h1>Webhook Events</h1><table><thead><tr><th>Time</th><th>Provider</th><th>Verified</th><th>Payload</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  res.status(200).type("html").send(html);
});

router.get("/health", (req, res) => res.json({ ok: true }));

function tryParseRaw(req: any) {
  const buf: Buffer | undefined = req.rawBody;
  if (!buf) return {};
  try {
    return JSON.parse(buf.toString("utf8"));
  } catch {
    return {};
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
