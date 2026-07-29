// [신설: 2026-07-29 10:36, 김병현 작성] 체감속도 개선 1번 — "누르기 전에 미리 받아두기".
//
// 왜 빨라지나: 사람이 링크에 마우스를 올리고 실제로 클릭하기까지 보통 200~400ms 가 뜬다.
// 그 사이에 요청을 미리 띄워 두면, 클릭하는 순간 캐시에 이미 답이 있어서 화면이 그냥 떠 있다.
// 로딩이 사라지는 게 아니라 "클릭 전"으로 옮겨지는 것이다.
//
// 이 훅이 숨기는 것: 어느 탭이 어떤 API 를 쓰는지(라우트→쿼리 지도), 각 화면의 기본값
// (리더보드는 'pts' 탭, 시너지·기량발전은 'eff' 탭), 기량 발전의 대회 폴백 규칙,
// 그리고 "이미 신선하면 안 부른다"는 판단(prefetchQuery 가 staleTime 을 보고 알아서 건너뛴다).
// 화면 코드는 prefetch.route('/players') 한 줄만 부르면 된다.
//
// 조용히 안 되는 경우(주의):
//  - CompetitionProvider / QueryClientProvider 밖에서 쓰면 각각의 훅이 던진다(즉시 실패라 안전).
//  - 프리페치는 "실패해도 그만"이다. 에러를 삼키고(void) 화면에 아무것도 안 띄운다 —
//    진짜 필요할 때 useQuery 가 다시 부르면서 그때 제대로 에러를 보여준다.
import { useCallback, useMemo } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  gamesOptions,
  growthOptions,
  leaderboardOptions,
  playerOptions,
  playersOptions,
  queryKeys,
  summaryOptions,
  synergyOptions,
} from '../api/queries';
import type { PlayerListItem } from '../api/types';
import { useCompetition } from '../context/CompetitionContext';

// 프리페치를 붙일 수 있는 탭 주소. Layout 의 NavLink to= 와 같은 문자열이라
// 지도(ROUTE_PREFETCH)에 빠진 탭이 있으면 타입 에러로 바로 걸린다.
export type PrefetchRoute = '/' | '/players' | '/compare' | '/leaderboard' | '/synergy' | '/growth';

// 프리페치가 알아야 하는 "지금 어느 대회를 보고 있나" 한 묶음.
interface PrefetchScope {
  competitionId: number | null; // 전역 대회 선택 (null = 전체 대회)
  // 기량 발전 화면은 대회 하나가 꼭 필요해서 '전체'면 첫 대회로 폴백한다(GrowthPage 와 같은 규칙).
  growthScopeId: number | null;
}

export interface Prefetcher {
  route: (route: PrefetchRoute) => void; // 탭에 마우스 올렸을 때
  player: (name: string) => void; // 선수 이름 링크에 마우스 올렸을 때(통산 상세)
}

// 라우트 → 그 화면이 첫 렌더에 부르는 쿼리들.
// 배열로 모아 두지 않고 각자 prefetchQuery 를 부르는 이유: 쿼리마다 응답 타입이 달라
// 한 배열에 담으면 타입이 unknown 으로 뭉개진다. 이렇게 두면 호출마다 타입이 살아 있다.
const ROUTE_PREFETCH: Record<
  PrefetchRoute,
  (queryClient: QueryClient, scope: PrefetchScope) => void
> = {
  // 대시보드 = 요약(있어야 패널이 그려짐) + 경기 목록(GameStatsPanel 드롭다운).
  // 박스스코어는 "목록의 마지막 경기"라 목록이 와야 알 수 있어서 미리 못 받는다.
  '/': (qc, s) => {
    void qc.prefetchQuery(summaryOptions(s.competitionId));
    void qc.prefetchQuery(gamesOptions(s.competitionId));
  },
  '/players': (qc, s) => {
    void qc.prefetchQuery(playersOptions(s.competitionId));
  },
  // 비교 화면도 선수 목록으로 시작한다 — 선수 탭과 같은 키라 캐시를 그대로 나눠 쓴다.
  '/compare': (qc, s) => {
    void qc.prefetchQuery(playersOptions(s.competitionId));
  },
  // 리더보드의 기본 탭은 'pts'(LeaderboardPage 의 useState 초기값).
  '/leaderboard': (qc, s) => {
    void qc.prefetchQuery(leaderboardOptions('pts', s.competitionId));
  },
  // 시너지는 (기준 선수, 지표) 가 있어야 부를 수 있다. 기준 선수 기본값은 "목록의 첫 선수"인데,
  // 목록이 이미 캐시에 있을 때만 그걸 알 수 있다 → 있으면 리포트까지, 없으면 목록만 미리 받는다.
  // (목록이 없으면 어차피 클릭 후 목록 → 리포트 순서로 가야 해서 여기서 억지로 만들 게 없다.)
  '/synergy': (qc, s) => {
    void qc.prefetchQuery(playersOptions(s.competitionId));
    const players = qc.getQueryData<PlayerListItem[]>(queryKeys.players.by(s.competitionId));
    const basePlayer = players?.[0]?.player ?? null;
    if (basePlayer) void qc.prefetchQuery(synergyOptions(basePlayer, 'eff', s.competitionId));
  },
  // 기량 발전의 기본 탭은 'eff'. 대회가 아예 없으면(첫 실행) growthScopeId 가 null 이라 건너뛴다.
  '/growth': (qc, s) => {
    if (s.growthScopeId != null) void qc.prefetchQuery(growthOptions(s.growthScopeId, 'eff'));
  },
};

export function usePrefetch(): Prefetcher {
  const queryClient = useQueryClient();
  const { competitionId, competitions } = useCompetition();
  // GrowthPage 의 scopeId 계산과 같은 식. 여기서 한 번 풀어 두면 지도는 규칙을 몰라도 된다.
  const growthScopeId = competitionId ?? competitions[0]?.id ?? null;

  const route = useCallback(
    (target: PrefetchRoute) => {
      ROUTE_PREFETCH[target](queryClient, { competitionId, growthScopeId });
    },
    [queryClient, competitionId, growthScopeId],
  );

  // 선수 이름 링크는 항상 통산(=competitionId null) 상세로 간다(PlayerDetailPage 가 그렇게 부른다).
  const player = useCallback(
    (name: string) => {
      if (name) void queryClient.prefetchQuery(playerOptions(name, null));
    },
    [queryClient],
  );

  return useMemo<Prefetcher>(() => ({ route, player }), [route, player]);
}
