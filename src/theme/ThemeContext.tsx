import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { tokensFor, type ThemeMode, type ThemeTokens } from './palette';

// 테마(라이트/다크)를 앱 전체에 뿌리는 컨텍스트.
// 하는 일 3가지:
//  1) 지금 모드가 뭔지(mode)와 그에 맞는 색 토큰(tokens)을 준다.
//  2) toggle()로 모드를 바꾸고 localStorage에 기억한다.
//  3) <html class="dark"> 를 붙였다 떼서 index.css 의 다크 토큰이 스위치되게 한다.
//     [변경: 2026-09-03 09:00, 김병현 수정] 시각 정체성 개편 Phase 4 — 옛 styles.css 삭제로
//     data-theme 속성은 더 이상 필요 없다(그 CSS 가 보던 속성이었다).

interface ThemeContextValue {
  mode: ThemeMode;
  tokens: ThemeTokens;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'tss-theme';

// [변경: 2026-09-02 15:00, 김병현 수정] 중계 그래픽 스타일은 다크가 기본이다.
// 처음 켤 때 모드 결정: 저장된 값 > 다크. (OS 설정은 더 이상 보지 않는다 — 사용자가
// 토글하면 그 선택이 저장돼 항상 이긴다.) index.html 의 인라인 스크립트와 규칙이
// 글자 그대로 같아야 FOUC 방지가 깨지지 않는다.
function initialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  // 모드가 바뀌면 <html> 클래스와 저장소를 같이 갱신 → CSS와 JS가 항상 동기화됨.
  useEffect(() => {
    // [변경: 2026-09-02 13:20, 김병현 수정] shadcn/Tailwind v4 는 .dark 클래스로 다크를 스위치한다.
    // [변경: 2026-09-03 09:00, 김병현 수정] 시각 정체성 개편 Phase 4 — 옛 styles.css(@layer
    // legacy)가 사라져서 data-theme 을 봐 줄 CSS 가 더 이상 없다. .dark 클래스 하나면 충분하다
    // (index.html 의 FOUC 방지 스크립트도 같이 정리했다 — 규칙이 어긋나면 새로고침 때 깜빡인다).
    document.documentElement.classList.toggle('dark', mode === 'dark');
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((m) => (m === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, tokens: tokensFor(mode), toggle }),
    [mode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// 화면 어디서든 현재 색 토큰과 토글을 꺼내 쓰는 훅.
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme 는 ThemeProvider 안에서만 쓸 수 있습니다.');
  return ctx;
}
