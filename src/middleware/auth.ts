import { Request, Response, NextFunction } from "express";
import { ENV } from "../lib/env";

export function authRequired(req: Request, res: Response, next: NextFunction) {
  if (!ENV.AUTH_TOKEN) return next();
  const h = req.headers["authorization"] || "";
  const ok = typeof h === "string" && h.trim() === `Bearer ${ENV.AUTH_TOKEN}`;
  if (!ok) return res.status(401).json({ ok: false, error: "unauthorized" });
  next();
}
