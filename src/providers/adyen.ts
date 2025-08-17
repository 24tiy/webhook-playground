import { Request, Response } from "express";
import crypto from "crypto";
import { saveEvent } from "../storage";

function toKeyBytes(k: string) {
  if (/^[0-9a-fA-F]+$/.test(k)) return Buffer.from(k, "hex");
  return Buffer.from(k, "base64");
}

function signingData(i: any) {
  const n = i || {};
  const a = n.amount || {};
  const fields = [
    n.pspReference || "",
    n.originalReference || "",
    n.merchantAccountCode || "",
    n.merchantReference || "",
    String(a.value ?? ""),
    String(a.currency ?? ""),
    n.eventCode || "",
    String(n.success ?? "")
  ];
  return fields.join(":");
}

function validateItem(hmacKey: string, item: any) {
  const k = toKeyBytes(hmacKey);
  const data = signingData(item);
  const mac = crypto.createHmac("sha256", k).update(data, "utf8").digest("base64");
  const sig = (((item.additionalData || {})["hmacSignature"] || "") + "").trim();
  return mac === sig;
}

export function adyenWebhookHandler(cfg: { hmacKey: string }) {
  return async (req: Request, res: Response) => {
    const body = req.body || {};
    const list = Array.isArray(body.notificationItems) ? body.notificationItems : [];
    let allOk = true;
    for (const w of list) {
      const i = (w && w.NotificationRequestItem) || {};
      if (!validateItem(cfg.hmacKey, i)) allOk = false;
    }
    const rec = await saveEvent({
      provider: "adyen",
      verified: allOk,
      headers: req.headers as any,
      payload: body
    });
    res.json({ ok: true, id: rec.id, verified: allOk });
  };
}
