---
layout: ../../layouts/PostLayout.astro
title: Multi-Tenant 是什麼？從自架課程網站到 SaaS 平台的那一步
date: 2026-01-13T12:13
description: 搞懂多租戶架構的核心概念，以及三種資料隔離策略怎麼選
tags:
  - Multi-Tenant
  - SaaS
  - 架構設計
  - PostgreSQL
---

一開始只是想做一個簡單的網頁，放我自己的課程。

用戶註冊、買課、看影片，功能很單純。

做完之後覺得還不錯，就想說加個後台管理、加個金流串接、加個進度追蹤。功能越疊越多，慢慢變成一個完整的課程平台。

然後有朋友問：「欸，這個可以給我用嗎？我也想賣課。」

我說可以啊，幫你開個帳號。

結果他又問：「可是我想要有自己的網址、自己的品牌，學生進來看到的是我的 Logo，不是你的。」

我愣了一下。

這不就變成要做 **Teachable**、**Thinkific** 那種東西嗎？

一個平台，N 個講師，每個講師有自己的網址、自己的品牌、自己的學生。學生 A 在講師甲那邊買的課，不會出現在講師乙的後台。

我去 Google 才發現，這種架構有個專有名詞——**Multi-Tenant（多租戶）**。

---

## 你每天都在用 Multi-Tenant

Multi-Tenant 聽起來很專業，但其實你每天都在用：

| 服務 | 租戶是誰 | 你看到什麼 |
|------|----------|------------|
| **Notion** | 每個 Workspace | 你只看到自己 Workspace 的頁面，別人的看不到 |
| **Slack** | 每個公司 | 你只能在自己公司的頻道聊天 |
| **Shopify** | 每個商家 | 每個商家有獨立網址、獨立後台、獨立商品 |
| **Figma** | 每個團隊 | 團隊的設計檔彼此隔離 |
| **GitHub** | 每個組織 | Organization 的 private repo 外人看不到 |

這些產品的共同點：**一套程式碼，服務上百萬個「租戶」**。

Notion 不會幫每個 Workspace 開一台 server。Shopify 不會幫每個商家部署一套獨立的程式碼。

他們都是在同一套系統裡，用某種方式把資料隔開。

---

## 公寓大樓的比喻

Multi-Tenant 直譯是「多租戶」。

想像一棟公寓大樓：

- **大樓本身** = 你的 SaaS 平台
- **每個住戶** = 每個租戶（講師、公司、團隊）
- **住戶的房間** = 租戶的資料
- **電梯、水電、管線** = 共用的程式碼和基礎設施

每個住戶覺得自己住在獨立的家，但其實大家共用同一棟大樓。

住戶 A 看不到住戶 B 家裡的東西。這就是「隔離」。

對應到軟體：每個租戶覺得自己在用一個專屬的系統，但其實背後跑的是同一套 code。

---

## 這跟加個 user_id 有什麼不同？

我一開始也搞混。

單一租戶系統很簡單：每筆資料加個 `user_id`，查詢的時候 `WHERE user_id = ?`，搞定。

但多租戶不一樣。

**單一租戶**：一個系統，多個用戶，大家平等。
```
你的系統
├── 用戶 A 的資料
├── 用戶 B 的資料
└── 用戶 C 的資料
```

**多租戶**：一個系統，多個「小系統」，每個小系統裡面又有自己的用戶。
```
你的平台
├── 租戶甲（講師 Jeff 的網站）
│   ├── Jeff 的課程
│   ├── 學生 A
│   └── 學生 B
├── 租戶乙（講師 Alice 的網站）
│   ├── Alice 的課程
│   ├── 學生 C
│   └── 學生 D（同一個人，但在這裡是另一個身份）
└── 租戶丙 ...
```

學生 D 可能同時在 Jeff 和 Alice 那邊買課。在 Jeff 那邊他是學生 D，在 Alice 那邊他也是學生 D，但這兩個身份是分開的。購買記錄、學習進度、付款資訊，全部隔開。

**這才是 Multi-Tenant 的核心：隔離的單位不是「用戶」，是「租戶」。**

---

## 三種隔離策略

決定做 Multi-Tenant 之後，第一個問題是：**資料怎麼隔離？**

有三種主流做法：

### 1. Database per Tenant（每個租戶一個資料庫）

```
PostgreSQL Server
├── database_jeff      ← 講師 Jeff 專用
├── database_alice     ← 講師 Alice 專用
└── database_bob       ← 講師 Bob 專用
```

**優點**：隔離最徹底。Jeff 的資料庫爆炸，不會影響 Alice。備份、還原都是獨立的。

**缺點**：管理地獄。100 個租戶就是 100 個資料庫。改 schema 要跑 100 次 migration。連線池也要開 100 組。

**適合**：企業客戶、金融醫療等資安要求極高的場景。客戶願意付高價，你也願意花人力維護。

### 2. Schema per Tenant（每個租戶一個 Schema）

```
PostgreSQL Database
├── schema_jeff        ← 講師 Jeff 的 schema
│   ├── courses
│   ├── orders
│   └── users
├── schema_alice       ← 講師 Alice 的 schema
│   ├── courses
│   ├── orders
│   └── users
└── schema_bob ...
```

**優點**：比獨立資料庫好管理一點。同一個資料庫，但邏輯上分開。PostgreSQL 原生支援。

**缺點**：Schema 太多會影響效能。而且這招只有 PostgreSQL 系列能用，MySQL 沒有這種概念。

**適合**：中型 SaaS，租戶數量在幾十到幾百之間，需要一定程度的隔離但又不想管太多資料庫。

### 3. Row-Level（用 tenant_id 區分）

```
PostgreSQL Database
└── public schema
    └── courses 表
        ├── id=1, tenant_id=jeff,  title="前端入門"
        ├── id=2, tenant_id=jeff,  title="React 進階"
        ├── id=3, tenant_id=alice, title="設計思考"
        └── id=4, tenant_id=bob,   title="行銷策略"
```

所有租戶的資料放在同一張表，用 `tenant_id` 欄位區分。

**優點**：最簡單。一個資料庫、一組表、一次 migration。開發快，成本低。

**缺點**：隔離是邏輯層面的，不是物理層面的。查詢忘記加 `WHERE tenant_id = ?` 就會漏資料。

**適合**：新創、小型 SaaS、需要快速迭代的產品。租戶數量可以很多（幾萬個都行），只要單一租戶的資料量不要太誇張。

---

## 我選哪個？

我選 Row-Level。

原因很實際：

1. **Supabase 免費方案只有一個資料庫**，開不了多個
2. **租戶數量不會太多**，幾十到幾百個講師
3. **開發速度最快**，我只想趕快把東西做出來

實作上就是每張表都加一個 `tenant_id`：

```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  title TEXT NOT NULL,
  price INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_courses_tenant ON courses(tenant_id);
```

看起來很簡單對吧？

但這只是開始。

接下來還有一堆問題要解決：

- 查詢忘記加 `tenant_id` 怎麼辦？ → **RLS（Row-Level Security）**
- 網址怎麼區分不同租戶？ → **動態路由**
- 權限怎麼設計？用戶可以同時屬於多個租戶 → **多層權限架構**
- 每個租戶要有自己的 Logo 和顏色 → **租戶自訂設定**

這些我會在後續的文章一個一個講。

---

## 這套架構的代價

最後講一下 Row-Level 隔離的限制，讓你決定要不要走這條路：

**效能天花板**

所有租戶共用一個資料庫，資料量大了會變慢。如果有一個租戶突然爆量（幾百萬筆資料），就得把他獨立出去，這會是一番大工程。

**隔離不夠徹底**

這是邏輯隔離，不是物理隔離。金融業、醫療業的客戶通常會要求獨立資料庫，Row-Level 滿足不了。

**心智負擔**

寫每一行 code 都要問自己：這個查詢有沒有加 `tenant_id`？這個 API 有沒有檢查租戶權限？

習慣之後還好，但前幾個月會很痛苦。

---

## 小結

這篇講的是 Multi-Tenant 的核心概念：

1. **Multi-Tenant = 一套系統服務多個獨立的「租戶」**
2. **隔離的單位是租戶，不是用戶**
3. **三種隔離策略各有優缺點，根據需求選擇**
4. **Row-Level 最簡單，適合快速開發的小型 SaaS**

下一篇會講 **Supabase 的 RLS（Row-Level Security）**——怎麼讓資料庫自動幫你擋住跨租戶的查詢，就算 code 寫錯也不會漏資料。

