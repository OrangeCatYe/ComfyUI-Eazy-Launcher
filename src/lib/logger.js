/*
 * 终端日志写入器
 *
 * 源码实证：原版用 _0x1021a9(text) 单行写入日志区，
 * 复杂结果用 \n 拼接成多行一次性输出（如依赖分析、查询结果）。
 * 此处保持相同语义：push 支持传入含 \n 的字符串，按行展开写入。
 *
 * 两种调用形式（history：
 *   push('纯文本')                      —— 早期用法，写入 info 级
 *   push({ level:'info', text:'...' })  —— 现行用法，TerminalDrawer 按 level 上色
 *
 * 曾经这里只支持字符串，而调用方传的是对象，
 * 结果 String({...}) 全变成 "[object Object]"，整个终端输出是坏的。
 * 现在两种都支持，且多行对象的每一行沿用同一个 level。
 */
export function createLogger(setLogs) {
  /* 归一化：把 string | {level,text} 转成日志行数组 */
  const normalize = (entry) => {
    if (entry === undefined || entry === null) return []
    const obj = typeof entry === 'string' ? { level: 'info', text: entry } : entry
    const text = obj?.text ?? ''
    const level = obj?.level || 'info'
    return String(text)
      .split('\n')
      .map((line) => ({ level, text: line, at: Date.now() }))
  }

  const push = (entry) => {
    const lines = normalize(entry)
    if (lines.length === 0) return
    setLogs((prev) => [...prev, ...lines])
  }

  const pushLines = (arr) => {
    (arr || []).forEach((l) => push(l))
  }

  const clear = () => setLogs([])

  return { push, pushLines, clear }
}

/*
 * 模拟异步步骤（未接后端时用于演示流程与耗时）
 */
export const delay = (ms) => new Promise((r) => setTimeout(r, ms))

export default createLogger
