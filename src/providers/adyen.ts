import { Request, Response } from "express";
import crypto from "crypto";
import { saveEvent, persist } from "../storage";

type Item = {
  additionalData?: Record<string, any>;
  pspReference?: string;
  originalReference?: string | null;
  merchantAccountCode?: string;
  merchantReference?: string;
  amount?: { value?: number; currency?: string };
  eventCode?: string;
  success?: string;
};

function base64KeyToBuffer(key: string) {
  try { return Buffer.from(key, "base64"); } catch { return Buffer.from(key, "hex"); }
}

function adyenHmac(item: Item, key: string) {
  const k = base64KeyToBuffer(key);
  const parts = [
    item.pspReference || "",
    item.originalReference || "",
    item.merchantAccountCode || "",
    item.merchantReference || "",
    String(item.amount?.value ?? ""),
    item.amount?.currency || "",
    item.eventCode || "",
    String(item.success || "")
  ];
  const data = parts.join(":");
  const mac = crypto.createHmac("sha256", k).update(data, "utf8").digest("base64");
  return mac;
}

export function adyenWebhookHandler(cfg: { hmacKey: string; allowlistCurrencies?: string[] }) {
  const strict = (process.env.STRICT_VERIFY || "true").toLowerCase() !== "false";

  return async (req: Request, res: Response) => {
    const body = req.body || {};
    const items: Item[] = Array.isArray(body.notificationItems)
      ? body.notificationItems.map((x: any) => x.NotificationRequestItem || x)
      : body.NotificationRequestItem
      ? [body.NotificationRequestItem]
      : [];

    if (!items.length) {
      if (strict) return res.status(400).json({ ok: false, error: "no_items" });
    }

    let verified = false;
    try {
      if (cfg.hmacKey && items.length) {
        verified = items.every(it => {
          const sig = it.additionalData?.hmacSignature || it.additionalData?.["hmacSignature"];
          const expected = adyenHmac(it, cfg.hmacKey);
          return typeof sig === "string" && sig === expected;
        });
      } else if (strict) {
        return res.status(500).json({ ok: false, error: "server_misconfigured" });
      }
    } catch {
      if (strict) return res.status(400).json({ ok: false, error: "invalid_signature" });
      verified = false;
    }

    if (cfg.allowlistCurrencies && cfg.allowlistCurrencies.length && items.length) {
      const ok = items.every(it => !it.amount?.currency || cfg.allowlistCurrencies!.includes(String(it.amount.currency)));
      if (!ok && strict) return res.status(400).json({ ok: false, error: "currency_not_allowed" });
    }

    const rec = saveEvent({ provider: "adyen", verified, headers: req.headers as any, payload: req.body });
    persist().catch(() => {});
    res.json({ ok: true, id: rec.id, verified });
  };
}
