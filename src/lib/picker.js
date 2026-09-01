/*
 * 文件/目录选择器
 *
 * 浏览器环境没有原生的目录选择对话框，这里用 <input type="file">
 * 近似实现：
 *   - 选目录：webkitdirectory，取 webkitRelativePath 第一段
 *   - 选文件：普通 file input，取文件全名
 *
 * 接入 Electron / Eel 后端时，应改为调用原生对话框，
 * 函数签名保持不变，调用方无需改动。
 */

/* 选择目录，返回目录名（失败或取消返回 null） */
export function pickDirectory() {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true
    input.directory = true
    input.multiple = false

    let done = false
    const finish = (val) => {
      if (done) return
      done = true
      resolve(val)
    }

    input.onchange = () => {
      const f = input.files?.[0]
      finish(f ? f.webkitRelativePath.split('/')[0] || f.name : null)
    }

    /* 用户取消时 change 不触发，用窗口重新获得焦点兜底 */
    window.addEventListener(
      'focus',
      () => setTimeout(() => finish(null), 500),
      { once: true }
    )

    input.click()
  })
}

/* 选择文件，返回文件名（失败或取消返回 null） */
export function pickFile(accept = '') {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (accept) input.accept = accept

    let done = false
    const finish = (val) => {
      if (done) return
      done = true
      resolve(val)
    }

    input.onchange = () => {
      const f = input.files?.[0]
      finish(f ? f.name : null)
    }

    window.addEventListener(
      'focus',
      () => setTimeout(() => finish(null), 500),
      { once: true }
    )

    input.click()
  })
}
