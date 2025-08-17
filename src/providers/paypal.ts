import { Request, Response } from "express";
import { saveEvent, persist } from "../storage";
import { ENV } from "../lib/env";

async function token(clientId: string, secret: string, env: "sandbox" | "live") {
  const base = env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const creds = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const r = await fetch(base + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "accept": "application/json",
      "authorization": `Basic ${creds}`
    },
    body: "grant_type=client_credentials"
  } as RequestInit);
  const j = await r.json();
  return j.access_token as string;
}

async function verify(args: {
  webhookId: string;
  transmissionId: string;
  timestamp: string;
  algorithm: string;
  certUrl: string;
  transmissionSig: string;
  body: any;
  clientId: string;
  secret: string;
  env: "sandbox" | "live";
}) {
  const base = args.env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const t = await token(args.clientId, args.secret, args.env);
  const r = await fetch(base + "/v1/notifications/verify-webhook-signature", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${t}` },
    body: JSON.stringify({
      auth_algo: args.algorithm,
      cert_url: args.certUrl,
      transmission_id: args.transmissionId,
      transmission_sig: args.transmissionSig,
      transmission_time: args.timestamp,
      webhook_id: args.webhookId,
      webhook_event: args.body
    })
  } as RequestInit);
  const j = await r.json();
  return j.verification_status === "SUCCESS";
}

export function paypalWebhookHandler() {
  return async (req: Request, res: Response) => {
    const h = req.headers as any;
    const verified = await (async () => {
      try {
        if (!ENV.PAYPAL.WEBHOOK_ID || !ENV.PAYPAL.CLIENT_ID || !ENV.PAYPAL.CLIENT_SECRET) return false;
        return await verify({
          webhookId: ENV.PAYPAL.WEBHOOK_ID,
          transmissionId: h["paypal-transmission-id"],
          timestamp: h["paypal-transmission-time"],
          algorithm: h["paypal-auth-algo"],
          certUrl: h["paypal-cert-url"],
          transmissionSig: h["paypal-transmission-sig"],
          body: req.body,
          clientId: ENV.PAYPAL.CLIENT_ID,
          secret: ENV.PAYPAL.CLIENT_SECRET,
          env: ENV.PAYPAL.ENV
        });
      } catch {
        return false;
      }
    })();

    const rec = saveEvent({
      id: (req.body && req.body.id) || "",
      provider: "paypal",
      verified,
      headers: req.headers as any,
      payload: req.body
    });
    persist().catch(() => {});
    res.json({ ok: true, id: rec.id, verified });
  };
}
