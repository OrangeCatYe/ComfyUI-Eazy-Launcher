/*
 * 后端调用适配层
 *
 * 依据 openspec/spec/terminal.md 的调用契约。
 *
 * 当前为**无后端阶段**：所有调用返回模拟数据，
 * 但函数签名、参数顺序、返回结构与规范完全一致，
 * 接入真实后端时只需替换函数体，调用方无需改动。
 *
 * 接入方式（后续）：
 *   1. Electron 环境：window.electronAPI?.xxx(...)
 *   2. HTTP 环境：    fetch('/api/xxx', { method:'POST', body: ... })
 */

/* 模拟：弹出文件选择，返回选中路径（浏览器环境下取文件名） */
export function selectRequirementsFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt'
    input.onchange = () => {
      const f = input.files?.[0]
      resolve(f ? f.name : null)
    }
    /* 用户直接取消时，change 不触发，用 window 焦点兜底 */
    window.addEventListener(
      'focus',
      function onFocus() {
        window.removeEventListener('focus', onFocus)
        setTimeout(() => resolve(null), 300)
      },
      { once: true }
    )
    input.click()
  })
}

/* 模拟：比较两份快照，返回差异三组 */
export function compareSnapshots(base, target) {
  const MOCK = {
    added: ['diffusers==0.32.2', 'accelerate==1.2.1', 'gguf==0.1.0'],
    removed: ['xformers==0.0.28'],
    changed: [
      { name: 'torch', from: '2.5.1+cu124', to: '2.10.0+cu128' },
      { name: 'numpy', from: '1.26.4', to: '2.1.3' },
      { name: 'transformers', from: '4.46.2', to: '4.48.0' },
    ],
  }
  return Promise.resolve(MOCK)
}

/* 模拟：查询哪些插件引用了指定库 */
export function findLibInPlugins(comfyuiPath, libName) {
  const MOCK = {
    numpy: ['ComfyUI-Manager', 'ComfyUI-Crystools'],
    torch: ['ComfyUI-KJNodes', 'ComfyUI-Manager'],
    diffusers: ['ComfyUI-KJNodes'],
    transformers: ['ComfyUI-KJNodes'],
  }
  const key = (libName || '').trim().toLowerCase()
  return Promise.resolve(MOCK[key] || [])
}

/* 模拟：预览快照恢复差异 */
export function previewRestoreSnapshot(pythonPath, snapshotPath) {
  const MOCK = {
    remove: ['xformers==0.0.28'],
    update: [
      { name: 'torch', from: '2.5.1+cu124', to: '2.10.0+cu128' },
      { name: 'numpy', from: '1.26.4', to: '2.1.3' },
    ],
    install: ['diffusers==0.32.2', 'accelerate==1.2.1', 'gguf==0.1.0'],
    localWhl: [],
    snapshotCount: 24,
    snapshotMeta: { version: '2.10.0+cu128', date: '2026-08-20' },
    currentMeta: { version: '2.5.1+cu124', date: '2026-08-01' },
    versionMismatch: ['torch'],
  }
  return Promise.resolve(MOCK)
}

/* 模拟：执行快照恢复 */
export function restoreEnvSnapshot(pythonPath, snapshotPath, selections) {
  return Promise.resolve({ ok: true, selections })
}
