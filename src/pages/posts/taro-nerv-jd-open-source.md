---
layout: ../../layouts/PostLayout.astro
title: Taro 和 Nerv：京東的開源專案
date: 2026-01-14T06:15
description: 在 GitHub 上看到京東開源的 Taro 和 Nerv，一個是跨平台小程式框架，一個是輕量 React 替代品
tags:
  - 前端
  - React
  - 小程式
  - 開源
---

在 GitHub 上逛到京東（JD.com）的開源專案。

[Taro](https://github.com/NervJS/taro) 有 35k+ stars，[Nerv](https://github.com/NervJS/nerv) 有 5k+ stars。

都是 NervJS 這個組織的，看起來是京東前端團隊在維護。

---

## Nerv：輕量版 React

Nerv 是一個跟 React 相容的輕量替代品。

```javascript
// 跟 React 一樣的寫法
import Nerv from 'nervjs';

class App extends Nerv.Component {
    state = { count: 0 };

    render() {
        return (
            <div>
                <p>Count: {this.state.count}</p>
                <button onClick={() => this.setState({ count: this.state.count + 1 })}>
                    +1
                </button>
            </div>
        );
    }
}

Nerv.render(<App />, document.getElementById('root'));
```

### 為什麼要做這個

| 對比 | React | Nerv |
|------|-------|------|
| 大小 | ~40KB gzipped | ~9KB gzipped |
| IE8 支援 | 不支援 | 支援 |
| API | 完整 | 相容大部分 |

京東的業務需要支援 IE8（中國市場的老電腦），React 16+ 不支援了，所以他們自己做了一個。

### 跟 Preact 的差別

Preact 也是輕量 React 替代品，我等等會講。

簡單說：

- **Nerv**：更強調 IE 相容性，京東自己用
- **Preact**：更輕量，社群更活躍

如果你不需要 IE8 支援，Preact 可能是更好的選擇。

---

## Taro：寫一次，跑多個平台

Taro 是重點。

中國有很多「小程式」平台：微信小程式、支付寶小程式、百度小程式、抖音小程式...

每個平台的 API 不一樣，要分別開發很痛苦。

**Taro 讓你用 React 語法寫一次，編譯到多個平台。**

```javascript
// 用 React 語法寫
import { View, Text, Button } from '@tarojs/components';
import { useState } from 'react';

function App() {
    const [count, setCount] = useState(0);

    return (
        <View>
            <Text>Count: {count}</Text>
            <Button onClick={() => setCount(count + 1)}>+1</Button>
        </View>
    );
}
```

然後：

```bash
# 編譯到微信小程式
taro build --type weapp

# 編譯到支付寶小程式
taro build --type alipay

# 編譯到 H5 網頁
taro build --type h5

# 編譯到 React Native
taro build --type rn
```

### 支援的平台

| 平台 | 說明 |
|------|------|
| 微信小程式 | 最主要的 |
| 支付寶小程式 | |
| 百度小程式 | |
| 抖音小程式 | |
| QQ 小程式 | |
| 京東小程式 | 京東自己的 |
| H5 | 普通網頁 |
| React Native | 手機 App |
| 鴻蒙 | 華為的系統 |

### 為什麼需要這個

如果你的業務只在台灣，可能不需要。

但如果要做中國市場，小程式是必須的，而且可能要同時上多個平台。

Taro 讓你不用每個平台都重寫一遍。

---

## 這類專案的共同點

Nerv、Taro 這類專案有個共同特徵：**大公司為了解決自己的問題而開源的**。

京東有：
- 大量老舊瀏覽器用戶（所以做了 Nerv）
- 多個小程式平台要維護（所以做了 Taro）

類似的例子：

| 公司 | 開源專案 | 解決的問題 |
|------|----------|------------|
| Facebook | React | 複雜 UI 狀態管理 |
| Google | Angular | 企業級前端架構 |
| 阿里巴巴 | Ant Design | 統一的 UI 元件庫 |
| 字節跳動 | Semi Design | 同上 |
| 京東 | Taro | 跨小程式平台 |

這些專案通常：
- 解決真實的大規模問題
- 有專職團隊維護
- 但如果公司策略改變，可能會停止維護

---

## 我自己的判斷

### Nerv

- 需要 IE8 支援 → 可以考慮
- 不需要 → 用 React 或 Preact

現在還需要 IE8 的場景越來越少了，這個專案的實用性在下降。

### Taro

- 要做中國市場的小程式 → **值得用**
- 只做台灣市場 → 不需要
- 只做微信小程式 → 可以直接用微信原生，不用 Taro

Taro 的價值在「跨平台」，如果只做一個平台，原生開發可能更簡單。

### 類似的跨平台方案

| 框架 | 技術 | 特點 |
|------|------|------|
| Taro | React | 京東出品，生態較完整 |
| uni-app | Vue | DCloud 出品，Vue 生態 |
| Remax | React | 阿里出品 |

如果你熟 Vue，uni-app 可能更適合。

---

## 相關文章

- [Preact 和 Svelte：輕量前端框架](/Evernote/posts/preact-svelte-lightweight-frameworks) — 其他輕量替代品
- [跨平台桌面開發](/Evernote/posts/cross-platform-desktop-overview) — 桌面端的跨平台方案

---

在 GitHub 上逛到有趣的專案，不一定要用，但了解它解決什麼問題是有價值的。

這些大公司的開源專案，通常都是為了解決真實的大規模問題。
