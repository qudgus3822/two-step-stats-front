import { useState } from 'react';
// [변경: 2026-07-15 10:28, 김병현 수정] useApi → React Query useLeaderboard 로 이관
// [변경: 2026-07-29 10:36, 김병현 수정] isStaleView 추가 — 지표 탭/대회를 바꾸는 동안 옛 순위를 흐리게 유지.
import { isStaleView, useLeaderboard } from '../api/queries';
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — useSeason → useCompetition(리네임).
import { useCompetition } from '../context/CompetitionContext';
import { LEADERBOARD_METRICS, type LeaderboardMetric } from '../api/types';
import { BarRanking, type BarDatum } from '../components/charts/BarRanking';
// [변경: 2026-07-29 10:36, 김병현 수정] 선수 링크를 PlayerLink 로 교체(마우스 올리면 상세 미리 받기).
import { PlayerLink } from '../components/PlayerLink';
import { Empty, ErrorView, TableSkeleton } from '../components/states';
// [변경: 2026-07-15 11:37, 김병현 수정] formatAvg import 추가 — 차트/표의 경기당 평균 표시용.
// [변경: 2026-07-15 13:01, 김병현 수정] formatPct import 추가 — 성공률(rate) 계열 표시용.
import { METRIC_LABELS, formatAvg, formatPct } from '../lib/format';
// [변경: 2026-09-02 17:20, 김병현 수정] 아래 5줄 — 계획서 §7 Phase 4b.
// .page* → PageHeader, .metric-tabs/.metric-tab/.is-active → useMetricTabs(Radix Tabs),
// .card* → SectionCard, .table-wrap/.table → TableScroller + shadcn Table.
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { useMetricTabs } from '../components/MetricTabs';
import { TableScroller } from '../components/TableScroller';
import { cn } from '../lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

// 리더보드: 지표를 골라 누적 순위를 막대 + 표로. 차트는 눈으로, 표는 정확한 값/평균으로.
// [변경: 2026-07-15 11:37, 김병현 수정] 메인 지표를 누적 → 경기당 평균으로. 정렬·차트·강조 모두 경기당 기준.
// [변경: 2026-07-15 13:01, 김병현 수정] 지표가 19종(카운트/성공률/180클럽 3계열)으로 늘어 계열별 차트·표 분기 추가.

// [변경: 2026-07-14 17:49, 김병현 수정] 표는 전체 순위, 막대 차트만 상위 12명으로 제한.
const CHART_TOP_N = 12;

// [신설: 2026-09-02 15:40, 김병현 작성] 중계 그래픽 리디자인(broadcast-redesign) Phase C —
// 1~3위 순위 칩. 색만으로 구분하지 않는다 — 굵기와 칩 배경(진하기 3단계)이 같이 바뀌어야
// 색맹도 "위쪽 3명이 특별하다"를 알 수 있다(계획서 AC-C1). 금/은/동 같은 새 팔레트 색은
// 안 쓰고 이미 있는 토큰(primary·foreground 투명도)만 조합했다 — checkPalette 게이트에
// 색을 새로 안 늘린다. 4위부터는 옛 화면 그대로(칩 없이 흐린 숫자)라 나머지 표는 안 바뀐다.
const RANK_TOP_STYLE: Record<number, string> = {
  1: 'bg-primary text-primary-foreground font-bold',
  2: 'bg-foreground/15 text-foreground font-bold',
  3: 'bg-foreground/8 text-foreground font-semibold',
};

function RankCell({ rank }: { rank: number }) {
  const topStyle = RANK_TOP_STYLE[rank];
  return (
    <TableCell className="text-right tabular-nums">
      <span
        className={cn(
          'inline-flex size-6 items-center justify-center rounded-full text-xs',
          topStyle ?? 'text-muted-foreground',
        )}
      >
        {rank}
      </span>
    </TableCell>
  );
}

export function LeaderboardPage() {
  const { competitionId, competitionLabel } = useCompetition();
  const [metric, setMetric] = useState<LeaderboardMetric>('pts');
  // [변경: 2026-07-14 17:49, 김병현 수정] limit 생략 → 상위 N 제한 없이 전체 선수 조회.
  // [변경: 2026-07-15 10:28, 김병현 수정] useApi → useLeaderboard(React Query)
  // [변경: 2026-07-29 10:36, 김병현 수정] 쿼리 객체를 통째로 — isStaleView 가 isFetching/isPlaceholderData 까지 본다.
  const boardQuery = useLeaderboard(metric, competitionId);
  const { data, isLoading, error, refetch } = boardQuery;
  // 지표 탭이 19개라 훑을 때 깜빡임이 제일 심한 화면이다. 새 순위가 올 때까지 옛 순위를 흐리게 유지.
  const stale = isStaleView(boardQuery);
  // [변경: 2026-07-15 13:01, 김병현 수정] 계열(family)은 지표키에서 유추하지 않고 실제 응답 첫 행의 kind 로 정한다.
  // (부제 문구도 계열별로 달라야 해서 data.length>0 JSX 블록보다 앞에서 한 번만 계산해 재사용.)
  const family = data && data.length > 0 ? data[0].kind : null;

  // [신설: 2026-09-02 17:20, 김병현 작성] 탭 UI + 탭↔패널 ARIA 연결(id/aria-labelledby)을
  // useMetricTabs 가 대신 짜 준다. 옛 화면은 이 반대 방향 연결이 아예 없었다(계획서 §9-6).
  const { tabs, panelProps } = useMetricTabs({
    metrics: LEADERBOARD_METRICS,
    labels: METRIC_LABELS,
    value: metric,
    onChange: setMetric,
    ariaLabel: '리더보드 지표',
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="리더보드"
        sub={
          <>
            {/* [변경: 2026-07-14 17:49, 김병현 수정] "상위 N" → 전체 인원 수 표기. */}
            {/* [변경: 2026-07-15 11:37, 김병현 수정] "누적" → "경기당" 순위로 문구 변경. */}
            {/* [변경: 2026-07-15 13:01, 김병현 수정] 계열별 부제 분기: count 는 기존 "경기당" 문구 유지,
                rate/club180 은 "경기당" 빼고 지표명만 + 최소 시도 자격 안내(AC19/21). */}
            {competitionLabel ?? '전체 대회'} ·{' '}
            {family === 'rate' || family === 'club180'
              ? `${METRIC_LABELS[metric]} 순위 (최소 시도 자격을 채운 ${data ? data.length : 0}명)`
              : `경기당 ${METRIC_LABELS[metric]} 순위 (전체 ${data ? `${data.length}명` : ''})`}
          </>
        }
      />

      {/* 지표 선택 탭 */}
      {tabs}

      {/* [변경: 2026-07-15 10:28, 김병현 수정] loading→isLoading, error→error.message, reload→refetch */}
      {/* [변경: 2026-07-29 10:36, 김병현 수정] 스피너 → 표 모양 뼈대. 열은 count 계열 기준 5개. */}
      {isLoading && <TableSkeleton rows={10} cols={5} />}
      {error && <ErrorView message={error.message} onRetry={() => refetch()} />}
      {/* [변경: 2026-07-15 13:01, 김병현 수정] 빈 상태 문구를 계열 무관하게 일반화(AC20). */}
      {data && data.length === 0 && (
        <Empty>이 지표에 표시할 선수가 없어요 (기록이 없거나 최소 시도 자격 미달).</Empty>
      )}

      {data && data.length > 0 && (
        // [변경: 2026-07-29 10:36, 김병현 수정] 차트+표를 통째로 흐리게. 지표 탭은 또렷하게 남아
        // "방금 누른 탭"이 어디인지 계속 보인다(탭은 이 div 바깥이라 안 흐려진다).
        // [변경: 2026-09-02 17:20, 김병현 수정] .grid-2/.is-stale → Tailwind + panelProps 스프레드.
        <div
          {...panelProps}
          className={cn('grid gap-4 lg:grid-cols-2', stale && 'opacity-55 transition-opacity')}
          aria-busy={stale}
        >
          <SectionCard
            title={
              <>
                {/* [변경: 2026-07-15 11:37, 김병현 수정] 차트가 경기당 평균 기준임을 제목에 명시. */}
                {/* [변경: 2026-07-15 13:01, 김병현 수정] rate/club180 은 "경기당" 문구 없이 지표명만(AC21). */}
                {METRIC_LABELS[metric]}{' '}
                {family === 'rate' || family === 'club180' ? '상위' : '경기당 상위'}
              </>
            }
          >
            <BarRanking
              data={data.slice(0, CHART_TOP_N).map<BarDatum>((row) => ({
                label: row.player,
                // [변경: 2026-07-15 13:01, 김병현 수정] 계열별 값(perGame/pct/sum)을 공통 row.value 로 통일.
                value: row.value,
              }))}
              // [변경: 2026-07-15 13:01, 김병현 수정] rate 계열은 %, 그 외(count/club180)는 소수1자리 평균.
              format={family === 'rate' ? formatPct : formatAvg}
            />
          </SectionCard>

          <SectionCard
            title="전체 순위"
            note={
              <>
                {/* [변경: 2026-07-15 11:37, 김병현 수정] "누적 · 경기당 평균" → "경기당 평균 · 누적"(경기당이 메인). */}
                {/* [변경: 2026-07-15 13:01, 김병현 수정] rate/club180 은 자격 안내로 카드노트 문구 교체(AC19). */}
                {family === 'rate' && '최소 시도 자격을 채운 선수만 · 성공률 · 성공/시도'}
                {family === 'club180' && '최소 시도 자격을 채운 선수만 · 180점 · 성공률 3종'}
                {family === 'count' && '경기당 평균 · 누적'}
              </>
            }
          >
            <TableScroller label="리더보드 전체 순위">
              <Table>
                {/* [변경: 2026-07-15 13:01, 김병현 수정] 표를 계열별 3레이아웃으로 분기(AC18).
                    family 는 레이아웃 선택에만 쓰고, 실제 필드 접근은 각 행에서 row.kind 로 다시 좁힌다
                    (배열 전체가 한 계열이란 건 런타임 보장일 뿐 타입 보장이 아니라서 — tsc 통과 위해 필수). */}
                {family === 'count' && (
                  <>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 text-right">#</TableHead>
                        <TableHead className="text-left">선수</TableHead>
                        <TableHead className="text-right">출전</TableHead>
                        {/* [변경: 2026-07-15 11:37, 김병현 수정] 표 컬럼 순서를 경기당 → 누적으로 교체. */}
                        <TableHead className="text-right">경기당</TableHead>
                        <TableHead className="text-right">누적</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((row) => {
                        if (row.kind !== 'count') return null;
                        return (
                          <TableRow key={row.player}>
                            <RankCell rank={row.rank} />
                            <TableCell className="text-left">
                              <PlayerLink name={row.player} />
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{row.games}</TableCell>
                            {/* [변경: 2026-07-15 11:37, 김병현 수정] 경기당(strong)·누적(muted) 순서·강조 교체. */}
                            <TableCell className="text-right font-semibold tabular-nums">
                              {formatAvg(row.perGame)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {row.total}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </>
                )}
                {family === 'rate' && (
                  <>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 text-right">#</TableHead>
                        <TableHead className="text-left">선수</TableHead>
                        <TableHead className="text-right">출전</TableHead>
                        <TableHead className="text-right">성공률</TableHead>
                        <TableHead className="text-right">성공/시도</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((row) => {
                        if (row.kind !== 'rate') return null;
                        return (
                          <TableRow key={row.player}>
                            <RankCell rank={row.rank} />
                            <TableCell className="text-left">
                              <PlayerLink name={row.player} />
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{row.games}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {formatPct(row.pct)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {row.makes}/{row.atts}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </>
                )}
                {family === 'club180' && (
                  <>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 text-right">#</TableHead>
                        <TableHead className="text-left">선수</TableHead>
                        <TableHead className="text-right">출전</TableHead>
                        <TableHead className="text-right">180점</TableHead>
                        <TableHead className="text-right">야투%</TableHead>
                        <TableHead className="text-right">3점%</TableHead>
                        <TableHead className="text-right">자유투%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((row) => {
                        if (row.kind !== 'club180') return null;
                        return (
                          <TableRow key={row.player}>
                            <RankCell rank={row.rank} />
                            <TableCell className="text-left">
                              <PlayerLink name={row.player} />
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{row.games}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {formatAvg(row.sum)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {formatPct(row.fgPct)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {formatPct(row.fg3Pct)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {formatPct(row.ftPct)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </>
                )}
              </Table>
            </TableScroller>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
