---
layout: ../../layouts/PostLayout.astro
title: 為什麼沒有 Pythonmon？Python 自動重啟的土炮之路
date: 2026-01-13T05:45
description: Electron 有 electronmon，Node 有 nodemon，那 Python 呢？
tags:
  - Python
  - 開發工具
  - DX
---

剛在 Electron 專案裝了 electronmon，改 main.js 會自動重啟，爽度直接提升一個檔次。

然後我看了一眼旁邊的 Python 後端。

每次改 `sherpa_server.py`，都要手動 Ctrl+C 再重跑。為什麼沒有 pythonmon？

## 其實有，但散落各處

Node.js 生態圈有 nodemon，Electron 有 electronmon，那 Python 呢？

其實有，但不是一個統一的工具，而是散落在各種框架裡：

| 框架 | 自動重載方式 |
|------|-------------|
| Flask | `flask run --reload` 或 `--debug` |
| Django | 內建，開發模式自動啟用 |
| FastAPI | `uvicorn --reload` |
| 純 Python | ...自己想辦法 |

如果你用的是 Flask、Django、FastAPI 這些 Web 框架，它們都內建了開發模式的自動重載。

但如果是純 Python 腳本呢？像我這個 sherpa_server.py，它是一個獨立的 JSON-RPC 服務，不是 Web 框架。

## 土炮方案

原理跟 electronmon 一樣：監聽檔案、殺進程、重啟。

```python
# watch_python.py
import subprocess
import sys
from watchfiles import watch

def run_server():
    return subprocess.Popen([sys.executable, 'sherpa_server.py'])

process = run_server()

for changes in watch('.', watch_filter=lambda _, path: path.endswith('.py')):
    print(f'檔案變更: {changes}，重啟服務...')
    process.kill()
    process.wait()
    process = run_server()
```

用 `watchfiles`（以前叫 watchgod）監聽 `.py` 檔案變化，有變化就殺掉重啟。

裝 watchfiles：

```bash
pip install watchfiles
```

然後跑 `python watch_python.py` 而不是直接跑 `python sherpa_server.py`。

## 為什麼沒有統一的 pythonmon？

想了一下，大概幾個原因：

**1. Web 框架都自己做了**

Flask、Django、FastAPI 的使用者佔大多數，它們都內建了，所以需求沒那麼強烈。

**2. Python 腳本通常是一次性的**

很多 Python 腳本跑完就結束了，不像 Node.js 那樣常駐。需要常駐的通常是 Web 服務，而 Web 框架已經處理了。

**3. 模組熱重載的複雜度**

Node.js 的 require cache 相對好清理，但 Python 的 import 系統比較複雜，模組之間的依賴關係、類別實例的狀態，要做到真正的熱重載很麻煩。所以大家乾脆重啟整個進程。

## 現成的替代方案

除了自己寫，還有幾個選擇：

### 1. watchfiles CLI

watchfiles 本身就有 CLI：

```bash
watchfiles "python sherpa_server.py"
```

簡單暴力，檔案變了就重跑整個指令。

### 2. nodemon（沒錯，就是那個 nodemon）

nodemon 其實可以跑任何指令，不只 Node.js：

```bash
nodemon --exec python sherpa_server.py --ext py
```

`--exec` 指定要跑的指令，`--ext` 指定要監聽的副檔名。

### 3. watchmedo（watchdog 的 CLI）

```bash
pip install watchdog
watchmedo auto-restart --pattern="*.py" -- python sherpa_server.py
```

## 我的選擇

最後我選了 **nodemon**，因為：

1. 已經裝了（開發 Electron 本來就有 Node 環境）
2. 設定簡單，一行搞定
3. 跨專案通用，不只 Python

在 `package.json` 加一個 script：

```json
{
  "scripts": {
    "dev:python": "nodemon --exec python sherpa_server.py --ext py"
  }
}
```

現在改 Python 也會自動重啟了。

## 小結

| 情境 | 推薦方案 |
|------|---------|
| Flask / Django / FastAPI | 內建的 `--reload` |
| 純 Python + 有 Node 環境 | nodemon |
| 純 Python + 無 Node | watchfiles CLI |
| 想自己控制邏輯 | 土炮 watchfiles 腳本 |

Python 沒有統一的 pythonmon，但有很多方式達到一樣的效果。選一個適合你的就好。

## 那...要不要自己寫一個？

說實話，有點心癢。

分析一下：

**自幹的好處：**
- 可以針對自己的需求客製化（比如只監聽特定目錄）
- 可以整合到現有的開發流程
- 學習 watchfiles / watchdog 的 API
- 寫完可以開源，說不定有人需要

**不自幹的理由：**
- nodemon 已經夠用了
- 維護成本（跨平台、邊界情況處理）
- 重複造輪子

現階段我選擇用 nodemon 先頂著，畢竟專案還有一堆事要做。

但如果哪天閒下來，說不定會寫一個真正的 `pythonmon`——一個專門給 Python 用的、零配置的自動重啟工具。就像 nodemon 之於 Node.js，electronmon 之於 Electron。

真的寫出來的話，記得來 star 一下。
