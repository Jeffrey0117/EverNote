---
layout: ../../layouts/PostLayout.astro
title: 資料驗證套件：Pydantic vs Zod
date: 2026-01-14T05:15
description: API 回傳的資料不可信，使用者輸入的資料更不可信。這兩個套件讓你用宣告式的方式驗證資料
tags:
  - Python
  - TypeScript
  - 資料驗證
  - 套件推薦
---

我被「API 回傳格式突然變了」坑過太多次。

```python
# 預期
{"user": {"name": "Jeff", "age": 25}}

# 實際
{"user": {"name": "Jeff", "age": "25"}}  # age 變字串了
# 或者
{"user": {"name": "Jeff"}}  # age 不見了
# 或者
{"users": [{"name": "Jeff"}]}  # 結構整個變了
```

程式沒報錯，但行為莫名其妙。

debug 兩小時，才發現是第三方 API 改了格式。

**資料驗證不是可選的，是必須的。**

---

## Python：Pydantic

[Pydantic](https://docs.pydantic.dev/) 是 Python 最受歡迎的資料驗證套件。

FastAPI 就是建立在 Pydantic 上的。

```python
from pydantic import BaseModel

class User(BaseModel):
    name: str
    age: int
    email: str | None = None

# 驗證成功
user = User(name="Jeff", age=25)
print(user.name)  # Jeff

# 驗證失敗
user = User(name="Jeff", age="not a number")
# ValidationError: age - Input should be a valid integer
```

### 自動型別轉換

Pydantic 會嘗試把資料轉成正確的型別：

```python
user = User(name="Jeff", age="25")  # 字串 "25"
print(user.age)        # 25（整數）
print(type(user.age))  # <class 'int'>
```

這在處理 API 回傳時特別有用——很多 API 會把數字當字串傳。

### 巢狀結構

```python
from pydantic import BaseModel

class Address(BaseModel):
    city: str
    country: str

class User(BaseModel):
    name: str
    address: Address

data = {
    "name": "Jeff",
    "address": {
        "city": "Taipei",
        "country": "Taiwan"
    }
}

user = User(**data)
print(user.address.city)  # Taipei
```

### 驗證規則

```python
from pydantic import BaseModel, Field, field_validator

class User(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    age: int = Field(ge=0, le=150)  # 0 <= age <= 150
    email: str

    @field_validator('email')
    @classmethod
    def email_must_contain_at(cls, v):
        if '@' not in v:
            raise ValueError('must contain @')
        return v
```

---

## TypeScript：Zod

[Zod](https://zod.dev/) 是 TypeScript 的資料驗證套件。

跟 Pydantic 的設計理念很像，但語法適合 TypeScript。

```typescript
import { z } from 'zod';

const UserSchema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email().optional(),
});

// 從 schema 推導出型別
type User = z.infer<typeof UserSchema>;

// 驗證
const user = UserSchema.parse({
    name: "Jeff",
    age: 25
});
// user 的型別自動是 User

// 驗證失敗會拋出錯誤
UserSchema.parse({ name: "Jeff", age: "not a number" });
// ZodError: Expected number, received string
```

### safeParse：不拋錯誤

如果你想自己處理錯誤：

```typescript
const result = UserSchema.safeParse(data);

if (result.success) {
    console.log(result.data);  // 驗證成功的資料
} else {
    console.log(result.error);  // ZodError 物件
}
```

### 驗證規則

```typescript
const UserSchema = z.object({
    name: z.string().min(1).max(50),
    age: z.number().int().min(0).max(150),
    email: z.string().email(),
    website: z.string().url().optional(),
});
```

### 巢狀結構

```typescript
const AddressSchema = z.object({
    city: z.string(),
    country: z.string(),
});

const UserSchema = z.object({
    name: z.string(),
    address: AddressSchema,
});

type User = z.infer<typeof UserSchema>;
// { name: string; address: { city: string; country: string } }
```

---

## 比較

| 功能 | Pydantic | Zod |
|------|----------|-----|
| 語言 | Python | TypeScript/JavaScript |
| 型別推導 | 用 Python type hints | 用 `z.infer` |
| 自動轉換 | 預設開啟 | 要用 `coerce` |
| 錯誤處理 | 拋出 ValidationError | `parse` 拋錯，`safeParse` 回傳 result |
| Schema 定義 | class 繼承 | 函數鏈式呼叫 |
| 生態系 | FastAPI, SQLModel | tRPC, React Hook Form |

### Pydantic 自動轉換 vs Zod 嚴格模式

```python
# Pydantic：預設會嘗試轉換
User(name="Jeff", age="25")  # OK，age 變成 int 25
```

```typescript
// Zod：預設不轉換
z.number().parse("25");  // Error!

// 要轉換要明確說
z.coerce.number().parse("25");  // OK，變成 25
```

我個人偏好 Pydantic 的行為——處理外部資料時，型別轉換是常見需求。

---

## 實際應用

### API 回傳驗證

```python
# Python + httpx + Pydantic
import httpx
from pydantic import BaseModel

class ApiResponse(BaseModel):
    success: bool
    data: list[dict]

async def fetch_data():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/data")
        validated = ApiResponse(**response.json())
        return validated.data
```

```typescript
// TypeScript + ky + Zod
import ky from 'ky';
import { z } from 'zod';

const ApiResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(z.record(z.unknown())),
});

async function fetchData() {
    const response = await ky.get('https://api.example.com/data').json();
    const validated = ApiResponseSchema.parse(response);
    return validated.data;
}
```

### 表單驗證

```typescript
// Zod + React Hook Form
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const FormSchema = z.object({
    email: z.string().email('請輸入有效的 email'),
    password: z.string().min(8, '密碼至少 8 個字'),
});

function LoginForm() {
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(FormSchema),
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <input {...register('email')} />
            {errors.email && <span>{errors.email.message}</span>}
            {/* ... */}
        </form>
    );
}
```

---

## 我自己的判斷

### Python

- 寫 API → **Pydantic**，FastAPI 原生支援
- 資料處理 → **Pydantic**，自動轉換很方便
- 需要嚴格驗證 → Pydantic 開 `strict=True`

### TypeScript

- 寫前端 → **Zod**，跟 React Hook Form 整合好
- 寫後端 → **Zod**，tRPC 原生支援
- 簡單驗證 → 用 TypeScript 型別就好，不用額外套件

### 什麼時候不需要這些套件

- 資料來源完全可控（自己的資料庫、自己的 API）
- 只是簡單的腳本，不是長期維護的專案
- 驗證邏輯很簡單，幾行 if-else 就搞定

但如果你要處理外部資料、使用者輸入、第三方 API——**一定要驗證**。

---

## 相關文章

- [HTTP 請求套件：httpx vs axios](/Evernote/posts/http-client-packages) — 發請求拿資料
- [FastAPI：為什麼我從 Flask 轉過來](/Evernote/posts/fastapi-why-i-switched-from-flask) — Pydantic 的實際應用
- [TypeScript 的型別不是萬能的](/Evernote/posts/typescript-runtime-types) — 為什麼編譯時型別不夠

---

資料驗證就像洗手——平常覺得麻煩，生病了才知道重要。

別等 API 改版把你的程式搞壞了，才來加驗證。
