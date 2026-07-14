import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';

// 시즌 필터를 앱 전체가 공유하는 컨텍스트.
// 대시보드·경기·선수·리더보드가 모두 "지금 고른 시즌"을 함께 봐야 해서,
// 각 화면이 따로 관리하지 않고 여기 한 곳에 둔다. 빈 문자열('')은 "전체 시즌".

interface SeasonContextValue {
  seasons: string[]; // 서버가 준 시즌 목록
  season: string; // 지금 고른 시즌 ('' = 전체)
  setSeason: (s: string) => void;
  loading: boolean;
  error: string | null;
}

const SeasonContext = createContext<SeasonContextValue | null>(null);

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [seasons, setSeasons] = useState<string[]>([]);
  const [season, setSeason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 시즌 목록은 앱 시작 때 한 번만 불러온다.
  useEffect(() => {
    let alive = true;
    api
      .seasons()
      .then((list) => {
        if (alive) {
          setSeasons(list);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (alive) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const change = useCallback((s: string) => setSeason(s), []);

  const value = useMemo<SeasonContextValue>(
    () => ({ seasons, season, setSeason: change, loading, error }),
    [seasons, season, change, loading, error],
  );

  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
}

export function useSeason(): SeasonContextValue {
  const ctx = useContext(SeasonContext);
  if (!ctx) throw new Error('useSeason 은 SeasonProvider 안에서만 쓸 수 있습니다.');
  return ctx;
}
