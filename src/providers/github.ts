import { Request } from "express";
import crypto from "crypto";
import { Provider } from "./base.js";

export function githubProvider(secret: string): Provider {
  return {
    identify() {
      return "github";
    },
    async verify(req: Request) {
      try {
        const sig = req.headers["x-hub-signature-256"] as string;
        if (!sig || !sig.startsWith("sha256=")) return false;
        const body = JSON.stringify(req.body || {});
        const mac = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
        return sig === mac;
      } catch {
        return false;
      }
    }
  };
}
