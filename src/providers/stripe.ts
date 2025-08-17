import { Request, Response } from "express";
import Stripe from "stripe";
import { saveEvent, persist } from "../storage";

export function stripeWebhookHandler(endpointSecret: string) {
  return (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    if (!sig) {
      const rec = saveEvent({ provider: "stripe", verified: false, headers: req.headers as any, payload: req.body });
      persist().catch(() => {});
      return res.status(400).json({ ok: false, id: rec.id, error: "missing_signature" });
    }
    try {
      const stripe = new Stripe("sk_test_dummy", { apiVersion: "2024-06-20" });
      const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      const rec = saveEvent({ provider: "stripe", verified: true, headers: req.headers as any, payload: event });
      persist().catch(() => {});
      return res.json({ ok: true, id: rec.id });
    } catch {
      const rec = saveEvent({ provider: "stripe", verified: false, headers: req.headers as any, payload: req.body });
      persist().catch(() => {});
      return res.status(400).json({ ok: false, id: rec.id, error: "verification_failed" });
    }
  };
}
