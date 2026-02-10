import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // 개발(dev)에서는 '/' 사용, 배포 빌드에서만 상대 경로 사용
  base: process.env.NODE_ENV === 'production' ? './' : '/',
  plugins: [react()],
})
