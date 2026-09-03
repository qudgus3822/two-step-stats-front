// [변경: 2026-07-15 10:28, 김병현 수정] useApi → React Query useSummary 로 이관
import { useSummary } from '../api/queries';
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — useSeason → useCompetition(리네임).
import { useCompetition } from '../context/CompetitionContext';
import { GameStatsPanel } from '../components/GameStatsPanel';
// [신설: 2026-09-03 09:00, 김병현 작성] 페이지 아이콘(계획서 §Phase 2-3). navItems.ts 의
// '경기 결과'(=이 페이지) 메뉴 아이콘과 같은 걸 쓴다 — 메뉴와 실제 화면이 같은 상징을 쓰게.
import { LayoutDashboard } from 'lucide-react';
// [변경: 2026-07-14 14:56, 김병현 수정] 요약 카드 제거로 StatCard import 삭제.
// [변경: 2026-07-15 09:45, 김병현 수정] 득점 TOP·스탯 코드 분포 차트 제거로 Link·BarRanking·statCodeLabel·useTheme import 삭제.
// [변경: 2026-07-29 10:36, 김병현 수정] 스피너 → 표 모양 뼈대(TableSkeleton).
import { Empty, ErrorView, TableSkeleton } from '../components/states';
// [변경: 2026-09-02 17:00, 김병현 수정] .page/.page-head/.page-title/.page-sub → PageHeader (계획서 §7 Phase 4a).
import { PageHeader } from '../components/PageHeader';

// 대시보드: 경기 기록을 한눈에.
// [변경: 2026-07-15 09:45, 김병현 수정] 득점 TOP·스탯 코드 분포 차트 제거 — 이전엔 "전체 규모를 한눈에. 요약 카드 4개 + 득점 TOP + 스탯 코드 분포"였음.

export function DashboardPage() {
  const { competitionId, competitionLabel } = useCompetition();

  // [변경: 2026-07-15 09:45, 김병현 수정] 득점 TOP 리더보드 호출(topState)·useTheme(tokens) 제거 — 관련 차트 삭제.
  // [변경: 2026-07-15 10:28, 김병현 수정] useApi → useSummary(React Query)
  const summaryQuery = useSummary(competitionId);

  const summary = summaryQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={LayoutDashboard}
        title="대시보드"
        sub={`${competitionLabel ?? '전체 대회'} 기록 요약`}
      />

      {/* [변경: 2026-07-15 10:28, 김병현 수정] loading→isLoading, error→error.message, reload→refetch */}
      {/* [변경: 2026-07-29 10:36, 김병현 수정] 여기가 첫 화면이라 인상이 제일 중요하다.
          아래에 뜰 GameStatsPanel 의 박스스코어와 비슷한 크기(열 9개)로 자리를 미리 잡아 둔다. */}
      {summaryQuery.isLoading && <TableSkeleton rows={6} cols={9} />}
      {summaryQuery.error && (
        <ErrorView message={summaryQuery.error.message} onRetry={() => summaryQuery.refetch()} />
      )}

      {summary && summary.events === 0 && (
        <Empty>
          아직 데이터가 없어요. API 서버에 엑셀을 업로드하면 여기에 통계가 채워집니다.
        </Empty>
      )}

      {summary && summary.events > 0 && (
        <>
          {/* [변경: 2026-07-14 14:56, 김병현 수정] 상단 요약 카드 4개(시즌/경기/선수/기록이벤트) 제거 — 사용자 요청. */}

          {/* [변경: 2026-07-14 14:43, 김병현 수정] 경기 단위 통계표 추가.
              시즌(전역 필터) + 경기(드롭다운)를 고르면 그 경기 스탯을 한눈에. */}
          <GameStatsPanel />
        </>
      )}
    </div>
  );
}
