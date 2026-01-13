---
layout: ../../layouts/PostLayout.astro
title: 這些開源專案，重要性不輸你學的任何框架
date: 2026-01-14T04:52
description: FFmpeg、yt-dlp、SQLite... 這些低調的開源專案撐起半個軟體世界，很多付費軟體底層就是這些免費的東西
tags:
  - 開源
  - 開發觀念
  - CLI
  - 工具
---

我第一次遇到是想下載 YouTube 影片。

找了一堆軟體，有的要錢，有的有廣告，有的下載到一半就壞掉。

後來朋友給我一行指令：

```bash
yt-dlp "https://www.youtube.com/watch?v=xxx"
```

我：「等等，就這樣？那些軟體到底在賣什麼？」

他：「包裝。底層都是這個免費的東西。」

**那天我才發現，很多付費軟體的底層，都是免費的開源工具。**

---

## 你其實每天都在用

你用 VLC 看影片，底層是 [FFmpeg](https://ffmpeg.org/)。

你用 Chrome 瀏覽網頁，底層是 [Chromium](https://www.chromium.org/)。

你手機裡的 App 存資料，底層是 [SQLite](https://www.sqlite.org/)。

Discord 播語音？FFmpeg。VS Code 跑起來？Chromium。

**這些專案低調到你不知道它存在，但沒有它們，這些軟體都跑不起來。**

| 專案 | 一句話定位 | 誰在用它 |
|------|------------|----------|
| [FFmpeg](https://ffmpeg.org/) | 影音界的瑞士刀，轉檔、剪輯、壓縮都靠它 | VLC、OBS、Chrome、Discord |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | 下載網路影片的終極武器 | 一堆 YouTube 下載器都是套殼 |
| [ImageMagick](https://imagemagick.org/) | 用指令批次處理圖片 | 很多圖片轉換工具 |
| [SQLite](https://www.sqlite.org/) | 一個檔案就是資料庫，不用裝服務 | 手機 App、瀏覽器、桌面應用 |
| [cURL](https://curl.se/) | 用指令發 HTTP 請求的標配 | 幾乎所有需要發請求的工具 |
| [Tesseract](https://github.com/tesseract-ocr/tesseract) | 開源 OCR 引擎，讓電腦看圖認字 | 各種文字辨識工具 |
| [Chromium](https://www.chromium.org/) | Chrome 的開源核心 | Chrome、Edge、Electron、Brave |
| [Pandoc](https://pandoc.org/) | 文件格式轉換的萬能翻譯機 | Markdown 轉 PDF、Word、HTML |

---

## 為什麼重要性不輸框架

我以前覺得學技術就是學框架、學套件，會越多越厲害。

後來發現，框架會過時。

jQuery → Angular → React → 下一個是什麼？

**但 FFmpeg 從 2000 年就存在了，到現在還是影音處理的標準。**

SQLite 從 2000 年開始，現在全世界有[超過一兆個 SQLite 資料庫](https://www.sqlite.org/mostdeployed.html)在跑。

cURL 從 1998 年就有了，到現在幾乎每個 Linux 系統都有它。

這些專案穩定存在二十幾年，而且還會繼續存在下去。

學會了，到處都能用。不會因為換公司、換語言就沒用。

**很多「技術問題」其實一行指令就解決：**

```bash
# 影片轉 MP3
ffmpeg -i video.mp4 -vn output.mp3

# 下載 YouTube 影片
yt-dlp "https://www.youtube.com/watch?v=xxx"

# 圖片轉 PDF
convert *.jpg output.pdf

# 發 HTTP 請求
curl -X POST -d '{"key":"value"}' https://api.example.com
```

這些指令比你寫一堆 code 還快。

---

## 很多付費軟體就是套殼

這個講出來有點得罪人，但確實是事實。

Google 搜尋「YouTube 下載」，會看到一堆軟體，有些還要付費。

**它們底層幾乎都是 yt-dlp。**

| 付費軟體類型 | 售價 | 底層技術 |
|-------------|------|----------|
| YouTube 下載器 | $20-50 | yt-dlp |
| 影片轉檔軟體 | $30-80 | FFmpeg |
| OCR（文字辨識）工具 | $10/月訂閱 | Tesseract |
| 圖片批次處理 | $20-40 | ImageMagick |

這些軟體做的事情就是：**包一個 GUI（圖形介面），呼叫底層的開源工具，然後收你錢**。

GUI 對不會用 CLI（命令列）的人確實方便。

但如果你會寫程式，與其花錢買套殼，不如自己學著用。

yt-dlp 的原理和用法，我之前寫過一篇詳細的：[yt-dlp：YouTube 下載背後的黑魔法](/Evernote/posts/yt-dlp-how-youtube-download-works)

---

## 怎麼開始用

我第一次用 FFmpeg，打了這個指令：

```bash
ffmpeg video.mp4 output.mp3
```

報錯。

原來少了 `-i` 參數。

然後我打 `ffmpeg -h`，出來幾百行說明，完全看不懂。

**後來我發現一個訣竅：不要硬讀文件，直接問 AI。**

「怎麼用 FFmpeg 把影片轉成 GIF？」

AI 直接給你完整指令，複製貼上就能跑。遇到問題再問，比讀文件快 10 倍。

### 用 Python 包起來

如果你會 Python，可以用 subprocess 把這些 CLI 工具包成函數：

```python
import subprocess

def convert_video_to_mp3(input_path, output_path):
    """用 FFmpeg 把影片轉成 MP3"""
    subprocess.run([
        "ffmpeg",
        "-i", input_path,      # -i: 輸入檔案
        "-vn",                 # -vn: 不要影像 (video none)
        "-acodec", "mp3",      # -acodec: 音訊編碼器
        output_path
    ])

def download_youtube(url, output_dir):
    """用 yt-dlp 下載 YouTube 影片"""
    subprocess.run([
        "yt-dlp",
        "-o", f"{output_dir}/%(title)s.%(ext)s",
        url
    ])
```

這樣就可以在你的程式裡呼叫這些工具了。

**其實很多 Python 套件底層就是這樣做的**，只是幫你包好了而已。

更進階的 Python 工具整合，可以看：[Python 套件管理的混亂現狀](/Evernote/posts/python-package-managers)

---

## 我自己用過的

這些工具不是紙上談兵，我自己踩過坑。

### Tesseract：做 OCR 工具

之前做圖片翻譯工具，需要從圖片裡抓文字。

一開始想用 Google Cloud Vision API，一查價格：每 1000 張圖 $1.5。

算了一下我的用量，一個月要燒好幾百塊。

後來找到 Tesseract，免費、開源、本地跑。

**但一開始辨識率超爛**，中文字幾乎亂碼。

後來發現要另外下載中文語言包，加上 `--lang chi_tra` 參數，辨識率瞬間從 30% 跳到 80% 以上。

瀏覽器版本可以用 [Tesseract.js](https://tesseract.projectnaptha.com/)，不用後端也能跑。

### SQLite：本地資料儲存

做桌面應用的時候，需要在本地存一些資料。

一開始用 JSON 檔案存，資料一多就變得很慢，而且要自己處理讀寫衝突。

想過裝 PostgreSQL，但對一個小工具來說太重了。

SQLite 剛剛好——**一個檔案就是一個資料庫**，不用裝任何服務，SQL 語法又跟其他資料庫一樣。

### Electron (Chromium)：桌面應用

Electron 本質上就是 Chromium + Node.js。

你的網頁技術可以直接拿來做桌面應用，不用學新的東西。

VS Code、Slack、Discord 都是這樣做的。

一開始我也覺得 Electron 肥，後來發現是打包方式的問題。

詳細的 Electron 優化可以看：[Electron 肥是你不會 Tree Shaking](/Evernote/posts/electron-tree-shaking)

### yt-dlp：下載器

下載 YouTube 影片最強的工具，沒有之一。

我自己包了一個有圖形介面的版本給不會用命令列的朋友用。

---

## 選擇指南

什麼時候該學這些 vs 用現成套件？

| 情況 | 建議 |
|------|------|
| 只需要簡單功能 | 用現成套件，不用自己包 CLI |
| 套件功能不夠用 | 學底層工具，自己呼叫 |
| 想了解原理 | 學底層工具，看它怎麼做的 |
| 需要最佳效能 | 用底層工具，套件包裝通常會慢一點 |
| 付費軟體太貴 | 自己學，省下來的錢是你的 |

**我自己的判斷：**

- 如果 npm/pip 有現成套件，而且功能夠用，就直接用
- 如果套件底層就是呼叫 CLI，不如自己呼叫，少一層包裝
- 如果是長期會用到的技術，值得花時間學底層

這些開源工具在各自的領域裡，就是標準答案。就像 Cargo 在 Rust 生態裡一樣，做得夠好就沒有其他選項。

詳情見：[為什麼大家都在抄 Cargo](/Evernote/posts/why-cargo-is-the-best)

---

## 下次遇到問題，先別寫 code

我現在的習慣是：遇到問題，先 Google「XXX CLI」或「XXX command line」。

十次有八次，已經有現成工具可以一行解決。

影片轉檔、圖片處理、文件轉換、OCR、HTTP 請求——這些都有現成的 CLI 工具。

這些工具穩定、成熟、免費，而且到處都能用。

**寫程式解決問題是能力，知道不用寫程式就能解決問題，是更高的能力。**

框架會換，這些工具不會。
