import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — SeasonProvider → CompetitionProvider(리네임).
import { CompetitionProvider } from './context/CompetitionContext';
import { ThemeProvider } from './theme/ThemeContext';
import './styles.css';

// 앱 진입점. 프로바이더 순서: 테마 → 대회 → 라우터 → App.
// (테마가 제일 바깥이라 어느 화면/차트든 색 토큰을 꺼내 쓸 수 있다.)
const root = document.getElementById('root');
if (!root) throw new Error('#root 엘리먼트를 찾을 수 없습니다.');

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <CompetitionProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </CompetitionProvider>
    </ThemeProvider>
  </StrictMode>,
);
