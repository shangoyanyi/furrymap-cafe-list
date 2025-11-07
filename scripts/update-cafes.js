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
  // 情境 A：hook 直接回傳 JSON（目前就是這種）
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.cafes)) return parsed.cafes;
  } catch (e) {
    // ignore，改用 URL decode 後再試
  }

  // 情境 B：整段 raw 是 URL encoded 的 JSON 字串
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.cafes)) return parsed.cafes;
  } catch (e) {
    // ignore
  }

  throw new Error("無法從 hook 回應解析出 cafes 陣列");
}

// 嘗試對字串做 URL decode，解不開就用原值
function safeDecode(str) {
  if (typeof str !== "string") return str;
  // 粗略判斷是不是有 URL encoded pattern
  if (!/%[0-9A-Fa-f]{2}/.test(str)) return str;

  try {
    // 有些系統會把空白變成 +，先轉回空白
    const normalized = str.replace(/\+/g, " ");
    return decodeURIComponent(normalized);
  } catch (e) {
    return str;
  }
}

async function main() {
  console.log("Fetching data from hook...");
  const raw = await fetchHook();
  console.log("Raw response length:", raw.length);

  let cafes = parseCafes(raw);
  console.log("Parsed cafes length:", cafes.length);

  // 逐欄位做 decode（包含新增的 gmap_link、photo_link）
  cafes = cafes.map((cafe) => ({
    ...cafe,
    name: safeDecode(cafe.name),
    type: safeDecode(cafe.type),
    address: safeDecode(cafe.address),
    gmap_link: safeDecode(cafe.gmap_link),
    photo_link: safeDecode(cafe.photo_link),
  }));

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
