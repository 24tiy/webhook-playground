import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import { saveEvent } from "./storage";

dotenv.config();

const app = express();

// Stripe webhooks требуют "сырой" body для проверки подписи
app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      const rec = saveEvent({
        provider: "stripe",
        verified: false,
        headers: req.headers,
        payload: JSON.parse(req.body.toString("utf8")),
      });
      return res.json({ ok: false, id: rec.id, error: "missing_signature" });
    }

    // Если подпись есть — сохраняем как verified=true
    const rec = saveEvent({
      provider: "stripe",
      verified: true,
      headers: req.headers,
      payload: JSON.parse(req.body.toString("utf8")),
    });
    return res.json({ ok: true, id: rec.id });
  }
);

// Диагностический эндпоинт: показывает cwd, путь к data/events и список файлов
app.get("/__diag", (_req, res) => {
  const cwd = process.cwd();
  const dataDir = cwd + "/data/events";
  let files: string[] = [];
  try {
    files = fs.existsSync(dataDir)
      ? fs.readdirSync(dataDir).filter((f) => f.endsWith(".json"))
      : [];
  } catch {}
  res.json({ cwd, dataDir, files, count: files.length });
});

// Тестовый эндпоинт: принудительно пишет событие
app.post("/__test_write", (_req, res) => {
  const rec = saveEvent({
    provider: "debug",
    verified: false,
    headers: {},
    payload: { ping: true },
  });
  res.json({ ok: true, id: rec.id });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook playground running on port ${PORT}`);
});
