import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { LS, readLS, writeLS } from '../lib/storage'

/*
 * 全局 UI 状态：主题 + 字体缩放
 * 原版键名：ui_theme / ui_font_scale，取值 standard | large | xlarge
 */
const UIContext = createContext(null)

export function UIProvider({ children }) {
  const [theme, setThemeState] = useState(() => readLS(LS.THEME, 'light'))

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    writeLS(LS.THEME, theme)
  }, [theme])

  const setTheme = useCallback((t) => setThemeState(t), [])
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === 'light' ? 'dark' : 'light')),
    []
  )

  return <UIContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</UIContext.Provider>
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}

export default UIProvider
