import { Request, Response } from "express";
import Stripe from "stripe";
import { saveEvent, persist } from "../storage.js";

const stripe = new Stripe(process.env.STRIPE_API_KEY || "sk_test_dummy");

export function stripeWebhookHandler(cfg: { endpointSecret: string }) {
  return async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    let verified = false;
    let payload: any = null;
    try {
      if (cfg.endpointSecret && sig) {
        const raw = Buffer.isBuffer((req as any).body) ? (req as any).body : Buffer.from((req as any).body || "");
        const event = stripe.webhooks.constructEvent(raw, sig, cfg.endpointSecret);
        payload = event;
        verified = true;
      } else {
        const raw = Buffer.isBuffer((req as any).body) ? (req as any).body.toString("utf8") : ((req as any).body || "").toString?.() || "";
        payload = raw ? JSON.parse(raw) : {};
      }
    } catch {
      payload = { parse_error: true };
      verified = false;
    }
    const rec = saveEvent({ provider: "stripe", verified, headers: req.headers as any, payload });
    persist().catch(() => {});
    res.json({ ok: true, id: rec.id, verified });
  };
}
