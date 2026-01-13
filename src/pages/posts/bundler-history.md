---
layout: ../../layouts/PostLayout.astro
title: 從 Grunt 到 Vite：前端打包的演進
date: 2026-01-14T02:53
description: 前端工具變化超快，每隔幾年就換一套，但其實是有脈絡的
tags:
  - 前端
  - 打包工具
  - 開發觀念
---

2019 年，我開始學前端。

同事說：「先學 Webpack。」

2020 年，新同事加入，他說：「現在都用 Vite 了，Webpack 太慢。」

2021 年，我去面試，面試官問：「你怎麼看 Turbopack？」

我連聽都沒聽過。

三年換三套工具？前端在搞什麼？

後來我去把歷史翻了一遍，才發現這不是亂換，每一次都有原因。

## 時間線

先看全貌：

```
2012: Grunt（任務執行器）
2013: Gulp（串流處理）
2014: Webpack 1.0（模組打包）
2015: Rollup（ES Module、Tree Shaking）
2016: Webpack 2.0（原生支援 ES Module）
2020: esbuild（Go 寫的，快 100 倍）
2020: Vite（開發不打包，生產用 Rollup）
2021: Turbopack（Rust 寫的，Vercel 出品）
```

十年之間，換了七八套工具。

但不是亂換，每一次都有原因。

## 任務執行器時代（2012-2014）

### Grunt：自動化任務

2012 年，前端開始複雜起來。

要壓縮 CSS、要編譯 SASS、要壓縮圖片、要合併 JS 檔案。

每次發布都要手動跑一堆指令，很煩。

[Grunt](https://gruntjs.com/) 出來解決這個問題：**自動化任務**。

你寫一個 `Gruntfile.js`，把任務定義好，然後 `grunt build` 一鍵搞定。

```javascript
// Gruntfile.js 大概長這樣
grunt.initConfig({
  uglify: {
    build: {
      src: 'src/*.js',
      dest: 'dist/app.min.js'
    }
  }
});
```

Grunt 做的事情很單純：**按照你定義的順序，一個一個執行任務。**

壓縮 → 合併 → 複製 → 完成。

我沒真正用過 Grunt，入行太晚。

但我看過前同事的舊專案，Gruntfile.js 有 800 行。

他說：「每次加新功能，我都要手動調整任務順序，很容易漏。」

這就是 Grunt 的問題：**它不懂依賴關係。**

### Gulp：串流處理

2013 年，[Gulp](https://gulpjs.com/) 出來了。

Gulp 的哲學不一樣：**用串流（stream）來處理檔案**。

串流的概念是：資料像水管裡的水，一邊讀一邊處理一邊輸出，不用等全部讀完才開始。

```javascript
// gulpfile.js
gulp.src('src/*.js')
  .pipe(uglify())
  .pipe(concat('app.min.js'))
  .pipe(gulp.dest('dist'));
```

檔案像水一樣流過去，經過一個一個處理器。

Gulp 比 Grunt 快，因為不用每個步驟都寫入硬碟，檔案在記憶體中流動。

### 但還是不夠

Grunt 和 Gulp 做的是「任務執行」，不是「模組打包」。

它們不懂 `import` / `export`，不會分析依賴關係。

你要手動告訴它：「先處理 a.js，再處理 b.js，然後合併。」

如果 a.js 引用了 b.js，它不知道。

專案一大，手動管理依賴關係會瘋掉。

## 模組打包時代（2014-2020）

### Webpack：一統江湖

2014 年，[Webpack](https://webpack.js.org/) 出來了。

Webpack 的突破在於：**它會分析你的 import，自動建立依賴圖。**

你只要告訴它入口點（entry），它會從入口開始，一路追蹤 import，把所有相關的模組都找出來，打包成一個 bundle。

```javascript
// webpack.config.js
module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js'
  }
};
```

不用手動管理依賴關係了。

而且 Webpack 可以打包任何東西：JS、CSS、圖片、字型。

用 loader 來處理不同類型的檔案，用 plugin 來做各種優化。

**Webpack 是瑞士刀，什麼都能做。**

但也因為什麼都能做，設定檔可以寫到讓人懷疑人生。

我第一次設定 Webpack，加了 babel-plugin-transform-runtime，結果跟另一個 plugin 衝突。

debug 了一整天，最後發現是順序問題。

**Webpack 的學習曲線不是一條線，是一道牆。**

想體驗什麼叫「設定地獄」，可以看這篇：[Webpack 設定地獄](/Evernote/posts/webpack-config-hell)

### Rollup：專注打包

2015 年，[Rollup](https://rollupjs.org/) 出來了。

Rollup 的切入點不一樣：**專注在 ES Module 和 Tree Shaking。**

Webpack 為了相容 CommonJS，打包出來的 code 會包一堆 runtime。

Rollup 假設你用 ES Module，產出的 code 更乾淨、更小。

這就是為什麼很多 library 作者用 Rollup 打包。

React、Vue、Three.js... 你打開它們的 `package.json`，看到 `"module": "dist/xxx.esm.js"` 通常就是 Rollup 產出的。

想知道為什麼打包 library 要用 Rollup，可以看這篇：[打包 Library 為什麼用 Rollup](/Evernote/posts/rollup-for-libraries)

### 問題：越來越慢

專案越來越大，node_modules 越來越肥。

Webpack 打包一次要 30 秒、1 分鐘、甚至好幾分鐘。

改一行 code，等 30 秒才能看到結果。

開發體驗很糟。

## 速度革命（2020-現在）

### esbuild：用 Go 寫，快 100 倍

2020 年，[esbuild](https://esbuild.github.io/) 出來了。

作者是 [Figma](https://www.figma.com/) 的 CTO，用 Go 語言重新寫了一個打包工具。

結果：**比 Webpack 快 10-100 倍。**

為什麼這麼快？

Go 編譯成原生 binary，不用先跑 Node.js。多核心平行處理，吃滿 CPU。沒有歷史包袱，專心做一件事。

Webpack 打包要 10 秒，esbuild 可能只要 0.1 秒。

想深入了解 esbuild 為什麼這麼快，可以看這篇：[esbuild 的速度秘密](/Evernote/posts/esbuild-speed)

### Vite：開發體驗革命

同樣是 2020 年，[Vite](https://vitejs.dev/) 出來了。

Vue 的作者尤雨溪做的。

Vite 的思路更激進：**開發時根本不打包。**

現代瀏覽器原生支援 ES Module，可以直接 `<script type="module">`。

那幹嘛還要打包？

Vite 在開發時不打包，直接讓瀏覽器載入原始的模組。

你改一行 code，瀏覽器只重新載入那一個模組。

不用等整包重打，改完立刻看到結果。

**這叫 unbundled development（無打包開發）。**

第一次跑 Vite，我以為它壞了。

因為 `npm run dev` 之後，0.3 秒就跑起來了。

我還在等它 build，結果它已經 ready 了。

然後我改了一行 code，瀏覽器在我按完 Ctrl+S 的瞬間就更新了。

不是幾秒後，是瞬間。

**用過 Vite 再回去用 Webpack，會想砸電腦。**

生產環境還是要打包（為了效能和相容性），Vite 用 Rollup 來做。

開發用原生 ES Module，生產用 Rollup。兩全其美。

### Turbopack：Rust 寫的，更快

2021 年，[Vercel](https://vercel.com/)（Next.js 背後的公司）發布了 [Turbopack](https://turbo.build/pack)。

用 Rust 寫的，號稱比 Vite 快 10 倍。

為什麼又要換語言？

因為 Rust 比 Go 更底層，可以做更多優化。

而且 Turbopack 專門針對大型 monorepo（把多個專案放在同一個 Git repo 管理）優化，會快取更多東西。

不過 Turbopack 還在發展中，目前主要用在 Next.js。

## 為什麼一直在換

看完歷史，你會發現換工具的原因就三個：

### 需求一直在膨脹

專案從幾十行 JS 變成幾十萬行。

從簡單的網頁變成複雜的 SPA（Single Page Application，單頁應用，整個網站只載入一個 HTML，靠 JavaScript 處理畫面切換）。

從一個人維護變成幾十人協作。

工具跟不上需求，就會被淘汰。

Grunt 夠用的時候，沒人會去研究 Webpack。

等到專案大到 Grunt 管不動，Webpack 就出來了。

### 語言決定天花板

JavaScript 是解釋型語言，先天就慢。

Node.js 跑 Webpack，要先載入 Node runtime，然後解釋執行 JS。

esbuild 用 Go 寫，編譯成原生 binary，直接跑。

Turbopack 用 Rust 寫，更底層、更快。

**語言的天花板決定工具的天花板。**

這也是為什麼很多基礎建設工具開始用 Rust 改寫：[SWC](https://swc.rs/)（Babel 的 Rust 版）、[Oxc](https://oxc-project.github.io/)（新一代 JS 工具鏈）...

### 誰想等 30 秒？

以前大家覺得「打包慢一點沒關係，反正要發布才打包」。

但現在開發時也要打包（HMR、TypeScript 編譯），慢就是問題。

改一行 code 等 30 秒，一天改 100 次就是 50 分鐘。

**開發體驗是生產力。**

Vite 把「開發不打包」這個概念帶進來，大家突然發現：原來可以這麼快。

回不去了。

## 我怎麼選

講了這麼多歷史，重點是：**現在該用什麼？**

我的判斷：

- 2024 年之後開新專案，**Vite 是預設選擇**
- 打包 library，**Rollup 還是首選**
- 舊專案有 Webpack 在跑，**不要為了換而換**，遷移成本很高
- 如果你在 Vercel 生態系（Next.js），**跟著官方走**，他們會幫你選

詳細的工具比較和選擇指南，可以看這篇：[前端打包工具，先搞懂在打包什麼](/Evernote/posts/bundler-overview)

## 未來會怎樣

這個領域還在快速發展。

一些趨勢：

**Rust 化**：越來越多工具用 Rust 重寫，追求極致速度。

**Native ESM**：瀏覽器原生支援越來越好，打包的必要性降低。

**整合式工具**：像 [Bun](https://bun.sh/)（用 Zig 寫的「runtime + 打包 + 套件管理」一體化工具）開始出現。

但不管怎麼變，核心問題不會變：

- 怎麼讓開發更快
- 怎麼讓產出更小
- 怎麼讓設定更簡單

工具會換，問題不會變。

---

現在有人跟我說「Turbopack 比 Vite 快 10 倍」，我不會急著學。

我會問：「它在解決什麼問題？這個問題我有嗎？」

如果我的專案 Vite 跑得很順，那 Turbopack 再快也跟我無關。

**工具是拿來解決問題的，不是拿來追的。**

搞懂歷史之後，我再也不怕前端換工具了。
