---
layout: ../../layouts/PostLayout.astro
title: 三個正確的決策，組合起來卻爆炸
date: 2026-01-13T11:01
description: 每個選擇單獨看都對，合在一起就出包——軟體開發的組合拳陷阱
tags:
  - 觀念
  - JavaScript
---

最近踩了一個坑，讓我想了很久。

不是因為難解，而是因為**每一步我都沒做錯**。

## 第一步：圖片預覽用 Base64

使用者上傳圖片，要在網頁上顯示預覽。

用 `FileReader.readAsDataURL` 轉成 Base64，塞進 `<img src>`。

這是前端的標準做法，沒毛病。

## 第二步：用 useEffect 監聽狀態

狀態變了就做某件事，用 `useEffect` 加 dependency array。

React 官方推薦的寫法，沒毛病。

## 第三步：自動存檔用 localStorage

想讓使用者重新整理後進度還在。

localStorage 是瀏覽器內建的，不用裝套件，API 簡單。

聽起來也沒毛病。

## 三個加在一起就爆了

```typescript
useEffect(() => {
  const data = { images, settings };  // images 裡有 Base64
  localStorage.setItem('session', JSON.stringify(data));
}, [images, settings]);
```

上傳幾張圖，瀏覽器噴 `QuotaExceededError`。

localStorage 只有 5MB，Base64 會讓圖片膨脹 33%。

三張圖就塞爆了。

## 為什麼會這樣

每個決策單獨看都合理：

| 決策 | 單獨來看 |
|------|----------|
| 預覽用 Base64 | 前端標準做法 |
| useEffect 監聽 | React 標準做法 |
| 存檔用 localStorage | 簡單方便 |

但組合起來就有問題：

- Base64 讓資料變大
- useEffect 讓它自動觸發
- localStorage 有容量限制

**三個「對」撞在一起，就變成「錯」。**

## 這種事很常見

不只這個例子。

軟體開發裡到處都是這種「組合拳陷阱」：

- **用了 ORM 很方便** + **每個 API 都撈一次資料庫** + **流量一大** = N+1 查詢，資料庫爆炸

- **React 狀態放最上層很乾淨** + **子元件很多** + **狀態常變動** = 整棵樹一直 re-render

- **console.log 除錯很方便** + **到處都加** + **忘記拿掉就上線** = 正式環境噴一堆垃圾

每一步都不是錯，但加起來就是坑。

## 怎麼避免

老實說，很難完全避免。

但有幾個習慣可以降低機率：

### 知道每個工具的限制

不只學怎麼用，也要知道它的邊界在哪。

localStorage 有 5MB 限制、Base64 會膨脹 33%、useEffect 每次 render 都可能觸發。

知道限制，才知道什麼時候會撞牆。

### 腦中模擬資料流

寫完一段 code，在腦中跑一遍：

「這個資料會有多大？會被呼叫幾次？會存在哪裡？」

這次如果我有想過「images 裡面有 Base64，那個字串有多肥？」，就不會踩坑。

### 早點測邊界情況

不要只測 happy path。

上傳一張圖可以，那上傳十張呢？上傳一張 10MB 的呢？

邊界情況最容易讓組合拳爆發。

---

這次的坑讓我學到一件事：

**單獨正確不代表組合正確。**

每個決策都要想一下，它跟其他東西加在一起會怎樣。

不然就會像我一樣，三個對的選擇，組出一個爆炸的結果。
