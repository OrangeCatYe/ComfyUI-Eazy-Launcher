import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_SETTINGS } from '../config/settings'
import { readLS, writeLS, LS } from '../lib/storage'

/*
 * 全局设置状态层
 *
 * 单一 set(key, value) 接口，所有设置项共用。
 * uiScale 单独驱动 <html data-font>，与已移除的 TopBar 字体按钮无关。
 */

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...(readLS(LS.SETTINGS, {}) || {}),
  }))

  useEffect(() => {
    writeLS(LS.SETTINGS, settings)
  }, [settings])

  /* 全局界面缩放：standard / large / xlarge */
  useEffect(() => {
    document.documentElement.setAttribute('data-font', settings.uiScale)
  }, [settings.uiScale])

  const set = useCallback((key, value) => {
    setSettings((s) => ({ ...s, [key]: value }))
  }, [])

  const reset = useCallback(() => setSettings({ ...DEFAULT_SETTINGS }), [])

  const value = useMemo(() => ({ settings, set, reset }), [settings, set, reset])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
