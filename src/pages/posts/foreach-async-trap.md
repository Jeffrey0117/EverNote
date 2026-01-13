---
layout: ../../layouts/PostLayout.astro
title: forEach 配 async 是個陷阱
date: 2026-01-14T01:08
description: 批次刪除 100 筆資料，結果只刪了 3 筆，問題出在哪？
tags:
  - JavaScript
  - TypeScript
  - React
---

在做 YouTube DB 的批次刪除功能時，踩了一個經典的坑。

寫了一個「全部刪除」的功能，選了 100 筆資料按下去，結果只刪了 3 筆。

剩下 97 筆還在那邊嘲笑我。

## 問題程式碼

一開始的寫法很直覺：

```typescript
async function deleteAll(ids: string[]) {
  ids.forEach(async (id) => {
    await deleteRecord(token, id);
  });
  console.log('刪除完成！');
}
```

看起來沒毛病對吧？

`forEach` 跑每一個 id，`await` 等 API 回來，最後印「刪除完成」。

**但這段程式碼根本沒有在等。**

## forEach 不管你的 await

問題在於 `forEach` 這個方法的設計。

看一下 `forEach` 的簽名：

```typescript
forEach(callbackfn: (value: T) => void): void
```

注意回傳值是 `void`。

它不管你 callback 回傳什麼，就算你回傳 Promise 也一樣，直接丟掉。

所以當你寫：

```typescript
ids.forEach(async (id) => {
  await deleteRecord(token, id);
});
```

實際上發生的事情是：

1. `forEach` 開始跑迴圈
2. 第一個 iteration，呼叫 `async (id) => ...`，拿到一個 Promise
3. `forEach` 不管這個 Promise，直接跑下一個 iteration
4. 重複步驟 2-3，瞬間發射 100 個 API 請求
5. `forEach` 跑完，繼續執行後面的程式碼
6. 100 個請求同時在背景跑，互相踩來踩去

結果就是：API 被打爆、rate limit 被觸發、資料刪到一半就噴錯。

## 更直觀的理解方式

把 `forEach` 換成 `for` 迴圈，你就知道問題在哪了：

```typescript
// 這段程式碼等價於上面的 forEach
for (const id of ids) {
  // 注意這邊沒有 await
  deleteRecord(token, id); // Promise 被忽略
}
console.log('刪除完成！'); // 馬上就印了
```

你的 `await` 只是在 callback function 裡面等，但外層的 `forEach` 根本不等你。

## 換成 for...of 就沒事了

最簡單的修法就是用 `for...of`：

```typescript
async function deleteAll(ids: string[]) {
  for (const id of ids) {
    await deleteRecord(token, id);
  }
  console.log('刪除完成！');
}
```

這樣每個刪除操作會等前一個完成才繼續，不會同時發射一堆請求。

## 真實世界還要加這些

在 YouTube DB 專案裡，我需要：

1. 讓使用者知道刪除進度
2. 每個請求之間加一點延遲，避免被 YouTube API 限流
3. 記錄哪些成功、哪些失敗

最後的實作長這樣：

```typescript
export async function deleteRecordsBatch(
  accessToken: string,
  playlistItemIds: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  for (let i = 0; i < playlistItemIds.length; i++) {
    try {
      await deleteRecord(accessToken, playlistItemIds[i]);
      success.push(playlistItemIds[i]);
    } catch (error) {
      failed.push(playlistItemIds[i]);
    }

    // 回報進度
    onProgress?.(i + 1, playlistItemIds.length);

    // 節流：每次請求之間等 100ms
    if (i < playlistItemIds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return { success, failed };
}
```

重點：

- **順序執行**：用 `for` 迴圈 + `await`，確保一個完成再下一個
- **進度回報**：`onProgress` callback 讓 UI 可以顯示進度條
- **節流控制**：每個請求之間等 100ms，避免觸發 rate limit
- **錯誤追蹤**：分開記錄成功和失敗的 id，方便後續處理

## 還有其他招

除了 `for...of`，還有幾種做法：

### Promise.all（全部同時跑）

```typescript
await Promise.all(ids.map(id => deleteRecord(token, id)));
```

所有請求同時發出去，全部完成才繼續。

快，但容易撞 rate limit。

### for await...of（搭配 async generator）

```typescript
async function* deleteGenerator(ids: string[]) {
  for (const id of ids) {
    yield deleteRecord(token, id);
  }
}

for await (const result of deleteGenerator(ids)) {
  console.log(result);
}
```

比較少用，但在處理串流資料時很方便。

### reduce 串接 Promise

```typescript
await ids.reduce(async (prev, id) => {
  await prev;
  return deleteRecord(token, id);
}, Promise.resolve());
```

functional programming 的寫法，但可讀性差。

## 記住這個表

| 方法 | 會等 Promise 嗎 | 適用場景 |
|------|----------------|----------|
| `forEach` | 不會 | 不要用在 async |
| `for...of` | 會 | 需要順序執行 |
| `Promise.all` | 會（並行） | 可以同時跑、不怕撞牆 |
| `map` + `await` | 不會 | 不要用在 async |

---

以後看到 `forEach` 配 `async`，就知道有問題了。

這個坑我踩過，你就不用踩了。

---

## 延伸閱讀

- [JavaScript 的賽跑問題](/Evernote/posts/javascript-race) — race condition 是什麼？這篇講完整觀念
- [Promise.race 處理 OCR 超時](/Evernote/posts/promise-race-timeout) — 反過來的問題：不想無限等，怎麼設停損
