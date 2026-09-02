import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// [변경: 2026-09-02 13:00, 김병현 수정] Tailwind v4 는 PostCSS 대신 전용 Vite 플러그인을 쓴다.
import tailwindcss from '@tailwindcss/vite';
// [변경: 2026-09-02 13:00, 김병현 수정] '@/...' 경로 별칭용.
// ⚠ __dirname 금지 — package.json 이 "type": "module" 이라 이 파일은 ESM 이고 ESM 엔 __dirname 이 없다
//   (shadcn 공식 문서 예제는 CJS 기준이다).
// ⚠ 'node:url' 타입은 @types/node 가 있어야 한다 — 없으면 tsc 가 TS2307 로 죽는다.
import { fileURLToPath } from 'node:url';

// Vite 설정: React + Tailwind v4 플러그인, 개발 서버는 12000 포트.
// API는 브라우저에서 VITE_API_BASE_URL 로 직접 호출하므로 프록시는 두지 않는다.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 12000,
    open: false,
  },
});
