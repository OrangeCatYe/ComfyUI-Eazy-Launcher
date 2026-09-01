import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Eraser, Terminal, X } from 'lucide-react'
import cx from '../../lib/cx'

/*
 * TerminalDrawer —— 原版右侧终端
 *
 * 这是「环境比较工具 / 查询引用插件 / 恢复快照依赖」三个功能的唯一输出通道
 * （源码实证：三者均无独立弹窗，全部通过 _0x1021a9(日志文本) 写入终端）
 *
 * 日志行前缀规范（源码提取）：
 *   ">>> " 命令回显与阶段提示
 *   "\n>>> " 新任务起始
 *   "🔍 "  扫描类结果
 *   "📦 "  依赖包条目
 *   " - "  列表项
 */
export function TerminalDrawer({ open, onClose, logs, onClear, height = 300 }) {
  const bodyRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [logs, open])

  return (
    <div
      className={cx(
        'shrink-0 border-t border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden transition-all duration-300',
        open ? 'opacity-100' : 'h-0 opacity-0 border-t-0'
      )}
      style={{ height: open ? height : 0 }}
    >
      <div className="h-full flex flex-col">
        <div className="h-10 shrink-0 px-4 flex items-center justify-between border-b border-[var(--border-main)] bg-[var(--bg-card-lighter)]">
          <div className="flex items-center gap-2">
            <Terminal size={13} className="text-[var(--text-sub)]" />
            <span className="text-[11px] font-black text-[var(--text-sub)] uppercase tracking-widest">
              终端命令行
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[10px] font-black text-[var(--text-sub)] tnum">
              {logs.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onClear}
              className="press p-1.5 rounded-lg text-[var(--text-sub)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)]"
              title="清空"
            >
              <Eraser size={13} />
            </button>
            <button
              onClick={onClose}
              className="press p-1.5 rounded-lg text-[var(--text-sub)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)]"
              title="收起"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        <div
          ref={bodyRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed"
          style={{ background: 'var(--bg-main)' }}
        >
          {logs.length === 0 ? (
            <div className="text-[var(--text-sub)] opacity-60">
              终端已就绪。执行操作后，输出将显示在这里。
            </div>
          ) : (
            logs.map((line, i) => (
              <div
                key={i}
                className={cx(
                  'whitespace-pre-wrap break-all',
                  line.startsWith('>>>')
                    ? 'text-[var(--accent)] font-bold'
                    : line.startsWith('🔍')
                      ? 'text-[var(--info)]'
                      : line.startsWith('📦')
                        ? 'text-[var(--text-main)] font-bold'
                        : line.startsWith(' - ')
                          ? 'text-[var(--text-sub)] pl-3'
                          : line.includes('失败') || line.includes('错误')
                            ? 'text-[var(--danger)]'
                            : line.includes('完成') || line.includes('成功')
                              ? 'text-[var(--success)]'
                              : 'text-[var(--text-main)] opacity-80'
                )}
              >
                {line || ' '}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default TerminalDrawer
