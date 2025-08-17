import { Request } from "express";
import Stripe from "stripe";
import { Provider } from "./base.js";

export function stripeProvider(secret: string): Provider {
  const stripe = new Stripe("", { apiVersion: "2023-10-16" });
  return {
    identify() {
      return "stripe";
    },
    async verify(req: Request) {
      try {
        const sig = req.headers["stripe-signature"] as string;
        if (!sig) return false;
        const raw = (req as any).rawBody as Buffer;
        stripe.webhooks.constructEvent(raw, sig, secret);
        return true;
      } catch {
        return false;
      }
    }
  };
}
