import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query';
import { api } from './client';
import type {
  Competition,
  GameBox,
  GameSummary,
  // [변경: 2026-07-28 15:00, 김병현 수정] 기량 발전 훅용 타입 추가.
  GrowthMetric,
  GrowthReport,
  LeaderboardMetric,
  LeaderboardRow,
  PlayerDetail,
  PlayerListItem,
  Summary,
  // [변경: 2026-07-27 16:14, 김병현 수정] 시너지 훅용 타입 추가.
  SynergyMetric,
  SynergyReport,
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
    // [변경: 2026-07-27 15:20, 김병현 수정] 대회 스코프가 생겨 키에 competitionId 를 넣는다.
    by: (name: string, competitionId: number | null) => ['player', name, competitionId] as const,
  },
  leaderboard: {
    all: ['leaderboard'] as const,
    by: (metric: LeaderboardMetric, competitionId: number | null) =>
      ['leaderboard', metric, competitionId] as const,
  },
  // [변경: 2026-07-27 16:14, 김병현 수정] 시너지 리포트 키. player/metric/competitionId 셋 다 바뀌면 새 키.
  synergy: {
    all: ['synergy'] as const,
    by: (player: string | null, metric: SynergyMetric, competitionId: number | null) =>
      ['synergy', player, metric, competitionId] as const,
  },
  // [변경: 2026-07-28 15:00, 김병현 수정] 기량 발전 키. (대회, 지표) 둘 다 바뀌면 새 키.
  growth: {
    all: ['growth'] as const,
    by: (competitionId: number | null, metric: GrowthMetric) =>
      ['growth', competitionId, metric] as const,
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
// 선수 상세. competitionId=null 이면 통산(전체 대회).
// 그 조건에 기록이 없으면 에러가 아니라 data=null 이다(클라이언트가 404 를 흡수).
// [변경: 2026-07-27 15:20, 김병현 수정] competitionId 인자 필수화(비교 화면의 대회 스코프 지원).
export function usePlayer(
  name: string,
  competitionId: number | null,
): UseQueryResult<PlayerDetail | null> {
  return useQuery({
    queryKey: queryKeys.player.by(name, competitionId),
    queryFn: () => api.player(name, competitionId),
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

// [변경: 2026-07-27 16:14, 김병현 수정] 시너지 리포트 훅. 기준 선수가 없으면 아예 안 부른다.
export function useSynergy(
  player: string | null,
  metric: SynergyMetric,
  competitionId: number | null,
): UseQueryResult<SynergyReport> {
  return useQuery({
    queryKey: queryKeys.synergy.by(player, metric, competitionId),
    // enabled 가 false 면 실행 자체를 안 하므로, 실행 시점의 player 는 항상 non-null 이다.
    queryFn: () => api.synergy(player as string, metric, competitionId),
    enabled: !!player,
    // 지표 탭을 바꾸면(그리고 기준 선수·대회를 바꿔도) 키가 달라져 새로 받는다. 그동안 이전 표를
    // 그대로 띄워 둬서 표·상세 패널이 사라졌다 돌아오는 깜빡임을 막는다(결정 9).
    // RQ v5 문법 — v4 의 keepPreviousData 를 대체한다.
    placeholderData: (prev) => prev,
  });
}

// [변경: 2026-07-28 15:00, 김병현 수정] 기량 발전 리포트 훅. 대회가 안 정해졌으면 아예 안 부른다.
// 같은 (대회, 지표) 로 두 번 불러도 React Query 가 키로 합쳐 요청은 1번이다
// (이 화면은 종합 Top3 용 'eff' 와 탭용 metric 을 각각 부르는데, 기본 탭이 eff 라 보통 합쳐진다).
export function useGrowth(
  competitionId: number | null,
  metric: GrowthMetric,
): UseQueryResult<GrowthReport> {
  return useQuery({
    queryKey: queryKeys.growth.by(competitionId, metric),
    // enabled 가 false 면 실행 자체를 안 하므로, 실행 시점의 competitionId 는 항상 non-null 이다.
    queryFn: () => api.growth(competitionId as number, metric),
    enabled: competitionId != null,
    // 지표 탭/대회를 바꾸는 동안 옛 표를 그대로 띄워 둬서 깜빡임을 막는다(RQ v5 문법).
    placeholderData: (prev) => prev,
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
    // [변경: 2026-07-27 15:20, 김병현 수정] 선수 상세도 업로드로 낡는다(빠져 있던 것 보완).
    queryClient.invalidateQueries({ queryKey: queryKeys.player.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.all }),
    // [변경: 2026-07-27 16:14, 김병현 수정] 시너지도 업로드로 낡는다(동료 목록·평균이 바뀔 수 있어서).
    queryClient.invalidateQueries({ queryKey: queryKeys.synergy.all }),
    // [변경: 2026-07-28 15:00, 김병현 수정] 기량 발전도 업로드로 낡는다(경기당 평균·발전률이 바뀔 수 있어서).
    queryClient.invalidateQueries({ queryKey: queryKeys.growth.all }),
  ]);
}
