---
layout: ../../layouts/PostLayout.astro
title: HTML 解析套件：Cheerio vs BeautifulSoup
date: 2026-01-14T05:25
description: 爬蟲抓下來的 HTML 要怎麼解析？各語言都有各自的標準答案
tags:
  - 爬蟲
  - JavaScript
  - Python
  - 套件推薦
---

爬蟲的流程通常是：

1. 發 HTTP 請求拿 HTML
2. **解析 HTML 找到要的資料**
3. 存起來或做後續處理

第二步需要 HTML 解析器。

用正規表達式解析 HTML？**別鬧了**。

```python
# 這種寫法遲早會出事
import re
titles = re.findall(r'<h1>(.*?)</h1>', html)
```

HTML 不是 regular language，用 regex 解析是在跟自己過不去。

---

## Python：BeautifulSoup

[BeautifulSoup](https://www.crummy.com/software/BeautifulSoup/) 是 Python 爬蟲的標準配備。

```python
from bs4 import BeautifulSoup

html = """
<div class="product">
    <h2 class="title">iPhone 15</h2>
    <span class="price">$999</span>
</div>
"""

soup = BeautifulSoup(html, 'html.parser')

# 找單一元素
title = soup.find('h2', class_='title')
print(title.text)  # iPhone 15

# 找多個元素
products = soup.find_all('div', class_='product')

# CSS 選擇器
price = soup.select_one('.product .price')
print(price.text)  # $999
```

### 常用方法

| 方法 | 說明 |
|------|------|
| `find('tag')` | 找第一個符合的元素 |
| `find_all('tag')` | 找所有符合的元素 |
| `select('selector')` | 用 CSS 選擇器找所有元素 |
| `select_one('selector')` | 用 CSS 選擇器找第一個元素 |
| `.text` | 取得元素的文字內容 |
| `.get('attr')` | 取得屬性值 |

```python
# 取得屬性
link = soup.find('a')
href = link.get('href')
# 或者
href = link['href']

# 取得文字，去除空白
text = soup.find('p').get_text(strip=True)
```

### 解析器的選擇

BeautifulSoup 不是解析器，它是解析器的**包裝**。

```python
# 內建的，堪用
soup = BeautifulSoup(html, 'html.parser')

# lxml，快很多（要另外裝）
soup = BeautifulSoup(html, 'lxml')

# html5lib，最寬容（處理爛 HTML）
soup = BeautifulSoup(html, 'html5lib')
```

我的建議：**裝 lxml**。速度差很多，尤其是大檔案。

```bash
pip install lxml
```

---

## JavaScript：Cheerio

[Cheerio](https://cheerio.js.org/) 是 Node.js 的 HTML 解析器，API 跟 jQuery 一樣。

```javascript
import * as cheerio from 'cheerio';

const html = `
<div class="product">
    <h2 class="title">iPhone 15</h2>
    <span class="price">$999</span>
</div>
`;

const $ = cheerio.load(html);

// jQuery 語法
const title = $('.title').text();  // iPhone 15
const price = $('.product .price').text();  // $999

// 遍歷
$('.product').each((i, el) => {
    console.log($(el).find('.title').text());
});
```

### 為什麼用 jQuery 語法

如果你寫過前端，jQuery 語法應該很熟：

```javascript
// 取文字
$('.title').text()

// 取屬性
$('a').attr('href')

// 取 HTML
$('.content').html()

// 找子元素
$('.product').find('.price')

// 篩選
$('.item').filter('.active')
```

Cheerio 不是真的 jQuery，只是借用了它的選擇器語法。

它不會執行 JavaScript，不會處理事件，只做 HTML 解析。

### 效能

Cheerio 很快，因為它用 [htmlparser2](https://github.com/fb55/htmlparser2) 作為底層解析器。

比起在瀏覽器裡跑 DOM 操作，Cheerio 快得多。

---

## 比較

| 功能 | BeautifulSoup | Cheerio |
|------|---------------|---------|
| 語言 | Python | JavaScript |
| 語法風格 | Python 風格 | jQuery 風格 |
| CSS 選擇器 | 支援 | 支援 |
| 速度 | 用 lxml 就很快 | 很快 |
| 處理爛 HTML | 很好 | 不錯 |
| 學習曲線 | 低 | 會 jQuery 就會 |

---

## 進階：lxml 直接用

如果你追求效能，可以直接用 [lxml](https://lxml.de/)：

```python
from lxml import html

tree = html.fromstring(html_string)

# XPath
titles = tree.xpath('//h2[@class="title"]/text()')

# CSS 選擇器（需要 cssselect）
from lxml.cssselect import CSSSelector
sel = CSSSelector('.product .price')
prices = sel(tree)
```

lxml 用 XPath，功能比 CSS 選擇器強大，但語法也複雜。

**我的選擇**：大部分情況用 BeautifulSoup + lxml，只有需要複雜查詢時才直接用 lxml XPath。

---

## 我自己的判斷

### Python

- 一般爬蟲 → **BeautifulSoup + lxml**
- 需要複雜查詢 → 學 XPath，直接用 lxml
- HTML 結構很亂 → BeautifulSoup + html5lib

```python
# 我的標準開頭
from bs4 import BeautifulSoup
import httpx

async def scrape(url):
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        soup = BeautifulSoup(response.text, 'lxml')
        # ...
```

### JavaScript

- Node.js 爬蟲 → **Cheerio**
- 會 jQuery 就會用，沒學習成本
- 需要 JavaScript 渲染的頁面 → 用 Playwright，不是 Cheerio

```javascript
// 我的標準開頭
import * as cheerio from 'cheerio';
import ky from 'ky';

async function scrape(url) {
    const html = await ky.get(url).text();
    const $ = cheerio.load(html);
    // ...
}
```

---

## 什麼時候用瀏覽器自動化

Cheerio 和 BeautifulSoup 只能解析 HTML。

如果網頁內容是 JavaScript 動態產生的（SPA、無限滾動、需要登入），它們拿到的只是空殼。

這時候要用 [Playwright](/Evernote/posts/browser-automation-packages)：

```python
# 需要 JavaScript 渲染
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto('https://spa-website.com')
    page.wait_for_selector('.content')  # 等 JS 載入
    html = page.content()  # 現在有完整內容了
    browser.close()

# 然後再用 BeautifulSoup 解析
soup = BeautifulSoup(html, 'lxml')
```

---

## 相關文章

- [HTTP 請求套件：httpx vs axios](/Evernote/posts/http-client-packages) — 發請求拿 HTML
- [瀏覽器自動化：Playwright vs Puppeteer](/Evernote/posts/browser-automation-packages) — 需要 JS 渲染時
- [yt-dlp：YouTube 下載背後的黑魔法](/Evernote/posts/yt-dlp-how-youtube-download-works) — 爬蟲的極端案例

---

選對 HTML 解析器，爬蟲寫起來會順很多。

記住：**別用 regex 解析 HTML**。
