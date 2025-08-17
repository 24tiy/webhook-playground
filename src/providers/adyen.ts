import crypto from "crypto";
import { Request, Response } from "express";
import { saveEvent, persist } from "../storage";
import { ENV } from "../lib/env";

function verifyAdyen(body: any, hmacHex: string): boolean {
  try {
    const n = body?.notificationItems?.[0]?.NotificationRequestItem;
    if (!n) return false;
    const sig = n.additionalData?.hmacSignature;
    if (!sig) return false;

    const signingString = [
      n.pspReference,
      n.originalReference || "",
      n.merchantAccountCode,
      n.merchantReference,
      n.amount.value,
      n.amount.currency,
      n.eventCode,
      n.success
    ].join(":");

    const expected = crypto
      .createHmac("sha256", Buffer.from(hmacHex, "hex"))
      .update(signingString, "utf8")
      .digest("base64");

    return expected === sig;
  } catch {
    return false;
  }
}

export function adyenWebhookHandler() {
  return (req: Request, res: Response) => {
    const verified = ENV.ADYEN_HMAC_KEY ? verifyAdyen(req.body, ENV.ADYEN_HMAC_KEY) : false;

    const rec = saveEvent({
      id: req.body?.notificationItems?.[0]?.NotificationRequestItem?.pspReference || "",
      provider: "adyen",
      verified,
      headers: req.headers as any,
      payload: req.body
    });
    persist().catch(() => {});
    res.json({ ok: true, id: rec.id, verified, result: "[accepted]" });
  };
}
