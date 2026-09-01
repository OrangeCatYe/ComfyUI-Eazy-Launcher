/*
 * 终端日志写入器
 *
 * 源码实证：原版用 _0x1021a9(text) 单行写入日志区，
 * 复杂结果用 \n 拼接成多行一次性输出（如依赖分析、查询结果）。
 * 此处保持相同语义：push 支持传入含 \n 的字符串，按行展开写入。
 */
export function createLogger(setLogs) {
  const push = (text) => {
    if (text === undefined || text === null) return
    const lines = String(text).split('\n')
    setLogs((prev) => [...prev, ...lines])
  }

  const pushLines = (arr) => {
    arr.forEach((l) => push(l))
  }

  const clear = () => setLogs([])

  return { push, pushLines, clear }
}

/*
 * 模拟异步步骤（未接后端时用于演示流程与耗时）
 */
export const delay = (ms) => new Promise((r) => setTimeout(r, ms))

export default createLogger
