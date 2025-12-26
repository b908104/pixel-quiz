import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/pixel-quiz/', // TODO: 如果您的 Repo 名稱不同，請修改這裡 (例如 '/my-repo/')
  plugins: [vue()],
  envPrefix: ['VITE_', 'GOOGLE_', 'PASS_', 'QUESTION_'], // Expose these to client
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
