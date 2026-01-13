---
layout: ../../layouts/PostLayout.astro
title: 前端打包工具，先搞懂在打包什麼
date: 2026-01-14T02:52
description: 很多人用 Vite、Webpack，但不知道打包到底在幹嘛
tags:
  - 前端
  - 打包工具
  - JavaScript
---

「你為什麼要用 Webpack？」

面試官這樣問我，我愣住了。

當時我已經用 Webpack 半年，每天跑 `npm run build`，但被問到「打包在幹嘛」，我只能說「把很多檔案變成一個檔案」。

面試官笑了笑，沒有追問。

我知道我答得很爛。

回家之後，我決定搞懂這件事。

## 為什麼要打包

瀏覽器以前不認識 `import` / `export`。

你寫 `import { useState } from 'react'`，瀏覽器會說：「我看不懂。」

所以需要一個工具，把這些 `import` 解析掉，變成瀏覽器看得懂的東西。

這只是原因之一。還有更實際的：

### HTTP 請求太多

我第一個專案有 47 個 JS 檔案。

部署上去之後，首頁載入要 8 秒。

我以為是 server 太慢，換了主機還是一樣慢。

後來打開 DevTools 的 Network 才發現：47 個請求，每個都要等。

原來瀏覽器不是「載入總共多少 KB」，而是「載入多少個檔案」。

100 個 1KB 的檔案，比 1 個 100KB 的檔案慢很多。

[HTTP/2](https://developer.mozilla.org/zh-TW/docs/Glossary/HTTP_2) 有改善（可以多路複用，減少連線 overhead），但還是比不上「一個檔案搞定」來得乾脆。

打包工具把 100 個小檔案合成一個大檔案，請求數從 100 變 1。

這是我第一次理解「打包」的意義。

### 要壓縮

```javascript
function calculateTotalPrice(items, taxRate) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return subtotal * (1 + taxRate);
}
```

這是人看的。

```javascript
function c(a,b){return a.reduce((s,i)=>s+i.price,0)*(1+b)}
```

這是電腦跑的。

兩者功能一樣，但後者體積小很多。

**minify（壓縮）** 就是把變數名縮短、刪空白、刪註解，讓檔案變小。

打包工具順便幫你做這件事。

### 要 Tree Shaking

我第一次發現 bundle 有 500KB，嚇到。

用了 webpack-bundle-analyzer 一看，lodash 佔了 70KB。

但我只用了 `debounce` 一個函數：

```javascript
import { debounce } from 'lodash';
```

lodash 有幾百個函數，為什麼要載入整個 library？

後來才知道有 Tree Shaking 這招。

**Tree Shaking（搖樹）** 就是把沒用到的 code 搖掉，只留你真正用到的。

這招在 Electron 打包時特別有用。

一個中型 Electron app（像是筆記軟體），Tree Shaking 前可能 150MB，處理後能壓到 50MB。

想知道怎麼優化 Electron 打包體積，可以看這篇：[Electron 肥是你不會 Tree Shaking](/Evernote/posts/electron-tree-shaking)

## 打包工具在做什麼

講完為什麼，講怎麼做。

打包工具做的事情可以拆成幾塊：

### 合併檔案

把多個檔案合成一個（或幾個）。

100 個小檔案 → 1 個大檔案。

這是最基本的。

### 轉譯

TypeScript → JavaScript。

JSX → JavaScript。

ES6+ → ES5（給舊瀏覽器看）。

這些轉換不是打包工具自己做的，而是呼叫其他工具（像 [Babel](https://babeljs.io/)、[tsc](https://www.typescriptlang.org/)）來做。

打包工具負責串起來。

### 壓縮

minify，前面講過了。

變數名縮短、刪空白、刪註解。

有些打包工具還會做更進階的優化，像是把多個小函數 inline 進來、刪掉 dead code。

### Tree Shaking

搖掉沒用的 code。

前提是你要用 ES Module（`import` / `export`），不能用 CommonJS（`require`）。

因為 ES Module 是靜態的，打包工具可以在編譯時分析依賴關係。

CommonJS 是動態的，`require` 的參數可以是變數，沒辦法靜態分析。

想了解更多關於 Node.js 的模組系統和套件管理，可以看這篇：[Node.js 套件管理器比較](/Evernote/posts/nodejs-package-managers)

## 現在有哪些選擇

工具一堆，每個都說自己很棒。

讓我來點名一下。

### Webpack

[Webpack](https://webpack.js.org/) 是老大哥，2014 年出的。

什麼都能做：打包 JS、CSS、圖片、字型。

什麼都能設定：loader、plugin、optimization。

但也因為什麼都能做，設定檔可以寫到讓人懷疑人生。

我第一次設定 Webpack，花了三天。

CSS 要用 css-loader，圖片要用 file-loader，TypeScript 要用 ts-loader。

每個 loader 還有一堆 options，設錯一個就跑不起來。

**Webpack 的學習曲線不是一條線，是一道牆。**

想體驗什麼叫「設定地獄」，可以看這篇：[Webpack 設定地獄](/Evernote/posts/webpack-config-hell)

複雜的大型專案、需要高度客製化？選這個。

### Rollup

[Rollup](https://rollupjs.org/) 是 2015 年出的，主打 ES Module 和 Tree Shaking。

打包出來的 code 比 Webpack 乾淨。

很多 library 作者用 Rollup 打包，因為產出的 bundle 比較小、比較好讀。

React、Vue、Three.js... 你打開它們的 `package.json`，看到 `"module": "dist/xxx.esm.js"` 通常就是 Rollup 產出的。

打包 library、npm 套件？選這個。

想知道為什麼打包 library 要用 Rollup 而不是 Webpack，可以看這篇：[打包 Library 為什麼用 Rollup](/Evernote/posts/rollup-for-libraries)

### esbuild

[esbuild](https://esbuild.github.io/) 是 2020 年出的，用 Go 寫的。

快到不講道理。

Webpack 打包要 10 秒，esbuild 可能只要 0.1 秒。

為什麼這麼快？因為用 Go 寫的，編譯成原生 binary，不像 JS 工具要先跑 Node.js。

而且 esbuild 的作者是 [Figma](https://www.figma.com/) 的 CTO，寫 code 的功力不是開玩笑的。

追求極致打包速度、CI/CD pipeline？選這個。

想深入了解 esbuild 為什麼這麼快，可以看這篇：[esbuild 的速度秘密](/Evernote/posts/esbuild-speed)

### Vite

[Vite](https://vitejs.dev/) 是 2020 年出的，Vue 的作者尤雨溪做的。

開發時不打包，直接用瀏覽器原生的 ES Module。

你改一行 code，瀏覽器只重新載入那一個模組，不用整包重打。

這叫 HMR（Hot Module Replacement，熱模組替換）——改 code 不用重整整頁，只換掉改動的模組。

Vite 把這件事做得特別快。

第一次跑 Vite，我以為它壞了。

因為 `npm run dev` 之後，0.3 秒就跑起來了。

我還在等它 build，結果它已經 ready 了。

用過 Vite 再回去用 Webpack，會想砸電腦。

生產環境打包則交給 Rollup。

Vue/React 新專案、想要快速開發體驗？選這個。

### Parcel

[Parcel](https://parceljs.org/) 主打「零設定」。

丟一個 `index.html` 進去，它會自動分析你的 import，自動打包。

不用寫 config 檔，不用設定 loader。

小專案、不想花時間設定？選這個。

### 表格比較

| 工具 | 速度 | 設定複雜度 | 生態系 | 適合場景 |
|------|------|-----------|--------|----------|
| [Webpack](https://webpack.js.org/) | 慢 | 高 | 最成熟 | 大型專案、複雜需求 |
| [Rollup](https://rollupjs.org/) | 中 | 中 | 成熟 | 打包 library |
| [esbuild](https://esbuild.github.io/) | 極快 | 低 | 較小 | CI/CD、追求速度 |
| [Vite](https://vitejs.dev/) | 快 | 低 | 快速成長 | Vue/React 新專案 |
| [Parcel](https://parceljs.org/) | 中 | 極低 | 較小 | 小專案、不想設定 |

## 選擇指南

講了這麼多，到底要選哪個？

| 你的情況 | 推薦 |
|---------|------|
| Vue/React 新專案 | **Vite**，開發體驗好，設定簡單 |
| 要打包 npm library | **Rollup**，產出乾淨，業界標準 |
| 大型企業專案，需求複雜 | **Webpack**，什麼都能做 |
| CI/CD 打包，追求速度 | **esbuild**，快到飛起 |
| 小專案，不想設定 | **Parcel**，零設定上手 |
| 不知道選什麼 | **Vite**，先用就對了 |

**我自己的判斷：**

2024 年之後開新專案，**Vite 是預設選擇**。

開發快、設定簡單、生態系成熟。

除非你有特殊需求（像是打包 library 要用 Rollup、極致速度要用 esbuild），不然 Vite 就夠了。

Webpack 還是有它的場景，但新專案越來越少人用了。

## 後續文章

打包工具的歷史演進也很有意思。

從 Grunt 到 Gulp 到 Webpack 到 Vite，每個階段都在解決不同的問題。

想知道為什麼前端工具一直在換？下一篇講：[從 Grunt 到 Vite：前端打包的演進](/Evernote/posts/bundler-history)

---

回到那次面試。

如果再被問一次「打包在幹嘛」，我會說：

「打包是把開發者寫的 code，變成瀏覽器跑得動、用戶載得快的 code。」

不是「把很多檔案變成一個」，那只是手段。

**搞懂目的，才能選對工具。**
