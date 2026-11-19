---
layout: ../../layouts/PostLayout.astro
title: Lovable 生的站，為什麼不能直接拿去收錢
date: 2026-11-20T00:20
description: AI 幾小時生出能註冊、結帳的網站，但「瀏覽器直連資料庫」這個架構，拿去收真錢、存個資會出什麼事。
tags:
  - 觀念
  - 資安
  - Supabase
---

用 Lovable（或同類「打幾句話就生出全端網站」的工具）幾個小時就能做出一個能註冊、能看課、能結帳的網站。驗證點子超快。

問題是：這種工具生出來的架構，直接拿去**收真錢、存真人的姓名 Email 電話**，會踩到一整類很難自己發現的洞。這篇不談感覺，直接拿架構和程式來拆。

## 一、先搞懂這種網站的「架構」長怎樣

一般網站是三層：

```
瀏覽器  →  你的伺服器  →  資料庫
```

中間那層伺服器是「警衛」：使用者說要買課，伺服器自己去查價格、確認付款，沒問題才寫進資料庫。

這類 AI 工具生的網站常常是兩層：

```
瀏覽器  →  資料庫（Supabase）
```

**沒有警衛。** 瀏覽器直接對資料庫下指令。那資料庫怎麼知道誰能做什麼？靠一種叫 **RLS（Row Level Security，列層級安全）** 的規則，寫在資料庫裡：

> 「這張表，誰可以讀哪幾列、誰可以新增什麼樣的資料。」

所以在這種架構裡：**RLS 就是你唯一的防線。前端寫得再漂亮，都只是「建議」，不是「規定」。** 下面全部都是這句話的延伸。

## 二、洞 #1：免費開通任何一門課

### 前端長這樣

典型生成的結帳頁，按下「確認購買」做的事，精簡後是這樣：

```tsx
// 價格在瀏覽器裡算
const basePrice = course.sale_price || course.original_price;
const finalPrice = Math.max(0, basePrice - discountAmount);

// 瀏覽器直接把報名資料寫進資料庫
const enrollmentData = {
  course_id: courseId,
  user_id: user.id,
  final_price: finalPrice,                                  // ← 價格：前端說了算
  status: paymentMethod === 'transfer' ? 'pending' : 'active', // ← 開不開通：前端說了算
};
await supabase.from("enrollments").insert(enrollmentData);
```

### 資料庫的守門規則長這樣

```sql
CREATE POLICY "Users can enroll in courses"
  ON public.enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

翻成白話：**「你要新增一筆報名資料？只要 user_id 是你自己，就放行。」**

價格對不對？有沒有付錢？status 能不能是 `active`？**完全沒檢查。**

### 攻擊者實際會怎麼做

很多人以為「要駭網站一定很難」。這個不用任何駭客技術，只要會打開瀏覽器的開發者工具。

**第 1 步：註冊一個帳號，登入。** 正常操作，沒人會擋。

**第 2 步：F12 → Network 分頁，隨便點幾個頁面。** 你會看到瀏覽器一直在打 `https://xxxx.supabase.co/rest/v1/...`，每個請求的 header 都帶著兩樣東西：

- `apikey`：Supabase 的公開金鑰（本來就公開，寫死在前端 JS 裡）
- `Authorization: Bearer ...`：你登入後拿到的身分憑證

這兩樣你都合法擁有。

**第 3 步：直接在 Console 送一筆：**

```js
await supabase.from("enrollments").insert({
  course_id: "想要的課程ID",
  user_id: "我自己的ID",
  final_price: 0,
  status: "active",
});
```

（就算網站沒把 `supabase` 物件暴露在全域，用 `fetch` 對 `/rest/v1/enrollments` 送同樣的 POST、帶上那兩個 header，效果一樣。）

**第 4 步：資料庫檢查 RLS：「user_id 是本人嗎？」是。→ 放行。**

**第 5 步：重新整理「我的課程」，課程已開通，價格 0 元。**

結帳頁、金流、轉帳審核……全部被跳過。因為那些東西只存在於「誠實使用者會走的那條路」上，而攻擊者根本不走那條路。

這類工具生的規則常常鬆到誇張，例如：

```sql
-- FOR ALL USING (true) WITH CHECK (true)  → 任何人可以改任何人的資料
-- INSERT WITH CHECK (true)                → 任何人可以偽造交易
```

`USING (true)` 的意思就是「無條件放行」。**這等於在門上貼一張紙寫「請勿進入」，但門是開的。**

## 三、洞 #2：陌生人讀走全站個資

補完寫入的洞，很容易留一句自我安慰的註解：「SELECT 規則是『用戶只能看自己的』，已經安全了。」

**通常是錯的。** 這種架構常見的結果是：**用公開金鑰、完全不登入**，就能讀到全站的報名資料（姓名、Email、電話）、全站註冊 Email、跨租戶的分享紀錄。

### 為什麼會這樣？兩個經典陷阱

**1. RLS 規則會「疊加」，而且是用 OR 疊的。**
同一張表上只要有**任何一條** SELECT 規則放行，資料就能被讀。專案長大後規則越加越多，原本那條「只能看自己的」沒錯，但旁邊多了一條比較寬鬆的，整張表就破了。你盯著單一一條規則看，永遠看不出問題。

**2. View 預設會繞過 RLS。**
在 Postgres 裡，view 預設用「建立者」的權限執行，不是「查詢者」的。所以底層表的 RLS 設得再嚴，透過 view 去讀就全部失效。除非你明確寫：

```sql
ALTER VIEW some_view SET (security_invoker = on);
```

這種東西，AI 生成工具不會提醒你，大部分人也不知道。

### 正確的修法

不要「一條一條補」，而是整張表砍掉重練，而且把寫入權整個收掉：

```sql
-- 刪掉這張表上「所有」現存規則（包含你不知道存在的那些）
FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'enrollments'
LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I ON enrollments', pol.policyname);
END LOOP;

-- 只留一條 SELECT：本人，或該租戶的老闆，可以讀
CREATE POLICY "enrollments_select_own_or_owner" ON enrollments FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM tenants t
             WHERE t.id = enrollments.tenant_id AND t.owner_id = auth.uid())
);

-- 不建立 INSERT/UPDATE/DELETE 規則 → 前端一律不能寫
-- 所有寫入改由伺服器（Server Action）處理
```

注意最後兩行。**真正的解法不是「把 RLS 寫得更聰明」，而是「不讓瀏覽器寫資料」。**

## 四、連手寫規則的人也會挖洞

公平講，不是所有洞都是 AI 挖的。看一個很自然的「退課」規則：

```sql
CREATE POLICY "Users can withdraw from their own enrollments" ON enrollments
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status IN ('active', 'pending', 'withdrawn'));
```

本意是「讓學生把自己的報名改成 withdrawn（退課）」。但 `status IN (...)` 裡面有 **`active`**。

一個選「轉帳付款」、狀態還是 `pending`（等老闆確認收款）的學生，可以自己送一個 UPDATE，把 status 改成 `active`。**沒付錢，直接開通。** 跟洞 #1 同一個手法，換個門進去而已。

重點來了：**問題不只是「AI 生的程式爛」，而是「讓瀏覽器直接碰資料庫」這個架構，會讓每一個寫規則的人（AI 也好、資深工程師也好）都很容易出錯。** 規則是用「列出允許什麼」來寫的，你只要漏想一種情況，就是一個洞。

## 五、所以正確的寫法長怎樣？

把「警衛」請回來。結帳流程應該是這樣：

```
瀏覽器：我要買「課程 A」，折扣碼「HELLO」
   ↓（只送「意圖」，不送價格、不送狀態）
伺服器：
  1. 你是誰？（從登入 session 查，不信前端傳的 user_id）
  2. 課程 A 多少錢？（自己查資料庫，不信前端傳的價格）
  3. HELLO 有效嗎？折多少？（自己算）
  4. 建立「待付款」訂單，導去金流
   ↓
金流：付款完成，通知伺服器（附簽章，驗證是真的金流打來的）
   ↓
伺服器：確認簽章 → 才把報名改成 active
```

前端從頭到尾只能說「我想要」，不能說「給我」。

**一句話心法：錢和權限，永遠不要相信瀏覽器傳來的任何數字。** 這跟[登入牆要擋在伺服器、不是畫面](./server-side-access-control)是同一件事的兩面。

## 六、所以，真的不能用嗎？

這類工具很適合：

- **驗證點子**：做個 demo 給人看、測有沒有人想用
- **內部工具**：只有你或團隊在用，沒有陌生人
- **不收錢、不存個資**的東西

真正不該做的，是這一種：

> **把「瀏覽器直連資料庫」的生成式網站，直接拿去收真錢、存真人的個資。**

如果已經這樣上線了，最低限度做三件事：

1. **把每張表的 INSERT / UPDATE / DELETE 規則全部列出來，一條一條問：「一個惡意的登入使用者，能用這條規則做什麼？」**
2. **檢查所有 view 有沒有 `security_invoker = on`。**
3. **用「不登入」和「登入成一般使用者」兩種身分，各自打一次 API**，看能讀到什麼、能寫什麼。不要相信「應該是安全的」。

最好的做法還是：**跟錢有關、跟權限有關的，全部搬到伺服器上。** 把生成式單頁網站換成有伺服器端（例如 Next.js 的 Server Actions）的架構，讀寫一律經過伺服器——那是另一篇的事了。
