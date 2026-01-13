---
layout: ../../layouts/PostLayout.astro
title: Fastify：比 Express 快的 Node.js 框架
date: 2026-01-14T06:10
description: Express 用了十幾年，但它的設計已經過時了。Fastify 是現代的替代品，更快、更有結構
tags:
  - Node.js
  - 後端
  - 框架
  - 套件推薦
---

在 GitHub 上逛到 [Fastify](https://fastify.dev/)，30k+ stars。

看了一下，是 Express 的替代品，主打「快」。

**我以前一直用 Express，但說實話，Express 的設計確實老了。**

---

## Express 的問題

Express 是 2010 年的產物，那時候 Node.js 還沒有 async/await。

```javascript
// Express 的 callback 地獄
app.get('/user/:id', (req, res, next) => {
    db.getUser(req.params.id, (err, user) => {
        if (err) return next(err);
        db.getPosts(user.id, (err, posts) => {
            if (err) return next(err);
            res.json({ user, posts });
        });
    });
});
```

現在當然可以用 async/await，但 Express 本身沒有原生支援——錯誤處理還是要自己包。

```javascript
// Express + async/await 要自己處理錯誤
app.get('/user/:id', async (req, res, next) => {
    try {
        const user = await db.getUser(req.params.id);
        const posts = await db.getPosts(user.id);
        res.json({ user, posts });
    } catch (err) {
        next(err);  // 忘記這行就會 crash
    }
});
```

其他問題：

| 問題 | 說明 |
|------|------|
| 沒有 schema 驗證 | 要另外裝 Joi、Yup |
| 沒有型別支援 | TypeScript 要自己設定 |
| 效能一般 | 中介軟體多了會慢 |
| 沒有結構規範 | 每個專案長得不一樣 |

---

## Fastify 的改進

### 原生 async/await

```javascript
// Fastify：async 函數自動處理錯誤
fastify.get('/user/:id', async (request, reply) => {
    const user = await db.getUser(request.params.id);
    const posts = await db.getPosts(user.id);
    return { user, posts };  // 直接 return，不用 res.json()
});
```

拋出的錯誤會自動被捕捉，不用手動 try-catch。

### 內建 Schema 驗證

```javascript
fastify.post('/user', {
    schema: {
        body: {
            type: 'object',
            required: ['name', 'email'],
            properties: {
                name: { type: 'string', minLength: 1 },
                email: { type: 'string', format: 'email' },
                age: { type: 'integer', minimum: 0 },
            },
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                },
            },
        },
    },
}, async (request, reply) => {
    // request.body 已經驗證過了
    const user = await db.createUser(request.body);
    return user;
});
```

Schema 不只驗證輸入，還可以：
- 自動產生 OpenAPI 文件
- 序列化輸出（比 JSON.stringify 快）

### 效能

Fastify 官方 benchmark：

| 框架 | req/sec |
|------|---------|
| Fastify | 78,956 |
| Koa | 54,848 |
| Express | 38,510 |
| Hapi | 29,998 |

Fastify 比 Express 快 2 倍。

為什麼快？

- 用 [find-my-way](https://github.com/delvedor/find-my-way) 做路由，比 Express 的 path-to-regexp 快
- Schema 序列化比 JSON.stringify 快
- 內部架構優化

---

## 基本用法

```javascript
import Fastify from 'fastify';

const fastify = Fastify({
    logger: true,  // 內建 pino logger
});

// 路由
fastify.get('/', async (request, reply) => {
    return { hello: 'world' };
});

// 帶參數
fastify.get('/user/:id', async (request, reply) => {
    const { id } = request.params;
    return { id };
});

// 啟動
fastify.listen({ port: 3000 }, (err) => {
    if (err) throw err;
});
```

### Plugin 系統

Fastify 用 plugin 來組織程式碼：

```javascript
// plugins/db.js
async function dbPlugin(fastify, options) {
    const db = await connectToDatabase(options.url);

    // 把 db 掛到 fastify instance 上
    fastify.decorate('db', db);
}

export default fp(dbPlugin);  // fp = fastify-plugin

// app.js
import dbPlugin from './plugins/db.js';

fastify.register(dbPlugin, { url: 'mongodb://...' });

// 之後就可以用 fastify.db
fastify.get('/users', async (request, reply) => {
    const users = await fastify.db.collection('users').find().toArray();
    return users;
});
```

### 路由組織

```javascript
// routes/users.js
async function userRoutes(fastify, options) {
    fastify.get('/', async () => {
        return fastify.db.getUsers();
    });

    fastify.get('/:id', async (request) => {
        return fastify.db.getUser(request.params.id);
    });

    fastify.post('/', async (request) => {
        return fastify.db.createUser(request.body);
    });
}

export default userRoutes;

// app.js
fastify.register(userRoutes, { prefix: '/users' });
// GET /users
// GET /users/:id
// POST /users
```

---

## 跟 Express 比較

| 功能 | Express | Fastify |
|------|---------|---------|
| async/await | 要自己處理錯誤 | 原生支援 |
| Schema 驗證 | 要另外裝 | 內建 |
| TypeScript | 要自己設定 | 官方支援 |
| 效能 | 一般 | 快 2 倍 |
| Logger | 要另外裝 | 內建 pino |
| 生態系 | 超大 | 中等 |
| 學習資源 | 超多 | 較少 |

---

## 我自己的判斷

### 什麼時候用 Fastify

- 新專案，想要更現代的架構
- 追求效能
- 需要內建的 schema 驗證
- 用 TypeScript

### 什麼時候用 Express

- 已經有 Express 專案在跑
- 需要某個只有 Express 有的中介軟體
- 團隊都熟 Express

### 其他選擇

| 框架 | 定位 |
|------|------|
| [Hono](https://hono.dev/) | 更輕量、跨 runtime（Node、Deno、Bun、Cloudflare Workers） |
| [Koa](https://koajs.com/) | Express 團隊做的，更簡潔 |
| [NestJS](https://nestjs.com/) | 企業級、類似 Angular 的架構 |

如果是 Python 後端，我會用 [FastAPI](/Evernote/posts/fastapi-why-i-switched-from-flask)——它的設計理念跟 Fastify 很像（都強調 schema、async、效能）。

---

## 相關文章

- [FastAPI：為什麼我從 Flask 轉過來](/Evernote/posts/fastapi-why-i-switched-from-flask) — Python 版的 Fastify
- [資料驗證套件：Pydantic vs Zod](/Evernote/posts/validation-packages) — Schema 驗證
- [寫程式解決問題之前，先決定你要做什麼](/Evernote/posts/what-should-i-build) — 什麼時候需要 API 服務

---

Express 還是可以用，但如果是新專案，可以考慮 Fastify。

更現代的設計，更好的開發體驗。
