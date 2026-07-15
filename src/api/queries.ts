import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query';
import { api } from './client';
import type {
  Competition,
  GameBox,
  GameSummary,
  LeaderboardMetric,
  LeaderboardRow,
  PlayerDetail,
  PlayerListItem,
  Summary,
} from './types';

// 리소스별 데이터 훅을 한 곳에 모은 모듈.
// 화면 코드는 queryKey 문자열을 모른 채 useGames(competitionId) 처럼만 부른다.
// (키 규칙을 여기 한 곳에 가둬 8곳으로 파편화되는 걸 막는다 = 작은 인터페이스, 깊은 모듈.)

// queryKey 팩토리 — 키를 만드는 유일한 출처. 무효화도 이 키(또는 그 접두어)로 한다.
// 파라미터가 있는 리소스는 { all, by } 로 나눈다: `all` 은 "이 리소스 전부"를 가리키는 접두어라
// invalidateAfterUpload 처럼 광범위 무효화에 쓰고, `by(...)` 는 실제 조회에 쓰는 구체 키다.
// (파라미터가 없는 competitions 는 접두어=키 자체라 굳이 나누지 않는다.)
export const queryKeys = {
  competitions: ['competitions'] as const,
  summary: {
    all: ['summary'] as const,
    by: (competitionId: number | null) => ['summary', competitionId] as const,
  },
  games: {
    all: ['games'] as const,
    by: (competitionId: number | null) => ['games', competitionId] as const,
  },
  gameBox: {
    all: ['game'] as const,
    by: (id: string | null) => ['game', id] as const,
  },
  players: {
    all: ['players'] as const,
    by: (competitionId: number | null) => ['players', competitionId] as const,
  },
  player: {
    all: ['player'] as const,
    by: (name: string) => ['player', name] as const,
  },
  leaderboard: {
    all: ['leaderboard'] as const,
    by: (metric: LeaderboardMetric, competitionId: number | null) =>
      ['leaderboard', metric, competitionId] as const,
  },
};

// 등록된 대회 목록.
export function useCompetitionsQuery(): UseQueryResult<Competition[]> {
  return useQuery({ queryKey: queryKeys.competitions, queryFn: () => api.competitions() });
}

// 대회 요약(전체 규모). competitionId=null 이면 전체 대회.
export function useSummary(competitionId: number | null): UseQueryResult<Summary> {
  return useQuery({
    queryKey: queryKeys.summary.by(competitionId),
    queryFn: () => api.summary(competitionId),
  });
}

// 대회 안의 경기 목록.
export function useGames(competitionId: number | null): UseQueryResult<GameSummary[]> {
  return useQuery({
    queryKey: queryKeys.games.by(competitionId),
    queryFn: () => api.games(competitionId),
  });
}

// 경기 하나의 박스스코어. id 가 없으면(예: 아직 고른 경기 없음) 아예 안 부른다(enabled).
export function useGameBox(id: string | null): UseQueryResult<GameBox> {
  return useQuery({
    queryKey: queryKeys.gameBox.by(id),
    // enabled 가 false 면 실행 자체를 안 하므로, 실행 시점의 id 는 항상 non-null 이다.
    queryFn: () => api.game(id as string),
    enabled: !!id,
  });
}

// 선수 목록.
export function usePlayers(competitionId: number | null): UseQueryResult<PlayerListItem[]> {
  return useQuery({
    queryKey: queryKeys.players.by(competitionId),
    queryFn: () => api.players(competitionId),
  });
}

// 선수 상세. 라우트 파라미터가 비면(이론상) 안 부른다.
export function usePlayer(name: string): UseQueryResult<PlayerDetail> {
  return useQuery({
    queryKey: queryKeys.player.by(name),
    queryFn: () => api.player(name),
    enabled: name !== '',
  });
}

// 리더보드(지표별 누적 순위). limit 는 생략 → 전체.
// [변경: 2026-07-15 11:37, 김병현 수정] 정렬 기준이 누적 → 경기당 평균으로 바뀜(백엔드 leaderboard 정렬 변경). 이 훅의 시그니처/로직은 그대로.
export function useLeaderboard(
  metric: LeaderboardMetric,
  competitionId: number | null,
): UseQueryResult<LeaderboardRow[]> {
  return useQuery({
    queryKey: queryKeys.leaderboard.by(metric, competitionId),
    queryFn: () => api.leaderboard(metric, undefined, competitionId),
  });
}

// 업로드 후 낡는 캐시를 한 번에 정리한다(업로드 fan-out).
// 업로드는 새 대회를 만들 수도 있어 competitions 까지 포함해 광범위하게 무효화한다.
// append 업로드는 competitionId 가 그대로라 세부 키가 안 바뀌지만 데이터는 갈린다 →
// 리소스 "접두어"(각 키의 `all`)로 무효화해서 모든 competitionId 의 캐시를 통째로 낡음 처리한다.
// (RQ 는 queryKey 를 접두어로 매칭하므로 ['games'] 하나면 ['games', 3], ['games', null] 전부 걸린다.)
// 참고: "대회 목록만" 무효화하는 가벼운 경우는 CompetitionContext.refresh() 가 담당한다(delete 등).
export async function invalidateAfterUpload(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.competitions }),
    queryClient.invalidateQueries({ queryKey: queryKeys.summary.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.games.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.players.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.all }),
  ]);
}
