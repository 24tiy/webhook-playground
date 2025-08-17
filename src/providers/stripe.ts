import { Request, Response } from "express";
import Stripe from "stripe";
import { saveEvent } from "../storage";

export function stripeWebhookHandler(endpointSecret: string) {
  const stripe = new Stripe("sk_dummy", { apiVersion: "2024-06-20" as any });
  return async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    let verified = false;
    let payload: any = null;
    try {
      const buf = req.body as Buffer;
      const event = stripe.webhooks.constructEvent(buf, sig || "", endpointSecret);
      verified = true;
      payload = event;
    } catch {
      try {
        payload = JSON.parse(Buffer.isBuffer(req.body) ? (req.body as Buffer).toString("utf8") : "");
      } catch {
        payload = { raw: Buffer.isBuffer(req.body) ? (req.body as Buffer).toString("base64") : null };
      }
    }
    const rec = await saveEvent({ provider: "stripe", verified, headers: req.headers as any, payload });
    res.json({ ok: true, id: rec.id, verified });
  };
}
