---
layout: ../../layouts/PostLayout.astro
title: 從 Flask 換到 FastAPI，我再也回不去了
date: 2026-01-14T02:35
description: 用 Python 寫 API 的框架比較：Flask vs Django vs FastAPI，以及 FastAPI 的非同步魔法是怎麼運作的
tags:
  - FastAPI
  - Python
  - Flask
  - 非同步
---

寫 Python 後端，第一個會碰到的問題是：**用什麼框架？**

Google 搜尋「Python web framework」，答案通常是 Flask 或 Django。

我一開始也用 Flask，寫了好幾個專案。

簡單、輕量、文件多、社群大。

**直到我開始寫需要「等待」的 API。**

---

## 等等，FastAPI 不是 API

先澄清一件事，因為這名字真的很容易誤會。

**FastAPI 是框架，不是 API。**

### API 是什麼

API（Application Programming Interface）是程式之間溝通的介面。

想像你去餐廳吃飯：

- 你不會跑進廚房自己炒菜
- 你看菜單，告訴服務生「我要一份炒飯」
- 服務生把菜端上來

**菜單就是 API**——它告訴你「有什麼可以點」、「怎麼點」，但你不用知道廚房怎麼運作。

程式的世界也一樣：

```python
# 你不用知道 YouTube 的伺服器怎麼運作
# 只要照著 API 格式發請求
requests.get("https://youtube.com/api/video/abc123")
```

### 框架是什麼

框架是「幫你把髒活累活都做完」的工具。

沒有框架，你要自己處理：

```python
# 自己處理 HTTP 請求
import socket

server = socket.socket()
server.bind(("0.0.0.0", 8080))
server.listen(5)

while True:
    client, addr = server.accept()
    request = client.recv(4096).decode()

    # 自己解析 HTTP 格式
    method, path, _ = request.split("\r\n")[0].split(" ")

    # 自己組 HTTP 回應
    if path == "/download":
        response = "HTTP/1.1 200 OK\r\n\r\n{\"status\": \"ok\"}"
    else:
        response = "HTTP/1.1 404 Not Found\r\n\r\nNot Found"

    client.send(response.encode())
    client.close()
```

用框架，同樣的事變這樣：

```python
from fastapi import FastAPI
app = FastAPI()

@app.get("/download")
def download():
    return {"status": "ok"}
```

**框架把 HTTP 解析、路由、回應格式這些瑣事都包好了**，你只要專心寫業務邏輯。

所以 FastAPI 的意思是：「一個很快的、用來寫 API 的框架」。

名字沒取好，不是它的錯。

---

## 問題：API 會卡住

我在做 [Ytify](/posts/ytify-self-hosted-youtube-downloader)（一個 YouTube 下載服務）時遇到一個問題。

使用者送出下載請求後，後端要：

1. 呼叫 yt-dlp 抓影片資訊（等網路）
2. 下載影片（等網路）
3. 轉檔（等硬碟 I/O）

每一步都在「等」。

用 Flask 寫，一個請求進來，整個 worker 就被佔住了。

同時有 3 個人下載，就需要 3 個 worker。

同時有 10 個人下載，伺服器直接掛掉。

```python
# Flask 版本（同步）
@app.route("/download", methods=["POST"])
def download():
    info = yt_dlp.extract_info(url)  # 卡住，等網路
    download_video(info)              # 卡住，等網路
    return {"status": "done"}
```

問題是：**等網路的時候，CPU 其實是閒著的**。

它只是在那邊乾等，什麼事都沒做，卻佔著一個 worker。

---

## 比較：Flask vs Django vs FastAPI

| 框架 | 類型 | 適合場景 | 問題 |
|------|------|----------|------|
| **Flask** | 同步 | 簡單 CRUD、prototype | I/O 密集會卡 |
| **Django** | 同步 | 大型專案、需要 ORM/Admin | 太重，學習曲線高 |
| **FastAPI** | 非同步 | API 服務、I/O 密集 | 相對新，生態系較小 |

Flask 的問題是同步模型。Django 雖然有 async 支援，但它設計的初衷是「全功能框架」，包山包海，我只是想寫個 API，不需要 ORM、不需要 Admin、不需要模板引擎。

FastAPI 的定位很明確：**專門為 API 設計的非同步框架**。

```python
# FastAPI 版本（非同步）
@app.post("/download")
async def download():
    info = await yt_dlp.extract_info(url)  # 不卡，去處理別的請求
    await download_video(info)              # 不卡，去處理別的請求
    return {"status": "done"}
```

加了 `async` 和 `await`，同一個 worker 就能同時處理多個請求。

---

## 但我好奇，async/await 到底是怎麼運作的

一開始我把 `async` 當魔法用——加了就變快。

但不懂原理，踩了不少坑（比如在 async 函數裡用同步的 requests 庫，結果還是會卡）。

後來花時間研究了一下 Python 的 asyncio。

### 核心概念：事件循環

想像你在煮泡麵：

**同步做法：**
1. 燒水（站在那邊等 3 分鐘）
2. 水滾了，放麵（站在那邊等 3 分鐘）
3. 麵好了，開吃

總共 6 分鐘，你站了 6 分鐘。

**非同步做法：**
1. 燒水（去做別的事）
2. 水滾了，放麵（去做別的事）
3. 麵好了，開吃

總共 6 分鐘，但你只在「放麵」和「開吃」時站了幾秒。

```python
# 事件循環的概念
import asyncio

async def boil_water():
    print("開始燒水")
    await asyncio.sleep(3)  # 假裝燒水要 3 秒
    print("水滾了")

async def do_other_stuff():
    print("去做別的事")
    await asyncio.sleep(1)
    print("做完了")

async def main():
    # 同時執行兩件事
    await asyncio.gather(
        boil_water(),
        do_other_stuff()
    )

asyncio.run(main())
```

輸出：
```
開始燒水
去做別的事
做完了      # 1 秒後
水滾了      # 3 秒後
```

`await` 的意思是：「這邊要等，但你可以先去忙別的」。

### 等等，JavaScript 不是本來就有嗎？

如果你寫過 JavaScript，可能會想：「這不是 JS 本來就會的事嗎？」

沒錯。**JavaScript 的事件循環是內建的**，從第一天就是非同步的。

```javascript
// JavaScript：天生非同步
fetch('/api/download')
  .then(res => res.json())
  .then(data => console.log(data));

console.log('我先跑');  // 這行會先印出來
```

你不用做任何事，JS 就是非同步的。這是因為瀏覽器和 Node.js 都內建事件循環。

**但 Python 不一樣。**

```python
# Python：預設是同步的
import requests

response = requests.get('/api/download')  # 卡住，等它跑完
data = response.json()
print(data)

print('我後跑')  # 真的會後跑
```

Python 預設是「一行跑完才跑下一行」。想要非同步，你要：

1. 用 `asyncio` 模組
2. 函數前面加 `async`
3. 等待的地方加 `await`
4. 用支援非同步的函式庫（`aiohttp` 而不是 `requests`）

這就是為什麼 Python 需要選框架——Flask 是同步的，FastAPI 是非同步的。

在 JavaScript 的世界，Express 和 Fastify 都是非同步的，因為 JS 本身就是。

| 語言 | 事件循環 | 要特別處理嗎 |
|------|----------|--------------|
| JavaScript | 內建 | 不用，天生非同步 |
| Python | 要自己加 | 要，選對框架 + async/await |
| Go | 內建（goroutine） | 不用，用 `go` 關鍵字 |
| Java | 要自己加 | 要，用 CompletableFuture 或 Virtual Threads |

所以如果你是 JS 開發者轉 Python，會覺得「怎麼這麼麻煩」——因為 JS 把你寵壞了。（但 [JS 的非同步也沒那麼簡單](/posts/javascript-async-you-still-need-to-learn)，別得意）

### 所以如果要自幹一個簡單的事件循環...

```python
# 極簡版事件循環
class SimpleEventLoop:
    def __init__(self):
        self.ready = []      # 可以執行的任務
        self.waiting = []    # 在等待的任務

    def run(self):
        while self.ready or self.waiting:
            # 檢查等待中的任務是否可以繼續
            for task in self.waiting[:]:
                if task.is_ready():
                    self.waiting.remove(task)
                    self.ready.append(task)

            # 執行一個可以執行的任務
            if self.ready:
                task = self.ready.pop(0)
                task.run_one_step()
                if not task.is_done():
                    self.waiting.append(task)
```

實際的 asyncio 比這複雜得多（要處理 I/O、計時器、例外...），但核心概念就是這個：

1. 維護一個待辦清單
2. 任務說「我要等」時，去做別的
3. 任務可以繼續時，再回來執行

---

## FastAPI 還有一個殺手級功能：自動 API 文檔

除了非同步，FastAPI 還有一個讓我回不去 Flask 的理由。

它會根據你的程式碼，**自動產生互動式 API 文檔**。

```python
from pydantic import BaseModel

class DownloadRequest(BaseModel):
    url: str
    format: str = "mp4"
    quality: str = "best"

@app.post("/download")
async def download(req: DownloadRequest):
    ...
```

就這樣，打開 `/docs`，你會看到一個漂亮的 Swagger UI，可以直接在網頁上測試 API。

不用寫文檔，不用開 Postman，程式碼就是文檔。

用 Flask 的話，要自己裝 flask-swagger 或 flask-restx，還要手動寫一堆裝飾器。

---

## 研究完之後

理解 async/await 的原理後，我更清楚 FastAPI 幫我省了多少事：

- 不用自己管理事件循環
- 不用自己處理 WebSocket 連線
- 不用自己寫 API 文檔
- 型別檢查和資料驗證都內建

對於需要處理大量 I/O 的 API 服務，FastAPI 目前是我的首選。

---

## 什麼時候不該用 FastAPI

公平起見，FastAPI 不是萬靈丹：

- **如果你在學 Python**：Flask 更簡單，更適合入門
- **如果你要做傳統網站**：Django 有完整的模板、ORM、Admin 系統
- **如果你的服務是 CPU 密集**：async 救不了你，要用 multiprocessing

但如果你要寫「API 服務」，而且有大量 I/O 操作（資料庫查詢、外部 API 呼叫、檔案下載），FastAPI 值得一試。
