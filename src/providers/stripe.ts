import { Request, Response } from "express";
import Stripe from "stripe";
import { saveEvent, persist } from "../storage";

export function stripeWebhookHandler(endpointSecret: string) {
  return async (req: Request, res: Response) => {
    let verified = false;
    let payload: any = null;
    const sig = req.headers["stripe-signature"] as string | undefined;
    try {
      if (!sig) throw new Error("missing_signature");
      const evt = Stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      verified = true;
      payload = evt;
    } catch {
      try {
        payload = JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body || "{}"));
      } catch {
        payload = { raw: String(req.body || "") };
      }
    }
    const rec = saveEvent({ provider: "stripe", verified, headers: req.headers as any, payload });
    persist().catch(() => {});
    res.json({ ok: true, id: rec.id, verified });
  };
}
