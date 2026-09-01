import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/// <reference types="vitest" />

/*
 * Vite 无论如何都会给入口 script 打上 type="module"，
 * 而 file:// 下浏览器对 module 脚本强制执行 CORS，直接白屏。
 * 所以构建末尾把 module 属性摘掉，降级为普通脚本执行。
 */
const stripModuleForFileProtocol = () => ({
  name: 'strip-module-for-file-protocol',
  apply: 'build',
  enforce: 'post',
  /* 产物真正落盘后执行，比 closeBundle 更可靠 */
  writeBundle() {
    const htmlPath = resolve(process.cwd(), 'dist', 'index.html')
    if (!existsSync(htmlPath)) return
    let html = readFileSync(htmlPath, 'utf-8')
    html = html.replace(/<script type="module"\s+crossorigin/g, '<script defer')
    html = html.replace(/<script type="module"/g, '<script defer')
    html = html.replace(/\s+crossorigin(?=\s|>)/g, '')
    writeFileSync(htmlPath, html, 'utf-8')
  },
})

export default defineConfig({
  /* base 用相对路径，构建产物可直接双击 index.html 打开（file:// 也能跑） */
  base: './',
  plugins: [react(), stripModuleForFileProtocol()],
  server: {
    host: '0.0.0.0',
    port: 61871,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    /*
     * 产物要能双击 index.html 直接打开（file:// 协议）。
     * ES Module 在 file:// 下会被 CORS 拦截导致白屏，
     * 所以这里打包成 IIFE 普通脚本 + 关闭 modulePreload。
     * 前提：项目内没有动态 import（已确认无），否则需开 inlineDynamicImports。
     */
    modulePreload: false,
    target: 'es2019',
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.js'],
      reporter: ['text', 'html'],
    },
  },
})
