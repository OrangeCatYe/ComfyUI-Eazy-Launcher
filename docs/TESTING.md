# 自动化测试与验收标准

> 本文件是 `kk-launcher-clone` 的测试基准。测试目标是 `src/lib/` 下**可在纯前端真实计算**的逻辑，
> 与 openspec「数据真实性约定」一致：只测能真实验证的，不为 UI 渲染或需后端的能力伪造断言。

## 一、如何运行

```bash
npm install          # 首次需装 vitest / jsdom（内网镜像）
npm test             # 跑全部用例一次（CI 用）
npm run test:watch   # 改代码自动重跑（开发用）
npm run test:cov     # 带覆盖率报告，产物在 coverage/index.html
```

测试框架：**Vitest 2.x + jsdom**。用例目录 `tests/`，匹配 `tests/**/*.test.js`。
配置在 `vite.config.js` 的 `test` 块，与构建共用一份别名，无需单独维护。

## 二、当前覆盖范围（10 个模块 / 72 个用例，全部通过）

| 测试文件 | 被测模块 | 用例数 | 验证的核心行为 |
|---|---|---|---|
| `tests/api.test.js` | `parseRequirements` / `compareSnapshots` | 11 | 依赖文本解析、环境差异比较 |
| `tests/findLibInPlugins.test.js` | `findLibInPlugins` | 5 | 扫描 custom_nodes 查引用插件 |
| `tests/storage.test.js` | `storage.js` | 5 | localStorage 键名与读写往返 |
| `tests/backend.test.js` | `backend.js` | 8 | Eel 桥接、无后端不假装成功 |
| `tests/cx.test.js` | `cx.js` | 5 | className 合并、falsy 过滤 |
| `tests/logger.test.js` | `logger.js` | 9 | 日志归一化、多行展开、对象 bug 防回归 |
| `tests/picker.test.js` | `picker.js` | 7 | 后端优先路径、能力探测 |
| `tests/envScan.test.js` | `envScan.js` | 12 | 空结果结构、体积格式化、扫描摘要、后缀常量 |
| `tests/dupScan.test.js` | `dupScan.js` | 8 | 重复检测 name/hash 两模式（node 环境） |
| `tests/icons.test.js` | `icons.js` | 2 | 图标导出完整性守卫 |

## 三、验收标准（逐条，可针对性修改）

### A. 依赖解析 parseRequirements
- A1 `pkg==版本` 能解析，且包名统一小写。
- A2 支持 `>= <= ~= != > <` 六种约束符，取到纯版本号。
- A3 纯包名（无版本）的 spec 为空字符串 `''`。
- A4 注释行 `#`、空行、`-r`/`--` 开头的引用行被忽略。
- A5 行内注释 `pkg==2.0  # xxx` 被剥离。
- A6 空文本或 null 返回空 Map，不抛错。

### B. 环境比较 compareSnapshots
- B1 目标独有的包归入 `added`。
- B2 基准独有的包归入 `removed`。
- B3 同名不同版本归入 `changed`，带 `from` / `to`。
- B4 两份内容等价（仅顺序不同）时三组均为空。
- B5 各组结果按字典序稳定排序。

### C. 查询引用插件 findLibInPlugins
- C1 库名为空 → 返回原因「库名为空」，不扫描。
- C2 无目录句柄 → 提示「尚未选择 ComfyUI 目录」。
- C3 命中依赖该库的插件，结果按名排序。
- C4 无插件依赖 → 返回空数组 + 已扫描数量说明，**不编造结果**。
- C5 库名匹配大小写不敏感。

### D. 本地存储 storage
- D1 `LS` 键名严格沿用原版（`ui_theme` / `kk_settings` / `kk_tools_hub_order` / `kk_local_env`）。
- D2 写对象读回等价对象（JSON 往返）。
- D3 写字符串按原样返回。
- D4 读不存在的键返回 fallback。
- D5 存储值非法 JSON 时按原始字符串返回，不抛错。

### E. 后端桥接 backend（数据真实性铁律）
- E1 未注入 `window.eel` → 判定 browser 模式。
- E2 注入后 → 判定 eel 模式。
- E3 无后端调用 `call` → 抛出带 fallback 文案的错误（**绝不假装成功**）。
- E4 后端缺该接口 → 抛「后端未提供 xxx 接口」。
- E5 后端返回 `ok:true` → 解析出 `data`。
- E6 后端返回 `ok:false` → 抛后端 `error` 文案。
- E7 `tryCall` 失败返回 `null` 不抛错。
- E8 `emitLogs` 把后端 log 逐行推到终端回调。

### F. className 合并 cx
- F1 多个字符串以单空格拼接。
- F2 过滤 `false` / `null` / `undefined` / `''` / `0` 等 falsy 值。
- F3 条件为假时不产生多余空格。
- F4 全 falsy 或无参数返回空字符串。

### G. 日志写入器 logger
- G1 push 纯字符串默认 info 级。
- G2 push 对象按其 level 上色。
- G3 **回归**：对象文本不会退化成 `[object Object]`。
- G4 含 `\n` 的文本按行展开，每行沿用同一 level。
- G5 push null / undefined 不产生日志行。
- G6 `pushLines` 批量写入；`clear` 清空；每行带 `at` 时间戳。
- G7 `delay(ms)` 返回按时 resolve 的 Promise。

### H. 选择器 picker
- H1 无后端时 `pickFileBackend` / `pickDirectoryBackend` 返回 `undefined`（交调用方降级）。
- H2 后端返回真实路径时得到该路径。
- H3 后端用户取消（无 path）返回 `null`。
- H4 `supportsDirectoryPicker` 按 `window.showDirectoryPicker` 是否存在返回布尔。

### I. 环境扫描 envScan（纯函数）
- I1 `emptyScan` 各字段为「未识别」初始态。
- I2 `formatBytes`：0/负数/null 返回 `—`；B/KB/MB/GB/TB 逐级换算，非字节位保留一位小数。
- I3 `summarizeScan`：null 返回空数组；未识别时输出原因行。
- I4 `summarizeScan`：识别成功含根目录、Python 环境类型、插件数、Git 状态；插件 >5 用「等」省略；无 Python 标注「未找到」。
- I5 `MEDIA_EXTS` / `WORKFLOW_EXTS` 含关键后缀。

### J. 重复检测 dupScan
- J1 未选目录返回 `ok:false`。
- J2 无匹配后缀文件返回空组。
- J3 name 模式：同名文件（跨子目录）归为一组；文件名各异则无重复组。
- J4 hash 模式：内容相同归组，内容不同不成组。
- J5 后缀匹配大小写不敏感。
- J6 进度回调被调用。

## 四、通过标准

- **全绿即通过**：`npm test` 退出码为 0，`72 passed`。
- **新增功能的门槛**：凡在 `src/lib/` 新增纯前端可计算的逻辑，必须补对应用例，
  并在本文件「验收标准」追加条目后再提交。
- **改行为必改用例**：修改被测函数的行为时，先改这里的验收条目，再改用例，最后改实现（红-绿-重构）。

## 五、暂不纳入自动化的部分（需人工/E2E，原因说明）

| 范围 | 为何不做单元测试 | 建议验证方式 |
|---|---|---|
| React 页面渲染 / 交互 | 依赖真实 DOM 与用户操作 | 后续可加 `@testing-library/react` 组件测试 |
| `picker` / `envScan` 的 `<input webkitdirectory>` 降级 | 依赖真实 `<input>` 点击与窗口焦点事件 | 手动/E2E 验证 |
| git / pip / ffmpeg 后端 | 需真实 Python Eel 环境与用户磁盘 | 后端侧单独测；前端只测「无后端时报错」 |
| 目录选择原生对话框 | 依赖浏览器原生 picker | 手动验证 |

> 注：`dupScan` 已纳入自动化，其测试跑在 **node 环境**（文件顶部 `// @vitest-environment node`），
> 因为 jsdom 的 `Blob` / `crypto.subtle` 实现与真实浏览器有差异，node 内置实现更贴近真实结果。

## 六、后续可扩展方向

1. 接 `@testing-library/react` 补组件级测试（如翻转卡 `stopPropagation`、按钮接线）。
2. 给 `dupScan.js` 喂构造的小文件做集成测试，覆盖同名/同内容分组。
3. 后端 `backend/services/*.py` 用 pytest 单独建测试套，前后端各测各的边界。
