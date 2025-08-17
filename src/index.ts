import "dotenv/config";
import express from "express";
import { router } from "./routes.js";
import { logger } from "./lib/logger.js";

const app = express();

app.use((req: any, _res, next) => {
  req.rawBody = Buffer.alloc(0);
  req.on("data", (chunk: Buffer) => {
    req.rawBody = Buffer.concat([req.rawBody, chunk]);
  });
  next();
});

app.use(router);

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  logger.info({ port: PORT }, "listening");
});
