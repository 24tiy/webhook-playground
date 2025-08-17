import Stripe from "stripe";
import { Request, Response } from "express";
import { saveEvent, persist } from "../storage";
import { ENV } from "../lib/env";

const stripe = new Stripe("sk_test_dummy", { apiVersion: "2024-06-20" });

export function stripeWebhookHandler() {
  return (req: Request, res: Response) => {
    let verified = false;
    let event: Stripe.Event | null = null;

    try {
      const sig = req.headers["stripe-signature"] as string;
      if (!ENV.STRIPE_ENDPOINT_SECRET) throw new Error("no endpoint secret");
      event = stripe.webhooks.constructEvent(
        (req as any).rawBody,
        sig,
        ENV.STRIPE_ENDPOINT_SECRET
      );
      verified = true;
    } catch {
      verified = false;
    }

    const payload = event ?? tryParseJson(req.body) ?? {};
    const rec = saveEvent({
      id: (event as any)?.id || "",
      provider: "stripe",
      verified,
      headers: req.headers as any,
      payload
    });
    persist().catch(() => {});
    res.json({ ok: true, id: rec.id, verified });
  };
}

function tryParseJson(v: any) {
  try {
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return null;
  }
}
