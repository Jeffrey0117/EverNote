---
layout: ../../layouts/PostLayout.astro
title: AI 寫文章時的配圖規範
date: 2026-01-13T00:01
description: 給 AI 看的圖片使用指南，確保圖片穩定、乾淨、不侵權
tags:
  - AI
  - 寫作
  - 工作流程
pinned: true
---

這篇是給 AI 看的。

人類也可以看，但主要是讓 AI 在幫我寫文章時，知道怎麼處理圖片。

## 核心原則

1. **穩定** - 圖片 URL 不會壞掉
2. **乾淨** - 不會有浮水印、廣告
3. **合法** - 不侵權

## 圖片來源

| 優先級 | 來源 | 說明 |
|--------|------|------|
| 1 | Unsplash Source API | 用關鍵字取圖 |
| 2 | 官方資源 | 工具的 logo、官方截圖 |
| 3 | 本地圖片 | 需要人工補 |
| 禁止 | Google 搜圖 | URL 不穩定、版權不明 |
| 禁止 | 隨便的網站 | 可能下架 |

## Unsplash Source API

AI 沒辦法真的去 Unsplash 搜尋拿 photo ID。

但可以用 Source API，只要給關鍵字就能取圖：

```
https://source.unsplash.com/800x450/?關鍵字1,關鍵字2
```

### 標準格式

```markdown
![圖片描述](https://source.unsplash.com/800x450/?code,programming)
```

### 參數

| 參數 | 值 | 說明 |
|------|-----|------|
| 寬度 | 800 | 內文圖寬度 |
| 高度 | 450 | 16:9 比例 |
| 關鍵字 | 2-3 個 | 英文，逗號分隔 |

### 關鍵字對照表

| 文章主題 | 建議關鍵字 |
|----------|------------|
| 軟體架構 | architecture,abstract,minimal |
| 開發心得 | workspace,laptop,coffee |
| 效能優化 | speed,fast,motion |
| 錯誤處理 | warning,caution,attention |
| API 設計 | network,connection,abstract |
| 資料庫 | data,server,technology |
| 前端開發 | code,screen,programming |
| 工具介紹 | tools,workspace,desk |
| 觀念文 | thinking,ideas,minimal |
| 專案心得 | notebook,planning,workspace |

## 什麼時候放圖

| 文章類型 | 要不要圖 | 說明 |
|----------|----------|------|
| 觀念文 | 要 | 開頭放一張主題圖 |
| 專案心得 | 要 | 開頭放一張 |
| 深度教學 | 看情況 | 有圖更好，沒有也行 |
| 速查筆記 | 不用 | 程式碼就是視覺 |
| 問題解決 | 不用 | 內容為主 |
| 工具介紹 | 用官方資源 | 需要人工補 |

## 圖片位置

如果要放圖，放在文章開頭、第一段之後：

```markdown
---
layout: ../../layouts/PostLayout.astro
title: 文章標題
...
---

開頭一兩句話介紹這篇在講什麼。

![主題圖](https://source.unsplash.com/800x450/?關鍵字)

## 第一個段落標題

正文開始...
```

## 注意事項

1. **不要亂猜 URL** - 只用上面說的格式
2. **關鍵字用英文** - Unsplash 是英文網站
3. **不要放太多圖** - 一篇文章最多 1-2 張
4. **圖片描述要寫** - alt text 對 SEO 有幫助

## 官方資源怎麼找

如果是介紹特定工具，優先用官方資源：

- GitHub repo 的 logo
- 官方文件的截圖
- 官網的 press kit

這些通常在專案的 GitHub 或官網能找到。

如果找不到，就標註 `<!-- 需要人工補圖 -->` 讓人類後續處理。

---

這份規範會隨時更新。

AI 寫文章前請先讀這篇。
