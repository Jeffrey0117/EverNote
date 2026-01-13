---
layout: ../../layouts/PostLayout.astro
title: 圖片處理套件：sharp 和 Pillow
date: 2026-01-14T05:30
description: 網頁圖片太大要壓縮、要轉格式、要裁切... 這兩個套件是各自語言的標準答案
tags:
  - 圖片處理
  - JavaScript
  - Python
  - 套件推薦
---

我做過一個專案，使用者上傳頭像。

直接存原圖？4MB 的 PNG 檔案，載入慢死。

所以要處理：

- 壓縮：4MB → 200KB
- 轉格式：PNG → WebP
- 裁切：正方形頭像
- 縮放：統一大小

用什麼工具？

底層都是 [ImageMagick](/Evernote/posts/opensource-giants)，但各語言有更好用的包裝。

---

## JavaScript：sharp

[sharp](https://sharp.pixelplumbing.com/) 是 Node.js 最快的圖片處理套件。

底層用 [libvips](https://www.libvips.org/)，比 ImageMagick 快 4-5 倍。

```javascript
import sharp from 'sharp';

// 基本轉換
await sharp('input.jpg')
    .resize(800, 600)
    .toFile('output.jpg');

// 壓縮
await sharp('input.png')
    .png({ quality: 80 })
    .toFile('output.png');

// 轉格式
await sharp('input.jpg')
    .webp({ quality: 80 })
    .toFile('output.webp');
```

### 常用操作

```javascript
// 裁切成正方形
await sharp('input.jpg')
    .resize(200, 200, {
        fit: 'cover',      // 填滿，可能會裁切
        position: 'center' // 從中心裁
    })
    .toFile('avatar.jpg');

// 加浮水印
await sharp('photo.jpg')
    .composite([{
        input: 'watermark.png',
        gravity: 'southeast'  // 右下角
    }])
    .toFile('output.jpg');

// 取得圖片資訊
const metadata = await sharp('input.jpg').metadata();
console.log(metadata.width, metadata.height, metadata.format);
```

### Buffer 處理

不一定要讀寫檔案，可以直接處理 Buffer：

```javascript
// 從 Buffer 處理
const inputBuffer = await fs.readFile('input.jpg');
const outputBuffer = await sharp(inputBuffer)
    .resize(800)
    .webp()
    .toBuffer();

// 在 API 中直接回傳
app.get('/image/:id', async (req, res) => {
    const image = await getImageFromDB(req.params.id);
    const processed = await sharp(image)
        .resize(400)
        .webp()
        .toBuffer();
    res.type('image/webp').send(processed);
});
```

---

## Python：Pillow

[Pillow](https://pillow.readthedocs.io/) 是 Python 圖片處理的標準套件。

（PIL 的 fork，原版已經不維護了）

```python
from PIL import Image

# 基本轉換
with Image.open('input.jpg') as img:
    img = img.resize((800, 600))
    img.save('output.jpg')

# 轉格式
with Image.open('input.jpg') as img:
    img.save('output.webp', 'WEBP', quality=80)

# 壓縮
with Image.open('input.png') as img:
    img.save('output.png', optimize=True, quality=80)
```

### 常用操作

```python
from PIL import Image

# 裁切
with Image.open('input.jpg') as img:
    # 裁切成正方形（從中心）
    width, height = img.size
    size = min(width, height)
    left = (width - size) // 2
    top = (height - size) // 2
    cropped = img.crop((left, top, left + size, top + size))
    cropped.save('square.jpg')

# 縮放並保持比例
with Image.open('input.jpg') as img:
    img.thumbnail((800, 800))  # 最大 800x800，保持比例
    img.save('thumbnail.jpg')

# 旋轉
with Image.open('input.jpg') as img:
    rotated = img.rotate(90, expand=True)
    rotated.save('rotated.jpg')
```

### 加浮水印

```python
from PIL import Image, ImageDraw, ImageFont

with Image.open('photo.jpg') as base:
    # 文字浮水印
    draw = ImageDraw.Draw(base)
    font = ImageFont.truetype('arial.ttf', 36)
    draw.text((10, 10), "© Jeff", font=font, fill=(255, 255, 255, 128))
    base.save('watermarked.jpg')

    # 圖片浮水印
    with Image.open('watermark.png') as watermark:
        base.paste(watermark, (base.width - watermark.width - 10,
                               base.height - watermark.height - 10),
                   watermark)  # 第三個參數是遮罩
        base.save('watermarked2.jpg')
```

---

## 比較

| 功能 | sharp | Pillow |
|------|-------|--------|
| 語言 | JavaScript | Python |
| 底層 | libvips | 自己實作 |
| 速度 | 非常快 | 快 |
| API 風格 | 鏈式呼叫 | 物件方法 |
| WebP 支援 | 原生 | 原生 |
| AVIF 支援 | 原生 | 要額外裝 |
| 記憶體使用 | 串流處理，省記憶體 | 要整張載入 |

### 速度對比

處理一張 10MB 的圖片，resize + 轉 WebP：

| 工具 | 時間 |
|------|------|
| sharp | ~100ms |
| Pillow | ~300ms |
| ImageMagick CLI | ~500ms |

sharp 是真的快。

---

## 我自己的判斷

### JavaScript (Node.js)

- 處理使用者上傳的圖片 → **sharp**
- 建置時處理靜態圖片 → **sharp**
- 沒有理由用別的

```javascript
// 我處理使用者上傳的標準流程
async function processUpload(file) {
    return sharp(file.buffer)
        .resize(1200, 1200, {
            fit: 'inside',           // 不超過這個尺寸
            withoutEnlargement: true // 不放大小圖
        })
        .webp({ quality: 85 })
        .toBuffer();
}
```

### Python

- 一般圖片處理 → **Pillow**
- 需要更強的功能 → [OpenCV](https://opencv.org/)（影像辨識、濾鏡）
- 科學運算 → [scikit-image](https://scikit-image.org/)

```python
# 我處理使用者上傳的標準流程
from PIL import Image
import io

def process_upload(file_bytes):
    with Image.open(io.BytesIO(file_bytes)) as img:
        # 轉成 RGB（處理 PNG 透明背景）
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')

        # 縮放
        img.thumbnail((1200, 1200))

        # 輸出
        output = io.BytesIO()
        img.save(output, 'WEBP', quality=85)
        return output.getvalue()
```

---

## 進階：批次處理

### sharp 批次

```javascript
import sharp from 'sharp';
import { glob } from 'glob';

const files = await glob('images/*.jpg');

await Promise.all(files.map(async (file) => {
    const output = file.replace('.jpg', '.webp');
    await sharp(file)
        .webp({ quality: 80 })
        .toFile(output);
}));
```

### Pillow 批次

```python
from PIL import Image
from pathlib import Path

for file in Path('images').glob('*.jpg'):
    with Image.open(file) as img:
        output = file.with_suffix('.webp')
        img.save(output, 'WEBP', quality=80)
```

---

## 什麼時候用 CLI 工具

如果只是要一次性處理圖片，不用寫程式，直接用 CLI：

```bash
# ImageMagick
convert input.jpg -resize 800x600 output.jpg

# FFmpeg（也可以處理圖片）
ffmpeg -i input.png -vf scale=800:600 output.png

# cwebp（Google 的 WebP 工具）
cwebp -q 80 input.png -o output.webp
```

這些 CLI 工具的詳細介紹在 [這篇文章](/Evernote/posts/opensource-giants)。

---

## 相關文章

- [這些開源專案，重要性不輸你學的任何框架](/Evernote/posts/opensource-giants) — ImageMagick 和其他 CLI 工具
- [HTTP 請求套件：httpx vs axios](/Evernote/posts/http-client-packages) — 下載圖片
- [瀏覽器自動化：Playwright vs Puppeteer](/Evernote/posts/browser-automation-packages) — 截圖功能

---

圖片處理的重點：

1. **別存原圖**——使用者不會注意到 85% 品質跟 100% 的差別，但檔案大小差很多
2. **用 WebP**——比 JPEG 小 25-35%，現代瀏覽器都支援
3. **限制尺寸**——超過螢幕解析度的圖片沒意義

選對工具，這些都是幾行程式碼的事。
