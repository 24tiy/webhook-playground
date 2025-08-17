const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const SRC = path.join(process.cwd(), "data", "events");
const DST = path.join(process.cwd(), "docs", "events");

fs.mkdirSync(DST, { recursive: true });

const files = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter(f => f.endsWith(".json")) : [];
for (const f of files) {
  const s = path.join(SRC, f);
  const d = path.join(DST, f);
  try { fs.copyFileSync(s, d); } catch {}
}

const docsFiles = fs.readdirSync(DST).filter(f => f.endsWith(".json"));
const list = [];
for (const f of docsFiles) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(DST, f), "utf8"));
    list.push(j);
  } catch {}
}
list.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
fs.writeFileSync(path.join(process.cwd(), "docs", "events.json"), JSON.stringify(list, null, 2));

try { execSync("git add docs", { stdio: "inherit" }); } catch {}
try { execSync('git commit -m "events" --allow-empty', { stdio: "inherit" }); } catch {}
try { execSync("git push origin main", { stdio: "inherit" }); } catch {}
