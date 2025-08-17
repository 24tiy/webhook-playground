import { Request } from "express";
import { Provider } from "./base.js";

async function token(clientId: string, secret: string, env: "sandbox" | "live") {
  const base = env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const creds = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const r = await fetch(base + "/v1/oauth2/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "accept": "application/json", "authorization": `Basic ${creds}` }, body: "grant_type=client_credentials" });
  const j = await r.json();
  return j.access_token as string;
}

async function verifySignature(args: { webhookId: string; transmissionId: string; timestamp: string; algorithm: string; certUrl: string; transmissionSig: string; body: any; clientId: string; secret: string; env: "sandbox" | "live" }) {
  const base = args.env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const t = await token(args.clientId, args.secret, args.env);
  const r = await fetch(base + "/v1/notifications/verify-webhook-signature", { method: "POST", headers: { "content-type": "application/json", "authorization": `Bearer ${t}` }, body: JSON.stringify({ auth_algo: args.algorithm, cert_url: args.certUrl, transmission_id: args.transmissionId, transmission_sig: args.transmissionSig, transmission_time: args.timestamp, webhook_id: args.webhookId, webhook_event: args.body }) });
  const j = await r.json();
  return j.verification_status === "SUCCESS";
}

export function paypalProvider(cfg: { webhookId: string; clientId: string; clientSecret: string; env: "sandbox" | "live" }): Provider {
  return {
    identify() {
      return "paypal";
    },
    async verify(req: Request) {
      try {
        const h = req.headers as any;
        const transmissionId = h["paypal-transmission-id"];
        const timestamp = h["paypal-transmission-time"];
        const algorithm = h["paypal-auth-algo"];
        const certUrl = h["paypal-cert-url"];
        const transmissionSig = h["paypal-transmission-sig"];
        if (!transmissionId || !timestamp || !algorithm || !certUrl || !transmissionSig) return false;
        return await verifySignature({ webhookId: cfg.webhookId, transmissionId, timestamp, algorithm, certUrl, transmissionSig, body: req.body, clientId: cfg.clientId, secret: cfg.clientSecret, env: cfg.env });
      } catch {
        return false;
      }
    }
  };
}
