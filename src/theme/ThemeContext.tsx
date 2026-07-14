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
//  3) <html data-theme="..."> 를 바꿔 CSS 변수(styles.css)도 같이 스위치되게 한다.

interface ThemeContextValue {
  mode: ThemeMode;
  tokens: ThemeTokens;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'tss-theme';

// 처음 켤 때 모드 결정: 저장된 값 > OS 설정 > 라이트.
function initialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  // 모드가 바뀌면 <html> 속성과 저장소를 같이 갱신 → CSS와 JS가 항상 동기화됨.
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
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
