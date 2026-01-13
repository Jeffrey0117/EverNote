---
layout: ../../layouts/PostLayout.astro
title: VSCode + Claude Code 開發 Electron 時的環境變數陷阱
date: 2026-01-13T10:30
description: 解決在 VSCode 終端中執行 Electron 開發命令時 require('electron') 返回字串而非模組的問題
tags:
  - Electron
  - VSCode
  - Node.js
---

最近在用 Claude Code 開發 Electron 應用時踩到一個坑，執行 `npm run dev` 直接噴錯：

```
Error: Electron failed to install correctly, please delete node_modules/electron and try installing again
```

刪了 `node_modules` 重裝也沒用，問題根本不在這裡。

## 問題根源

查了一下發現 `require('electron')` 返回的是一個**路徑字串**，而不是 Electron API 模組：

```javascript
const electron = require('electron');
console.log(electron);
// 預期: { app, BrowserWindow, ipcMain, ... }
// 實際: "C:\Users\...\node_modules\electron\dist\electron.exe"
```

原因是環境變數 `ELECTRON_RUN_AS_NODE=1` 被設定了。

## 為什麼會有這個環境變數

重點來了：**VSCode 本身就是 Electron 應用**，Claude Code 擴展也是。

當從 VSCode 終端執行命令時，會繼承 `ELECTRON_RUN_AS_NODE=1` 這個環境變數。這個變數的作用是讓 Electron 以純 Node.js 模式運行，這時候 `require('electron')` 就不會返回 Electron API 了。

整個執行鏈是這樣的：

```
VSCode (Electron App)
  └── 終端 (繼承 ELECTRON_RUN_AS_NODE=1)
        └── Claude Code Extension
              └── npm run dev
                    └── Electron 以 Node.js 模式運行 💥
```

這是一個 **Electron-in-Electron** 的嵌套問題。

## 解法

在 Electron 啟動之前把這個環境變數刪掉就好。

如果用 Vite，在 `vite.config.ts` 最頂端加：

```typescript
// vite.config.ts
delete process.env.ELECTRON_RUN_AS_NODE;

import { defineConfig } from 'vite';
// ... 其他 imports
```

或者在 Electron 主進程檔案的最頂端：

```javascript
// electron/main.ts
delete process.env.ELECTRON_RUN_AS_NODE;
```

也可以在 `package.json` 用 cross-env：

```json
{
  "scripts": {
    "dev": "cross-env ELECTRON_RUN_AS_NODE= vite"
  }
}
```

## 驗證修復

修復後確認一下：

```javascript
const electron = require('electron');
console.log(typeof electron); // 'object' 就對了
```

## 小結

這個問題只會在 VSCode 終端或 Claude Code 環境下發生，因為它們都是 Electron 應用。如果你從系統終端（Windows Terminal、iTerm2 等）執行同樣的命令，就不會有這個問題。

記得：看到 `require('electron')` 返回字串，第一個要檢查的就是 `ELECTRON_RUN_AS_NODE` 環境變數。

---

GitHub Repo: [vscode-claude-electron-fix](https://github.com/Jeffrey0117/vscode-claude-electron-fix)
