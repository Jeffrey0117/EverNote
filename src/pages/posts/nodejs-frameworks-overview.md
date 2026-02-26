---
layout: ../../layouts/PostLayout.astro
title: Node.js 後端框架選擇指南
date: 2026-01-14T17:30
description: Express 一定要學嗎？Fastify 真的比較快？Hono 是什麼？NestJS 適合什麼場景？
tags:
  - Node.js
  - 後端
  - 框架
  - 選擇指南
---

「你 Node.js 後端用什麼框架？」

「Express。」

「為什麼？」

「因為... 大家都用？」

這是我三年前的答案。

現在再問我，我會說：「看情況。」

因為 2025 年的 Node.js 框架生態，已經不是 Express 一家獨大了。

---

## 先講結論

沒時間看完全文？這是我的判斷：

| 你的情況 | 推薦 |
|---------|------|
| 新手入門、學習後端概念 | **Express**，資源最多 |
| 新專案、追求現代開發體驗 | **Fastify**，快又有結構 |
| 跨平台部署（Cloudflare Workers、Deno、Bun） | **Hono**，到處都能跑 |
| 企業級、大型團隊、需要嚴格架構 | **NestJS**，像 Angular 一樣有規範 |
| 想要輕量、喜歡 middleware 組合 | **Koa**，Express 團隊的新作品 |

---

## Express：老大哥，但老了

[Express](https://expressjs.com/) 是 2010 年的產物。

14 年了。

那時候 Node.js 還沒有 async/await，所以 Express 用 callback：

```javascript
app.get('/user/:id', (req, res, next) => {
    db.getUser(req.params.id, (err, user) => {
        if (err) return next(err);
        res.json(user);
    });
});
```

現在當然可以用 async/await，但 Express 沒有原生支援——錯誤處理要自己包：

```javascript
app.get('/user/:id', async (req, res, next) => {
    try {
        const user = await db.getUser(req.params.id);
        res.json(user);
    } catch (err) {
        next(err);  // 忘記這行就 crash
    }
});
```

### Express 的問題

| 問題 | 說明 |
|------|------|
| async 支援不完整 | 要手動 try-catch |
| 沒有內建驗證 | 要另外裝 Joi、Zod |
| 沒有結構規範 | 每個專案長得不一樣 |
| 效能一般 | 中介軟體多了會慢 |

### 為什麼還在用

- 教學資源超多（Stack Overflow 隨便找都有答案）
- 生態系超大（什麼 middleware 都有）
- 團隊熟悉（大家都學過）

**Express 不是不能用，但如果是新專案，有更好的選擇。**

---

## Fastify：Express 的現代替代品

[Fastify](https://fastify.dev/) 是 2016 年出的，設計目標就是「比 Express 更好」。

```javascript
// async 函數自動處理錯誤
fastify.get('/user/:id', async (request, reply) => {
    const user = await db.getUser(request.params.id);
    return user;  // 直接 return，不用 res.json()
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
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
            },
        },
    },
}, async (request) => {
    return db.createUser(request.body);
});
```

Schema 不只驗證輸入，還會：
- 自動產生 OpenAPI 文件
- 加速 JSON 序列化

### 效能

Fastify 官方 benchmark：

| 框架 | req/sec |
|------|---------|
| Fastify | ~79,000 |
| Koa | ~55,000 |
| Express | ~38,000 |

**Fastify 比 Express 快 2 倍。**

為什麼快？路由用 [find-my-way](https://github.com/delvedor/find-my-way)（radix tree），比 Express 的正則匹配快。

想深入了解 Fastify，看這篇：[Fastify：比 Express 快的 Node.js 框架](/Evernote/posts/fastify-node-framework)

---

## Hono：跨 Runtime 的輕量框架

[Hono](https://hono.dev/) 是 2021 年出的新星，最近非常火。

特色：**到處都能跑**。

- Node.js
- Deno
- Bun
- Cloudflare Workers
- AWS Lambda
- Vercel Edge Functions

寫一次，部署到任何地方。

```javascript
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.text('Hello Hono!'));
app.get('/user/:id', (c) => {
    const id = c.req.param('id');
    return c.json({ id });
});

export default app;
```

### 為什麼選 Hono

- **極度輕量**：核心只有 14KB
- **跨平台**：換 runtime 不用改 code
- **Edge 優先**：為 serverless/edge 設計

### Hono vs Fastify

| 特性 | Hono | Fastify |
|------|------|---------|
| 體積 | 14KB | 較大 |
| 跨 Runtime | 支援 | 主要 Node.js |
| 生態系 | 較小 | 較成熟 |
| Schema 驗證 | 要另外加 | 內建 |
| 適合場景 | Edge/Serverless | 傳統 Server |

**如果你要部署到 Cloudflare Workers 或 Deno Deploy，Hono 是首選。**

---

## NestJS：企業級架構

[NestJS](https://nestjs.com/) 不是單純的 HTTP 框架——它是一套完整的應用框架。

如果你寫過 Angular，NestJS 會很熟悉：

```typescript
@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) {}

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Post()
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }
}
```

Decorator、依賴注入、Module 系統... 全套。

### NestJS 的特色

- **強制結構**：Controller、Service、Module 分層
- **TypeScript 優先**：從頭到尾都是 TS
- **依賴注入**：跟 Angular 一樣
- **內建一切**：驗證、ORM、WebSocket、GraphQL、微服務...

### 什麼時候用 NestJS

- 大型團隊（需要統一架構）
- 企業專案（需要長期維護）
- 微服務架構
- 需要 GraphQL、gRPC、訊息佇列

### 什麼時候不要用

- 小專案（殺雞用牛刀）
- 學習階段（太多抽象概念）
- 追求輕量（NestJS 很肥）

**NestJS 底層可以選 Express 或 Fastify。**

對，你可以用 NestJS + Fastify，享受 NestJS 的架構 + Fastify 的效能。

---

## Koa：輕量版 Express

[Koa](https://koajs.com/) 是 Express 團隊在 2013 年做的新框架。

目標：更輕量、更現代。

```javascript
const Koa = require('koa');
const app = new Koa();

app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    ctx.set('X-Response-Time', `${ms}ms`);
});

app.use(async ctx => {
    ctx.body = 'Hello World';
});

app.listen(3000);
```

Koa 沒有內建路由、沒有內建 body parser——什麼都要自己裝。

這是優點也是缺點：
- 優點：極度輕量，只裝你需要的
- 缺點：每個專案都要自己組裝

**Koa 適合喜歡自己掌控一切的開發者。**

---

## 框架比較表

| 框架 | 效能 | 學習曲線 | 生態系 | TypeScript | 適合場景 |
|------|------|----------|--------|------------|----------|
| [Express](https://expressjs.com/) | 中 | 低 | 超大 | 支援 | 入門、小專案 |
| [Fastify](https://fastify.dev/) | 高 | 中 | 大 | 優秀 | API 服務、新專案 |
| [Hono](https://hono.dev/) | 極高 | 低 | 中 | 優秀 | Edge、Serverless |
| [NestJS](https://nestjs.com/) | 中 | 高 | 大 | 原生 | 企業、大型專案 |
| [Koa](https://koajs.com/) | 高 | 中 | 中 | 支援 | 輕量、自己組裝 |

---

## 2025 年的趨勢

### Fastify 持續成長

越來越多人從 Express 遷移到 Fastify。

原因很簡單：一樣的概念，但更快、更現代。

### Hono 快速崛起

Cloudflare Workers、Deno Deploy、Bun... 這些新 runtime 越來越多人用。

Hono 的「寫一次，到處跑」正好滿足這個需求。

### NestJS 穩定成長

企業級專案越來越多用 NestJS。

統一的架構讓大型團隊更好協作。

### Express 還是老大

雖然說「老了」，但 Express 的市佔率還是最高。

太多現有專案、太多教學資源、太多人熟悉。

短期內不會消失。

---

## 我自己的選擇

### 新專案

**Fastify** 或 **Hono**。

Fastify 適合傳統 server 部署。

Hono 適合 serverless/edge 部署。

### 大型企業專案

**NestJS**。

架構清晰，團隊好協作。

### 學習階段

**Express**。

資源最多，概念最基礎。

學會 Express 的概念，換到其他框架很快。

### 要不要用 Koa

我自己不太用。

Koa 太輕量了，什麼都要自己裝，不如直接用 Fastify。

---

## 結語

Express 還能用嗎？能。

但 2025 年開新專案，有更好的選擇。

**不要因為「大家都用」就選 Express。**

想清楚你的需求：
- 追求效能？**Fastify**
- 跨平台部署？**Hono**
- 企業架構？**NestJS**
- 學習入門？**Express**

選對工具，事半功倍。

---

## 相關文章

- [Fastify：比 Express 快的 Node.js 框架](/Evernote/posts/fastify-node-framework) — Fastify 詳細介紹
- [FastAPI：為什麼我從 Flask 轉過來](/Evernote/posts/fastapi-why-i-switched-from-flask) — Python 版的框架選擇
- [前端打包工具，先搞懂在打包什麼](/Evernote/posts/bundler-overview) — 另一個「選擇指南」風格的文章
