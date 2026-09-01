import { Component } from 'react'

/*
 * 全局错误边界
 *
 * React 默认行为：任一组件在渲染中抛错，整棵树被卸载，页面变全白，
 * 用户只看到白屏、看不到任何原因。这里改为捕获错误并展示可读信息，
 * 同时提供「重试 / 回到首页」出口，避免程序彻底不可用。
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: '' }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    const stack = info?.componentStack || ''
    this.setState({ info: stack })
    /* 同步打到控制台，便于定位 */
    console.error('[ErrorBoundary]', error, stack)
  }

  handleReset = () => {
    this.setState({ error: null, info: '' })
  }

  handleGoHome = () => {
    /* 清掉可能损坏的持久化状态，回到干净的初始态 */
    try {
      localStorage.removeItem('kk_local_env')
    } catch {
      /* localStorage 不可用时忽略 */
    }
    this.setState({ error: null, info: '' })
    window.location.reload()
  }

  render() {
    const { error, info } = this.state
    if (!error) return this.props.children

    return (
      <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] p-8 flex items-center justify-center">
        <div className="max-w-2xl w-full rounded-2xl border border-rose-400/40 bg-rose-500/5 p-6">
          <div className="text-sm font-black text-rose-600">界面渲染出错</div>
          <p className="mt-2 text-xs text-[var(--text-sub)] leading-relaxed">
            程序遇到了未预期的错误。下面是错误详情，可直接据此排查；也可以先重试，或回到首页恢复。
          </p>

          <pre className="mt-4 max-h-52 overflow-auto rounded-xl bg-black/5 p-3 text-[11px] font-mono text-[var(--text-main)] whitespace-pre-wrap break-all">
            {String(error?.stack || error?.message || error)}
          </pre>

          {info ? (
            <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-black/5 p-3 text-[10px] font-mono text-[var(--text-sub)] whitespace-pre-wrap break-all">
              {info}
            </pre>
          ) : null}

          <div className="mt-5 flex items-center gap-2">
            <button
              onClick={this.handleReset}
              className="press px-3 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-black"
            >
              重试
            </button>
            <button
              onClick={this.handleGoHome}
              className="press px-3 py-1.5 rounded-xl border border-[var(--border-main)] text-xs font-black"
            >
              回到首页
            </button>
          </div>
        </div>
      </div>
    )
  }
}
