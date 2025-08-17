import { Request, Response } from "express";
import crypto from "crypto";
import { saveEvent, persist } from "../storage.js";

function signString(i: any) {
  const p = i.NotificationRequestItem || i;
  const vals = [
    p.pspReference || "",
    p.originalReference || "",
    p.merchantAccountCode || "",
    p.merchantReference || "",
    (p.amount && typeof p.amount.value !== "undefined" ? String(p.amount.value) : ""),
    (p.amount && p.amount.currency) || "",
    p.eventCode || "",
    typeof p.success === "string" ? p.success : p.success ? "true" : "false"
  ];
  return vals.join(":");
}

function verifyItem(i: any, base64Key: string) {
  const data = signString(i);
  const key = Buffer.from(base64Key, "base64");
  const h = crypto.createHmac("sha256", key).update(data, "utf8").digest("base64");
  const provided = i.NotificationRequestItem?.additionalData?.hmacSignature || i.additionalData?.hmacSignature || "";
  return h === provided;
}

export function adyenWebhookHandler(cfg: { hmacKey: string }) {
  return async (req: Request, res: Response) => {
    let verified = false;
    try {
      const items = Array.isArray(req.body?.notificationItems) ? req.body.notificationItems : [];
      verified = !!cfg.hmacKey && items.length > 0 && items.every((it) => verifyItem(it, cfg.hmacKey));
    } catch {
      verified = false;
    }
    const rec = saveEvent({ provider: "adyen", verified, headers: req.headers as any, payload: req.body });
    persist().catch(() => {});
    res.json({ ok: true, id: rec.id, verified });
  };
}
