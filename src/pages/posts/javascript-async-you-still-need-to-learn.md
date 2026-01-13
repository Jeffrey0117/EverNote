---
layout: ../../layouts/PostLayout.astro
title: 別笑 Python 的框架，JavaScript 的非同步還是要學
date: 2026-01-14T02:45
description: JS 的事件循環是內建的，但 callback hell、Promise、async/await 你還是得搞懂
tags:
  - JavaScript
  - 非同步
  - Promise
  - async/await
---

在 [FastAPI 那篇文章](/posts/fastapi-why-i-switched-from-flask)，我寫了一句：

> 如果你是 JS 開發者轉 Python，會覺得「怎麼這麼麻煩」——因為 JS 把你寵壞了。

寫完之後我反省了一下。

JS 的非同步真的不用學嗎？

**錯。**

JS 的事件循環是內建的沒錯，但這只是表示你「不用選框架」。

怎麼正確地寫非同步程式碼，你還是要學。

而且 JS 的非同步演化了三代，每一代都有坑。

---

## 第一代：Callback

最早的非同步寫法是 callback——「做完之後呼叫這個函數」。

```javascript
// 讀檔案
fs.readFile('a.txt', (err, dataA) => {
  console.log(dataA);
});
```

看起來很簡單。

但如果你要「讀完 A 再讀 B，讀完 B 再讀 C」：

```javascript
fs.readFile('a.txt', (err, dataA) => {
  fs.readFile('b.txt', (err, dataB) => {
    fs.readFile('c.txt', (err, dataC) => {
      fs.readFile('d.txt', (err, dataD) => {
        fs.readFile('e.txt', (err, dataE) => {
          // 歡迎來到 callback hell
          console.log(dataA + dataB + dataC + dataD + dataE);
        });
      });
    });
  });
});
```

這就是傳說中的 **Callback Hell**，又叫 Pyramid of Doom。

程式碼往右邊無限延伸，每加一層就多一層縮排，看了頭痛。

而且錯誤處理超麻煩——每一層都要檢查 `err`。

---

## 第二代：Promise

ES6 引入了 Promise，把 callback 攤平成鏈式呼叫：

```javascript
readFilePromise('a.txt')
  .then(dataA => {
    console.log(dataA);
    return readFilePromise('b.txt');
  })
  .then(dataB => {
    console.log(dataB);
    return readFilePromise('c.txt');
  })
  .then(dataC => {
    console.log(dataC);
  })
  .catch(err => {
    // 錯誤統一處理
    console.error(err);
  });
```

不再往右長了，改成往下長。

錯誤處理也簡單了，最後加一個 `.catch()` 就好。

### 但 Promise 有自己的坑

**坑 1：忘記 return**

```javascript
// 錯誤示範
fetchUser(1)
  .then(user => {
    fetchPosts(user.id);  // 忘記 return
  })
  .then(posts => {
    console.log(posts);   // undefined，因為上面沒 return
  });
```

**坑 2：Promise.all vs 迴圈**

```javascript
// 慢：一個等完才換下一個
for (const id of ids) {
  const data = await fetch(`/api/${id}`);
}

// 快：同時發所有請求
const results = await Promise.all(
  ids.map(id => fetch(`/api/${id}`))
);
```

三個請求，一個要 1 秒。

迴圈寫法：3 秒。

`Promise.all` 寫法：1 秒。

**不懂這個，你的程式會慢 3 倍。**

---

## 第三代：async/await

ES2017 加入 async/await，讓非同步程式碼看起來像同步：

```javascript
async function readAllFiles() {
  const dataA = await readFilePromise('a.txt');
  const dataB = await readFilePromise('b.txt');
  const dataC = await readFilePromise('c.txt');
  console.log(dataA + dataB + dataC);
}
```

乾淨、好讀、好維護。

這也是現在最推薦的寫法。

### 但 async/await 也有坑

**坑 1：忘記 await**

```javascript
async function getUser() {
  const user = fetchUser(1);  // 忘記 await
  console.log(user.name);      // undefined，因為 user 是 Promise 不是資料
}
```

**坑 2：try/catch 的範圍**

```javascript
// 錯誤示範：catch 範圍太大
try {
  const user = await fetchUser(1);
  const posts = await fetchPosts(user.id);
  processData(posts);  // 這行的錯也會被 catch 吃掉
} catch (err) {
  console.error('網路錯誤');  // 其實可能是 processData 的 bug
}
```

**坑 3：不能在頂層用 await（舊環境）**

```javascript
// 以前這樣會報錯
const data = await fetch('/api');  // SyntaxError

// 要包一層
(async () => {
  const data = await fetch('/api');
})();
```

（ES2022 之後頂層 await 合法了，但舊專案還是會遇到）

---

## 面試最愛考：執行順序

```javascript
console.log('1');

setTimeout(() => {
  console.log('2');
}, 0);

Promise.resolve().then(() => {
  console.log('3');
});

console.log('4');
```

輸出是什麼？

答案：`1, 4, 3, 2`

**為什麼 3 比 2 先？**

因為 JS 的事件循環有兩種佇列：

- **Microtask queue**：Promise 的 `.then()` 會進這裡
- **Macrotask queue**：`setTimeout` 會進這裡

執行順序：

1. 跑完同步程式碼（印 1, 4）
2. 清空 microtask（印 3）
3. 拿一個 macrotask 來跑（印 2）

不懂這個，debug 會 debug 到懷疑人生。

---

## 什麼時候會卡住

JS 是單執行緒，事件循環再厲害，遇到 CPU 密集的工作還是會卡：

```javascript
// 這會卡住整個頁面
function blockingOperation() {
  const arr = [];
  for (let i = 0; i < 100000000; i++) {
    arr.push(Math.random());
  }
  return arr.sort();
}

blockingOperation();  // 跑這行的時候，按鈕點不動、動畫會停
```

`async/await` 救不了你，因為這是 CPU 在算，不是在等 I/O。

解法：

- Web Worker（瀏覽器）
- Worker Threads（Node.js）
- 把工作拆小，用 `requestIdleCallback` 分批做

---

## 所以 JS 的非同步要學什麼

| 主題 | 為什麼要學 |
|------|-----------|
| Callback | 舊程式碼、第三方 library 還在用 |
| Promise | `.then()`, `.catch()`, `Promise.all`, `Promise.race` |
| async/await | 現代寫法，但要知道坑在哪 |
| Event Loop | microtask vs macrotask，debug 和面試都會用到 |
| 錯誤處理 | try/catch 範圍、unhandled rejection |
| 並行處理 | `Promise.all` vs 迴圈，效能差 N 倍 |

---

## Python vs JavaScript：不同的痛點

| | Python | JavaScript |
|--|--------|------------|
| 事件循環 | 要自己加 | 內建 |
| 要選框架嗎 | 要（Flask vs FastAPI） | 不用，都是非同步 |
| 主要的學習點 | 要不要用 async | 怎麼正確用 async |
| 常見的坑 | 用了同步 library 結果還是卡 | `Promise.all` vs 迴圈、執行順序 |

[Python 要學怎麼「開啟」非同步](/posts/fastapi-why-i-switched-from-flask)。

JavaScript 要學怎麼「駕馭」非同步。

兩邊都有要學的東西，誰也別笑誰。
