---
layout: ../../layouts/PostLayout.astro
title: HTTP 請求套件：不要再用 requests 了
date: 2026-01-14T05:10
description: requests 是 Python 最多人用的 HTTP 套件，但不是最好的。跨語言來看，各家都在往同一個方向進化
tags:
  - Python
  - JavaScript
  - HTTP
  - 套件推薦
---

我第一次寫爬蟲，用的是 Python 的 `requests`。

```python
import requests
response = requests.get("https://api.example.com/data")
```

簡單、好懂、到處都有教學。

但專案一大，問題就來了：

- 同時發 100 個請求，程式卡死等回應
- 沒有內建的 retry 機制，網路不穩就炸
- 想加 timeout 和 headers，每個請求都要寫一次

後來我發現，**`requests` 是 2011 年的設計，Python 已經進化了**。

---

## Python：httpx 取代 requests

[httpx](https://www.python-httpx.org/) 是現代 Python 的 HTTP 客戶端。

API 跟 `requests` 幾乎一樣，但多了關鍵功能：

```python
import httpx

# 同步請求（跟 requests 一樣）
response = httpx.get("https://api.example.com/data")

# 非同步請求（這才是重點）
async with httpx.AsyncClient() as client:
    response = await client.get("https://api.example.com/data")
```

### 為什麼非同步重要

假設你要抓 100 個網頁：

```python
# requests 的寫法：一個一個等
import requests
for url in urls:
    response = requests.get(url)  # 等這個完成才會下一個

# httpx 的寫法：同時發出去
import httpx
import asyncio

async def fetch_all(urls):
    async with httpx.AsyncClient() as client:
        tasks = [client.get(url) for url in urls]
        return await asyncio.gather(*tasks)  # 100 個同時跑
```

100 個請求，每個花 1 秒。`requests` 要 100 秒，`httpx` 可能只要 2-3 秒。

### httpx 的其他優點

| 功能 | requests | httpx |
|------|----------|-------|
| 非同步支援 | 要用 aiohttp | 原生支援 |
| HTTP/2 | 不支援 | 支援 |
| 連線池 | 手動管理 | 自動管理 |
| Timeout 設定 | 全局設定麻煩 | Client 層級設定 |
| 型別提示 | 不完整 | 完整 |

```python
# httpx 的 Client 模式，設定一次到處用
client = httpx.Client(
    base_url="https://api.example.com",
    timeout=10.0,
    headers={"Authorization": "Bearer xxx"}
)

response = client.get("/users")  # 自動帶上 base_url 和 headers
```

---

## JavaScript：axios 還是主流，但有更好的

在 JavaScript 世界，`axios` 是最多人用的。

```javascript
import axios from 'axios';
const response = await axios.get('https://api.example.com/data');
```

但 `axios` 也是老套件了（2014 年），有些設計不太現代。

### ky：輕量的替代品

[ky](https://github.com/sindresorhus/ky) 是 `sindresorhus`（寫了一堆超紅 npm 套件的人）做的。

```javascript
import ky from 'ky';

// 基本用法
const data = await ky.get('https://api.example.com/data').json();

// 自動 retry
const data = await ky.get('https://api.example.com/data', {
    retry: 3
}).json();

// 建立 instance
const api = ky.create({
    prefixUrl: 'https://api.example.com',
    headers: { 'Authorization': 'Bearer xxx' }
});

const users = await api.get('users').json();
```

ky 的特點：

- **體積小**：gzip 後只有 3KB，axios 是 13KB
- **內建 retry**：網路不穩會自動重試
- **更好的錯誤處理**：HTTP 錯誤會拋出 exception
- **只支援瀏覽器**：Node.js 要用 `ky-universal`

### got：Node.js 專用

如果你只在 Node.js 跑，[got](https://github.com/sindresorhus/got) 是更好的選擇。

```javascript
import got from 'got';

const data = await got('https://api.example.com/data').json();

// 進階功能
const response = await got.post('https://api.example.com/users', {
    json: { name: 'Jeff' },
    retry: { limit: 3 },
    timeout: { request: 10000 }
});
```

got 功能超完整：串流、進度追蹤、快取、hooks... 但也因此比較肥。

---

## 跨語言比較

| 問題 | Python | JavaScript (Browser) | JavaScript (Node) |
|------|--------|---------------------|-------------------|
| 最多人用 | requests | axios | axios |
| 推薦使用 | **httpx** | **ky** | **got** |
| 非同步 | httpx, aiohttp | 全部都是 | 全部都是 |
| 最輕量 | httpx | ky | node-fetch |
| 功能最多 | httpx | axios | got |

---

## 我自己的判斷

### Python

- 新專案 → **httpx**，API 跟 requests 一樣但功能更強
- 已經在用 requests → 不用急著換，除非需要非同步
- 需要極致效能 → **aiohttp**，但 API 比較難用

```python
# 我現在的標準寫法
import httpx

async def fetch_data():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/data")
        return response.json()
```

### JavaScript

- 瀏覽器 → **ky**，輕量、現代、內建 retry
- Node.js → **got**，功能完整，該有的都有
- 已經在用 axios → 不用急著換，除非 bundle size 是問題

```javascript
// 瀏覽器
import ky from 'ky';
const api = ky.create({ prefixUrl: 'https://api.example.com' });

// Node.js
import got from 'got';
const data = await got('https://api.example.com/data').json();
```

### 什麼時候用內建的 fetch

現在瀏覽器和 Node.js 18+ 都有原生 `fetch`：

```javascript
const response = await fetch('https://api.example.com/data');
const data = await response.json();
```

**用 fetch 的情況**：

- 只發簡單請求，不需要 retry、timeout 等功能
- 專案對 bundle size 很敏感
- 不想加依賴

**用套件的情況**：

- 需要自動 retry
- 需要請求攔截器（interceptor）
- 需要更好的錯誤處理
- 需要進度追蹤

---

## 相關文章

- [資料驗證套件：Pydantic vs Zod](/Evernote/posts/validation-packages) — 驗證 API 回傳的資料
- [網頁爬蟲套件：Cheerio vs BeautifulSoup](/Evernote/posts/html-parsing-packages) — 發完請求後解析 HTML
- [瀏覽器自動化：Playwright vs Puppeteer](/Evernote/posts/browser-automation-packages) — 需要 JavaScript 渲染的網頁

---

下次寫爬蟲或串 API，先想想：「我要發幾個請求？需不需要非同步？」

如果答案是「很多」和「需要」，那就別用 `requests` 了。
