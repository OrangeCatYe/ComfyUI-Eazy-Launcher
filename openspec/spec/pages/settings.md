# 全局设置规格

> 依据 6 张设置页截图 + `bundle_READY.js` 字段名实证

## Tab

| id | 名称 |
|---|---|
| `performance` | 性能优化 |
| `software` | 软件设置 |

## 性能优化 Tab

**硬件调度与计算策略**（5 个下拉）+ **计算精度深度设置**（可展开）
+ 3 个开关：启用共享显存、智能内存管理、强制使用 CPU 解码 VAE。

## 软件设置 Tab（6 个分区）

1. **基础运行环境**（8 项路径参数）
2. **远程访问**（局域网 + 本机 IP）
3. **网络代理设置**（开关 + 地址 + 常用端口 + 连通测试）
4. **大模型 API**（接口类型 / Base Url / Api Key / 快捷配置 / 模型名称）
5. **加速开关**（HuggingFace 镜像 / PYPI 镜像）
6. **启动行为设置**（5 开关）+ **个性设置**（通知 / 软件锁 / 小秘书 / 缩放 / 关闭行为）

## 关键字段

| 字段 | 用途 | 消费方 |
|---|---|---|
| `comfyRoot` | ComfyUI 根目录 | 首页配置态、`查询引用插件` 校验 |
| `pythonPrimary` | 主 Python 路径 | 首页、`恢复快照依赖` |
| `pythonSecondary` | 副 Python 路径 | — |
| `uiScale` | 界面缩放 | `<html data-font>` |

## 持久化

全部设置在 `SettingsProvider` 内统一读写 localStorage
（键见 `src/lib/storage.js` 的 `LS.SETTINGS`）。

**重要**：环境路径**只有这一处来源**。
页面需要读取路径时用 `useSettings()`，不要另建 localStorage 键，
否则会出现设置页与首页数据不一致。

## 基础运行环境的浏览按钮

8 个路径项各带「浏览目录 / 浏览文件」按钮，统一走 `src/lib/picker.js`：
目录用 `pickDirectory()`，Python 文件用 `pickFile('.exe')`。
选中后直接写回 `set(key, value)`。

## 其它交互

- **本机 IP 刷新**：Toast 提示已刷新
- **复制**：`navigator.clipboard.writeText`，失败降级为提示手动复制
- **网络连通测试**：按是否配置代理给出不同提示（无后端阶段为模拟结果）
- **保存配置**：设置本身即时持久化，按钮仅 Toast 反馈
- **重置默认**：`reset()` 后 Toast 反馈

## 界面缩放

`uiScale` 取值 `standard` / `large` / `xlarge`，
对应根字号 14px / 15.5px / 17px，通过 `<html data-font>` 生效。
