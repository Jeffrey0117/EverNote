---
layout: ../../layouts/PostLayout.astro
title: 用 Google Sheets 當免費資料庫，繞過一堆認證地獄
date: 2026-01-13T08:18
description: 不想付錢、不想搞 OAuth、只想把資料丟進 Google Sheets？用 Apps Script 當跳板就對了
tags:
  - Google Apps Script
  - API
---

我之前做了一個短網址工具，有個功能是讓使用者把連結資料匯出到 Google Sheets。

聽起來很簡單對吧？就是把資料寫進 Google Sheets 而已。

結果我一查 Google Sheets API，差點沒吐血。

要用 OAuth 2.0 讓使用者登入授權，或是開一個 Service Account，然後去 Google Cloud Console 開專案、建憑證、設定 scope、處理 token refresh。光是認證流程的文件就寫了十幾頁，我看到一半就關掉了。

我只是想把資料塞進一個表格欸，有需要搞這麼複雜嗎？

然後我想起以前寫過一個 Apps Script，用來自動整理 Gmail。那時候發現它可以發布成 Web App，讓外部直接呼叫。

等等，這不就是我要的嗎？

## Apps Script 是什麼

[Google Apps Script](https://developers.google.com/apps-script) 是 Google 的腳本平台，用的是 JavaScript（其實是 V8 引擎跑的），可以直接操作 Google 服務。

重點是它可以發布成一個 Web App。**發布完會給你一個 HTTPS 網址，任何人都能 POST 資料過去。**

這意味著你的應用不用處理任何認證，只要 `fetch` 那個 URL 就好。

聽起來很美好，但魔鬼在細節裡。

## doPost 是怎麼運作的

當你把 Apps Script 發布成 Web App，Google 會建立一個 HTTPS endpoint。當有人對這個 URL 發 GET 請求，會觸發你寫的 `doGet` function；發 POST 請求，會觸發 `doPost`。

`doPost` 會收到一個 event 物件 `e`，裡面的 `e.postData.contents` 就是 request body 的原始字串：

```javascript
function doPost(e) {
  // e.postData.contents 是字串，要自己 parse
  const data = JSON.parse(e.postData.contents);

  // 現在 data 就是你 POST 過來的 JSON 物件
  console.log(data.rows);
}
```

要回傳東西給 client，不能直接 `return { success: true }`，要用 `ContentService`：

```javascript
return ContentService
  .createTextOutput(JSON.stringify({ success: true }))
  .setMimeType(ContentService.MimeType.JSON);
```

為什麼這麼囉唆？因為 Apps Script 的回傳值要指定 MIME type，不然 client 收到的會是純文字不是 JSON。這是我踩過的坑，debug 半天才發現 `response.json()` 一直報錯是因為 Content-Type 不對。

## 寫入 Google Sheets

拿到資料之後，用 `SpreadsheetApp` 寫入：

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);

  data.rows.forEach(row => {
    // appendRow 會在最後一行之後新增一行
    sheet.appendRow([row.date, row.title, row.url]);
  });

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, count: data.rows.length }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

`getActiveSpreadsheet()` 會拿到這個 Apps Script 綁定的試算表。對，Apps Script 可以「綁定」在某個 Google Sheet 上，從那個 Sheet 的選單進去（擴充功能 → Apps Script），寫的 script 就會自動綁定。

## 發布的眉角

寫完之後要部署。點「部署」→「新增部署」→ 類型選「網頁應用程式」。

這邊有兩個設定很重要：

**執行身分**：選「我」。這樣不管誰呼叫這個 Web App，都是用你的身分去執行。如果選「存取網頁應用程式的使用者」，呼叫者要先登入 Google，那就失去意義了。

**誰可以存取**：選「任何人」。這樣不用登入也能呼叫。

部署完會給你一個 URL：

```
https://script.google.com/macros/s/AKfycbxXXXXX.../exec
```

每次改 code 要重新部署才會生效。而且每次部署會產生新版本，舊版本的 URL 還是指向舊 code。我一開始不知道這件事，改了 code 測半天都沒反應，崩潰。

## 但這樣不是很不安全嗎

對，超不安全。任何人拿到 URL 就能 POST 資料進你的 Sheet。

所以我加了一個簡單的 token 檢查：

```javascript
const SECRET_TOKEN = 'your-secret-token-here';

function doPost(e) {
  const data = JSON.parse(e.postData.contents);

  // 驗證 token
  if (data.token !== SECRET_TOKEN) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // token 正確，繼續處理...
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  data.rows.forEach(row => {
    sheet.appendRow([row.date, row.title, row.url]);
  });

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

client 那邊就是在 body 多帶一個 `token`：

```typescript
await fetch(WEBAPP_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: 'your-secret-token-here',
    rows: [{ date: '2026-01-13', title: '測試', url: 'https://example.com' }]
  })
});
```

這不是什麼高強度的安全措施，token 寫死在 code 裡，有心人還是能從前端 JS 挖出來。但至少能擋掉亂掃的機器人，對於內部工具來說夠用了。

真的要保護敏感資料，還是乖乖去搞正規的 OAuth。

## 速度和配額

Apps Script 有冷啟動問題。如果一段時間沒人呼叫，下次呼叫時系統要花幾秒把環境「喚醒」，使用者會感覺卡卡的。

不過對於「存資料」這種不需要即時回應的操作，幾秒延遲根本不是問題。

配額的話，免費帳號每天可以執行約 20,000 次（[官方文件](https://developers.google.com/apps-script/guides/services/quotas)）。我那個短網址工具一天頂多幾百筆匯出，根本用不完。

## 什麼時候不該用這招

如果你要做的是即時聊天室、每秒寫入幾十筆的那種，Apps Script 撐不住，去用 Firebase。

如果你的資料有敏感個資，不能冒險被亂 POST，去搞正規的 API 認證。

如果你要做複雜查詢、關聯多個表，Google Sheets 根本不是設計來做這個的，去用 PostgreSQL。

但如果只是「我想把一些資料丟進 Sheet 備份一下」？這招完全夠用。

---

本來以為要搞半天的 Google Sheets 整合，用 Apps Script 繞一圈，一個小時就搞定了。

現在短網址工具的使用者，點一下按鈕就能把連結匯出到自己的 Sheet。每個人用自己的 Apps Script，資料存在自己的 Google 帳號，乾乾淨淨。

下次要接 Google 服務，別急著開 Google Cloud Console。先問自己：我真的需要那套認證流程嗎？

大部分時候，答案是不用。
