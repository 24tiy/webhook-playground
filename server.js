import express from "express";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json({ type: "*/*" }));

const DATA_DIR = path.join(process.cwd(), "data", "events");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.post("/webhook/:provider", (req, res) => {
  const id = Date.now().toString();
  const event = {
    id,
    provider: req.params.provider,
    verified: false,
    receivedAt: new Date().toISOString(),
    headers: req.headers,
    payload: req.body
  };
  fs.writeFileSync(
    path.join(DATA_DIR, `${id}.json`),
    JSON.stringify(event, null, 2)
  );
  res.json({ status: "ok", id });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
