import { Request, Response } from "express";
import { saveEvent, persist } from "../storage";
import crypto from "crypto";

function base64(key: string) {
  try {
    return Buffer.from(key, "base64");
  } catch {
    return Buffer.from(key, "utf8");
  }
}

function signString(item: any) {
  const fields = [
    item.pspReference || "",
    item.originalReference || "",
    item.merchantAccountCode || "",
    item.merchantReference || "",
    item.amount?.value ?? "",
    item.amount?.currency ?? "",
    item.eventCode || "",
    String(item.success ?? "")
  ];
  return fields.join(":");
}

export function adyenWebhookHandler(hmacKey: string) {
  const key = base64(hmacKey || "");
  return (req: Request, res: Response) => {
    const payload = req.body;
    let verified = false;
    if (payload && Array.isArray(payload.notificationItems)) {
      const items = payload.notificationItems.map((it: any) => it.NotificationRequestItem || it);
      verified = items.every((it: any) => {
        const expected = crypto.createHmac("sha256", key).update(signString(it), "utf8").digest("base64");
        const provided = String((it.additionalData || {}).hmacSignature || (it.additionalData || {})["hmacSignature"] || "");
        return expected === provided;
      });
    }
    const rec = saveEvent({ provider: "adyen", verified, headers: req.headers as any, payload });
    persist().catch(() => {});
    res.json({ ok: true, id: rec.id, verified });
  };
}
