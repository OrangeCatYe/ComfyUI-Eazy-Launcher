/*
 * 集中管理 localStorage key，全部沿用原版键名，
 * 便于后续接入真实数据时无需改名。
 */

export const LS = {
  THEME: 'ui_theme',
  SETTINGS: 'kk_settings',
  TOOLS_ORDER: 'kk_tools_hub_order',
  TERMINAL_OPEN: 'ui_terminal_open',
  /* 终端面板高度：用户拖拽后持久化，下次启动沿用 */
  TERMINAL_HEIGHT: 'ui_terminal_height',
  SIDEBAR_SHORTCUTS: 'kk_sidebar_shortcuts',
  /* 本地环境扫描结果（真实数据，非模拟） */
  ENV: 'kk_local_env',
  LAST_SNAPSHOT: 'lastSnapshotPath',
  LAST_ACTION: 'lastAction',
}

const memoryFallback = new Map()

function safeGet(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return memoryFallback.get(key) ?? null
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    memoryFallback.set(key, value)
  }
}

export function readLS(key, fallback = null) {
  const raw = safeGet(key)
  if (raw === null || raw === undefined) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

export function writeLS(key, value) {
  safeSet(key, typeof value === 'string' ? value : JSON.stringify(value))
}
