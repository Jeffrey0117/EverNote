---
layout: ../../layouts/PostLayout.astro
title: 瀏覽器自動化：Playwright vs Puppeteer
date: 2026-01-14T05:35
description: 網頁需要 JavaScript 渲染、需要登入、需要操作？這時候一般爬蟲不夠用，要開真的瀏覽器
tags:
  - 爬蟲
  - 自動化
  - JavaScript
  - Python
  - 套件推薦
---

很多網頁不是「打開就有資料」的。

- SPA（單頁應用）：資料是 JavaScript 動態載入的
- 無限滾動：要滾動才會載入更多
- 登入牆：要登入才能看內容
- 反爬蟲：偵測到是機器就擋你

這些情況，[httpx](/Evernote/posts/http-client-packages) + [Cheerio](/Evernote/posts/html-parsing-packages) 搞不定。

**你需要開一個真正的瀏覽器。**

---

## Playwright 和 Puppeteer

| 工具 | 開發者 | 支援的瀏覽器 | 語言 |
|------|--------|--------------|------|
| [Puppeteer](https://pptr.dev/) | Google | Chrome | JavaScript |
| [Playwright](https://playwright.dev/) | Microsoft | Chrome, Firefox, Safari | JavaScript, Python, C#, Java |

Playwright 是後來者，但功能更強、支援更多。

**我現在都用 Playwright。**

---

## Playwright 基本用法

### JavaScript

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto('https://example.com');

// 等待元素出現
await page.waitForSelector('.content');

// 取得文字
const title = await page.textContent('h1');

// 點擊按鈕
await page.click('button.submit');

// 填寫表單
await page.fill('input[name="email"]', 'test@example.com');

// 截圖
await page.screenshot({ path: 'screenshot.png' });

await browser.close();
```

### Python

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()

    page.goto('https://example.com')

    # 等待元素出現
    page.wait_for_selector('.content')

    # 取得文字
    title = page.text_content('h1')

    # 點擊按鈕
    page.click('button.submit')

    # 填寫表單
    page.fill('input[name="email"]', 'test@example.com')

    # 截圖
    page.screenshot(path='screenshot.png')

    browser.close()
```

### 非同步版本（Python）

```python
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto('https://example.com')
        # ...
        await browser.close()

asyncio.run(main())
```

---

## 常見操作

### 處理無限滾動

```javascript
// 滾到底部載入更多
while (true) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);  // 等載入

    // 檢查是否還有更多
    const hasMore = await page.$('.load-more');
    if (!hasMore) break;
}
```

### 處理登入

```javascript
await page.goto('https://example.com/login');
await page.fill('input[name="username"]', 'myuser');
await page.fill('input[name="password"]', 'mypass');
await page.click('button[type="submit"]');

// 等待登入完成
await page.waitForURL('**/dashboard');

// 現在可以訪問需要登入的頁面了
await page.goto('https://example.com/protected-page');
```

### 保存登入狀態

```javascript
// 儲存 cookies 和 storage
await page.context().storageState({ path: 'auth.json' });

// 下次直接使用
const context = await browser.newContext({
    storageState: 'auth.json'
});
const page = await context.newPage();
// 已經是登入狀態了
```

### 攔截請求

```javascript
// 攔截並修改請求
await page.route('**/*.{png,jpg,jpeg}', route => route.abort());  // 不載入圖片，加速

// 攔截 API 回應
await page.route('**/api/data', async route => {
    const response = await route.fetch();
    const json = await response.json();
    console.log('API 回傳:', json);
    await route.fulfill({ response });
});
```

---

## Playwright vs Puppeteer

| 功能 | Playwright | Puppeteer |
|------|------------|-----------|
| 瀏覽器 | Chrome, Firefox, Safari | Chrome |
| 語言 | JS, Python, C#, Java | JS |
| 自動等待 | 內建 | 要自己寫 |
| API 設計 | 更現代 | 較舊 |
| 維護團隊 | Microsoft | Google |
| 社群 | 成長中 | 較成熟 |

### 為什麼我選 Playwright

1. **自動等待**：Playwright 會自動等待元素可點擊才點擊，減少 `waitForSelector` 的使用

```javascript
// Puppeteer：要自己等
await page.waitForSelector('button');
await page.click('button');

// Playwright：自動等
await page.click('button');  // 會等到按鈕出現且可點擊
```

2. **多瀏覽器**：可以測試 Safari，這對前端測試很重要

3. **Python 支援**：官方支援，不是社群維護的 wrapper

4. **更好的 API**：很多小細節設計得更好

---

## 進階用法

### 同時開多個頁面

```javascript
const browser = await chromium.launch();
const context = await browser.newContext();

// 同時爬 10 個頁面
const pages = await Promise.all(
    urls.map(async url => {
        const page = await context.newPage();
        await page.goto(url);
        const title = await page.title();
        await page.close();
        return { url, title };
    })
);
```

### Headless vs Headed

```javascript
// Headless：不顯示瀏覽器視窗（預設）
const browser = await chromium.launch();

// Headed：顯示視窗，方便 debug
const browser = await chromium.launch({ headless: false });

// 慢動作，方便觀察
const browser = await chromium.launch({
    headless: false,
    slowMo: 100  // 每個操作間隔 100ms
});
```

### 模擬裝置

```javascript
import { devices } from 'playwright';

const iPhone = devices['iPhone 13'];
const context = await browser.newContext({
    ...iPhone,
});
// 現在會用 iPhone 的 viewport 和 user agent
```

---

## 我自己的判斷

### 什麼時候用 Playwright

- 需要 JavaScript 渲染的頁面
- 需要登入或有互動
- 需要截圖
- 需要自動化表單填寫
- E2E 測試

### 什麼時候用 httpx + Cheerio

- 靜態頁面（HTML 裡就有資料）
- API 可以直接呼叫
- 需要大量爬取（瀏覽器太慢）

### 選擇流程

```
頁面有你要的資料嗎？（看網頁原始碼）
├── 有 → 用 httpx + Cheerio/BeautifulSoup
└── 沒有（JavaScript 渲染）
    ├── 能找到 API 嗎？
    │   ├── 能 → 直接呼叫 API
    │   └── 不能 → 用 Playwright
    └── 需要登入/互動嗎？
        └── 是 → 用 Playwright
```

---

## 效能對比

爬 100 個頁面：

| 方法 | 時間 | 記憶體 |
|------|------|--------|
| httpx + Cheerio | ~10 秒 | ~100 MB |
| Playwright（1 個頁面） | ~200 秒 | ~500 MB |
| Playwright（10 個頁面並行） | ~30 秒 | ~2 GB |

**瀏覽器自動化慢而且吃資源**，能用 HTTP 請求就用 HTTP 請求。

---

## 相關文章

- [HTTP 請求套件：httpx vs axios](/Evernote/posts/http-client-packages) — 不需要瀏覽器時
- [HTML 解析套件：Cheerio vs BeautifulSoup](/Evernote/posts/html-parsing-packages) — 解析 HTML
- [yt-dlp：YouTube 下載背後的黑魔法](/Evernote/posts/yt-dlp-how-youtube-download-works) — 複雜的爬蟲案例

---

Playwright 是「最後手段」。

如果能用 API，就用 API。

如果能用 HTTP 請求，就用 HTTP 請求。

只有真的需要瀏覽器的時候，才開瀏覽器。

因為瀏覽器慢、吃資源、而且更容易被反爬蟲偵測。
