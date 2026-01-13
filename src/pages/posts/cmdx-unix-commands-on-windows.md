---
layout: ../../layouts/PostLayout.astro
title: 在 Windows 上跑 Unix 指令不用裝 WSL
date: 2026-01-13T15:30
description: 用宣告式 JSON 設定檔產生 batch 檔，在 cmd.exe 直接打 ls、cat、grep
tags:
  - Python
  - Windows
  - CLI
---

## 故事的開始：一台樹莓派

有一天，我買了一台樹莓派。

接上螢幕、插上電源，看著黑底白字的終端機畫面，我輸入了人生第一個 Linux 指令：

```bash
ls
```

目錄列出來了。

接著試了 `cat`、`grep`、`pwd`⋯⋯這些指令在 Linux 上如此自然。

後來我又接觸了 macOS，發現這些指令居然也通用。

原來，**它們都屬於 Unix 家族**——Linux、macOS、BSD 都共享這套指令系統。

## Unix vs Windows：兩個世界的指令

回到 Windows，打開命令提示字元，我習慣性地輸入 `ls`：

```
'ls' is not recognized as an internal or external command
```

欸？

原來 Windows 有自己的一套指令系統，跟 Unix 完全不同：

| 你想做的事 | Unix 指令 | Windows 指令 |
|-----------|----------|-------------|
| 列出檔案 | `ls` | `dir` |
| 顯示檔案內容 | `cat` | `type` |
| 搜尋文字 | `grep` | `findstr` |
| 複製檔案 | `cp` | `copy` |
| 移動/重命名 | `mv` | `move` |
| 刪除檔案 | `rm` | `del` |
| 顯示當前目錄 | `pwd` | `cd`（不帶參數）|
| 清除畫面 | `clear` | `cls` |

**兩套系統，兩種語言。**

如果你同時使用 Linux 和 Windows，腦袋就得不斷切換。

## 發現 WSL，但⋯⋯

後來我發現了 WSL（Windows Subsystem for Linux），可以在 Windows 裡跑 Linux！

問題解決了嗎？沒有。

WSL 是一個**完整的 Linux 環境**，意味著你需要：

- 切換到 WSL 終端
- 在兩個檔案系統間轉換路徑（`/mnt/c/Users/...` vs `C:\Users\...`）
- 處理 Windows 程式和 Linux 程式的互通問題

**我只是想打個 `ls`，不是想開另一台電腦。**

## 痛點：肌肉記憶 vs 現實

真正的痛點是這樣的。

當你習慣了 Unix 指令，手指會自動輸入：

```bash
ls -la              # 想看詳細檔案列表 → Windows 不認識
cat README.md       # 想快速看檔案 → Windows 要用 type
grep "error" log    # 想搜尋錯誤訊息 → Windows 要用 findstr
rm *.tmp            # 想刪除暫存檔 → Windows 要用 del
```

每一次，手打完，螢幕出現紅字錯誤，才想起：「啊，這是 Windows。」

然後嘆口氣，把指令改成 Windows 版本。

**日復一日，這個摩擦成本累積起來，相當煩人。**

## 傳統做法的問題

最直覺的解法是自己寫一堆 `.bat` 檔案，像是：

```batch
@echo off
dir %*
```

存成 `ls.bat`，放進 PATH，搞定。

但問題來了：

1. **維護地獄** — 幾十個 `.bat` 檔散落各處，改一個邏輯要開一堆檔案
2. **沒有智慧降級** — 如果我裝了 `eza` 這種現代化工具，我希望優先用它
3. **無法一目瞭然** — 哪些指令有對應？對應到什麼？要一個一個打開看

## 解法：宣告式的指令對應引擎

cmdx 的核心概念很簡單：**一份 JSON 設定檔，編譯成多個 batch 檔**。

```
┌─────────────────┐      ┌──────────────┐      ┌─────────────────┐
│  commands.json  │  →   │  generate.py │  →   │   out/*.bat     │
│   (設定檔)      │      │   (編譯器)    │      │   (執行檔)      │
└─────────────────┘      └──────────────┘      └─────────────────┘
```

設定長這樣：

```json
{
  "ls": {
    "prefer": ["yazi", "lsd", "eza"],
    "fallback": "dir",
    "description": "List directory contents"
  },
  "cat": {
    "prefer": ["bat"],
    "fallback": "type",
    "description": "Display file contents"
  }
}
```

這份設定同時是：

- **執行邏輯** — 定義優先順序和降級策略
- **文件** — 一眼看懂所有對應關係

產生的 `ls.bat` 會自動檢查 `yazi`、`lsd`、`eza` 是否存在，找到第一個可用的就執行，都沒有就用 Windows 原生的 `dir`。

## 使用方式

```bash
# 產生所有 batch 檔
python generate.py

# 把 out 資料夾加入 PATH

# 完成！直接用
ls           # 自動選擇最佳工具
cat file.txt # 有裝 bat 就用 bat，沒有就用 type
grep text    # 有裝 ripgrep 就用 rg，沒有就用 findstr
```

## 設計哲學

這個專案刻意保持極簡：

- **只有兩個核心檔案** — `commands.json` 和 `generate.py`
- **產物可拋棄** — 刪掉 `out/` 資料夾，重新執行就好
- **零執行依賴** — 產生的 `.bat` 檔不需要 Python

最喜歡的是這句話：

> *Come back in 10 years. Understand it in 10 seconds.*

十年後回來看，十秒鐘就能搞懂。

## 反過來呢？姊妹專案 wcmd

當然，也有人是相反的情況：**從 Windows 轉到 Linux，卻一直想打 `dir`、`cls`、`type`。**

所以我做了姊妹專案：

| 專案 | 解決的問題 |
|-----|-----------|
| [cmdx](https://github.com/Jeffrey0117/cmdx) | 在 Windows 上使用 Unix 指令 |
| [wcmd](https://github.com/Jeffrey0117/wcmd) | 在 Linux 上使用 Windows 指令 |

同樣的設計哲學，同樣的解決方式，只是方向相反。

無論你從哪個系統來，都能用熟悉的方式工作。

## 小結

cmdx 解決的問題很小，但解法很優雅：

| 傳統做法 | cmdx |
|---------|------|
| 手寫幾十個 `.bat` | 一份 `commands.json` |
| 改邏輯要改 code | 只改資料 |
| 散落各處難維護 | 集中管理 |

如果你也常在 Windows 和 Unix 之間切換，又不想搞 WSL 或 Git Bash 這麼重的東西，這個小工具值得一試。
