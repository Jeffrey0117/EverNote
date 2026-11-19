# `/walkthrough` 技術拆解 skill — 設計

**一句話**：改完 code、想留一份理解時叫 `/walkthrough`，它把這次改動拆成一頁「能動手玩」的互動 HTML，歸檔進 EverNote 技術部落格並部署，回你網址。

## 為什麼

- Jeff 懶得每次自己翻 repo 理解一段 code，但很多 commit 的概念很值得記下來。
- 這些拆解文同時是**影片素材**：一篇文 → 一支教學片。這是會生錢的資產，所以要建成可重複的生產線，不是一次性。
- 已有的 artifact（DuckShot 游標 bug、coursebloom 管理員驗證鎖）就是目標樣本：互動模型 + 逐段拆 + 驗證表。

## 目標 / 非目標

- **目標**：一個全域 skill，任何專案裡叫得到；產出自包互動 HTML；自動進 EverNote（列表/搜尋/RSS 都吃得到）；部署上線。
- **非目標（v1 不做）**：自動從每個 commit 觸發（維持手動叫）；批次補過去的 backlog（之後再回頭）；在互動頁裡放登入/留言/分析。

## 使用方式

```
/walkthrough                 # 拆最近一次改動（git diff HEAD~1）
/walkthrough 剛剛那個鎖        # 用自然語言指對象
/walkthrough src/foo.ts      # 拆某個檔/某段
```

不叫就不產（對應「不一定每次」）。

## 產物長相（house style，從 DuckShot / 鎖那兩頁蒸餾）

一頁自包 HTML：
- 整頁單一底色（Jeff 口味：淺色暖米、深色用 token 切換；三態主題 per artifact-design）。
- Noto Sans TC 內文 + JetBrains Mono 程式碼（只從 Google Fonts CDN，其餘 inline）。
- 結構：
  1. **H1 + lead**：這次改了什麼、幾行、藏了哪幾個值得記的觀念。
  2. **先玩一次**：一個可操作的 DOM 模型，讓讀者親手感受那個行為/bug（有視覺/互動面向時才放）。
  3. **逐段拆**：2–4 個觀念，每個配最小程式片段。
  4. **怎麼確認真的對**：驗證表（修正前/後的實際值）。
  5. 可選：**為什麼不用另一種解法**。
- 文字用 Jeff 的平白口吻，不用破折號、不客套。真實內容，不占位。

## 落地到 EverNote（互動頁是一等公民 + 進列表）

EverNote = Astro 靜態站，貼文是 `src/pages/posts/*.md`（frontmatter 驅動列表/RSS/分類）。互動頁是帶 JS 的完整 HTML，不硬塞 markdown。所以一篇拆解 = 兩個檔：

1. **互動頁**：`public/w/<slug>/index.html`（自包，原樣服務於 `/EverNote/w/<slug>/`）。
2. **列表貼文**：`src/pages/posts/<slug>.md`，frontmatter：
   ```
   layout: ../../layouts/PostLayout.astro
   title / date(YYYY-MM-DDTHH:mm) / description / tags / interactive: true
   ```
   內文 = 這次改動的**文字摘要**（＝SEO + 影片腳本種子）+ 一顆「▶ 打開互動拆解」按鈕連到互動頁。

兩個 URL 是刻意的：貼文頁負責被列出/搜尋/分享/SEO，互動頁一鍵打開。

## 元件

1. **skill**：`myclaudeset/skills/walkthrough/SKILL.md`（同步源頭）+ 鏡像到 `~/.claude/skills/walkthrough/SKILL.md`（本機即時生效）。內容：何時用、怎麼叫、產出流程、house style 規則、呼叫落地腳本、build+commit+push+回報。
2. **落地腳本**：`Evernote/scripts/add-walkthrough.cjs`（零依賴 Node CLI）。
   - 參數：`--html <檔> --slug <slug> --title <t> --desc <d> --tags <逗號分隔> [--date <ISO>] [--stub <markdown檔>]`。
   - 行為：把 html 複製到 `public/w/<slug>/index.html`；寫 `src/pages/posts/<slug>.md`（frontmatter + 傳入的摘要內文 + 按鈕）。slug 已存在要 `--force` 才覆蓋。
3. **列表徽章**：`index.astro` 對 `frontmatter.interactive` 的貼文標一個「互動」小徽章（低風險、純加顯示）。
4. **CLAUDE.md**：EverNote 的 CLAUDE.md 補一節「互動拆解（walkthrough）格式」。

## v1 驗收（整條線跑通）

- 用今天 coursebloom 的「管理員驗證鎖」當第一篇：產互動頁（沿用身分切換模型）→ 跑腳本落地 → `npm install` → `npm run build` 綠 → commit + push → GitHub Actions 部署 → 打得開 `https://jeffrey0117.github.io/EverNote/w/<slug>/` 且首頁列得到。
- EverNote 停擺半年，順便復活（build 綠、部署成功）。

## 之後（backlog）

- 從指定 commit / 跨專案自動產。
- 互動頁改成可內嵌進貼文（iframe）而非只連出去。
- 掃過去值得的 commit 批次補文。
