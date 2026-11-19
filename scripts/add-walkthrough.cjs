#!/usr/bin/env node
/**
 * 把一頁自包的「互動拆解」HTML 歸檔進這個部落格。
 *   1. 互動頁  → public/w/<slug>/index.html（原樣服務於 /EverNote/w/<slug>/）
 *   2. 列表貼文 → src/pages/posts/<slug>.md（frontmatter + 文字摘要 + 「打開互動拆解」按鈕）
 * 零依賴。給 /walkthrough skill 呼叫，也能自己手跑。
 *
 * 用法:
 *   node scripts/add-walkthrough.cjs \
 *     --html <互動頁.html> --slug server-side-auth-gate \
 *     --title "登入牆要擋在伺服器" --desc "一句話摘要" \
 *     --tags 觀念,資安,Node.js \
 *     --stub <摘要.md> [--date 2026-11-19T21:30] [--force]
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "src", "pages", "posts");
const PUBLIC_W = path.join(ROOT, "public", "w");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    if (key === "force") {
      args.force = true;
      continue;
    }
    args[key] = argv[i + 1];
    i += 1;
  }
  return args;
}

const SLUG_OK = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(message) {
  console.error("失敗:", message);
  process.exit(1);
}

function localISODate() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const { slug, title } = args;
  if (!slug || !SLUG_OK.test(slug)) fail("--slug 要給，只能用小寫英數與連字號（例 server-side-auth-gate）");
  if (!args.html) fail("--html 要給互動頁 HTML 檔路徑");
  if (!title) fail("--title 要給文章標題");
  if (!args.desc) fail("--desc 要給一句話摘要");

  const htmlPath = path.resolve(args.html);
  if (!fs.existsSync(htmlPath)) fail(`找不到 HTML:${htmlPath}`);
  const html = fs.readFileSync(htmlPath, "utf8");
  if (!/<\s*html|<!doctype/i.test(html) && !/<title>/i.test(html)) {
    fail("這個 HTML 看起來不是一頁完整的文件（沒有 <title>/<html>）");
  }

  const postPath = path.join(POSTS_DIR, `${slug}.md`);
  const pagePath = path.join(PUBLIC_W, slug, "index.html");
  if (!args.force && (fs.existsSync(postPath) || fs.existsSync(pagePath))) {
    fail(`slug「${slug}」已經存在，要覆蓋加 --force`);
  }

  const tags = String(args.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const date = args.date || localISODate();

  let summary = "";
  if (args.stub) {
    const stubPath = path.resolve(args.stub);
    if (!fs.existsSync(stubPath)) fail(`找不到摘要檔:${stubPath}`);
    summary = fs.readFileSync(stubPath, "utf8").trim();
  }

  // 1) 互動頁放進 public/w/<slug>/
  fs.mkdirSync(path.dirname(pagePath), { recursive: true });
  fs.writeFileSync(pagePath, html);

  // 2) 列表貼文
  const frontmatter = [
    "---",
    "layout: ../../layouts/PostLayout.astro",
    `title: ${title}`,
    `date: ${date}`,
    `description: ${args.desc}`,
    "tags:",
    ...tags.map((t) => `  - ${t}`),
    "interactive: true",
    "---",
    "",
  ].join("\n");

  const button =
    `<p style="margin:1.5em 0"><a href="/EverNote/w/${slug}/" ` +
    `style="display:inline-block;padding:0.7em 1.4em;border-radius:8px;` +
    `background:var(--text-primary,#222);color:var(--bg-primary,#fff);` +
    `text-decoration:none;font-weight:600">▶ 打開互動拆解</a></p>`;

  const body = [summary, "", button, ""].filter((part, i) => part !== "" || i === 1).join("\n");
  fs.writeFileSync(postPath, frontmatter + body + "\n");

  console.log("已歸檔:");
  console.log("  互動頁:", path.relative(ROOT, pagePath), "→ /EverNote/w/" + slug + "/");
  console.log("  貼文  :", path.relative(ROOT, postPath));
  console.log("接著 npm run build，然後 commit + push 部署。");
}

main();
