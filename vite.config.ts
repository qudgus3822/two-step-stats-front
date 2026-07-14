import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 설정: React 플러그인만 켜고 개발 서버는 5173 포트.
// API는 브라우저에서 VITE_API_BASE_URL 로 직접 호출하므로 프록시는 두지 않는다.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 12000,
    open: false,
  },
});
