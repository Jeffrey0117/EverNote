---
layout: ../../layouts/PostLayout.astro
title: Preact 和 Svelte：輕量前端框架
date: 2026-01-14T06:20
description: React 太肥？這兩個框架可以讓你的 bundle 小很多，而且寫起來也不差
tags:
  - 前端
  - React
  - Svelte
  - 框架
---

在 GitHub 上看到 [Preact](https://preactjs.com/)，36k+ stars。

然後順便看了 [Svelte](https://svelte.dev/)，80k+ stars，更多。

這兩個都是「輕量」取向的前端框架，但思路完全不同。

---

## 為什麼要輕量

React 的 bundle size：

```
react + react-dom = ~40KB gzipped
```

對於複雜的應用，40KB 不算什麼。

但如果你只是做一個簡單的互動頁面，40KB 的框架 + 10KB 的業務程式碼，有點浪費。

而且：
- 首次載入慢
- 低端設備解析 JS 慢
- SEO 不友善（除非做 SSR）

---

## Preact：React 的 3KB 替代品

Preact 的設計目標：**跟 React API 相容，但只有 3KB**。

```javascript
// 跟 React 一模一樣的寫法
import { useState } from 'preact/hooks';

function Counter() {
    const [count, setCount] = useState(0);

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>+1</button>
        </div>
    );
}
```

### 為什麼能這麼小

| 功能 | React | Preact |
|------|-------|--------|
| 合成事件 | 自己實作一套 | 直接用原生事件 |
| Fiber 架構 | 有 | 沒有（用簡單的遞迴） |
| 開發者工具 | 內建 | 另外裝 |
| 相容性 | 廣泛 | 現代瀏覽器 |

Preact 砍掉了 React 的很多「企業級」功能，專注在核心。

### preact/compat：相容層

如果你想用 React 生態的套件（例如某個只支援 React 的 UI 元件庫），可以用 preact/compat：

```javascript
// vite.config.js 或 webpack.config.js
{
    resolve: {
        alias: {
            'react': 'preact/compat',
            'react-dom': 'preact/compat',
        },
    },
}
```

這樣大部分 React 套件都能跑，但 bundle size 會大一點（~5KB）。

### 什麼時候用 Preact

- 簡單的互動頁面
- 嵌入到別人網站的 widget
- 對 bundle size 很敏感
- 已經會 React，不想學新的

---

## Svelte：編譯時框架

Svelte 的思路完全不同：**沒有 runtime**。

React 和 Vue 在瀏覽器裡跑一個「框架」，框架負責管理 DOM 更新。

Svelte 在編譯時就把元件變成原生 JavaScript，不需要框架 runtime。

```svelte
<!-- Counter.svelte -->
<script>
    let count = 0;
</script>

<p>Count: {count}</p>
<button on:click={() => count++}>+1</button>

<style>
    p { color: blue; }
</style>
```

編譯後，這個元件變成：

```javascript
// 簡化版
function create_fragment(ctx) {
    let p, t0, t1, button;
    return {
        c() {
            p = element("p");
            t0 = text("Count: ");
            t1 = text(ctx[0]);
            button = element("button");
            button.textContent = "+1";
        },
        m(target, anchor) {
            insert(target, p, anchor);
            append(p, t0);
            append(p, t1);
            insert(target, button, anchor);
        },
        p(ctx, [dirty]) {
            if (dirty & 1) set_data(t1, ctx[0]);
        },
        // ...
    };
}
```

**直接操作 DOM，沒有 virtual DOM diff。**

### 為什麼這樣更快

React 的流程：

```
狀態改變 → 產生新的 Virtual DOM → Diff 比較 → 更新真實 DOM
```

Svelte 的流程：

```
狀態改變 → 直接更新相關的 DOM 節點
```

Svelte 在編譯時就知道「哪個變數會影響哪個 DOM 節點」，不需要執行時 diff。

### Svelte 的語法

Svelte 的語法很獨特，不是 JSX：

```svelte
<script>
    // JavaScript 邏輯
    let name = 'world';
    let count = 0;

    // 響應式語句（$: 開頭）
    $: doubled = count * 2;

    function handleClick() {
        count++;
    }
</script>

<!-- HTML 模板 -->
<h1>Hello {name}!</h1>
<p>Count: {count}, Doubled: {doubled}</p>
<button on:click={handleClick}>+1</button>

<!-- 條件渲染 -->
{#if count > 10}
    <p>Count is big!</p>
{:else}
    <p>Count is small</p>
{/if}

<!-- 迴圈 -->
{#each items as item}
    <li>{item}</li>
{/each}

<style>
    /* Scoped CSS，只影響這個元件 */
    h1 { color: purple; }
</style>
```

### SvelteKit

Svelte 有自己的全端框架 [SvelteKit](https://kit.svelte.dev/)，類似 Next.js：

- 檔案路由
- SSR
- API routes
- 靜態站點生成

---

## 比較

| 功能 | React | Preact | Svelte |
|------|-------|--------|--------|
| Bundle 大小 | ~40KB | ~3KB | ~2KB（只算 runtime） |
| 語法 | JSX | JSX | .svelte 檔案 |
| Virtual DOM | 有 | 有 | 沒有 |
| 學習曲線 | 中 | 低（會 React 就會） | 中 |
| 生態系 | 超大 | 可用 React 生態 | 較小 |
| TypeScript | 好 | 好 | 好 |
| 公司支持 | Meta | 社群 | Vercel（雇用了作者） |

### 效能比較

[js-framework-benchmark](https://github.com/nicooksite/nicooksite.github.io) 的結果：

| 操作 | React | Preact | Svelte |
|------|-------|--------|--------|
| 建立 1000 行 | 中 | 中 | 快 |
| 更新部分 | 中 | 中 | 快 |
| 選擇 | 中 | 中 | 快 |
| 記憶體 | 多 | 少 | 少 |

Svelte 通常最快，因為沒有 Virtual DOM 開銷。

---

## 我自己的判斷

### 用 React

- 大型團隊專案
- 需要豐富的生態系
- 已經有 React 程式碼

### 用 Preact

- 簡單專案，想省 bundle size
- 已經會 React，不想學新的
- 需要嵌入到別人網站的 widget

```javascript
// 典型場景：嵌入式 widget
// 用 Preact 可以讓整個 widget 只有 10KB
```

### 用 Svelte

- 新專案，願意學新語法
- 追求極致效能
- 喜歡「少寫程式碼」的體驗

```svelte
<!-- Svelte 的程式碼通常比 React 短 30-40% -->
<script>
    let count = 0;
</script>

<button on:click={() => count++}>
    Clicked {count} times
</button>
```

### 不要用的情況

- **Preact**：需要 React 的某些進階功能（Concurrent Mode、Suspense）
- **Svelte**：團隊都熟 React，不想學新的

---

## 實際例子

### Preact：嵌入式回饋按鈕

```javascript
// 給別人嵌入的 widget，要越小越好
import { h, render } from 'preact';
import { useState } from 'preact/hooks';

function FeedbackButton() {
    const [open, setOpen] = useState(false);

    return (
        <div>
            <button onClick={() => setOpen(true)}>Feedback</button>
            {open && <FeedbackModal onClose={() => setOpen(false)} />}
        </div>
    );
}

render(<FeedbackButton />, document.getElementById('feedback-widget'));
```

整個 bundle 可以壓到 5KB 以下。

### Svelte：互動式文章

```svelte
<!-- 部落格裡的互動圖表 -->
<script>
    let value = 50;
</script>

<input type="range" bind:value min="0" max="100" />
<p>Value: {value}</p>
<div class="bar" style="width: {value}%"></div>

<style>
    .bar {
        height: 20px;
        background: steelblue;
        transition: width 0.1s;
    }
</style>
```

Svelte 很適合這種「文章內的小互動」，因為 bundle 小、寫起來簡單。

---

## 相關文章

- [Taro 和 Nerv：京東的開源專案](/Evernote/posts/taro-nerv-jd-open-source) — 另一個 React 替代品
- [為什麼我選 Astro 來做這個網站](/Evernote/posts/why-astro-for-this-site) — Astro 支援 Svelte
- [前端打包工具總覽](/Evernote/posts/bundler-overview) — 打包相關

---

這些輕量框架不是要取代 React，而是在特定場景下提供更好的選擇。

不需要大砲打小鳥。
