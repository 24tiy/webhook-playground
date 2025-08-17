import Stripe from "stripe";
import { Request, Response } from "express";
import { saveEvent } from "../storage";

const stripe = new Stripe(process.env.STRIPE_API_KEY || "", {
  apiVersion: "2024-06-20",
} as any);

export function stripeWebhookHandler(endpointSecret?: string) {
  return async (req: Request, res: Response) => {
    try {
      let verified = false;
      let payload: any;

      if (endpointSecret && req.headers["stripe-signature"]) {
        const sig = req.header("Stripe-Signature") as string;
        const evt = stripe.webhooks.constructEvent(
          req.body,
          sig,
          endpointSecret
        );
        verified = true;
        payload = evt;
      } else {
        payload =
          Buffer.isBuffer(req.body)
            ? JSON.parse(req.body.toString("utf8"))
            : req.body;
      }

      const saved = await saveEvent({
        provider: "stripe",
        verified,
        headers: req.headers as any,
        payload,
      });

      res.json({ ok: true, id: saved.id, verified });
    } catch (err) {
      res.status(400).json({ ok: false, error: "invalid_signature" });
    }
  };
}
