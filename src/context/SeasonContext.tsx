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
  refresh: () => Promise<void>; // [변경: 2026-07-14 14:21, 김병현 수정] 업로드 후 시즌 목록 새로고침용
  loading: boolean;
  error: string | null;
}

const SeasonContext = createContext<SeasonContextValue | null>(null);

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [seasons, setSeasons] = useState<string[]>([]);
  const [season, setSeason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // [변경: 2026-07-14 14:21, 김병현 수정] 목록 로딩을 load()로 빼서 mount·업로드후 둘 다 재사용.
  // 시즌 목록을 서버에서 가져와 상태에 반영한다. loading 은 처음(true)에서만 내려가고,
  // 새로고침(refresh) 때는 건드리지 않아 시즌선택 UI가 깜빡이지 않는다.
  // SeasonProvider 는 앱 최상단이라 언마운트되지 않으므로 alive 가드는 생략.
  const load = useCallback(async () => {
    try {
      const list = await api.seasons();
      setSeasons(list);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // 시즌 목록은 앱 시작 때 한 번 불러오고, 업로드 성공 시 refresh()로 다시 부른다.
  useEffect(() => {
    void load();
  }, [load]);

  const change = useCallback((s: string) => setSeason(s), []);

  const value = useMemo<SeasonContextValue>(
    () => ({ seasons, season, setSeason: change, refresh: load, loading, error }),
    [seasons, season, change, load, loading, error],
  );

  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
}

export function useSeason(): SeasonContextValue {
  const ctx = useContext(SeasonContext);
  if (!ctx) throw new Error('useSeason 은 SeasonProvider 안에서만 쓸 수 있습니다.');
  return ctx;
}
