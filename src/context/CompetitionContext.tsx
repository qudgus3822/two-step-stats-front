import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';
import type { Competition } from '../api/types';

// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — 옛 SeasonContext(문자열 시즌 필터)를
// CompetitionContext 로 리네임. 대회 필터를 앱 전체가 공유하는 컨텍스트.
// 대시보드·경기·선수·리더보드가 모두 "지금 고른 대회"를 함께 봐야 해서,
// 각 화면이 따로 관리하지 않고 여기 한 곳에 둔다. null 은 "전체 대회".
// 기계키(competitionId)와 사람이 읽는 라벨(competitionLabel)을 둘 다 노출한다 — id 로
// API 를 부르고, label 로 화면에 표시하기 위함.

export interface CompetitionContextValue {
  competitions: Competition[]; // 서버가 준 등록된 대회 목록
  competitionId: number | null; // 지금 고른 대회 (null = 전체)
  competitionLabel: string | null; // 고른 대회의 표시 라벨(전체면 null) — competitions+competitionId 로 파생
  setCompetitionId: (id: number | null) => void;
  refresh: () => Promise<void>; // 업로드 후 대회 목록 새로고침용
  loading: boolean;
  error: string | null;
}

const CompetitionContext = createContext<CompetitionContextValue | null>(null);

export function CompetitionProvider({ children }: { children: ReactNode }) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionId, setCompetitionIdState] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // [변경: 2026-07-14, 김병현 수정] 첫 목록 로드 때 '가장 최근 대회'를 기본 선택으로 잡았는지 표시.
  // 딱 한 번만 적용하려는 가드 — 이후 사용자가 '전체 대회'(null)를 골라도 refresh 때 되돌리지 않는다.
  const defaultedRef = useRef(false);

  // 목록 로딩을 load()로 빼서 mount·업로드후 둘 다 재사용.
  // 대회 목록을 서버에서 가져와 상태에 반영한다. loading 은 처음(true)에서만 내려가고,
  // 새로고침(refresh) 때는 건드리지 않아 대회선택 UI가 깜빡이지 않는다.
  // CompetitionProvider 는 앱 최상단이라 언마운트되지 않으므로 alive 가드는 생략.
  const load = useCallback(async () => {
    try {
      const list = await api.competitions();
      setCompetitions(list);
      // [변경: 2026-07-14, 김병현 수정] 시즌(대회) 기본값 = 가장 최근 대회.
      // list 는 서버가 최신순(연도·시즌번호 내림차순)으로 주므로 list[0] 이 가장 최근 대회다.
      // 처음 목록을 받은 순간 딱 한 번만 기본 선택으로 잡는다(defaultedRef 가드).
      if (!defaultedRef.current && list.length > 0) {
        defaultedRef.current = true;
        setCompetitionIdState(list[0].id);
      }
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // 대회 목록은 앱 시작 때 한 번 불러오고, 업로드 성공 시 refresh()로 다시 부른다.
  useEffect(() => {
    void load();
  }, [load]);

  const setCompetitionId = useCallback((id: number | null) => setCompetitionIdState(id), []);

  // 선택된 대회의 표시 라벨. competitions 목록에서 competitionId 로 찾아 파생한다.
  const competitionLabel = useMemo(
    () => competitions.find((c) => c.id === competitionId)?.label ?? null,
    [competitions, competitionId],
  );

  const value = useMemo<CompetitionContextValue>(
    () => ({
      competitions,
      competitionId,
      competitionLabel,
      setCompetitionId,
      refresh: load,
      loading,
      error,
    }),
    [competitions, competitionId, competitionLabel, setCompetitionId, load, loading, error],
  );

  return (
    <CompetitionContext.Provider value={value}>{children}</CompetitionContext.Provider>
  );
}

export function useCompetition(): CompetitionContextValue {
  const ctx = useContext(CompetitionContext);
  if (!ctx) throw new Error('useCompetition 은 CompetitionProvider 안에서만 쓸 수 있습니다.');
  return ctx;
}
