---
layout: ../../layouts/PostLayout.astro
title: 日期處理套件：別再用 moment.js 了
date: 2026-01-14T05:20
description: 日期處理是出了名的難搞。時區、格式化、計算... 選對套件可以少踩很多坑
tags:
  - JavaScript
  - Python
  - 日期處理
  - 套件推薦
---

日期處理是程式設計裡最容易踩坑的領域之一。

時區轉換、閏年計算、月份天數、夏令時間...

我曾經花一整天 debug 一個問題，最後發現是因為「某個月沒有 31 號」。

**用原生 Date 處理日期，遲早會出事。**

---

## JavaScript：moment.js 已死

[moment.js](https://momentjs.com/) 曾經是 JavaScript 日期處理的標準。

但 2020 年，官方宣布**不再開發新功能**，並建議遷移到其他套件。

為什麼？

| 問題 | 說明 |
|------|------|
| 太肥 | gzip 後 72KB，很多功能你用不到 |
| 可變物件 | `moment().add(1, 'day')` 會修改原物件 |
| Tree Shaking 無效 | 引入就是全部，沒辦法只打包用到的功能 |
| 時區處理要額外裝 | moment-timezone 又是一個大套件 |

### day.js：moment 的輕量替代品

[day.js](https://day.js.org/) 的 API 跟 moment 幾乎一樣，但只有 2KB。

```javascript
import dayjs from 'dayjs';

// 基本操作
dayjs('2024-01-15').format('YYYY/MM/DD');  // 2024/01/15
dayjs().add(7, 'day').format('YYYY-MM-DD');  // 一週後

// 比較
dayjs('2024-01-15').isBefore('2024-01-20');  // true
dayjs('2024-01-15').diff('2024-01-10', 'day');  // 5

// 相對時間（需要 plugin）
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
dayjs('2024-01-01').fromNow();  // "2 months ago"
```

**day.js 是不可變的**——每個操作都回傳新物件，不會改動原本的。

```javascript
const date = dayjs('2024-01-15');
const nextWeek = date.add(7, 'day');

console.log(date.format('YYYY-MM-DD'));      // 2024-01-15（沒變）
console.log(nextWeek.format('YYYY-MM-DD'));  // 2024-01-22
```

### date-fns：函數式的日期處理

[date-fns](https://date-fns.org/) 的設計不一樣——它不是包裝 Date 物件，而是提供一堆函數。

```javascript
import { format, addDays, differenceInDays } from 'date-fns';

const date = new Date('2024-01-15');

format(date, 'yyyy/MM/dd');  // 2024/01/15
addDays(date, 7);  // 回傳新的 Date 物件
differenceInDays(new Date('2024-01-20'), date);  // 5
```

**Tree Shaking 超友善**——你用什麼就打包什麼。

如果你只用 `format` 和 `addDays`，打包就只會包這兩個函數。

---

## Python：datetime 很痛苦

Python 內建的 `datetime` 模組可以用，但很多操作很囉唆：

```python
from datetime import datetime, timedelta

# 格式化
now = datetime.now()
now.strftime("%Y-%m-%d %H:%M:%S")  # 要記格式字串

# 解析
datetime.strptime("2024-01-15", "%Y-%m-%d")  # 格式要完全對

# 時區轉換... 很痛苦
```

### pendulum：Python 的 moment

[pendulum](https://pendulum.eustace.io/) 是 Python 最舒服的日期套件。

```python
import pendulum

# 建立
now = pendulum.now()
dt = pendulum.parse("2024-01-15")

# 格式化
dt.format("YYYY/MM/DD")  # 2024/01/15

# 計算
dt.add(days=7)
dt.subtract(months=1)

# 時區（這才是 pendulum 的殺手功能）
tokyo = pendulum.now("Asia/Tokyo")
taipei = tokyo.in_timezone("Asia/Taipei")

# 相對時間
pendulum.now().diff_for_humans()  # "just now"
pendulum.parse("2024-01-01").diff_for_humans()  # "2 months ago"
```

**pendulum 處理時區的方式特別好**：

```python
import pendulum

# 建立時指定時區
dt = pendulum.datetime(2024, 1, 15, 10, 30, tz="Asia/Tokyo")

# 轉換時區
taipei_time = dt.in_timezone("Asia/Taipei")
print(taipei_time)  # 2024-01-15 09:30:00+08:00（差一小時）

# 時區資訊永遠正確
print(dt.timezone_name)  # Asia/Tokyo
```

### arrow：另一個選擇

[arrow](https://arrow.readthedocs.io/) 也是不錯的套件，API 類似 pendulum。

```python
import arrow

now = arrow.now()
now.format("YYYY/MM/DD")
now.shift(days=7)
now.humanize()  # "just now"
```

我個人偏好 pendulum，因為時區處理更直覺。

---

## 比較

### JavaScript

| 套件 | 大小 | 特點 | 適合場景 |
|------|------|------|----------|
| moment.js | 72KB | 已停止開發 | 別用了 |
| day.js | 2KB | API 像 moment，超輕量 | 大部分場景 |
| date-fns | 按需載入 | 函數式，Tree Shaking 友善 | 對 bundle 大小敏感 |
| Temporal | 原生 | 未來的標準 | 等瀏覽器支援 |

### Python

| 套件 | 特點 | 適合場景 |
|------|------|----------|
| datetime | 內建，基本功能 | 簡單操作 |
| pendulum | 時區處理強，API 好用 | 需要時區、相對時間 |
| arrow | 類似 pendulum | 個人偏好 |
| dateutil | 強大的解析功能 | 要解析各種格式 |

---

## 我自己的判斷

### JavaScript

- 新專案 → **day.js**，輕量、API 好用
- 對 bundle 大小敏感 → **date-fns**，用多少載多少
- 舊專案用 moment → 不急著換，但新功能用 day.js
- 等未來 → **Temporal** 是 JavaScript 新的日期 API，但還沒進標準

```javascript
// 我現在的選擇
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

dayjs().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm');
```

### Python

- 需要時區 → **pendulum**，時區處理最舒服
- 簡單格式化 → 內建 `datetime` 就夠
- 要解析各種日期字串 → **dateutil**，解析能力最強

```python
# 我現在的選擇
import pendulum

dt = pendulum.now("Asia/Taipei")
dt.format("YYYY-MM-DD HH:mm")
dt.diff_for_humans()
```

---

## 常見的坑

### 時區

**最常見的錯誤**：以為伺服器時區跟使用者時區一樣。

```javascript
// 錯誤：不指定時區
new Date().toLocaleString()  // 用伺服器時區

// 正確：明確指定時區
dayjs().tz('Asia/Taipei').format()
```

### 月份從 0 開始

JavaScript 的 `Date` 月份是 0-11，不是 1-12。

```javascript
new Date(2024, 1, 15)  // 這是 2 月 15 日，不是 1 月！
```

用套件就沒這問題——day.js 和 date-fns 月份都是 1-12。

### 可變 vs 不可變

```javascript
// moment（可變）
const date = moment();
date.add(1, 'day');  // date 被改動了！

// day.js（不可變）
const date = dayjs();
const tomorrow = date.add(1, 'day');  // date 沒變，tomorrow 是新物件
```

不可變的好處是不會有「物件被別的地方改掉」的 bug。

---

## 相關文章

- [HTTP 請求套件：httpx vs axios](/Evernote/posts/http-client-packages) — 從 API 拿日期資料
- [資料驗證套件：Pydantic vs Zod](/Evernote/posts/validation-packages) — 驗證日期格式

---

日期處理的第一原則：**別用原生的**。

第二原則：**永遠存 UTC，顯示時再轉時區**。

選對套件，可以省下很多 debug 時間。
