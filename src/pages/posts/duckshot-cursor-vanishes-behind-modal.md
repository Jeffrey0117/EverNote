---
layout: ../../layouts/PostLayout.astro
title: 上傳彈窗一出來，游標就不見了
date: 2026-11-20T00:10
description: DuckShot 的 16 行 CSS 修正,藏了 z-index、選擇器權重、:has() 三個觀念。
tags:
  - CSS
  - 觀念
  - Electron
interactive: true
---
DuckShot（桌面截圖工具）的截圖覆蓋層，上傳成功的彈窗一出現，滑鼠游標就整個不見了，「完成」按鈕只能用猜的點。這個 bug 只動了 16 行 CSS，但背後有三個值得記住的觀念。

為什麼游標會不見？截圖時為了不把游標拍進圖裡，覆蓋層用 `cursor: none !important` 把真游標整個關掉，另外畫一個「假游標」（橘色圓點 + 十字線的 div）跟著滑鼠跑。問題出在彈窗：

- **z-index（誰蓋住誰）**：彈窗的 z-index 是 2000，假游標才 1005。真游標被 `cursor:none` 關掉、假游標被彈窗蓋住，兩個都沒了。每一段程式單看都對，是疊在一起才出事。
- **選擇器權重（兩條都 !important 時比誰具體）**：修法是在彈窗裡把真游標還回來，但原規則有 `!important`，新規則要贏就得讓選擇器更具體——瀏覽器數的是 class 數和標籤數。
- **`:has()`（讓裡面的狀態影響外面的元素）**：彈窗一開就把假游標收起來，但假游標不在彈窗裡，一般選擇器選不到。`:has(.modal.show)` 可以反過來問「body 裡有沒有開著的彈窗」，不用改一行 JavaScript。

怎麼確認真的修好：用看不見的視窗載入修正前後，直接問瀏覽器 `getComputedStyle(el).cursor`，比用眼睛看可靠。

下面的互動版可以切換「修正前／修正後」，把滑鼠移進白色卡片親手感受游標消失，再看修好後的差別。

<p style="margin:1.5em 0"><a href="/EverNote/w/duckshot-cursor-vanishes-behind-modal/" style="display:inline-block;padding:0.7em 1.4em;border-radius:8px;background:var(--text-primary,#222);color:var(--bg-primary,#fff);text-decoration:none;font-weight:600">▶ 打開互動拆解</a></p>
