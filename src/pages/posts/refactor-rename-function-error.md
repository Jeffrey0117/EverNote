---
layout: ../../layouts/PostLayout.astro
title: 重構改名忘記全改，整個畫面黑掉
date: 2026-01-12T23:55
description: aiService.init is not a function 背後的坑，以及為什麼你需要 Error Boundary
tags:
  - TypeScript
  - React
  - Debug
---

在幫 Unifold 加 DeepSeek API 支援的時候，順手重構了一下 AIService。

原本只有一個 `init()` 方法初始化 Gemini，現在要支援兩個 provider，就把它改成 `initGemini()` 和 `initDeepSeek()`。

改完，存檔，HMR 熱更新。

畫面全黑。

## 錯誤訊息

打開 DevTools，Console 噴了一堆紅字：

```
Uncaught TypeError: aiService.init is not a function
    at App.tsx:28:23

An error occurred in the <App> component.
Consider adding an error boundary to your tree to customize error handling behavior.
```

React 還很貼心地提醒你：**加個 Error Boundary 吧**。

## 為什麼會黑屏

React 的錯誤處理機制是這樣的：如果 render 過程中有任何 JavaScript 錯誤沒被 catch，**整個 component tree 都會 unmount**。

就是說，一個 component 爆掉，整個畫面都會消失。

這其實是故意的。React 團隊的邏輯是：**與其顯示壞掉的 UI 讓使用者操作，不如直接不顯示**。壞掉的 UI 可能導致使用者誤操作，造成更大的問題。

但「什麼都不顯示」對開發者來說很痛苦，你只會看到一片黑（或白），不知道發生什麼事。

## Error Boundary 是什麼

[Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) 是 React 提供的一種機制，讓你可以「接住」子元件的錯誤，顯示 fallback UI，而不是讓整個畫面掛掉。

長這樣：

```tsx
class ErrorBoundary extends React.Component {
    state = { hasError: false, error: null }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-red-400">
                    <h2>出錯了</h2>
                    <pre>{this.state.error?.message}</pre>
                </div>
            )
        }
        return this.props.children
    }
}
```

然後把你的 App 包起來：

```tsx
<ErrorBoundary>
    <App />
</ErrorBoundary>
```

這樣就算 App 爆掉，至少會顯示「出錯了」和錯誤訊息，不會整個黑屏。

### 為什麼一定要用 class component

你可能注意到了，Error Boundary **只能用 class component 寫**。

這是因為 `getDerivedStateFromError` 和 `componentDidCatch` 這兩個生命週期方法，React 到現在都沒有提供對應的 Hook。官方說「未來可能會加」，但已經講了好幾年了。

如果不想自己寫 class，可以用 [react-error-boundary](https://github.com/bvaughn/react-error-boundary) 這個 library，它包裝好了，用起來比較舒服。

## 回到原本的問題

好，Error Boundary 是用來兜底的。但根本問題還是要解決：**為什麼 `aiService.init` 會變成 undefined？**

原本的 code 長這樣：

```typescript
// AIService.ts（舊）
class AIService {
    init(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
    }
}
```

App.tsx 這樣用：

```tsx
useEffect(() => {
    const key = localStorage.getItem('gemini_api_key')
    if (key) {
        aiService.init(key)
    }
}, [])
```

重構之後，`init()` 改名了：

```typescript
// AIService.ts（新）
class AIService {
    initGemini(apiKey: string) { /* ... */ }
    initDeepSeek(apiKey: string) { /* ... */ }
}
```

但 App.tsx 還在 call `aiService.init(key)`——這個方法已經不存在了。

## TypeScript 怎麼沒擋住

這就是靠北的地方。

TypeScript 的型別檢查是靜態的，在編譯階段。但 Vite 的 HMR 有時候會跳過完整的型別檢查，直接熱更新。

如果你改了 AIService.ts 但沒動 App.tsx，Vite 可能只重新編譯 AIService.ts。App.tsx 用的是舊的 import cache，根本不知道方法簽名變了。

等到 runtime 真的去 call，才發現方法不存在。

## 怎麼避免

改名的時候用 **IDE 的 Rename Symbol**（VSCode 按 F2），會自動幫你改所有引用的地方。不要手動改名然後忘記改其他地方。

如果已經改了，重構完跑一次 `npm run build`。完整的 TypeScript 編譯會抓到所有型別錯誤，HMR 有時候會漏。

---

這次踩的坑其實兩層：重構沒改乾淨是一層，沒有 Error Boundary 導致黑屏是另一層。

前者靠習慣避免，後者靠基礎建設。Error Boundary 就像安全氣囊，平常不會用到，但真的出事的時候可以救你一命。
