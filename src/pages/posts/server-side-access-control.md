---
layout: ../../layouts/PostLayout.astro
title: 登入牆要擋在伺服器，不是畫面
date: 2026-11-19T23:40
description: 只有管理員能用的頁面，驗證為什麼擋三層、為什麼不能只擋畫面。
tags:
  - 觀念
  - 資安
  - Node.js
interactive: true
---
做一個只有平台管理員能用的工具頁，我把驗證寫成一個小函式，卻擋在三個地方：頁面、每個後端動作、圖片上傳。多擋不是囉嗦，是因為少擋一個就等於沒擋。

重點是一個很多人會寫錯的觀念：**能不能做，只能在伺服器判斷，不能靠畫面。**

畫面（前端 React）跑在訪客自己的瀏覽器裡，訪客想改就能改。只在畫面上「不是管理員就不顯示按鈕」，按鈕是不見了，但後面的入口還開著——懂的人不用按鈕，直接對入口送請求，照樣能做。所以「誰能用」一定要在訪客碰不到的地方判斷，那就是伺服器。

守門函式只做三件事：先拿登入憑證去問認證系統「這是誰」（不是相信瀏覽器自己說自己是誰），再拿帳號 ID 比對一份只存在伺服器、瀏覽器看不到的名單，過了才把確認過的 ID 交出去。名單沒設時是「沒有人是管理員」，不是「人人都過」；用帳號 ID 不用 Email，因為 Email 會變。

為什麼每個後端動作都要自己驗一次？因為 `"use server"` 的函式同時也是外面打得到的入口，不經過頁面也能直接呼叫。第 1 層頁面只擋「看不看得到畫面」，第 2、3 層才是真的門鎖。

同場加映這幾篇觀念相近的：[CORS 為什麼擋掉你的請求](./cors-why-browser-blocks-your-request)、[session cookie:HTTP 是無狀態的](./session-cookie-http-is-stateless)。

下面的互動版可以換身分（沒登入／一般會員／管理員）親手試，看三層各自怎麼回應。

<p style="margin:1.5em 0"><a href="/EverNote/w/server-side-access-control/" style="display:inline-block;padding:0.7em 1.4em;border-radius:8px;background:var(--text-primary,#222);color:var(--bg-primary,#fff);text-decoration:none;font-weight:600">▶ 打開互動拆解</a></p>
