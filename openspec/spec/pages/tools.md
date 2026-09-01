# 实用工具规格

> 依据「实用工具.png」+ 各工具页补充截图

## 工具网格

卡片网格 `sm:grid-cols-2 xl:grid-cols-3`，每张卡含：
图标（渐变底）/ 标题 / 描述 / 悬停显示「点击开始使用 →」。

`kind: 'action'` 的卡片右上角显示「外链」徽标。

## 顺序持久化

长按拖拽排序，localStorage 键 `kk_tools_hub_order`（沿用原版键名）。

## 12 项工具

| ID | 名称 | kind | 页面 |
|---|---|---|---|
| `MODEL_MANAGER` | 模型管理 | page | ✅ |
| `DUP_MODEL` | 检测重复模型 | page | ✅ |
| `IMAGE_PROMPT_REV` | 识图反推提示词 | page | ✅ |
| `WORKFLOW_HUB` | 工作流管家 | page | ✅ |
| `PROMPT_FAVORITES` | 提示词收藏夹 | page | ✅ |
| `POLISH` | 提示词润色 | page | ✅ |
| `MEDIA_TOOLS` | 音视频工具 | page | ✅ |
| `AUTO_SHUTDOWN` | 自动关机任务 | page | ✅ |
| `MY_WORKS` | 我的作品 | page | ✅ |
| `ABOUT_AUTHOR` | 关于作者 | page | ✅ |
| `comfy-model-release` | 官方模型下载 | action | — |
| `free-cloud-compute` | 免费云端算力 | action | — |

## 各工具页要点

### 模型管理
左侧模型目录（checkpoints / diffusion_models / loras / 其它目录），
右侧 8 个快捷筛选 + 搜索 + 排序 + 全选。
空态文案：`当前条件下没有找到模型文件。`

### 检测重复模型
按文件名 / 哈希值两种扫描方式，5 种格式过滤
（`.safetensors` `.ckpt` `.bin` `.pt` `.gguf`）+ 高级选项。

### 识图反推提示词
拖拽上传区 + 结果区。

### 工作流管家
工作流列表 + 启动分析 + 未识别节点明细。

### 提示词收藏夹
分类卡（闪念胶囊 / 创作提示词 / 人物设定模板）+ 新建弹窗。

### 提示词润色
10 个目标模型卡（数据见 `src/config/tools.js` 的 `POLISH_MODELS`）。

### 音视频工具
3 个 Tab：提取音频 / 消除原声 / 裁剪音频，附使用说明 3 条。

### 自动关机任务
3 类：定时关机 / GPU 空闲 / ComfyUI 空闲。

### 我的作品
类型筛选（全部 / 图片 / 视频）+ 排序（最新 / 最早 / 体积）。

### 关于作者
5 个 Tab：推荐插件 / 推荐工具 / 资源网站 / 软件声明 / 作者信息。
仅「推荐插件」有真实数据（5 个插件及仓库地址），其余为空态。

## 移除项

源码注册表原 16 项，用户明确要求移除 2 项，**不重建**：
~~购买AI服务~~、~~作者资源~~。
