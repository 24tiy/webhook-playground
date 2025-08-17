import { Request, Response } from "express";
import { saveEvent } from "../storage";

type Env = "sandbox" | "live";

function apiBase(env: Env) {
  return env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

let cachedToken = "";
let tokenExp = 0;

async function withTimeout<T>(p: Promise<T>, ms: number) {
  const t = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));
  return Promise.race([p, t]);
}

async function getToken(clientId: string, secret: string, env: Env) {
  const now = Date.now();
  if (cachedToken && now < tokenExp - 10_000) return cachedToken;
  const creds = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await withTimeout(
    fetch(apiBase(env) + "/v1/oauth2/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
        authorization: `Basic ${creds}`
      },
      body: "grant_type=client_credentials"
    }),
    8000
  );
  const j = await res.json();
  cachedToken = j.access_token || "";
  const expiresIn = Number(j.expires_in || 300);
  tokenExp = now + expiresIn * 1000;
  return cachedToken;
}

async function verifySignature(args: {
  webhookId: string;
  transmissionId: string;
  timestamp: string;
  algorithm: string;
  certUrl: string;
  transmissionSig: string;
  body: any;
  clientId: string;
  clientSecret: string;
  env: Env;
}) {
  const token = await getToken(args.clientId, args.clientSecret, args.env);
  const res = await withTimeout(
    fetch(apiBase(args.env) + "/v1/notifications/verify-webhook-signature", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        auth_algo: args.algorithm,
        cert_url: args.certUrl,
        transmission_id: args.transmissionId,
        transmission_sig: args.transmissionSig,
        transmission_time: args.timestamp,
        webhook_id: args.webhookId,
        webhook_event: args.body
      })
    }),
    8000
  );
  const j = await res.json();
  return j && j.verification_status === "SUCCESS";
}

export function paypalWebhookHandler(cfg: {
  webhookId: string;
  clientId: string;
  clientSecret: string;
  env: Env;
}) {
  return async (req: Request, res: Response) => {
    const h = req.headers as any;
    const transmissionId = h["paypal-transmission-id"] || "";
    const timestamp = h["paypal-transmission-time"] || "";
    const algorithm = h["paypal-auth-algo"] || "";
    const certUrl = h["paypal-cert-url"] || "";
    const transmissionSig = h["paypal-transmission-sig"] || "";
    let verified = false;
    try {
      if (
        cfg.webhookId &&
        transmissionId &&
        timestamp &&
        algorithm &&
        certUrl &&
        transmissionSig
      ) {
        verified = await verifySignature({
          webhookId: cfg.webhookId,
          transmissionId,
          timestamp,
          algorithm,
          certUrl,
          transmissionSig,
          body: req.body,
          clientId: cfg.clientId,
          clientSecret: cfg.clientSecret,
          env: cfg.env
        });
      }
    } catch {
      verified = false;
    }
    const rec = await saveEvent({ provider: "paypal", verified, headers: req.headers as any, payload: req.body });
    res.json({ ok: true, id: rec.id, verified });
  };
}
