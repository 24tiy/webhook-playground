import type { Request, Response } from "express";
import Stripe from "stripe";
import { saveEvent, persist } from "../storage";

export function stripeWebhookHandler(cfg: { endpointSecret: string }) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" } as any);
  const strict = (process.env.STRICT_VERIFY || "true").toLowerCase() !== "false";

  return async (req: Request, res: Response) => {
    let verified = false;
    let event: Stripe.Event | null = null;

    try {
      const sig = req.headers["stripe-signature"];
      if (!sig) {
        if (strict) return res.status(400).json({ ok: false, error: "missing_signature" });
      } else if (!cfg.endpointSecret) {
        if (strict) return res.status(500).json({ ok: false, error: "missing_endpoint_secret" });
      } else {
        event = stripe.webhooks.constructEvent(req.body as Buffer, String(sig), cfg.endpointSecret);
        verified = true;
      }
    } catch (e) {
      if (strict) return res.status(400).json({ ok: false, error: "invalid_signature" });
      verified = false;
    }

    const payload = event ?? parseBuffer(req.body);
    const rec = saveEvent({ provider: "stripe", verified, headers: req.headers as any, payload });
    persist().catch(() => {});
    res.json({ ok: true, id: rec.id, verified });
  };
}

function parseBuffer(b: any) {
  if (Buffer.isBuffer(b)) {
    try { return JSON.parse(b.toString("utf8")); } catch { return { raw: b.toString("base64") }; }
  }
  return b;
}
