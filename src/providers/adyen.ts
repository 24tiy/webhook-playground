import { Request } from "express";
import crypto from "crypto";
import { Provider } from "./base.js";

export function adyenProvider(hmacKeyBase64: string): Provider {
  return {
    identify() {
      return "adyen";
    },
    async verify(req: Request) {
      try {
        const item = req.body?.notificationItems?.[0]?.NotificationRequestItem;
        if (!item) return false;
        const payload = [
          item.pspReference || "",
          item.originalReference || "",
          item.merchantAccountCode || "",
          item.merchantReference || "",
          item.amount?.value ?? "",
          item.amount?.currency ?? "",
          item.eventCode || "",
          item.success || ""
        ].join(":");
        const mac = crypto.createHmac("sha256", Buffer.from(hmacKeyBase64, "base64")).update(payload, "utf8").digest("base64");
        const sig = item.additionalData?.hmacSignature || item.additionalData?.["hmacSignature"];
        return mac === sig;
      } catch {
        return false;
      }
    }
  };
}
