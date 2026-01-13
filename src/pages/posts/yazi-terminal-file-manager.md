---
layout: ../../layouts/PostLayout.astro
title: dir 太醜了，換個方式看資料夾
date: 2026-01-13T08:36
description: 用 yazi 讓 terminal 的檔案瀏覽變得視覺化
tags:
  - CLI
  - Windows
  - 開發工具
---

在 Windows Terminal 打 `dir`，出來的東西長這樣：

```
 Volume in drive C is OS
 Directory of C:\Users\jeffb\Desktop\code

01/13/2026  08:30 AM    <DIR>          .
01/13/2026  08:30 AM    <DIR>          ..
01/13/2026  07:00 AM    <DIR>          Evernote
01/12/2026  15:30 PM    <DIR>          PasteV
01/10/2026  09:00 AM    <DIR>          Unifold
...
```

能用，但很醜。想快速看有哪些專案、哪個最近改過、裡面有什麼檔案，要一直 cd 進去再 dir，很煩。

我想要的是那種**可以用方向鍵瀏覽、按 Enter 進資料夾、有預覽**的東西。

## yazi

[yazi](https://github.com/sxyazi/yazi) 是一個用 Rust 寫的終端檔案管理器，很快，而且長得很漂亮。

裝法（Windows 用 scoop）：

```bash
scoop install yazi
```

[scoop](https://scoop.sh/) 是 Windows 的套件管理器，讓你可以像 Linux 一樣用指令裝軟體。類似的東西還有微軟官方的 [winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/)、macOS 的 [brew](https://brew.sh/)、Linux 的 `apt`。

裝完後在 terminal 打 `yazi` 就會進入檔案瀏覽模式。

我自己寫了一個 batch 檔，讓我打 `lls` 就會呼叫 yazi：

```batch
@echo off
yazi %*
```

放在 PATH 裡，這樣就不用每次打 yazi 全名。

## 為什麼選這個

其他類似的工具：

| 工具 | 說明 |
|------|------|
| [ranger](https://github.com/ranger/ranger) | Python 寫的，很老牌，但在 Windows 上裝比較麻煩 |
| [lf](https://github.com/gokcehan/lf) | Go 寫的，輕量，但功能比較少 |
| [nnn](https://github.com/jarun/nnn) | C 寫的，超快超輕量，但介面比較陽春 |
| [yazi](https://github.com/sxyazi/yazi) | Rust 寫的，快、漂亮、功能完整 |

yazi 的優勢是**圖片預覽**和**非同步 I/O**，大資料夾也不會卡。而且內建主題系統，可以調成自己喜歡的樣子。

## 基本操作

一開始有點卡，因為是 Vim 式的操作邏輯。記幾個常用的：

**移動**
- `j` / `k`：上下移動（j 往下，想成 jump down）
- `h` / `l`：h 回上層資料夾，l 進入資料夾（h 是 left，l 是 right）
- `gg`：跳到最上面
- `G`：跳到最下面

**操作檔案**
- `Enter`：用預設程式開啟檔案
- `y`：yank，複製（跟 Vim 一樣）
- `p`：paste，貼上
- `d`：delete，刪除（會進垃圾桶）
- `r`：rename，重新命名

**其他**
- `/`：搜尋
- `q`：quit，離開
- `~`：回到家目錄
- `?`：顯示所有快捷鍵

我只是拿來快速看一下資料夾有什麼，沒有深入使用，但這樣就夠了。

---

現在要看專案資料夾，打 `lls` 就好，比 `dir` 舒服多了。
