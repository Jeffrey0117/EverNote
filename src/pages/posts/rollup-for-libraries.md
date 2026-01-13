---
layout: ../../layouts/PostLayout.astro
title: 打包 Library，我選 Rollup
date: 2026-01-14T02:52
description: 如果你要發布 npm 套件，Rollup 可能比 Webpack 更適合
tags:
  - Rollup
  - 前端
  - 打包工具
---

如果你要發布一個 npm 套件，[Rollup](https://rollupjs.org/) 可能比 Webpack 更適合。

我第一次聽到這個說法的時候很困惑。

Webpack 不是什麼都能做嗎？為什麼打包 library 要用另一個工具？

後來真的試著發布一個小套件，用 Webpack 打包完一看——

**靠，輸出檔案裡塞了一堆看不懂的 runtime code。**

就幾十行的小工具，打包完變成幾百行，一半都是 Webpack 自己加的東西。

這時候才懂，Rollup 存在的意義。

## Rollup 的定位

Rollup 不是要取代 Webpack，它有自己的定位：**專門打包 library**。

它做的事情：

- 把你的 ES modules 打包成一個檔案
- 做 tree shaking，把沒用到的 code 刪掉
- 輸出各種格式（ESM、CJS、UMD）

就這樣。不處理開發伺服器、不處理 HMR、不處理 CSS。

順帶解釋一下這些縮寫：

- **ESM**：ES Modules，JavaScript 的官方模組格式（不是 Electronic Smoothie Machine）
- **CJS**：CommonJS，Node.js 傳統用的 `require()` 格式
- **UMD**：Universal Module Definition，哪裡都能跑的萬用格式

### Tree Shaking 的先驅

Tree shaking 這個詞，就是 Rollup 發明的。

概念是這樣：

```javascript
// utils.js
export function add(a, b) { return a + b; }
export function multiply(a, b) { return a * b; }

// main.js
import { add } from './utils.js';
console.log(add(1, 2));
```

你只用了 `add`，沒用 `multiply`。

Tree shaking 會把 `multiply` 從打包結果中移除，減少檔案大小。

假設 utils.js 有 100KB，你只用了 add 那 5KB，打包後就只有 5KB。

Rollup 從第一天就支援這個功能，因為它從一開始就是用 ES modules 設計的。

我把同一份 code 用 Webpack 和 Rollup 各打包一次，Rollup 的輸出小了快 40%。

Webpack 後來也支援 tree shaking，但效果就是沒 Rollup 好。

想了解更多打包工具的歷史，可以看這篇：[前端打包工具演進史](/Evernote/posts/bundler-history)

## 跟 Webpack 的差異

這兩個工具的定位完全不同：

| | Webpack | Rollup |
|------|---------|--------|
| **設計目的** | 打包應用程式 | 打包 library |
| **輸出檔案** | 包含 runtime code | 乾淨，沒有額外 code |
| **多格式輸出** | 需要額外設定 | 原生支援 ESM、CJS、UMD |
| **Tree shaking** | 支援，但效果較差 | 先驅，效果最好 |
| **生態系** | 超大，什麼都有 | 較小，專注打包相關 |
| **設定複雜度** | 地獄 | 相對簡單 |

一句話總結：

- **Webpack**：打包給使用者用的應用程式
- **Rollup**：打包給開發者用的 library

我用 Webpack 打包 library 踩了一堆坑，後來才知道該用 Rollup。

Webpack 的踩坑紀錄：[Webpack 設定讓我崩潰，然後真香](/Evernote/posts/webpack-config-hell)

## 為什麼 library 適合用 Rollup

### 輸出乾淨

用 Webpack 打包一個簡單的函式：

```javascript
// 你的 code
export function greet(name) {
  return `Hello, ${name}!`;
}

// Webpack 輸出（簡化版）
(function(modules) {
  // 一堆 runtime code...
  function __webpack_require__(moduleId) {
    // ...
  }
  // ...
})({
  "./src/index.js": function(module, exports) {
    exports.greet = function(name) {
      return "Hello, " + name + "!";
    };
  }
});
```

用 Rollup 打包同樣的東西：

```javascript
// Rollup 輸出
function greet(name) {
  return `Hello, ${name}!`;
}
export { greet };
```

**差別一目了然。**

Rollup 的輸出就是你寫的 code，沒有額外的包裝。

對 library 來說，這很重要——使用者不需要載入你的 runtime，只要載入他需要的功能。

### 多格式輸出

發布 npm 套件，通常要同時提供多種格式：

```javascript
// rollup.config.js
export default {
  input: 'src/index.js',
  output: [
    { file: 'dist/index.esm.js', format: 'es' },     // ES modules
    { file: 'dist/index.cjs.js', format: 'cjs' },    // CommonJS
    { file: 'dist/index.umd.js', format: 'umd', name: 'MyLib' }  // UMD
  ]
};
```

一個設定檔，三種輸出。

- **ESM**：給現代打包工具用（Vite、esbuild）
- **CJS**：給 Node.js 用
- **UMD**：給瀏覽器直接用（script 標籤）

Webpack 也做得到，但設定複雜很多。

## 基本設定

Rollup 的設定比 Webpack 簡單很多。

一個最基本的 `rollup.config.js`：

```javascript
export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'es'
  }
};
```

就這樣。

### 常用 Plugin

Rollup 核心很小，額外功能靠 plugin：

| Plugin | 功能 | 什麼時候需要 |
|--------|------|-------------|
| `@rollup/plugin-node-resolve` | 解析 node_modules | 有 import 第三方套件就需要 |
| `@rollup/plugin-commonjs` | CJS 轉 ESM | 第三方套件用 CommonJS 寫的就需要 |
| `@rollup/plugin-babel` | Babel 轉譯 | 要支援舊瀏覽器就需要 |
| `@rollup/plugin-terser` | 壓縮輸出 | 想減少檔案大小就需要 |
| `@rollup/plugin-typescript` | 支援 TypeScript | 用 TypeScript 寫的就需要 |

更多 plugin 可以看 [Rollup 官方 Plugin 列表](https://github.com/rollup/plugins)。

一個實際的設定大概長這樣：

```javascript
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.js',
  output: [
    { file: 'dist/index.esm.js', format: 'es' },
    { file: 'dist/index.cjs.js', format: 'cjs' }
  ],
  plugins: [
    resolve(),     // 解析 node_modules
    commonjs(),    // 轉換 CommonJS
    terser()       // 壓縮
  ],
  external: ['react', 'react-dom']  // 不打包這些，讓使用者自己裝
};
```

### 別忘了 external

`external` 很重要——如果你的 library 依賴 React，不應該把 React 打包進去。

我第一次忘了加 `external`，結果把整個 React 打包進去，檔案從 5KB 爆增到 500KB。

更慘的是，使用者的專案會有兩份 React——一份是他自己裝的，一份是你打包進去的。

**兩份 React 會直接炸掉。**

所以記得：library 依賴的東西，都要加到 `external` 裡。

## 什麼時候選 Rollup

| 情境 | 建議 |
|------|------|
| 打包 npm 套件 | Rollup |
| 需要乾淨的輸出 | Rollup |
| 需要多格式輸出 | Rollup |
| 打包應用程式 | [Webpack](/Evernote/posts/webpack-config-hell) 或 Vite |
| 需要開發伺服器、HMR | Webpack 或 Vite |
| 追求極致速度 | [esbuild](/Evernote/posts/esbuild-speed) |

我自己的判斷：

如果你要**發布 npm 套件**——不管是公開的還是公司內部用的——Rollup 是首選。

輸出乾淨、tree shaking 好、多格式輸出方便。

如果你要**打包應用程式**，Rollup 就不太適合了。

它沒有開發伺服器、沒有 HMR、處理 CSS 和圖片也不方便。

這種情況用 Webpack 或 Vite。

對了，Vite 的生產環境打包其實就是用 Rollup，所以如果你用 Vite，某種程度上也在用 Rollup。

想了解完整的打包工具生態，可以看這篇總覽：[前端打包工具，到底在打包什麼](/Evernote/posts/bundler-overview)

---

Rollup 就做一件事：打包 library。

這件事它比 Webpack 做得好，就這樣。

**工具沒有好壞，只有適不適合。打包 library 用 Rollup，打包應用程式用 Webpack 或 Vite。**

Webpack 和 Rollup 都嫌慢？下一篇聊聊 [esbuild 怎麼做到比它們快 100 倍](/Evernote/posts/esbuild-speed)。

想了解 Node.js 的套件管理生態，可以看這篇：[npm、yarn、pnpm 怎麼選](/Evernote/posts/nodejs-package-managers)
