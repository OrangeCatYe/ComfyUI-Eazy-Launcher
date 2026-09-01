# 通用区块组件规格

> 七个主页面共用的结构件。所有页面遵循同一套区块语言。

## PageHeader

页面主标题区，位于内容区顶部。

```jsx
<PageHeader title="系统与网络配置" desc="系统路径，代理与偏好设置" />
```

- 标题：`text-2xl font-black text-[var(--text-main)]`
- 描述：`mt-1 text-xs text-[var(--text-sub)]`
- 与内容区间距：`mb-6`

## SectionCard

带标题的内容区块，页面内主要分割单位。

```jsx
<SectionCard title="基础运行环境" desc="ComfyUI 运行所需的核心路径">
  ...
</SectionCard>
```

- 容器：`rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow`
- 内边距：`p-5`
- 区块间距：`space-y-5`
- 标题：`section-title` 类（大写、字距 0.2em）
- 可选 `desc`：标题右侧小字说明

## FieldRow

表单行，用于设置类页面。

```jsx
<FieldRow label="ComfyUI 根目录" hint="ComfyUI 的主目录">
  <Input value={...} />
  <Button variant="glass" size="sm">浏览目录</Button>
</FieldRow>
```

- 布局：`flex items-center gap-3`
- 标签宽度：`w-32 shrink-0`，右对齐或左对齐按页面统一（设置页左对齐）
- `hint`：标签下方 `text-[11px] text-[var(--text-sub)]`

## EmptyState

空数据占位，**S2/S3 所有列表默认走此组件**。

```jsx
<EmptyState icon={PackageSearch} title="暂无插件" desc="点击右上角「安装新插件」开始" />
```

- 图标容器：`w-14 h-14 rounded-2xl bg-[var(--bg-card-lighter)]`
- 标题：`text-sm font-black text-[var(--text-main)]`
- 描述：`text-xs text-[var(--text-sub)] max-w-xs`
- 垂直居中，`py-12`

## StatCard

首页与概览类数据卡。

```jsx
<StatCard icon={Cpu} label="内核版本" value="v0.33.1" />
```

- 容器：`rounded-2xl border bg-[var(--bg-card)] p-4`
- 图标：`w-9 h-9 rounded-xl` 渐变底
- 值：`text-lg font-black tnum`
- 标签：`text-[11px] text-[var(--text-sub)]`

## Toolbar

列表页顶部操作条。

```jsx
<Toolbar count={3} countUnit="个已安装" actions={[...]} />
```

- 左侧计数：`text-xs font-black text-[var(--text-sub)]`
- 右侧按钮组：`flex gap-2`，`flex-wrap`
- 与列表间距：`mb-4`

## 表格

内核管理用表格，其余页面用卡片列表。

- 表头：`bg-[var(--bg-card-lighter)] text-[11px] font-black uppercase tracking-wider`
- 行：`border-t border-[var(--border-main)]`
- 悬浮：`hover:bg-[var(--bg-hover)]`

## 间距基线

| 用途 | 值 |
|---|---|
| 页面外边距 | `p-6` |
| 区块间距 | `space-y-5` |
| 卡片内边距 | `p-5` |
| 按钮组间距 | `gap-2` |
| 表单行间距 | `space-y-3` |
