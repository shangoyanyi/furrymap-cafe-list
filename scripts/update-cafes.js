// scripts/update-cafes.js
const fs = require("fs");
const path = require("path");
const https = require("https");

const HOOK_URL = "https://hook.eu2.make.com/oueitoq7oc6upio41xo3tfu1kj5r7smq";
const DB_PATH = path.join(__dirname, "..", "db.json");

function fetchHook() {
  return new Promise((resolve, reject) => {
    https
      .get(HOOK_URL, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

function parseCafes(raw) {
  // 情境 A：hook 直接回傳 JSON 陣列
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed.cafes)) {
      return parsed.cafes;
    }
  } catch (e) {
    // ignore，改用 URL decode 再試
  }

  // 情境 B：hook 回傳的是 URL encoded 的 JSON 字串
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed.cafes)) {
      return parsed.cafes;
    }
  } catch (e) {
    // ignore
  }

  throw new Error("無法從 hook 回應解析出 cafes 陣列");
}

async function main() {
  console.log("Fetching data from hook...");
  const raw = await fetchHook();
  console.log("Raw response length:", raw.length);

  const cafes = parseCafes(raw);
  console.log("Parsed cafes length:", cafes.length);

  const dbRaw = fs.readFileSync(DB_PATH, "utf8");
  const db = JSON.parse(dbRaw);

  db.cafes = cafes;

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  console.log("db.json updated successfully.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
