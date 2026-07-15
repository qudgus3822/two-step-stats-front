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
// [변경: 2026-07-15 10:28, 김병현 수정] api 직접 호출 대신 React Query 훅/키/클라이언트 사용
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys, useCompetitionsQuery } from '../api/queries';
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
  // [변경: 2026-07-15 10:28, 김병현 수정] 대회 목록/로딩/에러를 React Query 로 위임
  const queryClient = useQueryClient();
  const competitionsQuery = useCompetitionsQuery();
  // data 가 undefined(첫 로드)여도 항상 배열로 다룬다. 참조 안정화를 위해 memo.
  const competitions = useMemo<Competition[]>(
    () => competitionsQuery.data ?? [],
    [competitionsQuery.data],
  );

  const [competitionId, setCompetitionIdState] = useState<number | null>(null);
  // [변경: 2026-07-14, 김병현 수정] 첫 목록 로드 때 '가장 최근 대회'를 기본 선택으로 잡았는지 표시.
  // 딱 한 번만 적용하려는 가드 — 이후 사용자가 '전체 대회'(null)를 골라도 refresh 때 되돌리지 않는다.
  const defaultedRef = useRef(false);

  // [변경: 2026-07-15 10:28, 김병현 수정] 기본선택 로직을 load() 안에서 effect 로 이동.
  // list[0] 이 가장 최근 대회(서버가 최신순 정렬). defaultedRef 로 딱 한 번만.
  // (이후 목록이 재로드돼도 재실행 안 됨 → 사용자가 고른 '전체'(null) 선택을 되돌리지 않는다.)
  useEffect(() => {
    if (!defaultedRef.current && competitions.length > 0) {
      defaultedRef.current = true;
      setCompetitionIdState(competitions[0].id);
    }
  }, [competitions]);

  const setCompetitionId = useCallback((id: number | null) => setCompetitionIdState(id), []);

  // 선택된 대회의 표시 라벨. competitions 목록에서 competitionId 로 찾아 파생한다.
  const competitionLabel = useMemo(
    () => competitions.find((c) => c.id === competitionId)?.label ?? null,
    [competitions, competitionId],
  );

  // [변경: 2026-07-15 10:28, 김병현 수정] refresh = 대회 목록 캐시 무효화(재조회 트리거).
  // "대회 목록 무효화" 지식은 여기 한 곳에만 둔다 — UploadPage 의 delete 도 이 refresh() 를 재사용.
  // invalidateQueries 는 Promise 를 반환하므로 UploadPage 의 await 계약을 그대로 만족.
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.competitions }),
    [queryClient],
  );

  const value = useMemo<CompetitionContextValue>(
    () => ({
      competitions,
      competitionId,
      competitionLabel,
      setCompetitionId,
      refresh,
      // [변경: 2026-07-15 10:28, 김병현 수정] loading 은 isLoading(첫 로드만 true) → refresh 때 UI 안 깜빡임.
      loading: competitionsQuery.isLoading,
      error: competitionsQuery.error ? competitionsQuery.error.message : null,
    }),
    [
      competitions,
      competitionId,
      competitionLabel,
      setCompetitionId,
      refresh,
      competitionsQuery.isLoading,
      competitionsQuery.error,
    ],
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
