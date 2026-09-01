import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  /* base 用相对路径，构建产物可直接双击 index.html 打开（file:// 也能跑） */
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 61871,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
})
