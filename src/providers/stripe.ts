import { Request, Response } from "express";
import Stripe from "stripe";
import { saveEvent, persist } from "../storage.js";

const stripe = new Stripe(process.env.STRIPE_API_KEY || "sk_test_dummy");

export function stripeWebhookHandler(cfg: { endpointSecret: string }) {
  return async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    let verified = false;
    let payload: any = null;
    let raw = "";

    try {
      if (cfg.endpointSecret && sig) {
        const rawBuf = (req as any).body as Buffer;
        raw = rawBuf?.toString("utf8") || "";
        const event = stripe.webhooks.constructEvent(rawBuf, sig, cfg.endpointSecret);
        payload = event;
        verified = true;
      } else {
        if (Buffer.isBuffer((req as any).body)) {
          raw = (req as any).body.toString("utf8");
          try {
            payload = JSON.parse(raw);
          } catch {
            payload = { parse_error: true };
          }
        } else {
          payload = (req as any).body || {};
          raw = JSON.stringify(payload);
        }
      }
    } catch {
      payload = { parse_error: true };
      verified = false;
    }

    const rec = saveEvent({ provider: "stripe", verified, headers: req.headers as any, payload, raw });
    persist().catch(() => {});
    res.json({ ok: true, id: rec.id, verified });
  };
}
