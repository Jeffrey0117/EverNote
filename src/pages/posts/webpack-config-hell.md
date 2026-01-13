---
layout: ../../layouts/PostLayout.astro
title: Webpack 設定讓我崩潰，然後真香
date: 2026-01-14T02:52
description: 第一次打開 webpack.config.js 以為在看天書，搞懂之後發現它真的什麼都能做
tags:
  - Webpack
  - 前端
  - 打包工具
---

第一次看到 webpack.config.js 的時候，我以為我在看天書。

Entry、output、module、rules、plugins... 一個設定檔塞了幾百行，每一行都看得懂，但組合起來完全不知道在幹嘛。

那時候想說：**打包個 JavaScript 而已，有需要搞這麼複雜嗎？**

後來才知道，[Webpack](https://webpack.js.org/) 根本不只是「打包工具」。

## 不只是打包

很多人以為 Webpack 就是把一堆 JS 檔合成一個，但它其實是**整個前端建置系統**。

看這個流程：

```
Entry → Loader → Plugin → Output
```

- **Entry**：程式的進入點，Webpack 從這裡開始分析相依性
- **Loader**：處理各種檔案類型（JS、CSS、圖片、字型...）
- **Plugin**：額外功能（壓縮、環境變數、產生 HTML...）
- **Output**：輸出打包後的檔案

說穿了就是建置流水線。

TypeScript 編譯、CSS 預處理、圖片壓縮、程式碼分割——全部塞進同一個流程裡。

我第一次不懂這件事，把 loader 和 plugin 搞混，改了設定噴了一堆錯，debug 了一整個下午。

想深入了解前端打包工具的發展脈絡，可以看這篇：[前端打包工具演進史](/Evernote/posts/bundler-history)

## 設定為什麼這麼複雜

因為**什麼都能做 = 什麼都要設定**。

Webpack 的設計哲學是「零假設」——它不假設你要打包什麼、怎麼打包、輸出什麼格式。

這代表每一件事都要你自己決定。

### Loader：檔案類型處理器

Webpack 原生只看得懂 JavaScript。

想讓它處理其他檔案？裝 loader。

| Loader | 功能 |
|--------|------|
| `babel-loader` | 把新語法轉成舊語法，讓舊瀏覽器也能跑 |
| `css-loader` | 解析 CSS 檔案裡的 `@import` 和 `url()` |
| `style-loader` | 把 CSS 注入到 HTML 的 `<style>` 標籤 |
| `file-loader` | 處理圖片、字型等靜態資源 |
| `ts-loader` | 編譯 TypeScript |
| `sass-loader` | 編譯 SCSS/Sass 成 CSS |

每個 loader 都要裝、都要設定。

我第一次裝 `css-loader` 結果發現還要裝 `style-loader`，google 了半小時才搞懂兩個差在哪。

### Plugin：各種額外功能

Loader 處理檔案，Plugin 處理流程。

| Plugin | 功能 |
|--------|------|
| `HtmlWebpackPlugin` | 自動產生 HTML 檔案，把打包後的 JS 塞進去 |
| `MiniCssExtractPlugin` | 把 CSS 抽出成獨立檔案 |
| `DefinePlugin` | 定義環境變數 |
| `CleanWebpackPlugin` | 每次 build 前清掉舊檔案 |

光是基本功能就要裝一堆 plugin。

這就是為什麼 webpack.config.js 會變成幾百行——不是它故意要複雜，是你要的功能太多。

## 但它真的很強

抱怨歸抱怨，Webpack 能活這麼久是有原因的。

### Code Splitting

Webpack 可以把程式碼拆成多個 chunk（獨立的程式碼區塊），讓使用者只載入需要的部分。

```javascript
// 動態 import，Webpack 會自動拆成獨立 chunk
const module = await import('./heavy-module.js');
```

首頁只要載入首頁的 code，進到其他頁面再載入那頁的 code。

這對效能影響超大。

### Hot Module Replacement（HMR）

HMR，熱模組替換——不是 Her Majesty's Request，是讓你改 code 的時候頁面自動更新，而且**不用整頁重新整理**。

改了一個 component，只有那個 component 會更新，其他狀態都保留。

這個功能現在看起來理所當然，但當年 Webpack 推出 HMR 的時候是很屌的。

### 生態系最大

Webpack 的生態系是所有打包工具裡最大的。

檔案類型有 loader 處理，額外功能有 plugin，框架整合也有人做好了——資源就是多。

有些 loader 可能年久失修，但至少有得選。

如果你對「為什麼前端需要打包」還有疑惑，可以先看這篇總覽：[前端打包工具，到底在打包什麼](/Evernote/posts/bundler-overview)

## 常見設定踩坑

講幾個我踩過的：

### babel-loader 設定

Babel 本身要設定 `.babelrc` 或 `babel.config.js`，loader 也要設定。

兩邊設定打架的時候，錯誤訊息又很難懂。

```javascript
// webpack.config.js
module: {
  rules: [
    {
      test: /\.js$/,
      exclude: /node_modules/,  // 這行很重要，不然會編譯 node_modules
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      }
    }
  ]
}
```

`exclude: /node_modules/` 這行忘了加，build 會慢到你懷疑人生。

### css-loader + style-loader 順序

Webpack loader 的執行順序是**從右到左、從下到上**。

```javascript
// 先執行 css-loader，再執行 style-loader
use: ['style-loader', 'css-loader']
```

寫反了就會噴錯。

這個設計我到現在還是覺得反直覺。

### 路徑問題

`publicPath`、`path`、`contentBase`... 各種路徑設定搞混了，資源就載入不到。

```javascript
output: {
  path: path.resolve(__dirname, 'dist'),      // 輸出到哪個資料夾
  publicPath: '/assets/',                      // 瀏覽器要用什麼路徑載入
  filename: '[name].[contenthash].js'          // 輸出檔名
}
```

搞懂這三個的差異，踩坑次數少一半。

## 什麼時候選 Webpack

先說結論：

| 情境 | 建議 |
|------|------|
| 複雜大型專案，需要細緻控制 | Webpack |
| 需要各種 loader 和 plugin | Webpack |
| 新專案，想要開發體驗好 | [Vite](/Evernote/posts/bundler-overview) |
| 打包 library | [Rollup](/Evernote/posts/rollup-for-libraries) |
| 追求極致速度 | [esbuild](/Evernote/posts/esbuild-speed) |

我自己的判斷：

如果是**既有的大型專案**，或是有特殊需求要用某個 loader/plugin，Webpack 還是首選。

生態系的優勢是實打實的，遇到奇怪需求有人解過。

但如果是**新專案**，我會先考慮 Vite。

開發體驗好太多，build 速度也快，大部分情境都夠用。

等真的遇到 Vite 解決不了的問題，再換 Webpack 也不遲。

---

Webpack 的設定確實是地獄，但搞懂之後會發現它什麼都能做。

不是它故意要複雜，是前端建置本來就這麼多事。

**Webpack 只是把複雜性攤在你面前，讓你自己決定。**

其他工具把這些藏起來了，但藏起來不代表不存在。

Webpack 和 Rollup 都嫌慢？下一篇聊聊 [esbuild 怎麼做到比它們快 100 倍](/Evernote/posts/esbuild-speed)。

想了解 Node.js 生態系的套件管理，可以看這篇：[npm、yarn、pnpm 怎麼選](/Evernote/posts/nodejs-package-managers)
