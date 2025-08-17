import type { Request } from "express";
import Stripe from "stripe";
import { Provider, ProviderResult } from "./base.js";

const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET || "";
const stripe = new Stripe("sk_test_0", { apiVersion: "2023-10-16" });

export const stripeProvider: Provider = {
  async verify(req: Request): Promise<ProviderResult> {
    const sig = String(req.headers["stripe-signature"] || "");
    if (!endpointSecret || !sig) {
      const raw = JSON.parse(req.body.toString("utf8") || "{}");
      return { verified: false, payload: raw };
    }
    try {
      const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      return { verified: true, payload: event };
    } catch {
      const raw = JSON.parse(req.body.toString("utf8") || "{}");
      return { verified: false, payload: raw };
    }
  }
};
