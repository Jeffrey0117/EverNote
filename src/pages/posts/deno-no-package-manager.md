---
layout: ../../layouts/PostLayout.astro
title: Deno 說：套件管理器是歷史的錯誤
date: 2026-01-14T01:42
description: Deno 不需要 npm install，直接 import URL 就能用
tags:
  - Deno
  - JavaScript
  - TypeScript
  - 套件管理
---

我第一次用 Deno 是因為好奇：「沒有 node_modules 到底怎麼跑？」

結果真的跑起來了。

沒有 npm install，沒有 package.json，沒有那個吃掉我 10GB 硬碟的黑洞資料夾。

我心想：「這什麼黑魔法？」

後來才知道，這是 Node.js 作者 Ryan Dahl 的「贖罪」。

2018 年他在 JSConf 上講了一場 [10 Things I Regret About Node.js](https://www.youtube.com/watch?v=M3BM9TB-8yA)，直接公開檢討自己當年的設計錯誤。

其中 node_modules 是最大的遺憾。

一個中型專案的 node_modules 可能有 **200MB、10 萬個檔案**。十個專案就是 2GB。

**於是他做了 [Deno](https://deno.com/)，根本沒有套件管理器這東西。**

## 直接 import URL

在 Deno 裡面，要用第三方套件，直接寫 URL：

```typescript
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

serve(() => new Response("Hello World"));
```

沒有 `npm install`，沒有 package.json，沒有 node_modules。

第一次執行的時候，Deno 會自動下載這個 URL，cache（快取）在本機，之後就直接用 cache。

> cache 就是把下載過的東西存起來，下次不用再下載。跟瀏覽器會 cache 網頁圖片是一樣的道理。

這跟瀏覽器載入 `<script src="https://...">` 是一樣的概念。

**套件就是一個 URL，沒什麼好管理的。**

## import map 整理依賴

URL 寫在程式碼裡有點醜，而且版本寫死不好改。

Deno 支援 **import map**——簡單說就是一份「對照表」，讓你用短名字代替長 URL：

```json
{
  "imports": {
    "std/": "https://deno.land/std@0.208.0/",
    "oak": "https://deno.land/x/oak@v12.6.1/mod.ts"
  }
}
```

然後程式碼就可以這樣寫：

```typescript
import { serve } from "std/http/server.ts";
import { Application } from "oak";
```

看起來乾淨多了，要改版本也只要改一個地方。

這就是 Deno 版的「套件管理」，但其實只是 URL 的別名而已。

## 現在也能用 npm 套件

Deno 後來也妥協了，支援用 `npm:` 前綴來載入 npm 套件：

```typescript
import express from "npm:express@4";
```

這樣可以用整個 npm 生態系，不用等所有套件都搬到 Deno。

想用 React？`import React from "npm:react@18"`。想用 axios？`import axios from "npm:axios"`。幾乎什麼都能用。

但骨子裡還是一樣：**沒有 node_modules，Deno 自己處理依賴**。

## 但這設計有坑

聽起來很美好，但實際用會遇到一些問題。

### 第一次執行的等待

```bash
deno run app.ts
# 第一次會看到 Download https://deno.land/...
```

依賴多的話，第一次跑會花一點時間。之後用 cache，但換電腦就要重來。

### 離線開發的尷尬

沒網路的時候，如果 cache 裡沒有，就跑不起來。

Deno 有 `deno cache` 指令可以預先下載：

```bash
deno cache app.ts
```

也可以用 `--lock` 和 `--lock-write` 來鎖定依賴版本。

但比起 node_modules 整包放在專案裡，還是麻煩一點。詳細用法可以看 [Deno 官方文件](https://docs.deno.com/runtime/fundamentals/modules/)。

### URL 掛掉怎麼辦

如果 `deno.land` 或第三方伺服器掛了，套件就載不到。

這也是為什麼 URL 要帶版本號：`std@0.208.0`。至少確保不會因為上游更新而炸掉。

2016 年 npm 上的 [left-pad 套件被作者刪掉](https://qz.com/646467/how-one-programmer-broke-the-internet-by-deleting-a-tiny-piece-of-code)，整個 JavaScript 生態系大爆炸。如果 Deno 的依賴伺服器掛了，道理是一樣的。

長期來看，確實有單點故障的風險。

## 這種設計對還是錯

Deno 的核心想法很簡單：**能不管的就不管**。

| | Node.js | Deno |
|------|---------|------|
| **一句話** | 穩定優先，離線能跑 | 簡潔優先，擁抱網路 |
| **依賴來源** | npm registry | 任何 URL |
| **本機儲存** | 每個專案一份 node_modules | 全域 cache |
| **版本鎖定** | package-lock.json | URL 帶版本 + lock 檔 |
| **離線使用** | node_modules 在就能跑 | 要先 cache 過 |

Node.js 的設計是「把所有東西都放在專案裡」，確保隨時能跑。

Deno 的設計是「把依賴當成 URL」，簡化管理但依賴網路。

兩種思路都有道理，看你在意什麼。

常斷網？Node.js 把東西都放手邊比較穩。

受夠 node_modules？Deno 乾淨到你會感動。

## 其他語言的套件管理

想了解其他語言怎麼處理套件管理，可以參考：

- [Node.js 的三個套件管理器](/Evernote/posts/nodejs-package-managers)：npm、yarn、pnpm 的差異
- [Python 套件管理的混亂](/Evernote/posts/python-package-managers)：pip、uv、poetry 各有擁護者
- [Cargo 為什麼是最好的](/Evernote/posts/why-cargo-is-the-best)：Rust 的套件管理被公認設計得最好
- [Windows 也有套件管理器了](/Evernote/posts/windows-package-managers)：winget 和 scoop 的選擇

Deno 說不要套件管理器，聽起來瘋，但說不定是對的。

---

Ryan Dahl 花了十年反省 Node.js 的錯誤，Deno 就是他的答案。

不一定是對的答案，但至少提供了另一種可能。

**node_modules 是黑洞。URL 是逃生艙。**
