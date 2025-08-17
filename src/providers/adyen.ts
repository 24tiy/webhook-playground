import type { Request } from "express";
import { Provider, ProviderResult } from "./base.js";
import crypto from "crypto";

const hmacHex = process.env.ADYEN_HMAC_KEY || "";

function b64(s: string) {
  return Buffer.from(s, "utf8").toString("base64");
}

export const adyenProvider: Provider = {
  async verify(req: Request): Promise<ProviderResult> {
    const n = req.body;
    const items = n?.notificationItems || [];
    let ok = false;
    for (const it of items) {
      const x = it.NotificationRequestItem;
      const signing = [
        x.pspReference,
        x.originalReference || "",
        x.merchantAccountCode,
        x.merchantReference,
        x.amount?.value,
        x.amount?.currency,
        x.eventCode,
        x.success
      ].map(v => b64(String(v ?? ""))).join(":");
      if (!hmacHex) continue;
      const mac = crypto.createHmac("sha256", Buffer.from(hmacHex, "hex")).update(signing, "utf8").digest("base64");
      if (mac === x.additionalData?.hmacSignature) ok = true;
    }
    return { verified: ok, payload: req.body };
  }
};
