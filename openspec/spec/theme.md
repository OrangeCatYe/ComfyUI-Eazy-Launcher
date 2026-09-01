# 主题 Token 规格

## 变量清单

提取自原版 `var(--x)` 用法，共 59 处引用，去重后 12 个核心变量。
原版通过 `style.setProperty` 运行时注入，此处改为 `[data-theme]` 静态声明，语义一一对应。

| 变量 | 用途 | 浅色 | 深色 |
|---|---|---|---|
| `--bg-main` | 页面底色 | `#f1f5f9` | `#0b1120` |
| `--bg-card` | 卡片底色 | `#ffffff` | `#111a2e` |
| `--bg-card-lighter` | 卡片内浅层 | `#f8fafc` | `#172033` |
| `--bg-glass-strong` | 玻璃拟态按钮 | `rgba(255,255,255,.8)` | `rgba(30,41,59,.7)` |
| `--bg-hover` | 悬浮底色 | `rgba(15,23,42,.04)` | `rgba(255,255,255,.06)` |
| `--bg-modal` | 弹窗底色 | `#ffffff` | `#111a2e` |
| `--bg-sidebar` | 侧边栏底色 | `rgba(255,255,255,.7)` | `rgba(17,26,46,.72)` |
| `--border-main` | 主描边 | `rgba(15,23,42,.08)` | `rgba(255,255,255,.08)` |
| `--text-main` | 主文字 | `#0f172a` | `#e2e8f0` |
| `--text-sub` | 次文字 | `#64748b` | `#94a3b8` |
| `--text-strong` | 强调文字 | `#0f172a` | `#f8fafc` |
| `--text-log-warning` | 终端警告 | `#b45309` | `#fbbf24` |
| `--shadow-color` | 投影色 | `rgba(15,23,42,.06)` | `rgba(0,0,0,.4)` |

## 扩展 Token（复刻版补充，原版用 Tailwind 色板直接写死）

| 变量 | 浅色 | 深色 |
|---|---|---|
| `--accent` | `#4f46e5` | `#6366f1` |
| `--accent-hover` | `#4338ca` | `#818cf8` |
| `--accent-soft` | `rgba(79,70,229,.1)` | `rgba(99,102,241,.16)` |
| `--success` | `#059669` | `#10b981` |
| `--warning` | `#d97706` | `#f59e0b` |
| `--danger` | `#e11d48` | `#f43f5e` |
| `--info` | `#0284c7` | `#38bdf8` |

## 字体缩放

沿用原版 localStorage 键 `ui_font_scale`，通过 `[data-font]` 在 `<html>` 生效。

| 取值 | 根字号 |
|---|---|
| `standard` | 14px |
| `large` | 15.5px |
| `xlarge` | 17px |

## 通用工具类

| 类 | 作用 |
|---|---|
| `.card-surface` | 卡片表面（底色 + 描边 + 投影） |
| `.glass-surface` | 玻璃拟态（半透明 + backdrop-blur） |
| `.section-title` | 区块标题（text-xs / font-black / tracking-[.2em] / uppercase） |
| `.press` | 按压缩放 `active:scale-95`，原版大量使用 |
| `.tnum` | 等宽数字，用于版本号、数值统计 |

## 动效基线（P2 待校准）

当前统一使用 `cubic-bezier(0.16, 1, 0.3, 1)`，时长：

| 动效 | 时长 |
|---|---|
| `fade-in` | 0.2s |
| `scale-in`（弹窗） | 0.2s |
| `slide-up` | 0.24s |
| `slide-in-right` | 0.28s |
