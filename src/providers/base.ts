import type { Request } from "express";

export interface ProviderResult {
  verified: boolean;
  payload: any;
}

export interface Provider {
  verify(req: Request): Promise<ProviderResult>;
}
