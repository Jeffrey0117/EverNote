---
layout: ../../layouts/PostLayout.astro
title: yt-dlp：YouTube 下載背後的黑魔法
date: 2026-01-14T03:00
description: YouTube 不想讓你下載影片，yt-dlp 怎麼繞過的？從網頁爬蟲到影音串流解析
tags:
  - yt-dlp
  - Python
  - YouTube
  - 爬蟲
---

YouTube 不提供下載按鈕。

這是故意的。

他們希望你在線上看，這樣才能放廣告、追蹤觀看行為、控制內容分發。

**但影片資料終究要傳到你的瀏覽器，不然你怎麼看？**

只要資料傳過來了，就有辦法存下來。

這就是 yt-dlp 做的事。

---

## 為什麼不用線上下載工具

Google 搜尋「YouTube 下載」，會看到一堆線上工具。

問題是：

| 問題 | 說明 |
|------|------|
| 廣告轟炸 | 點三下才能找到真正的下載按鈕 |
| 限速 | 免費版下載速度 100KB/s |
| 畫質限制 | 只給你 720p，想要 4K 請付錢 |
| 隱私疑慮 | 你的下載歷史被記錄 |
| 隨時會掛 | YouTube 一改版就壞，修復看心情 |

yt-dlp 是開源的命令列工具，沒有這些問題。

```bash
yt-dlp "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

一行指令，影片就下載了。最高畫質、沒有限速、沒有廣告。

---

## YouTube 影片怎麼傳到你的瀏覽器

要理解 yt-dlp 怎麼運作，先要知道 YouTube 怎麼播影片。

### 不是一個 MP4 檔案

很多人以為 YouTube 是存了一個 MP4 檔案，點播放就串流過來。

**錯。**

現代影音平台用的是 **Adaptive Bitrate Streaming**（自適應串流）：

1. 影片被切成很多小片段（幾秒一段）
2. 每個片段有不同畫質版本（360p、720p、1080p、4K...）
3. 播放器根據你的網速，動態選擇要載入哪個畫質

這就是為什麼 YouTube 看一看會「自動降畫質」——網路變慢時，它會切換到低畫質片段。

### 音訊和視訊是分開的

更麻煩的是，高畫質影片的音訊和視訊是**分開存放**的。

```
video_1080p.mp4  → 只有畫面，沒有聲音
audio_128k.m4a   → 只有聲音，沒有畫面
```

為什麼要分開？因為音訊不需要那麼多版本。不管你看 720p 還是 4K，聲音都是同一個。

分開存可以省空間、省頻寬。

**所以 yt-dlp 下載完之後，還要把音訊和視訊合併起來。**

---

## yt-dlp 怎麼找到影片網址

YouTube 不會直接告訴你影片檔案在哪裡。

但播放器總要知道去哪裡載入資料，這個資訊藏在網頁的某個地方。

### 步驟 1：解析網頁

yt-dlp 會模擬瀏覽器，去抓 YouTube 頁面的 HTML。

```python
# 簡化版概念
import requests

html = requests.get("https://www.youtube.com/watch?v=xxx").text
```

### 步驟 2：找到播放器設定

YouTube 頁面裡面有一大坨 JavaScript，其中藏著播放器需要的資訊：

```javascript
var ytInitialPlayerResponse = {
  "streamingData": {
    "formats": [...],
    "adaptiveFormats": [...]
  }
}
```

這裡面有所有可用的畫質、對應的下載網址。

### 步驟 3：解密簽名

YouTube 不會直接給你能用的網址。網址裡面有一個「簽名」參數，這個簽名是用 JavaScript 函數加密過的。

```
https://...googlevideo.com/videoplayback?...&sig=加密過的簽名
```

yt-dlp 要：

1. 找到加密用的 JavaScript 函數
2. 理解它的邏輯（每隔一段時間會換）
3. 自己算出正確的簽名

這就是為什麼 yt-dlp 要一直更新——YouTube 會定期換加密方式。

### 步驟 4：下載並合併

```bash
# 下載最佳視訊
wget "https://...googlevideo.com/video_1080p..."

# 下載最佳音訊
wget "https://...googlevideo.com/audio_128k..."

# 用 ffmpeg 合併
ffmpeg -i video.mp4 -i audio.m4a -c copy output.mp4
```

yt-dlp 把這些步驟都自動化了。

---

## yt-dlp vs youtube-dl

yt-dlp 是從 youtube-dl fork 出來的。為什麼要 fork？

| | youtube-dl | yt-dlp |
|--|------------|--------|
| 更新頻率 | 幾個月一次 | 幾天一次 |
| YouTube 支援 | 常常壞掉 | 很快修復 |
| 下載速度 | 單線程 | 多線程，快很多 |
| 功能 | 基本 | 更多選項 |
| 社群 | 維護緩慢 | 活躍 |

youtube-dl 曾經被 RIAA（美國唱片業協會）在 GitHub 上下架，雖然後來恢復了，但開發速度變慢。

yt-dlp 接手了這個需求，現在是主流選擇。

---

## 常用指令

```bash
# 下載最佳畫質
yt-dlp "URL"

# 列出所有可用格式
yt-dlp -F "URL"

# 下載指定格式（例如 137+140）
yt-dlp -f 137+140 "URL"

# 只下載音訊
yt-dlp -x --audio-format mp3 "URL"

# 下載整個播放清單
yt-dlp "https://www.youtube.com/playlist?list=xxx"

# 下載字幕
yt-dlp --write-sub --sub-lang zh-TW "URL"
```

---

## 在 Python 裡使用

yt-dlp 可以當 Python 模組用，這就是 [Ytify](/posts/ytify-self-hosted-youtube-downloader) 的做法：

```python
import yt_dlp

def download_video(url):
    opts = {
        'format': 'bestvideo[height<=1080]+bestaudio/best',
        'outtmpl': 'downloads/%(title)s.%(ext)s',
        'progress_hooks': [on_progress],  # 進度回調
    }

    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])

def on_progress(d):
    if d['status'] == 'downloading':
        print(f"下載中: {d['_percent_str']}")
    elif d['status'] == 'finished':
        print("下載完成，開始合併...")
```

`progress_hooks` 是關鍵——它讓你能拿到下載進度，推送給前端顯示。

---

## 為什麼 yt-dlp 一直要更新

YouTube 和 yt-dlp 是貓捉老鼠的關係：

1. YouTube 換加密方式
2. yt-dlp 壞掉
3. yt-dlp 開發者逆向工程，發布更新
4. 重複

這就是為什麼 Ytify 有「自動更新 yt-dlp」的功能：

```python
async def update_ytdlp():
    process = await asyncio.create_subprocess_exec(
        "pip", "install", "--upgrade", "yt-dlp"
    )
    await process.wait()
```

不更新，隔幾週就會壞掉。

---

## 法律問題

yt-dlp 本身是合法的工具，它只是幫你下載**你本來就能看的**內容。

但用它下載有版權的內容然後散播，那是你的問題。

就像菜刀可以切菜也可以傷人，工具本身是中性的。

---

## 總結

| yt-dlp 做的事 | 為什麼難 |
|---------------|----------|
| 解析 YouTube 頁面 | JavaScript 混淆、結構常換 |
| 解密影片網址 | 加密演算法定期更換 |
| 處理多種格式 | DASH、HLS、不同編碼 |
| 合併音視訊 | 需要 ffmpeg |
| 支援其他網站 | 每個網站邏輯不同 |

yt-dlp 支援的不只 YouTube，還有 [幾千個網站](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)。

每個網站的下載邏輯都不一樣，yt-dlp 把這些都抽象成一個統一的介面：

```bash
yt-dlp "任何影片網址"
```

這就是它厲害的地方。
