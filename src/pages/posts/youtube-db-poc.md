---
layout: ../../layouts/PostLayout.astro
title: 用 YouTube Playlist 當 NoSQL 資料庫
date: 2026-01-12T23:50
description: 一個異想天開的 POC，把 YouTube 當免費雲端資料庫來薅
tags:
  - React
  - YouTube API
---

我之前在搞一些 side project。

每次做到要存資料的時候就很煩。Firebase 免費額度不夠用，Supabase 要綁信用卡，自己架 PostgreSQL 又太重。

搞了幾個專案，每次都卡在「資料要存哪」這個問題。

然後某天我在整理 YouTube 播放清單的時候，盯著那個描述欄位發呆。

突然想到一件事。

**這個欄位可以寫 5000 個字欸。**

## 等等，這不就是免費的雲端儲存嗎

你想想看 YouTube 提供了什麼：

- 上傳影片，**免費**
- 每部影片有標題、描述欄位
- 播放清單可以無限建
- 有完整的 [YouTube Data API](https://developers.google.com/youtube/v3) 可以 CRUD

然後我就開始歪腦筋了。

播放清單不就是資料表嗎？每部影片就是一筆記錄，描述欄位塞 JSON 就是你的資料。

越想越北爛，**所以我一定要把它做出來。**

## 先看看其他免費方案有多爛

在動手之前，我先盤點了一下現有的免費資料庫方案：

| 方案 | 免費額度 | 問題 |
|------|----------|------|
| [Firebase Firestore](https://firebase.google.com/pricing) | 1GB 儲存、50K 讀/天 | 讀寫次數限制很容易爆 |
| [Supabase](https://supabase.com/pricing) | 500MB、專案會暫停 | 7 天沒活動就暫停，要手動喚醒 |
| [PlanetScale](https://planetscale.com/pricing) | 已取消免費方案 | 沒了 |
| [GitHub Gist](https://gist.github.com/) | 無限 | API 難用，沒辦法 query |
| [Google Sheets](https://developers.google.com/sheets/api) | 無限 | 速度慢，資料結構受限 |

每個都有毛病。不是額度不夠，就是用起來很麻煩。

然後 YouTube 呢？

- 儲存空間：**無限**（至少目前是）
- API 配額：每天 10,000 單位，夠用
- 會不會被停：只要不違反 ToS，不會

聽起來很香對吧。

## 所以我就真的做了一個

花了幾天，用 React + TypeScript 刻了一個管理介面出來。

### 新增資料的時候發生什麼事

當你按下「新增記錄」，背後會：

1. 產生一個 1 秒的黑畫面 WebM 影片（超小，只有幾 KB）
2. 用 [Resumable Upload API](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol) 上傳到 YouTube
3. 把你的 JSON 資料塞進影片描述
4. 把影片加到對應的 Playlist

```typescript
const metadata = {
  snippet: {
    title: record.id,
    description: JSON.stringify(record), // 資料就存這裡
    categoryId: '22',
  },
  status: { privacyStatus: 'unlisted' }, // 不公開
};
```

對，每新增一筆資料，就是上傳一部影片。

很北爛，但 it works。

### 讀取的時候怎麼辦

讀取就是反過來。把 Playlist 裡的影片撈出來，parse 描述欄位：

```typescript
const items = await getPlaylistItems(token, playlistId);

return items.map(item => {
  const data = JSON.parse(item.snippet.description);
  return {
    id: item.snippet.title,
    ...data,
  };
});
```

YouTube API 一次最多回傳 50 筆，所以要處理分頁。這部分用 `pageToken` 迴圈處理就好。

### 網路爛的時候會怎樣

一開始沒處理，網路一斷就整個掛掉。

後來加了重試機制，用指數退避：

```typescript
async function fetchWithRetry(url, options, { maxRetries = 3 } = {}) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status >= 500 || response.status === 429) {
        // 伺服器錯誤或被限流，等一下再試
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }
      return response;
    } catch (error) {
      if (attempt < maxRetries - 1) {
        await sleep(1000 * Math.pow(2, attempt));
      } else {
        throw error;
      }
    }
  }
}
```

429 是 YouTube 跟你說「你太頻繁了」，這時候就要退後重試。

## 這東西潛力其實無敵的吧

目前還有一些可以補強的地方：

1. **速度很慢**：上傳一部影片要等 YouTube 處理，少說 5-10 秒，這算什麼鬼資料庫
2. **沒有 index**：要搜尋就是全撈出來在前端 filter，資料量一大就爆炸
3. **沒有 transaction**：兩個人同時改同一筆，誰後面誰贏，沒有鎖
4. **配額會用完**：YouTube API 每天 10,000 單位，高頻操作會撞牆
5. **Google 可能會 ban 你**：這種用法很明顯不是 YouTube 預期的，哪天被發現搞不好就掰了

但反過來想，這些都是可以繼續玩的方向。

## 不乖乖用就是爽

這個專案本來就不是要拿來 production 用的。

它就是一個 POC，一個「我想證明這個北爛想法可以動」的實驗。

而且說真的，做完之後有一種奇怪的成就感。

以前都是乖乖用別人設計好的服務，Firebase 叫你怎麼用就怎麼用，Supabase 說什麼就是什麼。

這次反過來，把一個影音平台硬掰成資料庫。沒想到吧，這種鬼操作就是 side project 無限的靈感來源。

---

其實還有很多可以聊的，像是：

- **OAuth 流程** — Google 登入那套搞起來也是一堆坑
- **React Query 怎麼接** — 用 mutation 處理 CRUD 的 pattern
- **批次刪除怎麼不會 race condition** — 順序執行 + 節流

反正，**免費的東西就是要榨乾啊，不然你以為我很有錢喔？**
