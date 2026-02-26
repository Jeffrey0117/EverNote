---
layout: ../../layouts/NoteLayout.astro
title: 測試筆記 - Notes 功能上線
date: 2026-02-27T12:00
description: 技術筆記功能的第一則測試筆記
tags:
  - Astro
  - 測試
source: Evernote
---

## 這是什麼

技術筆記區上線了。這裡放的是開發時的技術細節、debug 紀錄、踩坑筆記。

跟正式文章（`/posts`）的差別：
- **筆記**：快速、原始、自己看的
- **文章**：整理過、有觀點、對外分享的

## 筆記來源

筆記可以透過以下方式產生：
1. 手動撰寫
2. Git hook 自動產生（push 時分析 diff）
3. Telegram bot `/write-note` 指令

每則筆記的 frontmatter 多了 `source` 欄位，標記來自哪個專案。
