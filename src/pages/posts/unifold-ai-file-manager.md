---
layout: ../../layouts/PostLayout.astro
title: Unifold：用 AI 幫你整理文件的桌面應用
date: 2026-01-13T10:30
description: 使用 Electron + React + Gemini API 打造的智能文件管理工具
tags:
  - Electron
  - React
  - TypeScript
  - AI
---

最近完成了一個桌面應用專案 **Unifold**，它是一個結合 AI 的文件管理工具，可以自動分析、分類、重新命名你的本地文件。這篇文章記錄整個專案的架構和技術選型。

## 專案目標

傳統的文件管理器只能讓你手動整理文件，但現代人每天下載的檔案越來越多，桌面和下載資料夾很快就會變得一團亂。Unifold 的目標是：

- 用 AI 分析文件內容，自動建議分類和命名
- 支援自然語言指令，例如「把所有 PDF 移到文件夾」
- 提供現代化的視覺介面，操作起來舒服

## 技術棧總覽

| 層級 | 技術 |
|------|------|
| 桌面框架 | Electron 33 |
| 構建工具 | Electron Vite |
| UI 框架 | React 19 + TypeScript |
| 樣式系統 | TailwindCSS |
| 動畫 | Framer Motion |
| AI 服務 | Google Gemini 1.5 Flash |

## 專案架構

Electron 應用的標準三層架構：

```
src/
├── main/           # 主進程：文件系統操作
├── preload/        # 預加載：安全的 IPC 橋接
└── renderer/       # 渲染進程：React UI
    └── src/
        ├── components/   # UI 元件
        ├── hooks/        # 邏輯封裝
        ├── services/     # AI 服務
        └── layouts/      # 佈局
```

## 核心功能實作

### 1. 文件系統操作

主進程負責所有文件操作，透過 IPC 與 UI 溝通：

```typescript
// main/index.ts
ipcMain.handle('list-dir', async (_, dirPath) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  return entries.map(entry => ({
    name: entry.name,
    path: path.join(dirPath, entry.name),
    isDirectory: entry.isDirectory(),
    // ... 其他元資料
  }))
})
```

### 2. AI 分析服務

使用 Google Generative AI SDK 整合 Gemini：

```typescript
// services/AIService.ts
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    responseMimeType: 'application/json'
  }
})

async analyzeFile(file: FileInfo) {
  const result = await model.generateContent(prompt)
  return JSON.parse(result.response.text())
}
```

AI 會回傳結構化的建議：

```json
{
  "summary": "這是一份 2024 年的報稅文件",
  "category": "財務/稅務",
  "suggestedName": "2024-個人所得稅申報書.pdf",
  "tags": ["稅務", "2024", "PDF"]
}
```

### 3. 自然語言命令

CommandBar 元件讓使用者用自然語言下指令：

```typescript
async executeCommand(command: string, contextFiles: FileInfo[]) {
  // AI 解析指令並生成執行計劃
  // 例如：「把截圖都移到 Screenshots 資料夾」
  // → 生成一系列 move 操作
}
```

## UI 設計：Glassmorphism 風格

視覺上採用毛玻璃效果搭配深色主題：

```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

配色使用 HSL 系統方便統一管理：

- 背景：`hsl(230 25% 4%)` 極深藍黑
- 主色：`hsl(210 100% 66%)` 鮮藍
- 強調色：`hsl(263.4 70% 50.4%)` 紫色

## Electron 安全性考量

為了讓 UI 能預覽本地圖片，需要調整一些安全設定：

```typescript
webPreferences: {
  sandbox: false,      // 允許 Node.js API
  webSecurity: false,  // 允許載入本地文件
  contextIsolation: true,
  preload: join(__dirname, '../preload/index.js')
}
```

這在開發階段可行，但正式版應該實作更安全的文件存取機制（例如透過 IPC 傳遞 base64）。

## 開發與構建

使用 `electron-vite` 簡化開發流程：

```bash
# 開發模式（熱重載）
npm run dev

# 生產構建
npm run build
```

Electron Vite 會自動處理主進程、預加載、渲染進程的分別打包。

## 小結

這個專案展示了一個完整的 Electron + React 應用架構，並整合了 AI 能力。幾個學到的重點：

1. **進程分離**：Electron 的主進程和渲染進程職責要分清楚
2. **IPC 設計**：透過 preload 暴露安全的 API，避免直接暴露 Node.js
3. **AI 整合**：Gemini API 用 JSON 模式可以確保回傳格式一致
4. **視覺設計**：Glassmorphism + Framer Motion 可以做出很精緻的效果

未來可以繼續擴展的方向：批次處理、規則引擎、更多文件類型支援等。
