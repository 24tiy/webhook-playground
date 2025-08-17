import { Request } from "express";

export interface Provider {
  verify(req: Request): Promise<boolean>;
  identify(): string;
}
