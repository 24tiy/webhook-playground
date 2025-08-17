import crypto from "crypto";
import { Request, Response } from "express";
import { saveEvent, persist } from "../storage";

function signString(v: any) {
  const arr = [
    v.pspReference || "",
    v.originalReference || "",
    v.merchantAccountCode || "",
    v.merchantReference || "",
    v.amount?.value?.toString() || "",
    v.amount?.currency || "",
    v.eventCode || "",
    v.success || ""
  ];
  return arr.join(":");
}

function verifyItem(item: any, hmacKeyBase64: string) {
  const v = item?.NotificationRequestItem || item;
  const given = v?.additionalData?.hmacSignature || v?.additionalData?.["hmacSignature"];
  if (!given) return false;
  const key = Buffer.from(hmacKeyBase64, "base64");
  const data = signString(v);
  const mac = crypto.createHmac("sha256", key).update(data, "utf8").digest("base64");
  return mac === given;
}

export function adyenWebhookHandler(hmacKeyBase64: string) {
  return async (req: Request, res: Response) => {
    let verified = false;
    let body = req.body;
    try {
      if (Array.isArray(body?.notificationItems)) {
        verified = body.notificationItems.every((x: any) => verifyItem(x, hmacKeyBase64));
      } else {
        verified = verifyItem(body, hmacKeyBase64);
      }
    } catch {
      verified = false;
    }
    const rec = saveEvent({ provider: "adyen", verified, headers: req.headers as any, payload: body });
    persist().catch(() => {});
    res.json({ ok: true, id: rec.id, verified });
  };
}
