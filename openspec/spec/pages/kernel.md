# 内核管理规格

> 依据「内核管理.png」

## 结构

1. **当前远程仓库**：仓库地址 + 切换仓库 + 刷新列表 + 当前内核版本徽标
2. **版本列表**：Tab 切换 + 表格 + 右上角「自动安装依赖」开关

## Tab

| id | 文案 |
|---|---|
| `releases` | 稳定版 (Releases) |
| `commits` | 开发版 (Commits) |

两个 Tab 共用同一张表，切换仅改变数据源。

## 表格列

版本标识 | 更新说明 | 发布日期 | 操作

- 表头：`bg-[var(--bg-card-lighter)] text-[11px] font-black uppercase tracking-wider`
- 行：`border-t`，`hover:bg-[var(--bg-hover)]`
- 当前版本行：显示绿色「当前使用」徽标，而非「切换」按钮

## 空态

`EmptyState`：暂无版本数据 / 点击「刷新列表」从远程仓库拉取可用版本。

## 数据

`versions=[]`、`currentVersion="v0.33.1"`、`repoUrl` 为 Comfy-Org 官方仓库。
真实数据接入后表格渲染，当前为空态。
