---
layout: ../../layouts/PostLayout.astro
title: Electron 主進程與渲染進程的溝通橋樑：IPC
date: 2026-01-16T06:36
description: 剛開始學 Electron 時，最搞不懂的就是為什麼網頁不能直接讀寫檔案。這一切都跟主進程和渲染進程的設計有關，而 IPC 就是它們之間的橋樑。
tags:
  - Electron
  - IPC
  - Node.js
---

剛開始用 Electron 把網頁包成桌面應用的時候，我天真地以為，這不就是個加了 Node.js 環境的 Chrome 嗎？

那我理所當然地可以在我的 `index.html` 裡，用 `fs.readFile` 之類的方法直接讀取使用者電腦上的檔案吧？

結果下一秒，`fs` is not defined 的錯誤直接打在我臉上。

那一刻我才意識到，事情沒有憨人想的那麼簡單。

## 瀏覽器終究是瀏覽器

查了一下資料才發現，Electron 應用程式其實分成兩種進程：

1.  **主進程 (Main Process)**：只有一個，是整個應用的入口點。它可以呼叫原生 GUI API、建立視窗、管理應用的生命週期。**它擁有完整的 Node.js 環境**，所有跟作業系統底層互動的功能（像是讀寫檔案、操作硬體）都在這裡。
2.  **渲染進程 (Renderer Process)**：每個網頁視窗都是一個獨立的渲染進程。它基本上就是一個 Chromium 瀏覽器環境，負責顯示 UI。

這就解釋了為什麼我不能在網頁裡直接用 `fs`。

基於安全考量，渲染進程預設是跑在一個沙盒環境裡的，跟我們平常寫網頁一樣，它不能隨便就碰使用者的檔案系統。不然任何一個用 Electron 包的網頁，都能在你電腦上亂搞，那還得了。

這個設計很合理，但也帶來一個新問題：如果我的 UI (渲染進程) 需要讀取一個本地檔案，該怎麼辦？

答案就是 **IPC (Inter-Process Communication)**，進程間通訊。

## 主進程與渲染進程的對話

IPC 是 Electron 讓我們安全地在不同進程之間傳遞訊息的機制。你可以把它想像成一個對講機系統：

- `ipcRenderer` 是渲染進程（網頁）拿的對講機。
- `ipcMain` 是主進程拿的對講機。

它們之間可以透過預先約定好的「頻道 (channel)」來傳遞訊息。

主要有兩種溝通模式：單向通訊和雙向通訊。

### 單向通訊：渲染進程發送，主進程監聽

最簡單的場景是，渲染進程想通知主進程去做某件事，但不在乎結果。例如，點擊一個按鈕後，要求主進程儲存目前設定。

**渲染進程 (`renderer.js`)**
```javascript
const { ipcRenderer } = require('electron');

document.getElementById('save-button').addEventListener('click', () => {
  const settings = { theme: 'dark' };
  // 向 'save-settings' 頻道發送訊息
  ipcRenderer.send('save-settings', settings);
});
```

**主進程 (`main.js`)**
```javascript
const { ipcMain, app } = require('electron');
const fs = require('fs');
const path = require('path');

// 監聽 'save-settings' 頻道
ipcMain.on('save-settings', (event, settings) => {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  fs.writeFileSync(settingsPath, JSON.stringify(settings));
  console.log('Settings saved!');
});
```
這樣一來，渲染進程就成功委託主進程完成了它自己做不到的檔案寫入操作。

### 雙向通訊：渲染進程發起請求，主進程回傳結果

更常見的場景是，渲染進程需要主進程幫忙做一件事，**並且需要得到結果**。例如，讀取一個檔案的內容並顯示在介面上。

這時候就要用 `invoke` 和 `handle` 的組合，它們是基於 Promise 的，寫起來更現代。

**渲染進程 (`renderer.js`)**
```javascript
const { ipcRenderer } = require('electron');

async function loadFileContent() {
  // 向 'load-file' 頻道發起請求，並等待回傳結果
  const content = await ipcRenderer.invoke('load-file', 'path/to/my/file.txt');
  document.getElementById('content-area').innerText = content;
}

loadFileContent();
```

**主進程 (`main.js`)**
```javascript
const { ipcMain } = require('electron');
const fs = require('fs');

// 處理 'load-file' 頻道的請求
ipcMain.handle('load-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content; // 回傳結果
  } catch (err) {
    console.error('Failed to read file', err);
    return null; // 發生錯誤時回傳 null
  }
});
```

用 `invoke/handle` 的好處是，非同步流程非常清楚，可以完美搭配 `async/await`，避免了回呼地獄 (callback hell)。

## 安全第一：Context Bridge

直接在渲染進程裡 `require('electron')` 其實有安全風險。為了解決這個問題，Electron 推薦使用 "preload" 指令碼搭配 "Context Bridge" 來安全地將主進程的能力暴露給渲染進程。

簡單來說，就是在 `preload.js` 這個特殊指令碼中，將你需要用到的 IPC 功能掛載到 `window` 物件上。

**`preload.js`**
```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadFile: (filePath) => ipcRenderer.invoke('load-file', filePath),
  saveSettings: (settings) => ipcRenderer.send('save-settings', settings),
});
```

然後在你的渲染進程中，就可以這樣安全地呼叫：

**渲染進程 (`renderer.js`)**
```javascript
// 不再需要 require('electron')
async function loadFileContent() {
  const content = await window.electronAPI.loadFile('path/to/my/file.txt');
  // ...
}
```

這塊有點複雜，之後可以另外寫一篇詳細講。但重點是，透過 Context Bridge，我們可以嚴格控制渲染進程能存取哪些 Node.js/Electron API，大幅提升安全性。

---

搞懂了主進程、渲染進程和 IPC 的關係，才算真正踏入了 Electron 開發的大門。

這套機制雖然一開始有點繞，但它背後是為了兼顧功能強大性與安全性的權衡。一旦掌握了這個核心概念，你就能打造出功能遠超一般網頁的桌面應用程式。