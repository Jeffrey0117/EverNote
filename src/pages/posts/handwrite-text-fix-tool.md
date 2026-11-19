---
layout: ../../layouts/PostLayout.astro
title: 手寫一支改字工具：找字、換字、推上去
date: 2026-11-19T23:50
description: 跟著做的五關練習：用約 60 行 Node.js 寫出在專案裡找字、換字、commit、push 的小工具。
tags:
  - Node.js
  - 觀念
  - 工具
interactive: true
---
我有一個工具，在自己的網站上點一段字就能改掉原始碼。它有一千多行，但核心只有一件事：在專案裡找到那句話，換掉，推上去。

這篇是一份跟著做的練習，五關，寫完大約 60 行 Node.js：

1. **在一個檔案裡找字**：`process.argv`、`fs.readFileSync`、`indexOf`。
2. **換掉並存檔**：為什麼不用 `replace`（新字裡的 `$` 會被當成指令），改用位置切開再接起來。
3. **在整個專案裡找**：從 Node 叫 `git grep`，以及找不到時結束碼是 1 這個坑。
4. **好幾處就停**：只有一處才改。改錯地方比沒改更糟。
5. **commit 和 push**：只送出改到的那一個檔案。

每一關都有驗收指令和應該看到的輸出，提示和寫法收在可以展開的區塊裡，先自己寫再打開。頁面裡有兩個小實驗可以直接玩：`indexOf` 回傳什麼、`replace` 和 `slice` 遇到 `$` 的差別。

<p style="margin:1.5em 0"><a href="/EverNote/w/handwrite-text-fix-tool/" style="display:inline-block;padding:0.7em 1.4em;border-radius:8px;background:var(--text-primary,#222);color:var(--bg-primary,#fff);text-decoration:none;font-weight:600">▶ 打開互動拆解</a></p>
