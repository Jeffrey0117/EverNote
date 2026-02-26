---
layout: ../../layouts/PostLayout.astro
title: Supabase RLS 踩坑：為何管理員無法更新用戶資料？
date: 2026-01-16T22:23
description: 在儀表板想幫用戶開通 VIP，API 成功但資料庫沒反應？兇手就是 Supabase RLS 政策。
tags:
  - Supabase
  - RLS
  - Next.js
  - API Route
---

這是一篇速查筆記，紀錄一次 Supabase RLS 的踩坑經驗。

## 案發現場

我在做一個管理員儀表板，上面有個「開通 VIP」的按鈕。

功能很單純：點下去，呼叫一隻 Next.js API Route，把特定用戶的 `tier` 欄位更新成 `VIP`。

但奇怪的事情發生了：
1. 按鈕點了，API 回傳 `200 OK`。
2. 前端也跳出 `Toast` 通知，顯示「更新成功」。
3. 我打開 Supabase 後台看，那個用戶的 `tier` 根本沒變。

API 說成功，但資料庫就是沒更新。完全是靈異事件。

## 問題追查

我把 API 裡的 `update` 操作前後都加上 log，確定 code 都有跑到。

前端傳來的 `targetUserId` 和 `tier` 也都正確。

```javascript
// pages/api/update-tier.js
const { error } = await supabase
  .from('profiles')
  .update({ tier: 'VIP' })
  .eq('id', targetUserId);

console.log('Supabase update error:', error); // 這邊竟然是 null
```

最詭異的是，`supabase.from('profiles').update(...)` 回傳的 `error` 是 `null`。

這代表 Supabase 客戶端認為這次操作是成功的，但資料卻沒有寫進去。

## 真相大白：RLS (Row Level Security)

想了半天，終於想到兇手是誰了：**RLS (Row Level Security)**。

我的 `profiles` 資料表有設定 RLS 政策，用來確保用戶只能讀寫自己的資料。其中一條 `UPDATE` 政策長這樣：

```sql
-- 用戶只能更新自己的 profile
auth.uid() = id
```

這個政策的意思是：「只有當前登入用戶的 `uid` 等於要修改的資料列的 `id` 時，才允許更新。」

當管理員呼叫 API 時，他用的是一般的 `supabase` client。這個 client 帶著管理員自己的 `auth` 身份。當他試圖去更新 `targetUserId` 的資料時，RLS 會檢查 `auth.uid() === targetUserId`，結果當然是 `false`。

**重點是：RLS 擋下操作時，並不會回傳錯誤給 client。** 它只會默默地不執行，讓 API 繼續往下跑，造成「API 成功，但資料庫沒動」的假象。

## 正確解法：使用 Service Role Client

要解決這個問題，不能用帶著用戶身份的普通 client，必須在後端 API 中使用 **Service Role Client**。

`service_role` client 帶有最高權限金鑰，可以繞過所有的 RLS 政策，直接對資料庫進行操作。這適用於管理員後台、cron job 等需要系統級權限的場景。

實作方式如下：

```typescript
// pages/api/update-tier.js

import { createClient } from '@supabase/supabase-js';

// 建立一個 service role client
// 注意：這段 code 只能在後端執行！金鑰千萬不能外洩到前端
const createServiceClient = (supabaseUrl, serviceRoleKey) => {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// ... 在你的 API handler 中 ...

// 使用 service role client 繞過 RLS
const serviceClient = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 用 serviceClient 而非普通 supabase client
const { error } = await serviceClient
  .from('profiles')
  .update({ tier })
  .eq('id', targetUserId);

// 這樣資料就會確實更新了
```

`SUPABASE_SERVICE_ROLE_KEY` 必須設為環境變數，並且**絕對不能**讓這個金鑰洩漏到前端。

## 其他方案？

有人可能會想：「我直接去改 RLS 政策，加入管理員的例外不就好了嗎？」

例如，新增一個 `admins` 資料表，然後 RLS 政策改成：

```sql
-- 用戶只能更新自己的 profile，或是你是管理員
(auth.uid() = id) OR (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()))
```

這在技術上可行，但我**不建議**這麼做。

把管理權限的邏輯寫進 RLS，等於是把後端權限下放到資料庫層級。未來如果邏輯變複雜（例如不同等級的管理員有不同權限），RLS 會變得非常難維護。

將權限控制保留在後端 API 層（透過 `service_role` client）是更安全、更靈活的做法。

## 教訓

- Supabase RLS 是針對「當前登入用戶」情境設計的，非常適合做用戶只能存取自己資料的場景。
- 當 RLS 政策不滿足時，操作會被**靜默忽略**，不會拋出錯誤。這是個大坑。
- 涉及「代表系統」或「管理他人資料」的操作時（如管理員後台），必須在**後端**使用 `service_role` client 來繞過 RLS。
- 永遠不要把 `service_role` 金鑰洩漏到前端。
