import fetch from "node-fetch";
import { Request, Response } from "express";
import { saveEvent } from "../storage";

async function token(clientId: string, secret: string, env: "sandbox" | "live") {
  const base = env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const creds = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const r = await fetch(base + "/v1/oauth2/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "accept": "application/json", "authorization": `Basic ${creds}` }, body: "grant_type=client_credentials" } as any);
  const j = await r.json();
  return j.access_token as string;
}

async function verify(args: { webhookId: string; transmissionId: string; timestamp: string; algorithm: string; certUrl: string; transmissionSig: string; body: any; clientId: string; secret: string; env: "sandbox" | "live" }) {
  const base = args.env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const t = await token(args.clientId, args.secret, args.env);
  const r = await fetch(base + "/v1/notifications/verify-webhook-signature", { method: "POST", headers: { "content-type": "application/json", "authorization": `Bearer ${t}` }, body: JSON.stringify({ auth_algo: args.algorithm, cert_url: args.certUrl, transmission_id: args.transmissionId, transmission_sig: args.transmissionSig, transmission_time: args.timestamp, webhook_id: args.webhookId, webhook_event: args.body }) });
  const j = await r.json();
  return j.verification_status === "SUCCESS";
}

export function paypalWebhookHandler(cfg: { webhookId: string; clientId: string; clientSecret: string; env: "sandbox" | "live" }) {
  return async (req: Request, res: Response) => {
    const h = req.headers as any;
    const transmissionId = h["paypal-transmission-id"];
    const timestamp = h["paypal-transmission-time"];
    const algorithm = h["paypal-auth-algo"];
    const certUrl = h["paypal-cert-url"];
    const transmissionSig = h["paypal-transmission-sig"];
    let verified = false;
    try {
      verified = await verify({ webhookId: cfg.webhookId, transmissionId, timestamp, algorithm, certUrl, transmissionSig, body: req.body, clientId: cfg.clientId, secret: cfg.clientSecret, env: cfg.env });
    } catch {
      verified = false;
    }
    const rec = saveEvent({ provider: "paypal", verified, headers: req.headers as any, payload: req.body });
    res.json({ ok: true, id: rec.id, verified });
  };
}
