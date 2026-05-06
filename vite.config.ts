import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// На GH Pages мини-апп лежит по /prostodoc-mini/ — поэтому base.
// При локальной разработке (npm run dev) base='/' — иначе hot reload отвалится.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/prostodoc-mini/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
