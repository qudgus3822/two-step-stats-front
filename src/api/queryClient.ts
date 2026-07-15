import { QueryClient } from '@tanstack/react-query';

// 앱 전체가 함께 쓰는 React Query 클라이언트(= 캐시 저장소).
// 렌더마다 새로 만들면 캐시가 날아가므로 모듈 최상단에서 딱 한 번만 만든다(싱글턴).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 1분 동안은 "신선함"으로 봐서 재요청을 아예 건너뛴다 → 대회 재전환/재방문이 즉시.
      // (staleTime 0 이어도 캐시 즉시표시+백그라운드 갱신은 되지만, 1분이면 그 갱신마저 스킵해 더 가볍다.)
      staleTime: 60_000,
      // 실패 시 자동 재시도는 1번만. 기본 3번은 사람이 읽는 에러 메시지가 너무 늦게 뜬다.
      retry: 1,
      // 이 대시보드는 "업로드할 때만" 데이터가 바뀐다. 창 포커스마다 재요청은 낭비 → 끈다.
      // (업로드 후에는 invalidateAfterUpload 로 명시적으로 갱신하므로 최신성 문제 없음.)
      refetchOnWindowFocus: false,
    },
  },
});
