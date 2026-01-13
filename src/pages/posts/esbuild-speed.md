---
layout: ../../layouts/PostLayout.astro
title: esbuild 快到不講道理
date: 2026-01-14T02:51
description: 第一次用 esbuild 的時候，以為它壞了——怎麼可能這麼快就跑完
tags:
  - esbuild
  - 前端
  - 打包工具
  - 效能
---

第一次用 [esbuild](https://esbuild.github.io/) 的時候，我以為它壞了——怎麼可能這麼快就跑完？

那時候在改一個 Electron 專案的打包流程，原本用 [webpack](https://webpack.js.org/) 打包渲染進程要 12 秒。

12 秒聽起來還好，但每次改一行 code 就要等 12 秒，一天下來等了幾十次，很煩。

同事說：「試試 esbuild，很快。」

我心想，能快多少？省個 3、4 秒？

結果跑完我傻了：**0.2 秒**。

「等等，這是真的跑完了嗎？」

我去看 dist 資料夾，檔案都在，打開確認沒問題。

是真的，0.2 秒。

## 有多快

esbuild 官方有放 [benchmark](https://esbuild.github.io/faq/#benchmark-details)，數字很誇張：

| 工具 | 打包時間 | 相對速度 | 一句話定位 |
|------|----------|----------|------------|
| esbuild | 0.37s | 1x | 追求極致速度 |
| Parcel 2 | 32.06s | 86x | 零設定入門友善 |
| Rollup + terser | 34.95s | 94x | Library 打包首選 |
| Webpack 5 | 41.53s | 112x | 生態最完整 |

這是打包 [three.js](https://threejs.org/)（一個 3D 圖形庫）10 次的結果。

**esbuild 比 webpack 快 100 倍**。

不是 10%、不是 2 倍，是 100 倍。

我自己的專案沒那麼誇張，但也差了 60 倍（12 秒 vs 0.2 秒）。

而且不只是打包快，連裝 esbuild 都快——npm install 完直接就能用，不用等什麼原生編譯。

## 為什麼這麼快

打包工具這麼多年了，大家都在做同一件事：把一堆 JavaScript 檔案合併成一個。

為什麼 esbuild 能快這麼多？

### 不是 JavaScript 寫的

webpack、Rollup、Parcel，這些工具都是用 JavaScript 寫的。

JavaScript 是動態語言，執行前要先被 [V8 引擎](https://v8.dev/)（Chrome 和 Node.js 的 JavaScript 執行引擎）編譯成機器碼。
每次跑的時候都要重新編譯，沒辦法像 C++ 那樣事先編譯好。

esbuild 是用 [Go](https://go.dev/) 寫的。

Go 是編譯語言，會事先編譯成原生機器碼。
你 npm install esbuild 的時候，裝的是已經編譯好的二進位檔，不是 JavaScript。

這差距就像：你每次開車都要先組裝引擎，跟車子本來就組好的差別。

之前寫過一篇關於 Rust/Go 帶來的效能革命：[為什麼大家都在抄 Cargo](/Evernote/posts/why-cargo-is-the-best)

裡面提到的 [uv](https://github.com/astral-sh/uv)（Python 套件管理）和 [Ruff](https://github.com/astral-sh/ruff)（Python linter）也是用 Rust 寫的，速度比原本的 Python 工具快 10-100 倍。

### 原生多執行緒

JavaScript 是單執行緒的，一次只能做一件事。

webpack 雖然有些 loader 可以開 worker 跑，但核心還是單執行緒。

esbuild 用 Go 寫，天生支援多執行緒。
掃描檔案、解析 AST（Abstract Syntax Tree，把程式碼拆成樹狀結構讓電腦理解）、產生程式碼，全部可以同時跑。

現代 CPU 動輒 8 核 16 執行緒，esbuild 可以全部吃滿。
webpack 只能用一個核心在那慢慢跑。

### 從零設計，沒有歷史包袱

webpack 2012 年出的，那時候前端還沒這麼複雜。

AMD、CommonJS、ES Module 三種模組系統打架（就像 USB-A、USB-C、Lightning 三種接頭，都是模組但格式不同），webpack 要全部支援。
一堆 loader、plugin 生態，要維持向後相容。

esbuild 2020 年才出，直接針對現代前端設計。

只支援 ES Module 和 CommonJS，不管 AMD。
不搞 loader 那套，內建支援 TypeScript、JSX（JavaScript XML，React 用來寫 UI 的語法）、CSS。

沒有歷史包袱，就可以做很多極端優化。

### 不用 AST transform（大部分情況）

webpack 的 loader 機制很彈性：每個 loader 把程式碼解析成 AST，改完再轉回字串，傳給下一個 loader。

問題是：每個 loader 都要解析一次 AST，轉換一次字串。

一個檔案可能經過 babel-loader、ts-loader，解析兩次、轉換兩次。

esbuild 不這樣玩。

它只解析一次 AST，所有轉換都在同一次解析裡完成。

TypeScript 轉 JavaScript、JSX 轉 React.createElement、壓縮程式碼——全部在同一次解析裡搞定。

## 但有代價

esbuild 不是萬能的，我也踩過坑。

### 裝飾器讓我翻車

有個專案用了 [MobX](https://mobx.js.org/)（一個狀態管理庫），程式碼裡滿滿的 `@observable`、`@action`。

我滿心期待換 esbuild，結果一跑就炸：

```
error: Transforming JavaScript decorators to the configured target environment is not supported yet
```

查了才知道，esbuild 對裝飾器（decorators）的支援很有限。

[Babel](https://babeljs.io/) 有一堆 plugin 可以做各種轉換：裝飾器、class properties、polyfill（讓舊瀏覽器跑新語法的補丁）。

esbuild 只做基本轉換：TypeScript 轉 JavaScript、JSX 轉函數呼叫、新語法轉舊語法。

專案重度依賴 Babel plugin？換 esbuild 會爆。

最後那個專案還是用 webpack，不是不想換，是換不了。

### Plugin 生態小很多

webpack 的 plugin 生態龐大——bundle analyzer、自動產生 HTML、PWA service worker、熱更新，什麼都有人做過。

esbuild 的 plugin 機制比較簡單，生態也小很多。

很多功能要自己寫，或者用其他工具補。

### 不適合高度客製化的場景

如果你的專案需要自訂 AST 轉換、複雜 code splitting、IE11 支援，esbuild 不夠用，還是要用 webpack 或 Rollup。

想深入了解各種打包工具的定位，可以參考這篇總覽：[前端打包工具演進史](/Evernote/posts/bundler-history)

## 怎麼用

說得夠多了，直接看 code。

### CLI 看起來簡單，但我一開始搞錯 --bundle

第一次用的時候，我只跑：

```bash
npx esbuild src/index.ts --outfile=dist/bundle.js
```

結果 dist 裡只有一個幾 KB 的檔案，import 的東西全部沒進去。

原來 esbuild 預設只轉譯單一檔案，不會幫你打包依賴。
要加 `--bundle`：

```bash
# 安裝
npm install -D esbuild

# 打包（重點是 --bundle）
npx esbuild src/index.ts --bundle --outfile=dist/bundle.js

# 打包 + 壓縮
npx esbuild src/index.ts --bundle --minify --outfile=dist/bundle.js
```

這個跟 webpack 的預設行為相反，webpack 預設就是 bundle mode。

常用參數：

| 參數 | 說明 |
|------|------|
| `--bundle` | 把所有 import 的檔案打包成一個（很重要，別漏掉） |
| `--minify` | 壓縮程式碼（移除空白、縮短變數名） |
| `--sourcemap` | 產生 source map（讓 debug 時能對應回原始程式碼） |
| `--target=es2020` | 指定輸出的 JavaScript 版本 |
| `--platform=node` | 打包給 Node.js 用（不打包 node 內建模組） |
| `--external:react` | 不把某個套件打包進去 |

### API 用法

CLI 參數太多會很難維護，複雜專案建議用 API：

```javascript
// build.js
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/index.tsx'],
  bundle: true,
  minify: true,
  sourcemap: true,
  target: ['es2020'],
  outfile: 'dist/bundle.js',

  // React 17+ 的 JSX 轉換（不用手動 import React）
  jsx: 'automatic',

  // 定義環境變數
  define: {
    'process.env.NODE_ENV': '"production"',
  },

  // 不打包這些套件（讓外部 CDN 提供）
  external: ['react', 'react-dom'],
}).then(() => {
  console.log('Build complete!');
}).catch(() => process.exit(1));
```

跑 `node build.js` 就會打包。

### Watch 模式

開發時想要改 code 自動重新打包：

```javascript
const esbuild = require('esbuild');

async function watch() {
  // context 模式：保持 esbuild 進程，增量編譯更快
  const ctx = await esbuild.context({
    entryPoints: ['src/index.tsx'],
    bundle: true,
    outfile: 'dist/bundle.js',
  });

  await ctx.watch();
  console.log('Watching for changes...');
}

watch();
```

改檔案後會自動重新打包，通常幾十毫秒就好了。

更多設定可以看 [esbuild 官方文件](https://esbuild.github.io/getting-started/)。

## 實際應用

講幾個我自己用 esbuild 的場景。

### Electron 渲染進程——這才是我愛上 esbuild 的原因

之前 Electron 專案每次改 UI 就要等 webpack 跑 12 秒。

後來我把渲染進程的打包換成 esbuild，世界都不一樣了。

不只是 0.2 秒的爽感，是整個開發節奏變了。

以前改一行 CSS 要：改 → 等 12 秒 → 看結果 → 再改。
現在是：改 → 0.2 秒 → 看結果 → 再改 → 0.2 秒 → 看結果...

手感完全不同，像從撥接網路換成光纖。

詳情可以看這篇：[Electron 肥是你不會 Tree Shaking](/Evernote/posts/electron-tree-shaking)

### Vite 底層就是 esbuild

[Vite](https://vitejs.dev/) 是現在最紅的前端建構工具，它的開發模式就是用 esbuild。

Vite 開發時不做完整打包，而是用瀏覽器原生的 ES Module。
但 node_modules 裡的套件還是要處理（轉換成 ES Module、合併小檔案）。

這個「預打包」步驟就是用 esbuild 跑的，所以 Vite 首次啟動很快。

webpack-dev-server 首次啟動要等一兩分鐘，Vite 幾秒就好。

### 打包 TypeScript

純 TypeScript 專案、沒有複雜 Babel 轉換需求？esbuild 剛好。

```javascript
esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: ['node18'],
  outfile: 'dist/index.js',
});
```

esbuild 內建 TypeScript 支援，不用另外裝 ts-loader。

**注意**：esbuild 只做轉譯（transpile），不做型別檢查（type check）。

如果你需要型別檢查，還是要另外跑 `tsc --noEmit`。詳情見 [esbuild TypeScript 文件](https://esbuild.github.io/content-types/#typescript)。

## 什麼時候選 esbuild

最後整理一下，什麼時候該用什麼工具。

| 場景 | 推薦工具 | 理由 |
|------|----------|------|
| 新專案，追求開發體驗 | Vite | Vite 底層用 esbuild，開發爽，打包用 Rollup |
| 追求極致打包速度 | esbuild | 快到不講道理 |
| Library 打包 | Rollup | Tree Shaking 最乾淨，輸出格式彈性大 |
| 需要複雜 loader/plugin | webpack | 生態最完整，什麼需求都有人做過 |
| Legacy 瀏覽器支援 | webpack + Babel | esbuild 對 IE11 支援有限 |
| Electron 渲染進程 | esbuild | 快，而且輸出乾淨 |

想了解更多打包工具的比較，可以看：
- [前端打包工具總覽](/Evernote/posts/bundler-overview) — 各工具的定位
- [前端打包工具演進史](/Evernote/posts/bundler-history) — 為什麼會有這麼多工具
- [webpack 設定地獄](/Evernote/posts/webpack-config-hell) — webpack 為什麼這麼難設定
- [Rollup 適合打包 Library](/Evernote/posts/rollup-for-libraries) — 什麼時候該用 Rollup

**我自己的判斷：**

- 新專案 → **Vite**，底層已經幫你整合好 esbuild 了
- CI/CD 打包太慢 → **換 esbuild**，效果立竿見影
- 想自己控制打包流程 → **esbuild API**，乾淨簡單
- 專案很老、很複雜 → **別亂換**，webpack 用好用滿

---

從 12 秒到 0.2 秒，這改變了我對「等待」的容忍度。

以前覺得打包等 10 秒很正常，現在等 2 秒就覺得慢。

esbuild 證明了一件事：**打包工具慢，是工具的問題，不是打包這件事的問題。**

語言選對、架構選對、不背歷史包袱——效能差 100 倍。

這也是為什麼我現在看到任何 JavaScript 寫的 CLI 工具，第一個念頭都是：「有沒有 Rust/Go 的替代品？」

下次有人跟你說「前端打包就是慢」，叫他試試 esbuild。
