import { Request } from "express";
import { Provider } from "./base.js";

export function telegramProvider(secret: string): Provider {
  return {
    identify() {
      return "telegram";
    },
    async verify(req: Request) {
      const q = req.query?.secret as string | undefined;
      return !!secret && q === secret;
    }
  };
}
