---
layout: ../../layouts/PostLayout.astro
title: 為什麼大家都在抄 Cargo
date: 2026-01-14T01:40
description: Rust 的套件管理做對了什麼，以及其他語言為什麼學不來
tags:
  - Rust
  - 套件管理
  - 開發工具
---

前陣子幫同事 debug 一個詭異的問題：明明本機跑得好好的 Python 專案，部署到 server 就爆掉。

查了兩小時，原因是 `pip freeze` 的版本跟實際安裝的不一樣。

那天晚上我把 Rust 專案的 `Cargo.lock` commit 上去的時候，突然很感慨。

**為什麼 Cargo 就不會有這種鳥事？**

## 我用過的套件管理，每個都讓我罵過

[npm](https://www.npmjs.com/) 裝個套件要等半天，node_modules 肥到不行。

[pip](https://pip.pypa.io/) 沒有 lockfile，環境一換就炸。

Go 的 `go get` 一開始連版本管理都沒有，我 2018 年用的時候，同事換台電腦 build 就壞掉。

但 Rust 的 [Cargo](https://doc.rust-lang.org/cargo/)？幾乎沒聽過有人罵。

Cargo 在 Rust 社群裡被當成標竿，其他語言的新工具都在學它。

Python 的 [uv](https://github.com/astral-sh/uv) 說自己要當「Python 的 Cargo」，JavaScript 的 [Bun](https://bun.sh/) 想把所有東西包在一起，Go 後來補上的 [go mod](https://go.dev/blog/using-go-modules) 也學了一部分。

**Cargo 到底做對了什麼？**

## 我花了多少時間在「選工具」

去年接手一個 Python 專案，第一個問題不是 code 怎麼寫，是：

「這專案用 pip 還是 poetry？」

「有 requirements.txt 也有 pyproject.toml，到底看哪個？」

「為什麼有人用 pipenv 有人用 pdm？」

光是搞清楚該用什麼工具，就花了半天。

然後我打開 Rust 專案——什麼都不用選，**Cargo 就是答案**。

不用比較，不用選，官方出品，裝完 Rust 就有。

這不是因為 Rust 社群比較無聊不愛造輪子，是因為 Cargo 從一開始就設計得夠好，好到沒有人想重寫一個。

## 不只是套件管理

以前寫 JavaScript，我的 package.json scripts 長這樣：

```json
"scripts": {
  "build": "tsc && webpack",
  "test": "jest --coverage",
  "lint": "eslint . && prettier --check .",
  "prepublish": "npm run build && npm run test"
}
```

光是記這些指令的組合就夠累了。

換到 Rust 之後，什麼都不用組合：

| 指令 | 功能 |
|------|------|
| `cargo build` | 編譯專案 |
| `cargo run` | 編譯 + 執行 |
| `cargo test` | 跑測試 |
| `cargo bench` | 跑效能測試 |
| `cargo doc` | 產生文件 |
| `cargo publish` | 發布到 crates.io |
| `cargo fmt` | 格式化程式碼 |
| `cargo clippy` | 靜態程式碼分析 |

一個指令搞定，不用記一堆工具的名字。

JavaScript 專案根目錄長這樣：

```
package.json
package-lock.json
tsconfig.json
vite.config.ts
vitest.config.ts
.eslintrc.js
.prettierrc
```

7 個設定檔，分別給 7 個工具。

Rust 只要一個 `Cargo.toml`。

詳細的 Python 套件管理比較可以看這篇：[Python 套件管理的混亂現狀](/Evernote/posts/python-package-managers)

## Cargo.toml 清楚到不行

來看看各語言的設定檔：

**JavaScript 的 package.json**：

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  },
  "scripts": {
    "build": "tsc",
    "test": "jest"
  }
}
```

JSON 格式，不能寫註解，dependencies 和 devDependencies 分兩個地方寫。

**Python 的 pyproject.toml**（如果你用 poetry）：

```toml
[tool.poetry]
name = "my-app"
version = "1.0.0"

[tool.poetry.dependencies]
python = "^3.10"
requests = "^2.28.0"

[tool.poetry.dev-dependencies]
pytest = "^7.0.0"
```

格式不錯，但每個工具（poetry、pdm、hatch）的寫法都不一樣。

**Rust 的 Cargo.toml**：

```toml
[package]
name = "my-app"
version = "1.0.0"
edition = "2021"  # Rust 版本，決定可用的語法特性

[dependencies]
serde = "1.0"  # 簡寫，等同 { version = "1.0" }
tokio = { version = "1.0", features = ["full"] }  # 啟用所有功能

[dev-dependencies]  # 只在開發時用，不會打包進最終產物
criterion = "0.5"
```

TOML 格式，可以寫註解，結構清晰。

而且這個格式是**官方標準**，不會有 poetry 和 pdm 寫法不一樣的問題。

## Lockfile 是預設行為

Cargo 會自動產生 `Cargo.lock`，記錄所有依賴的確切版本。

這不是什麼創新功能，但重點是**預設就有**。

npm 以前沒有 package-lock.json，後來才加上。

pip 到現在都沒有內建 lockfile，要靠 pip-tools 或 poetry 補。

Go 的 go.sum 也是後來才加的。

Cargo 從 Day 1 就有 lockfile，而且預設就會用。

不用特別設定，不用跑額外指令，裝完就有。

這種「正確的行為是預設值」的設計哲學，讓我少踩很多坑。

## crates.io 生態健康

[crates.io](https://crates.io/) 是 Rust 的官方套件倉庫，跟 npm 或 PyPI 比起來，有幾個優點：

1. **統一的文件系統** — 每個套件都有自動產生的 [docs.rs](https://docs.rs/) 文件，格式一致
2. **下載量透明** — 可以看到每個套件的下載趨勢，判斷是否活躍
3. **不能刪除已發布的版本** — 避免 [left-pad 事件](https://blog.npmjs.org/post/141577284765/kik-left-pad-and-npm) 重演

left-pad 是 npm 上一個只有 11 行的套件，作者一氣之下刪掉，結果半個網路都壞了。

crates.io 不讓你這樣搞。

## 我看到的趨勢

2022 年，Astral 做了 [Ruff](https://github.com/astral-sh/ruff)，用 Rust 寫的 Python linter，快到不可思議。

2023 年，他們又做了 [uv](https://github.com/astral-sh/uv)，目標是「Python 的 Cargo」。

同一時間，[Bun](https://bun.sh/) 也在喊「我要取代 npm + node + webpack + jest」。

這些新工具有個共同點：**都在抄 Cargo 的作業**。

### uv 學了什麼

uv 用 Rust 寫的，速度比 pip 快 10-100 倍。

套件安裝、虛擬環境管理、版本鎖定全部整合在一起：

```bash
# 建立虛擬環境 + 安裝依賴，一條指令
uv sync
```

這跟 `cargo build` 自動處理依賴的邏輯很像。

更多 Python 套件管理工具的比較：[Python 套件管理的混亂現狀](/Evernote/posts/python-package-managers)

### Bun 學了什麼

Bun 野心更大，不只是套件管理器，還包了 runtime（執行環境）、bundler（打包工具）、test runner（測試執行器）：

```bash
bun install  # 裝套件
bun run      # 執行
bun test     # 測試
bun build    # 打包
```

這不就是 Cargo 的 `cargo build`、`cargo run`、`cargo test` 嗎？

Bun 基本上就是在說：npm + node + webpack + jest 太多了，我全包。

跟 Cargo 的設計哲學一模一樣。

JavaScript 套件管理的詳細比較：[npm vs yarn vs pnpm vs bun](/Evernote/posts/nodejs-package-managers)

### Go 學了什麼

Go 一開始那個 `go get` 根本是鬧劇——直接從 GitHub 拉 code，沒有版本鎖定，沒有 lockfile。

後來補上了 [go mod](https://go.dev/blog/using-go-modules)，加了 `go.mod` 和 `go.sum`，終於有版本管理了。

```bash
go mod init    # 初始化
go mod tidy    # 整理依賴
```

這些功能 Cargo 從 2015 年就有了，Go 到 2018 年才補上。

但 Go 的 `go build`、`go test`、`go run` 本來就有，這點跟 Cargo 很像，都是官方工具全包。

## 為什麼其他語言學不來

看起來大家都想學 Cargo，但為什麼學不好？

**歷史包袱。**

Rust 是 2015 年才 1.0 的新語言，Cargo 從一開始就是標準配備。

但 Python 是 1991 年的語言，JavaScript 是 1995 年的。

那個年代「套件管理」根本不是優先考量。網路沒那麼發達，開源生態沒那麼大，大家寫程式都是自己從頭寫。

後來需要套件管理了，各種工具就長出來了：

| 年份 | Python 工具 | 解決的問題 |
|------|-------------|------------|
| 2008 | pip | 取代 easy_install |
| 2011 | virtualenv | 隔離環境 |
| 2017 | pipenv | pip + virtualenv 整合 |
| 2018 | poetry | lockfile + build 整合 |
| 2024 | uv | 以上全部 + 速度 |

每個工具都在修前一個工具的問題，但沒有人能統一。

npm 是 Node.js 的官方工具，但 yarn 和 pnpm 還是長出來了。

Python 連官方工具都沒有共識，pip 只是「最多人用」而不是「官方標準」。

Rust 不一樣。

Cargo 從一開始就是跟 Rust 綁在一起的，安裝 Rust 就有 Cargo，沒有第二個選項。

**沒有歷史包袱，一開始就做對，大家就不會想換。**

所以 Python 和 JavaScript 的新工具只能說「我要當這個語言的 Cargo」，但永遠沒辦法真的變成唯一選項。

Windows 的套件管理也有類似的問題，可以參考：[Windows 套件管理：winget vs scoop](/Evernote/posts/windows-package-managers)

---

Deno 是另一個有趣的例子。

它直接不要套件管理器，用 URL import，像瀏覽器一樣。

這算是另一種「不想重蹈覆轍」的方式——既然套件管理那麼亂，那乾脆不要有。

詳情見：[Deno 為什麼不需要 node_modules](/Evernote/posts/deno-no-package-manager)

---

每次有人問我「為什麼要學 Rust」，我都會說：

「因為 Cargo 讓我知道，套件管理本來就不該那麼痛苦。」

官方標準、全功能整合、清楚的設定檔、預設有 lockfile、健康的生態系——這些單獨拿出來都不是什麼創新，但全部組合在一起，就是其他語言羨慕不來的體驗。

**其他語言的新工具都在追，但 Cargo 從 2015 年就站在終點等了。**
