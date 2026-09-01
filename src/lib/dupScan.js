/*
 * 重复文件检测引擎
 *
 * 支持两种真实检测方式：
 *   1. name  —— 按文件名分组，找出同名文件（纯元数据比对，极快）
 *   2. hash  —— 按内容哈希分组，用 Web Crypto API 真实计算 SHA-256
 *
 * 哈希策略（针对模型文件体积大的特点）：
 *   不做全文件哈希（一个 7GB 的 safetensors 全读一遍不现实），
 *   而是取「文件大小 + 头部 1MB + 尾部 1MB」做采样哈希。
 *   这样既能真实区分内容，又避免长时间占用内存。
 *   结果如实标注为「采样哈希」，不伪装成完整文件哈希。
 */

const SAMPLE_BYTES = 1024 * 1024 // 头尾各取 1MB

async function sha256(...buffers) {
  /* 把多个片段合并后一次性计算，保证采样段的顺序也参与哈希 */
  const total = buffers.reduce((n, b) => n + b.byteLength, 0)
  const merged = new Uint8Array(total)
  let offset = 0
  buffers.forEach((b) => {
    merged.set(new Uint8Array(b), offset)
    offset += b.byteLength
  })
  const digest = await crypto.subtle.digest('SHA-256', merged)
  return Array.from(new Uint8Array(digest))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
}

/*
 * 对单个文件计算采样哈希
 * 返回 { hash, size }；读取失败返回 null
 */
async function sampleHash(fileHandle) {
  let file
  try {
    file = await fileHandle.getFile()
  } catch {
    return null
  }
  const size = file.size

  try {
    /* 小文件直接整体哈希，结果更精确 */
    if (size <= SAMPLE_BYTES * 2) {
      const buf = await file.arrayBuffer()
      return { hash: await sha256(buf), size, exact: true }
    }

    const head = await file.slice(0, SAMPLE_BYTES).arrayBuffer()
    const tail = await file.slice(size - SAMPLE_BYTES, size).arrayBuffer()
    /* 把 size 也纳入哈希，避免首尾相同但长度不同的文件被误判 */
    const sizeBuf = new TextEncoder().encode(String(size)).buffer
    return { hash: await sha256(head, tail, sizeBuf), size, exact: false }
  } catch {
    return null
  }
}

/*
 * 扫描目录，找出重复文件
 *
 * handle  —— 用户选择的目录句柄（File System Access API）
 * exts    —— 需要纳入的后缀数组，如 ['.safetensors', '.ckpt']
 * mode    —— 'name' 按文件名 | 'hash' 按内容采样哈希
 * onProgress —— 进度回调 ({ scanned, total, current })
 *
 * 返回 { ok, dir, groups, scanned, dupFiles, dupBytes, reason }
 *   groups 形如 [{ key, files:[{name, size, path}] }]，只包含有重复的组
 */
export async function findDuplicates(handle, exts, mode, onProgress) {
  if (!handle) return { ok: false, reason: '未选择目录', groups: [], scanned: 0 }

  /* 第一遍：收集符合后缀的文件（含子目录） */
  const files = []
  try {
    const walk = async (dir, prefix) => {
      for await (const [name, h] of dir.entries()) {
        if (h.kind === 'directory') {
          await walk(h, prefix ? `${prefix}/${name}` : name)
        } else {
          const lower = name.toLowerCase()
          if (exts.some((e) => lower.endsWith(e.toLowerCase()))) {
            files.push({ name, path: prefix ? `${prefix}/${name}` : name, handle: h })
          }
        }
      }
    }
    await walk(handle, '')
  } catch (e) {
    return { ok: false, reason: `目录遍历失败：${e?.message || e}`, groups: [], scanned: 0 }
  }

  if (files.length === 0) {
    return { ok: true, dir: handle.name, groups: [], scanned: 0, dupFiles: 0, dupBytes: 0 }
  }

  /* 第二遍：按模式计算分组键 */
  const buckets = new Map()
  let scanned = 0
  for (const f of files) {
    let key
    let size = 0

    if (mode === 'name') {
      key = f.name.toLowerCase()
      try {
        size = (await f.handle.getFile()).size
      } catch {
        size = 0
      }
    } else {
      const r = await sampleHash(f.handle)
      scanned += 1
      onProgress?.({ scanned, total: files.length, current: f.path })
      if (!r) continue
      key = r.hash
      size = r.size
    }

    if (mode === 'name') {
      scanned += 1
      onProgress?.({ scanned, total: files.length, current: f.path })
    }

    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push({ name: f.name, path: f.path, size })
  }

  /* 只保留真正有重复的组（组内文件数 > 1，且哈希模式下还要同尺寸） */
  const groups = []
  let dupFiles = 0
  let dupBytes = 0
  buckets.forEach((list) => {
    if (list.length < 2) return
    /* 采样哈希存在极小概率碰撞，用尺寸做二次确认 */
    if (mode === 'hash') {
      const sizes = new Set(list.map((f) => f.size))
      if (sizes.size > 1) return
    }
    list.sort((a, b) => a.path.localeCompare(b.path))
    groups.push({ key: list[0].name, files: list })
    dupFiles += list.length
    dupBytes += list.reduce((n, f) => n + f.size, 0)
  })

  groups.sort((a, b) => b.files[0].size - a.files[0].size)

  return {
    ok: true,
    dir: handle.name,
    groups,
    scanned,
    dupFiles,
    /* 重复占用 = 总体积 - 每个组保留一份的体积 */
    dupBytes: groups.reduce(
      (n, g) => n + g.files.slice(1).reduce((m, f) => m + f.size, 0),
      0
    ),
  }
}

/* 让用户选择目录（带取消与错误处理） */
export async function pickScanDirectory() {
  if (typeof window === 'undefined' || typeof window.showDirectoryPicker !== 'function') {
    return { canceled: false, handle: null, error: '当前浏览器不支持目录选择，请使用 Chrome / Edge。' }
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'read' })
    return { canceled: false, handle, error: '' }
  } catch (err) {
    if (err && err.name === 'AbortError') return { canceled: true, handle: null, error: '' }
    return { canceled: false, handle: null, error: `目录选择失败：${err?.message || err}` }
  }
}
