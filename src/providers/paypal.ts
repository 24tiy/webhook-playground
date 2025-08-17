import type { Request } from "express";
import { Provider, ProviderResult } from "./base.js";

const env = (process.env.PAYPAL_ENV === "live" ? "live" : "sandbox") as "sandbox" | "live";
const base = env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const webhookId = process.env.PAYPAL_WEBHOOK_ID || "";
const clientId = process.env.PAYPAL_CLIENT_ID || "";
const clientSecret = process.env.PAYPAL_CLIENT_SECRET || "";

async function token() {
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const r = await fetch(base + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "accept": "application/json",
      "authorization": `Basic ${creds}`
    },
    body: "grant_type=client_credentials"
  } as any);
  const j = await r.json();
  return j.access_token as string;
}

export const paypalProvider: Provider = {
  async verify(req: Request): Promise<ProviderResult> {
    const h = req.headers as Record<string, string | string[] | undefined>;
    const transmissionId = String(h["paypal-transmission-id"] || "");
    const timestamp = String(h["paypal-transmission-time"] || "");
    const algorithm = String(h["paypal-auth-algo"] || "");
    const certUrl = String(h["paypal-cert-url"] || "");
    const transmissionSig = String(h["paypal-transmission-sig"] || "");
    const bodyJson = req.body;
    let ok = false;
    if (webhookId && clientId && clientSecret && transmissionId && timestamp && algorithm && certUrl && transmissionSig) {
      try {
        const t = await token();
        const r = await fetch(base + "/v1/notifications/verify-webhook-signature", {
          method: "POST",
          headers: { "content-type": "application/json", "authorization": `Bearer ${t}` },
          body: JSON.stringify({
            auth_algo: algorithm,
            cert_url: certUrl,
            transmission_id: transmissionId,
            transmission_sig: transmissionSig,
            transmission_time: timestamp,
            webhook_id: webhookId,
            webhook_event: bodyJson
          })
        });
        const j = await r.json();
        ok = j.verification_status === "SUCCESS";
      } catch {
        ok = false;
      }
    }
    return { verified: ok, payload: bodyJson };
  }
};
