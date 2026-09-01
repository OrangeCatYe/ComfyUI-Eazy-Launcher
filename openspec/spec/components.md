# 通用组件规格

所有组件位于 `src/components/ui/`，规格来源为原版截图 + 源码类名。

## Button

文件：`src/components/ui/Button.jsx`

五种变体，对应截图中的实际用法：

| 变体 | 用途 | 观感 |
|---|---|---|
| `primary` | 主操作（一键启动、保存） | 渐变 indigo → indigo-600 |
| `glass` | 玻璃拟态次级（原版最多） | 半透明底 + 描边 + shadow-lg |
| `ghost` | 无边框纯文字 | 仅 hover 底色 |
| `danger` | 危险操作（卸载选中） | hover 变 rose-600 |
| `outline` | 描边按钮 | 强描边 |

尺寸：`sm`（px-3 py-1.5）/ `md`（px-4 py-2.5）/ `lg`（w-full py-3.5）

统一特征：`rounded-xl` + `font-black` + `text-xs` + `active:scale-95`（`.press`）

## Card

文件：`src/components/ui/Card.jsx`

`rounded-[2rem]` + `border` + `shadow-xl`，内部 padding 默认 `p-6`。

## SectionTitle

文件：`src/components/ui/Card.jsx`

区块标题。原版观感：

```
text-xs font-black text-[var(--text-sub)] uppercase tracking-[0.2em]
```

常带 14px 图标，支持右侧 `action` 插槽。

## Modal

文件：`src/components/ui/Modal.jsx`

- 遮罩：`bg-black/40` + `backdrop-blur-2xl`
- 容器：`rounded-[2rem]` + `animate-scale-in`
- 头部：可选图标（36px 圆角方块）+ 标题 + 说明
- 底部：`bg-card-lighter` + 上描边，承载操作按钮
- 尺寸：`sm` / `md` / `lg` / `xl`

**ConfirmModal**：截图实证，插件「切换」为 `取消 / 确认` 两按钮，无图标。

## Toggle

文件：`src/components/ui/Toggle.jsx`

胶囊轨道 44×24px + 20px 圆钮，开启态 `bg-accent`。支持 label + description。

## Toast

文件：`src/components/ui/Toast.jsx`

截图实证文案形态：

```
操作成功
回滚成功（无需安装依赖）
       [ 确定 ]
```

居中图标（34px）+ 标题 + 说明 + 全宽确定按钮。
类型：`success` / `alert` / `error` / `info`

## 表单控件

文件：`src/components/ui/Input.jsx`

| 组件 | 用途 |
|---|---|
| `SearchInput` | 搜索框，左放大镜，有值时右清除按钮 |
| `TextInput` | 单行输入 |
| `TextArea` | 多行输入 |
| `Field` | 字段容器（标签 + 控件 + 说明） |

统一观感：`rounded-xl` + `bg-card-lighter` + 聚焦时 `border-accent` + `ring-2 accent-soft`

## 展示组件

文件：`src/components/ui/Badge.jsx`

| 组件 | 用途 |
|---|---|
| `Badge` | 状态标签，6 种色调 |
| `EmptyState` | 空数据占位（本项目默认状态） |
| `StatItem` | 键值信息行 |

截图实证的 Badge 文案：`有新版本` / `当前版本` / `已在使用` / `本地插件` / `支持视觉` / `本地保存`
