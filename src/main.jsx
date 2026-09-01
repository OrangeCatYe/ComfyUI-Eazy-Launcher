import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// 顺序有意为之：theme.css 必须在 tailwind 之后引入，
// 否则 `*{border-color}` 与变量声明会被 Tailwind preflight 覆盖。
import './styles/index.css'
import './styles/theme.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
