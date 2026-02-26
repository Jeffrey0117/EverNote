---
layout: ../../layouts/PostLayout.astro
title: "AI 寫的登入頁面，讓我學到了什麼叫「哭笑不得」"
date: "2026-01-16T06:22"
description: "記錄一次與 AI 協作開發時，它在一個簡單的登入頁面上犯下的三個低級但關鍵的錯誤，以及我最終如何收拾殘局。"
tags: [AI, Claude, Web-Development, Debugging, WTF]
---

我最近在弄一個專案的後台 admin 頁面。
心想這不是個體力活嗎，乾脆叫 Claude 幫我寫。
一個簡單的 HTML，包含登入表單和登入成功後顯示的 dashboard。
聽起來很簡單吧。
結果，我被它連續耍了三次，真是受夠了。

第一個錯誤，最經典的。
AI 給我的 `admin.html` 放在專案的根目錄，但我的伺服器路由是 `/` 會導向用戶首頁，`/_admin` 才會顯示這個後台頁面。
它寫的 CSS 引用是 `<link rel="stylesheet" href="style.css">`。
頁面在 `/_admin`，瀏覽器自然就去請求 `/_admin/style.css`。
想當然，404。
整個頁面完全沒有樣式，醜到我以為回到 1999 年。
我嘆了口氣，手動改成 `/style.css`。
很煩，但只是小問題。
我天真地以為這樣就結束了。

第二個錯誤更讓我無語。
改好 CSS 路徑後，樣式是載入了，但畫面整個爛掉。
登入表單和登入後才應該出現的 Dashboard，竟然同時擠在畫面上。
我去看 AI 寫的 CSS。
它很「聰明」地定義了 `.login-screen.hidden` 和 `.upload-zone.hidden` 這種特定的 class 來隱藏元素。
但我登入後要隱藏的是整個 container，上面掛的 class 是 `.container`。
所以 JavaScript 執行 `.classList.add('hidden')` 後，`div` 變成了 `.container.hidden`。
這個 selector，CSS 裡根本沒有定義。
AI 啊，你寫程式都不考慮通用性的嗎。
一個通用的 `.hidden { display: none !important; }` class 不是基本操作嗎。

我真的開始懷疑人生了，但還是耐著性子把 CSS 改了。
現在畫面總算正常了。
我輸入密碼，按下登入按鈕。
然後... 什麼事都沒發生。
按鈕按到滑鼠都快壞了，就是沒反應。
這就是第三個，也是壓垮我的最後一根稻草。
它的 JS 放在外部檔案 `<script src="/app.js"></script>`。
我猜可能是瀏覽器快取，或是什麼鬼的執行順序問題。
總之，`onclick` 事件完全沒綁上去。

我受夠了。
我不想再跟它玩這種「你寫 bug，我來 debug」的遊戲了。
我直接打開 `admin.html`，把 `/style.css` 的內容全部複製貼到 `<style>` 標籤裡。
然後再把 `/app.js` 的內容全部複製貼到 `<script>` 標籤裡。
一個檔案搞定。
沒有外部請求，沒有路徑問題，沒有快取問題。
頁面終於正常運作了。

早該這樣了。
一個自給自足的單頁面 admin panel，搞這麼多外部依賴幹嘛。
這次經驗告訴我，AI 是個很好的助手，但你永遠不能完全信任它。
你得像個監工一樣，盯著它做的每一步，不然它隨時會給你「驚喜」。
而多數時候，你一點都不會想收到那種驚喜。
