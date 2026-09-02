import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// [변경: 2026-07-15 10:28, 김병현 수정] React Query Provider 추가
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';
import { App } from './App';
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — SeasonProvider → CompetitionProvider(리네임).
import { CompetitionProvider } from './context/CompetitionContext';
import { ThemeProvider } from './theme/ThemeContext';
// [변경: 2026-09-02 13:00, 김병현 수정] Tailwind 진입점을 옛 스타일시트보다 먼저 import 한다.
// 순서 자체가 캐스케이드에 영향을 주진 않는다(레이어가 순서를 결정) — 다만
// index.css 의 @layer 선언이 legacy 보다 먼저 평가돼야 레이어 순서가 확정된다.
import './index.css';
import './styles.css';

// 앱 진입점. 프로바이더 순서: 테마 → (쿼리 캐시) → 대회 → 라우터 → App.
// (테마가 제일 바깥이라 어느 화면/차트든 색 토큰을 꺼내 쓸 수 있다.)
const root = document.getElementById('root');
if (!root) throw new Error('#root 엘리먼트를 찾을 수 없습니다.');

// [변경: 2026-07-15 10:28, 김병현 수정] QueryClientProvider 를 CompetitionProvider 바깥에 둔다
// (CompetitionProvider 가 useQuery 를 쓰므로 캐시 컨텍스트가 먼저 있어야 함).
createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <CompetitionProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </CompetitionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
