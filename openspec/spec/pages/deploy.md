# 初恋部署规格

> 依据「初恋部署.png」

## 结构

1. **驱动与显卡信息**：驱动版本 / GPU 型号 / 架构
2. **部署目录**：选择目录 + 从零开始
3. **源地址**：4 个，带短标签
4. **部署进度**：进度条 + 状态徽标 + 阶段清单
5. **目标版本**：Python / Torch

## 静态数据（截图实证）

| 项 | 值 |
|---|---|
| 驱动版本 | 591.44 |
| GPU | NVIDIA GeForce RTX 4080 |
| 架构 | ada |
| Python | 3.12 |
| Torch | 2.10.0+cu128 |

## 源地址短标签

| 源 | 标签 | 地址 |
|---|---|---|
| ComfyUI 仓库 | GitHub 官方仓库 | github.com/Comfy-Org/ComfyUI.git |
| Pytorch 套件下载站 | 阿里云国内站 | mirrors.aliyun.com/pytorch-wheels |
| Python 下载站 | — | python.org/downloads |
| PYPI 源 | 清华大学 | pypi.tuna.tsinghua.edu.cn/simple |

## 部署阶段（6 步）

| # | 阶段 | 进度 |
|---|---|---|
| 1 | 创建部署目录 | 10% |
| 2 | 下载并解压 Python | 35% |
| 3 | 创建虚拟环境 | 50% |
| 4 | 安装 Pytorch+Cuda 套件 | 75% |
| 5 | 拉取 ComfyUI 仓库 | 90% |
| 6 | 安装依赖并完成部署 | 100% |

阶段清单：已完成打勾，进行中显示旋转图标，
进度条在进行中带 `animate-pulse`。

## 目录选择

浏览器环境无原生目录对话框，用 `<input type="file" webkitdirectory>`
取 `webkitRelativePath` 的第一段作为目录名。
接入 Electron 后应改回原生对话框。
