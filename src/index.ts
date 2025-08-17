import "dotenv/config";
import express from "express";
import fs from "fs";
import { saveEvent, listEventFiles } from "./storage.js";
import { stripeProvider } from "./providers/stripe.js";
import { paypalProvider } from "./providers/paypal.js";
import { adyenProvider } from "./providers/adyen.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.get("/", (_req, res) => res.send("OK"));

app.post("/webhooks/stripe", express.raw({ type: "*/*" }), async (req, res) => {
  const r = await stripeProvider.verify(req);
  const rec = saveEvent({ provider: "stripe", verified: r.verified, headers: req.headers as any, payload: r.payload });
  res.json({ ok: true, id: rec.id, verified: r.verified });
});

app.use(express.json({ limit: "2mb" }));

app.post("/webhooks/paypal", async (req, res) => {
  const r = await paypalProvider.verify(req);
  const rec = saveEvent({ provider: "paypal", verified: r.verified, headers: req.headers as any, payload: r.payload });
  res.json({ ok: true, id: rec.id, verified: r.verified });
});

app.post("/webhooks/adyen", async (req, res) => {
  const r = await adyenProvider.verify(req);
  const rec = saveEvent({ provider: "adyen", verified: r.verified, headers: req.headers as any, payload: r.payload });
  res.json({ ok: true, id: rec.id, verified: r.verified });
});

app.get("/events", (_req, res) => {
  const items = listEventFiles(200).map(f => JSON.parse(fs.readFileSync(f, "utf8")));
  res.json({ total: items.length, items });
});

app.post("/__test_write", express.json(), (req, res) => {
  const rec = saveEvent({ provider: "debug", verified: false, headers: req.headers as any, payload: req.body || { ping: true } });
  res.json({ ok: true, id: rec.id });
});

app.listen(PORT, () => {
  console.log(`listening on :${PORT}`);
});
