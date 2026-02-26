---
layout: ../../layouts/PostLayout.astro
title: cloudpipe 上傳了 API 服務卻沒反應？兇手是 require.cache
date: 2026-01-16T23:09
description: 記錄一次在自製工具 cloudpipe 上傳新服務後，卻一直 404 的踩坑過程。原來 Node.js 的 require 快取機制才是元兇。
tags:
  - Node.js
  - Hot Reload
  - cloudpipe
---

最近在開發我的小工具 [cloudpipe](https://github.com/Jeffrey0117/cloudpipe)，這是一個可以快速把本地腳本變成公開 API 的玩具。

開發過程中，我透過 Dashboard 上傳了一個新的 API 服務 `lurl.js`，功能很單純，就是一個健康檢查端點。

上傳完後，我滿心期待地打開 `/lurl/health`。

結果是 404 Not Found。

## 鬼打牆的 404

一開始我以為是路徑寫錯，反覆檢查了好幾次，路徑、檔名都沒問題。

但不管怎麼試，訪問 `/lurl/anything` 就是回 404。

這就很奇怪了。檔案確實已經在 `services/` 目錄底下，但 router 好像完全沒註冊到這個服務。

我只好回去翻 router 的程式碼，看看服務是怎麼被載入的。

```javascript
// src/core/router.js

// ...
const servicesDir = path.join(process.cwd(), 'services');
const routes = [];

fs.readdirSync(servicesDir)
  .filter(f => f.endsWith('.js') && !f.startsWith('_'))
  .forEach(file => {
    try {
      const route = require(path.join(servicesDir, file));
      routes.push({ name: path.basename(file, '.js'), handler: route });
      console.log(`Loaded service: ${file}`);
    } catch (error) {
      console.error(`Error loading service ${file}:`, error);
    }
  });
// ...
```

一看就懂了。

`cloudpipe` 只在**啟動時**讀取一次 `services/` 目錄，然後用 `require()` 把所有 `.js` 檔載入。

之後就算我上傳了新檔案，已經跑起來的 Node.js 主程式根本不知道，當然也就找不到對應的路由。

## 解法：重啟大法好

最簡單粗暴的解法，就是直接重啟 `cloudpipe`。

```bash
node index.js
```

重啟後，`router.js` 的載入邏輯會重新跑一次，自然就讀得到新的 `lurl.js`，服務也就能正常運作了。

雖然問題解決了，但每次上傳新服務都要手動重啟也太蠢了。

## 教訓：Node.js 的 require 會快取

這次踩坑的核心教訓是：**Node.js 的 `require()` 有快取機制**。

當你 `require一个模組時，Node.js 會把它快取在 `require.cache` 裡。下次再 `require` 同一個檔案，Node.js 會直接從快取回傳，而不是重新讀取檔案。

這在大部分情況下是好事，可以提升效能。但對我這種需要動態載入新檔案的場景，就成了阻礙。

如果要讓 Node.js 重新載入一個已經被 `require` 過的檔案，你需要手動把它的快取刪掉：

```javascript
// 取得模組的完整路徑
const modulePath = require.resolve('./my-module.js');

// 從快取中刪除
delete require.cache[modulePath];

// 重新載入
const myModule = require('./my-module.js');
```

## 後續：該來做熱載入了

最理想的作法，當然是讓 `cloudpipe` 支援熱載入（Hot Reload）。

我可以監聽 `services/` 目錄的檔案變化，當有新檔案或檔案更新時，就自動觸發快取刪除和重新載入的邏輯。

這可以用 Node.js 內建的 `fs.watch` 來實現。

```javascript
fs.watch(servicesDir, (eventType, filename) => {
  if (filename && filename.endsWith('.js')) {
    const modulePath = path.join(servicesDir, filename);
    
    // 如果檔案還在 (eventType可能是rename)
    if (fs.existsSync(modulePath)) {
        // 先清快取
        delete require.cache[require.resolve(modulePath)];
        // 重新載入或更新路由...
        console.log(`Reloading ${filename}...`);
    }
  }
});
```

這部分之後可以另外寫一篇來詳細記錄怎麼在 `cloudpipe` 中實現完整的熱載入功能。

總之，又學到了一課。下次碰到類似「檔案明明在，程式卻找不到」的鬼故事，記得先檢查是不是快取在搞鬼。

---

專案 Repo 在這，有興趣可以看看：
[https://github.com/Jeffrey0117/cloudpipe](https://github.com/Jeffrey0117/cloudpipe)
