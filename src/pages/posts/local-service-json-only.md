---
layout: ../../layouts/PostLayout.astro
title: 網頁顯示失敗，伺服器卻已經照做了：本機服務為什麼只收 JSON
date: 2026-11-20T00:03
description: 瀏覽器擋的是讀回應不是送出去。用真的瀏覽器實測，講清楚預檢是什麼，以及會改東西的本機服務為什麼只收 JSON。
tags:
  - 資安
  - 觀念
  - Node.js
interactive: true
---
我寫了一個跑在自己電腦上的小服務，它會改硬碟裡的檔案。只聽本機聽起來很安全，但你開的任何一個網頁，都能對它送請求。

這篇拆三個觀念：

1. **瀏覽器擋的是「讀回應」，不是「送出去」。** 表單送得出來的那種請求，瀏覽器照樣放行，只是不讓網頁讀回應。對會改東西的服務來說，請求送到的那一刻就已經做完了。
2. **不像表單的請求，瀏覽器會先問。** JSON 不是表單送得出來的格式，所以網頁要送 JSON 一定要先經過預檢，伺服器沒回答可以就不會送。
3. **所以伺服器只收 JSON，而且不回答預檢。** 純文字送得到但不收，JSON 根本送不出來，兩條路都斷。

頁面裡有一個小實驗：選誰送、用什麼格式、伺服器怎麼寫，看請求走到哪一步、檔案最後有沒有被改。另外附上用真的瀏覽器跑出來的結果：五次網頁看到的都是同一句 `Failed to fetch`，但其中一次伺服器其實已經照做了。

<p style="margin:1.5em 0"><a href="/EverNote/w/local-service-json-only/" style="display:inline-block;padding:0.7em 1.4em;border-radius:8px;background:var(--text-primary,#222);color:var(--bg-primary,#fff);text-decoration:none;font-weight:600">▶ 打開互動拆解</a></p>
