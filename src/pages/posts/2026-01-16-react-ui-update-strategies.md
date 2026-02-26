---
layout: ../../layouts/PostLayout.astro
title: 按完按鈕，畫面沒反應？談談 React 的三種 UI 更新策略
date: 2026-01-16T22:58
description: 在 React 後台，點擊按鈕後呼叫 API 更新資料，但 UI 卻有延遲感？這篇文章介紹三種 UI 更新策略，讓你根據不同場景選擇最適合的解法。
tags:
  - React
  - API
  - UX
---

我最近在搞一個 React 開發的管理後台，有個常見情境：管理者在後台調整使用者資料，例如把某個用戶的會員等級從「普通」升到「VIP」。

這操作很單純：點個按鈕，呼叫 API，後台資料庫更新。

搞定，收工！

但馬上就發現一個很尬的問題：按下按鈕後，API 雖然成功了，但畫面上的統計數據（例如各等級會員數量）沒有立刻變動，要等我手動刷新頁面，或是等下一次的定時重撈，新的資料才會顯示出來。

這體驗實在太差了。使用者根本不知道他的操作到底有沒有成功。

## 最直覺，也最慢的做法：重新 Fetch

為了解決這個問題，我第一個想到的方法很暴力：API 操作成功後，再重新呼叫一次拉取全部統計資料的 API (`fetchStats`)。

```typescript
async function handleUpdateTier(userId, newTier) {
  // 先發送更新請求
  await fetch(`/api/users/${userId}/tier`, { 
    method: 'PUT',
    body: JSON.stringify({ tier: newTier }) 
  });

  // 成功後，重新撈一次全部的資料
  const response = await fetch('/api/admin/stats');
  const data = await response.json();
  setStats(data);
}
```

這方法很簡單，而且保證資料絕對是最新最正確的，因為是直接從後端來的。

但缺點也很明顯：**慢**。

每一次操作都要承受一次額外的網路請求延遲，如果後端計算 `stats` 很花時間，那使用者按完按鈕後可能要呆坐一兩秒，盯著沒變的畫面，開始懷疑人生。

## 精打細算，自己動手：手動更新本地狀態

重新撈一次實在太浪費了，明明我已經知道哪些資料變了。

例如，把一個「普通」會員升級成「VIP」，變化其實很明確：
1.   `users` 陣列中，該用戶的 `membership_tier` 變了。
2.   `tier_distribution` 物件中，`"普通"` 的數量 -1，`"VIP"` 的數量 +1。

那我何不自己手動改 React 的 local state？

```typescript
// API 成功後直接改 local state
setStats(prev => {
  // 為了更新 tier_distribution，需要找到舊的 tier
  const oldTier = prev.users.find(u => u.id === userId).membership_tier;
  
  return {
    ...prev,
    users: prev.users.map(u => 
      u.id === userId ? { ...u, membership_tier: newTier } : u
    ),
    tier_distribution: {
      ...prev.tier_distribution,
      [oldTier]: prev.tier_distribution[oldTier] - 1,
      [newTier]: prev.tier_distribution[newTier] + 1,
    }
  };
});
```

這個方法在 API 成功後才執行，所以能確保 UI 跟後端狀態一致。而且因為是純前端操作，沒有網路延遲，畫面更新是瞬發的。

優點是**快又準**。

缺點是**麻煩**。如果狀態的結構很複雜，或是更新一個資料會連動到好幾個地方，那這段手動更新的邏輯就會變得很巨大、很難維護。等於是把後端的商業邏輯在前端又重寫了一遍。

## 速度就是一切：樂觀更新 (Optimistic Update)

我又想，能不能更快？連 API 的等待時間都省掉？

使用者一按下按鈕，我**立刻**就更新 UI，**假裝** API 一定會成功。

這就是所謂的「樂觀更新」。我們先對結果感到樂觀，直接把畫面變成操作後的樣子。然後才在背景發送 API 請求。

如果 API 成功了，那什麼事都不用做，因為畫面已經是最新的了。

如果 API 不幸失敗了，那就把剛剛的修改**回滾**，還原到舊的狀態，並跳出錯誤提示告訴使用者。

```typescript
async function handleUpdateTierOptimistic(userId, newTier) {
  const oldStats = stats; // 先把舊的 state 存起來
  
  // 計算出新 state
  const newStats = getNewStats(stats, userId, newTier); // 這是一個自己封裝的函式，做跟方案 A 一樣的邏輯
  
  // 立刻更新 UI
  setStats(newStats);

  try {
    // 然後才在背景發送 API
    await fetch(`/api/users/${userId}/tier`, {
      method: 'PUT',
      body: JSON.stringify({ tier: newTier })
    });
    // 成功了，皆大歡喜
  } catch (error) {
    // 失敗了，UI 回滾到舊的狀態
    setStats(oldStats);
    // 跳出錯誤提示
    alert('更新失敗，請重試！');
  }
}
```

這方法提供了**極致的響應速度**，使用者體感是「秒更新」，非常流暢。

缺點就是**有風險**。在網路不穩或後端出錯的情況下，UI 會閃爍一下（從新狀態變回舊狀態）。對於金融操作或絕對不能出錯的流程，就不太適合。但對於一些容錯率高的操作（例如按讚、修改個人簡介），這是提升使用者體驗的神兵利器。

---

## 所以，我該用哪個？

這三種策略沒有絕對的好壞，完全取決於你的使用場景。

| 策略 | 優點 | 缺點 | 適用場景 |
|---|---|---|---|
| **重新 Fetch** | 簡單粗暴、保證資料最新 | 慢、額外網路請求、伺服器壓力 | 不常操作、UI 簡單、或可以接受延遲的頁面 |
| **本地狀態更新** | 速度快、無額外請求、資料準確 | 狀態管理邏輯複雜、前後端邏輯重複 | 狀態連動單純、追求準確性的關鍵操作 |
| **樂觀更新** | **體感最快**、使用者體驗極佳 | 實作複雜、需處理回滾、UI 可能短暫不一致 | 容錯率高、追求極致體驗的操作（如按讚、開關）|

簡單來說：
- 想無腦開發，選**重新 Fetch**。
- 想在安全和速度間取個平衡，選**本地狀態更新**。
- 想給使用者飛一般的體驗，且能接受一點風險，選**樂觀更新**。

## 懶人包：善用 SWR / React Query

其實，上面這些複雜的邏輯，現在的非同步狀態管理 library 都幫我們想好了。

像是 [SWR](https://swr.vercel.app/) 或 [React Query (TanStack Query)](https://tanstack.com/query/latest) 都有 `mutate` 的功能，可以非常優雅地實現這三種更新策略，尤其是樂觀更新，它們提供了更完善的 API，幫你處理了狀態備份和回滾的細節。

如果你發現自己常常在手寫這些 state 更新邏輯，那也許就是時候導入這些好用的工具了。
