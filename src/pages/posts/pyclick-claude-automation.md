---
layout: ../../layouts/PostLayout.astro
title: 別再用 --dangerously-skip-permissions！我寫了個 PyClick 自動點掉 Claude 確認框
date: 2026-01-16T07:25
description: Claude Code 一直跳確認框很煩，但完全跳過權限檢查又太危險。所以我寫了一個小工具，用圖像辨識看到提示才點，既安全又省事。
tags:
  - Python
  - OpenCV
  - Claude Code
  - 自動化
---

最近在用 `claude-code-cli` 時，一直被一個問題困擾。

每次它要執行敏感操作（例如讀寫檔案、執行命令）時，都會彈出一個確認提示框，問你「你確定嗎？」

這設計本身是好的，很安全。

但當你一次要處理幾十個檔案，這個提示框就會一直跳出來，點到手痠，超級煩。

## 官方解法：一個危險的選項

官方提供了一個解法：`--dangerously-skip-permissions`。

光看名字就知道這不是什麼好東西。

它的作用是「完全跳過」所有權限檢查，讓 `claude-code-cli` 擁有完全的權限，想幹嘛就幹嘛。

雖然方便，但這也意味著如果 AI 的判斷出錯，它可能會刪除不該刪的檔案，或執行惡意指令。

這個選項太危險了，我不敢用。

## 難道只能手動點嗎？

在安全和方便之間，我陷入了兩難。

手動點擊太累，完全跳過又太危險。

我就在想，有沒有一個折衷的辦法？一個既能自動化，又不會完全放棄安全性的方法。

然後我發現，這兩種方法的本質區別在於：

- **手動點擊**：看到提示框 -> 理解內容 -> 點擊同意。
- **`--dangerously-skip`**：根本不看，直接同意所有事。

關鍵就在「看到」這一步。如果我能讓程式「看到」提示框再點，不就跟手動點擊一樣安全了嗎？

## 所以我做了 PyClick

於是，我用 [Python](https://www.python.org/) 和 [OpenCV](https://opencv.org/) 寫了一個小工具：[PyClick](https://github.com/Jeffrey0117/PyClick)。

它的原理很簡單：

1.  **持續監控螢幕**：用圖像辨識技術，不斷在螢幕上尋找跟提示框長得一樣的圖片。
2.  **偵測到就點擊**：一旦找到，就用 [pyautogui](https://pyautogui.readthedocs.io/en/latest/) 模擬滑鼠，自動移過去點兩下，再補一個 Enter。

這個方法的核心精神是「看到才點」，而不是「盲目同意」。

### 設定檔決定怎麼點

你可以用一個 JSON 檔來設定它的行為，非常簡單。

腳本設定（`cli-auto-accept.json`）：

```json
{
  "template_paths": ["...template_20260113_004120.png"],
  "click_count": 2,
  "click_interval": 0.5,
  "after_key": "Enter",
  "auto_interval": 2.0,
  "threshold": 0.7
}
```

- `template_paths`: 你的提示框長什麼樣子（截圖）。
- `click_count`: 要點幾下。
- `after_key`: 點完後要不要按鍵盤，例如 `Enter`。
- `threshold`: 圖像辨識的相似度要多高才算找到。

### 不只是點擊，還能量化

在開發過程中，我加了一個有趣的小功能：點擊計數。

點擊計數（`tray_clicker.py`）：

```python
self.total_clicks = 0      # 本次啟動點擊計數
self.lifetime_clicks = 0   # 累計總點擊次數

def increment_click_count(self, count=1):
    self.total_clicks += count
    self.lifetime_clicks += count
    if self.total_clicks % 10 == 0:
        self.save_config()  # 每 10 次儲存一次
```

我突然意識到，這個工具不僅能幫我省下點擊的力氣，還能幫我「量化」Claude Code 到底問了我幾次問題。

這讓我對 AI 的行為有了更深入的了解。

## 真正的自動化，不是「全部跳過」

經過這次踩坑，我學到一件事：**自動化不一定要「全部跳過」**。

用圖像辨識的好處是：

1.  **有提示才點，沒提示不點**：跟手動點擊一樣，只在需要時才動作，兼顧了安全與效率。
2.  **可以統計點擊次數**：量化 AI 的行為，讓你知道它在背後到底做了多少事。
3.  **比完全跳過更有彈性**：我可以隨時暫停或停止腳本，重新拿回控制權。

### 未來的可能性

有了這些點擊統計數據，我甚至可以開始分析：在執行不同類型的任務時（例如「寫測試」 vs 「重構程式碼」），Claude Code 需要確認的次數有什麼不同？

這讓一個單純的偷懶小工具，變得有了一點研究價值。

沒想到自己弄了個按鍵精靈出來。小時候玩遊戲超想要這種東西，現在居然可以自己做一個，還挺有成就感的。

---

這個專案還在早期階段，如果你也有類似的煩惱，歡迎來看看。

GitHub Repo: [https://github.com/Jeffrey0117/PyClick](https://github.com/Jeffrey0117/PyClick)
