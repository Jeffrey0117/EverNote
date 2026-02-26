---
layout: ../../layouts/PostLayout.astro
title: Windows CLI 看檔案：不切出去就能搞定
date: 2026-01-14T18:00
description: 用 type 和 more 在命令列直接看檔案，不用開編輯器
tags:
  - Windows
  - CLI
  - 指令
---

現在越來越常待在 CLI 裡工作。

跑 git、跑 npm、跑測試... 都在終端機。

突然想看某個檔案內容，不想切出去開編輯器——就為了「看一眼」而已。

Windows 內建兩個指令就夠用。

---

## `type`：直接印出來

```cmd
type config.json
```

整個檔案一次噴到螢幕上。

類似 Linux 的 `cat`。

**適合**：短檔案、設定檔、快速確認內容。

**問題**：檔案太長會刷過去，來不及看。

---

## `more`：一頁一頁翻

```cmd
more README.md
```

塞滿一個螢幕就停下來，等你按鍵。

| 按鍵 | 動作 |
|------|------|
| `Space` | 下一頁 |
| `Enter` | 下一行 |
| `Q` | 離開 |

**適合**：長檔案、log、想從頭慢慢看。

---

## 就這樣

兩個指令，看情況選：

- 短的 → `type`
- 長的 → `more`

不用切視窗，不用開 VS Code，留在 CLI 裡搞定。
