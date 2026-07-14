/// <reference types="vite/client" />

// Vite 환경변수 타입 힌트 (VITE_ 접두사만 브라우저에 노출됨)
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
