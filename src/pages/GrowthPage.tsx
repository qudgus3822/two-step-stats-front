// [신설: 2026-07-28 15:00, 김병현 작성] 기량 발전 탭 — 대회(시즌) 하나를 고르면 직전 시즌 대비
// 각 선수가 얼마나 좋아졌는지(%)를 종합 순위(EFF)와 지표별 순위(9개 탭)로 보여주는 화면.
//
// 계산·정렬·랭킹은 전부 백엔드(useGrowth 가 받은 그대로 그린다). 이 화면은 두 가지만 한다:
//  1) 대회 스코프 결정(전역 피커가 '전체 대회'면 헤더 기본값으로 파생 폴백 — setCompetitionId 는 안 씀)
//  2) 지표 탭 선택(useState 하나) — 나머지는 전부 파생 계산. useEffect 0개.
//
// [변경: 2026-07-28 17:00, 김병현 수정] v3.1 — 성공률 2종(2점·3점) 추가. 종합 Top3 카드는
// 사용자가 직접 뺐다(원래 있었지만 "프론트에 종합순위 필요없어서 내가 빼버렸어") — 남은 쿼리는
// boardQuery 하나뿐이다. 종합 계산(결정 3, EFF 하한)은 백엔드 규칙으로 그대로 살아 있고,
// tinyBaseCount 고지는 표 아래 안내로 자리를 옮겼다(AC 83-b).
import { useState } from "react";
// [변경: 2026-07-29 10:36, 김병현 수정] stale 판정을 isStaleView 로 공용화(같은 식을 여러 화면이 쓴다).
import { isStaleView, useGrowth } from "../api/queries";
// [변경: 2026-07-29 10:36, 김병현 수정] 선수 링크를 PlayerLink 로 교체(마우스 올리면 상세 미리 받기).
import { PlayerLink } from "../components/PlayerLink";
import { useCompetition } from "../context/CompetitionContext";
import {
  GROWTH_METRICS,
  type GrowthKindView,
  type GrowthMetric,
  type GrowthReport,
  type GrowthRow,
} from "../api/types";
// [변경: 2026-07-29 10:36, 김병현 수정] 스피너 → 표 모양 뼈대(TableSkeleton).
import { Empty, ErrorView, Loading, TableSkeleton } from "../components/states";
import {
  GROWTH_KIND_VIEW,
  GROWTH_BASIS_LABELS,
  GROWTH_UNQUALIFIED_LABELS,
  METRIC_LABELS,
  deltaTone,
} from "../lib/format";
// [변경: 2026-09-02 17:50, 김병현 수정] 아래 7줄 — 계획서 §7 Phase 4c.
// .page* → PageHeader, .metric-tabs* → useMetricTabs, .card* → SectionCard,
// .table-wrap/.table → TableScroller + shadcn Table, .growth-scope-note → Alert,
// .badge → Badge(variant=team).
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { useMetricTabs } from "../components/MetricTabs";
import { TableScroller } from "../components/TableScroller";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";

// 발전률(delta) 톤 → 색 토큰. 시너지·기량발전 두 화면이 같은 규칙을 쓴다.
const DELTA_CLASS: Record<"good" | "bad" | "flat", string> = {
  good: "text-win",
  bad: "text-loss",
  flat: "text-muted-foreground",
};

export function GrowthPage() {
  const { competitionId, competitions, labelOf, loading, error } =
    useCompetition();
  const [metric, setMetric] = useState<GrowthMetric>("eff");

  // 이 화면은 시즌 하나가 꼭 필요하다. 전역이 '전체 대회'(null)면 헤더가 기본으로 잡는 대회로 대신 본다.
  // competitions[0] 은 CompetitionContext 의 기본 선택과 같은 규칙이다(앱 전체 일관).
  // ⚠ 그게 타임라인상 '최신'이라는 보장은 없다(같은 year+seasonNo 면 이름 오름차순이 이긴다) →
  //   안내 문구에서 "가장 최근"이라고 단정하지 않는다.
  // 전역 상태는 절대 안 건드린다(다른 탭의 선택이 조용히 바뀌면 안 되니까) → effect 없이 파생 계산만.
  const scopeId = competitionId ?? competitions[0]?.id ?? null;
  const usingFallback = competitionId == null && scopeId != null;

  const boardQuery = useGrowth(scopeId, metric); // 표 — 고른 탭 기준
  const report = boardQuery.data;
  // [변경: 2026-07-28 16:00, 김병현 수정] 갱신 중(isFetching)뿐 아니라 실패 후에도 placeholderData 가
  // 살아 있으면 낡은 표가 멀쩡한 값처럼 보인다(리뷰 R1/R2). isPlaceholderData 도 같이 흐려서
  // "지금 보이는 게 최신이 아니다"를 놓치지 않게 한다 — 특히 지표 탭을 바꾼 순간의 # 열은
  // 옛 지표로 매겨진 순위라 값이 안 맞는데, 흐려지기라도 해야 사용자가 눈치챈다.
  // [변경: 2026-07-29 10:36, 김병현 수정] 같은 판정식을 시너지·선수·리더보드도 쓰게 돼서
  // isStaleView 로 옮겼다(식은 그대로 — 여기 있던 규칙이 공용 규칙이 된 것).
  const stale = isStaleView(boardQuery);

  const scopeLabel = labelOf(scopeId) ?? "대회 확인 중";

  // [신설: 2026-09-02 17:50, 김병현 작성] 탭 UI + 탭↔패널 ARIA 연결을 useMetricTabs 가 대신 짜 준다.
  // 옛 화면은 aria-labelledby 방향만 있었다(탭 id 는 있었지만 aria-controls/패널 id 는 없었음,
  // 계획서 §9-6) — useMetricTabs 로 바꾸며 양방향이 채워진다.
  const { tabs, panelProps } = useMetricTabs({
    metrics: GROWTH_METRICS,
    labels: METRIC_LABELS,
    value: metric,
    onChange: setMetric,
    ariaLabel: "기량 발전 지표",
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="기량 발전"
        sub={
          report ? (
            <>
              {report.current.label} ← 직전: {report.previous?.label ?? "없음"}{" "}
              · 이번 {report.current.games}경기 · 직전{" "}
              {report.previous?.games ?? 0}경기 · 양 시즌 {report.minGames}경기
              이상만 순위
            </>
          ) : (
            scopeLabel
          )
        }
      />

      {usingFallback && (
        // [변경: 2026-09-02 17:50, 김병현 수정] .growth-scope-note → Alert(계획서 §5-5).
        <Alert className="border-l-[3px] border-l-primary">
          <AlertDescription>
            헤더가 '전체 대회'라서 <strong>{scopeLabel}</strong> 기준으로 보고
            있어요. 헤더에서 대회를 바꾸면 그 대회 기준으로 바뀝니다.
          </AlertDescription>
        </Alert>
      )}

      {loading && <Loading />}
      {error && <ErrorView message={error} />}
      {!loading && !error && competitions.length === 0 && (
        <Empty>등록된 대회가 없어요. 먼저 엑셀을 업로드해 주세요.</Empty>
      )}

      {!loading && !error && competitions.length > 0 && (
        <>
          {/* [변경: 2026-07-29 10:36, 김병현 수정] 스피너 → 발전 순위표 모양 뼈대(열 7개). */}
          {boardQuery.isLoading && <TableSkeleton rows={8} cols={7} />}
          {boardQuery.error && (
            <ErrorView
              message={boardQuery.error.message}
              onRetry={() => boardQuery.refetch()}
            />
          )}

          {report && report.previous == null && (
            <Empty>
              이 대회가 가장 오래된 대회예요. 비교할 직전 시즌이 없어요.
            </Empty>
          )}
          {report && report.previous != null && report.previous.games === 0 && (
            <Empty>
              직전 시즌({report.previous.label})에 기록이 없어서 비교할 수
              없어요.
            </Empty>
          )}
          {report &&
            report.previous != null &&
            report.previous.games > 0 &&
            report.rows.length === 0 && (
              <Empty>
                이 대회엔 선수 기록이 없어요.
                {report.goneCount > 0 &&
                  ` (직전 시즌엔 ${report.goneCount}명이 뛰었어요)`}
              </Empty>
            )}

          {report &&
            report.previous != null &&
            report.previous.games > 0 &&
            report.rows.length > 0 && (
              <>
                {tabs}

                <div
                  {...panelProps}
                  className={cn(stale && "opacity-55 transition-opacity")}
                  aria-busy={stale}
                >
                  <GrowthTable report={report} metric={metric} />
                </div>
              </>
            )}
        </>
      )}
    </div>
  );
}

// 발전 순위표. 자격 미달/신규 행은 흐리게 남기고(지우지 않음), 서버 정렬 그대로 표시한다.
function GrowthTable({
  report,
  metric,
}: {
  report: GrowthReport;
  metric: GrowthMetric;
}) {
  // [신설: 2026-07-28 17:00, 김병현 작성] v3.1 — "성공률 탭에서 화면이 달라지는 것 전부"를 이
  // 한 줄로 뽑아 아래 전부(열 제목·값 셀·발전률 셀·card-note·안내 문구)에 쓴다(AC 83).
  // 'fg2Pct'/'fg3Pct' 문자열도, 자격 상수도 이 컴포넌트 어디에도 없다 — 전부 응답에서 읽는다.
  // report.kinds 는 Record 라 report 가 낡았어도(placeholderData) 새 metric 으로 읽으면 안전하다(B4).
  const view = GROWTH_KIND_VIEW[report.kinds[metric]];

  return (
    <SectionCard
      title={`발전 순위 — ${METRIC_LABELS[metric]}`}
      note={
        <>
          직전 시즌 대비 · {view.cardNote}
          {report.betterWhen[metric] === "lower" &&
            " (낮을수록 좋은 지표라 줄어들면 +)"}
        </>
      }
    >
      <TableScroller label="기량 발전 순위">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="w-10 text-right">
                #
              </TableHead>
              <TableHead scope="col" className="text-left">
                선수
              </TableHead>
              <TableHead scope="col" className="text-right">직전 경기</TableHead>
              <TableHead scope="col" className="text-right">이번 경기</TableHead>
              <TableHead scope="col" className="text-right">직전 {view.valueColumnWord}</TableHead>
              <TableHead scope="col" className="text-right">이번 {view.valueColumnWord}</TableHead>
              <TableHead scope="col" className="text-right">{view.deltaColumnLabel}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => (
              <GrowthTableRow key={row.player} row={row} metric={metric} view={view} />
            ))}
          </TableBody>
        </Table>
      </TableScroller>
      <p className="mt-3 text-xs text-muted-foreground">
        발전률은 "직전 시즌보다 얼마나 좋아졌나"예요. 턴오버처럼 낮아야 좋은
        지표는 줄어들면 +가 됩니다.{" "}
        {/* [변경: 2026-07-28 18:00, 김병현 수정] v3.1 구현 리뷰 D1 — "직전 값이 0이면 —" 문장이
            성공률 탭에서도 그대로 떠서 방금 표에 뜬 값(영점 0.0%→20.0%=+20.0, 1위)을 정면으로
            부정했다. view.baseNote 로 계열별 문장을 낸다 — 카운트는 그대로, 성공률은 사실대로. */}
        {view.baseNote} 기록이 하나도 없는 경기는 출전으로 안 잡히고, 선수는
        이름으로만 구분해서 이름이 같은 사람은 한 사람으로 합쳐집니다.
        {report.goneCount > 0 &&
          ` 직전 시즌엔 뛰었지만 이번 시즌 기록이 없는 선수 ${report.goneCount}명은 뺐어요.`}
        {/* [신설: 2026-07-28 17:00, 김병현 작성] AC 83-b — v1 리뷰 블로커 B1 재발 방지(자리만
            Top3 카드 아래 → 표 아래로 옮김). report.metric(응답이 말하는 지표) 을 쓴다 — 로컬
            상태 metric 을 쓰면 탭 전환 찰나에 낡은 tinyBaseCount 와 새 지표 이름이 섞여
            "3점 성공률 기준값이 너무 작아…" 같은 구조적으로 불가능한 문장이 뜬다(v3.1 리뷰 N4). */}
        {report.tinyBaseCount > 0 &&
          ` ${METRIC_LABELS[report.metric]} 기준값이 너무 작아 발전률을 못 낸 선수 ${report.tinyBaseCount}명이 있어요(표에서 '기준값 작음').`}
        {/* [신설: 2026-07-28 17:00, 김병현 작성] rate 전용 안내 두 줄(v3.1 리뷰 N7 — 기술자 안에
            있어서 이 컴포넌트엔 kind==='rate' 분기가 없다. minAttempts 는 Record 라 새 metric 으로
            읽어도 안전하다). */}
        {view.extraNotes(report.minAttempts[metric]).map((note) => ` ${note}`)}
      </p>
    </SectionCard>
  );
}

function GrowthTableRow({
  row,
  metric,
  view,
}: {
  row: GrowthRow;
  metric: GrowthMetric;
  // [변경: 2026-07-28 18:00, 김병현 수정] v3.1 구현 리뷰 D6 — 인라인 조회 타입 대신 이름 있는
  // GrowthKindView 를 쓴다(v2 리뷰 R4 와 같은 유형의 반복이었다).
  view: GrowthKindView;
}) {
  const s = row.metrics[metric];
  // pct 는 이미 방향이 반영된 값(클수록 좋음)이라 항상 'higher' 로 톤을 낸다.
  const tone = s.pct == null ? "flat" : deltaTone(s.pct, "higher");
  const basisLabel = GROWTH_BASIS_LABELS[s.basis];

  return (
    <TableRow className={cn(row.rank == null && "opacity-60")}>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {row.rank ?? "—"}
      </TableCell>
      <TableCell className="text-left">
        <PlayerLink name={row.player} />
        {row.isNew && (
          <Badge variant="team" className="ml-1.5">
            신규
          </Badge>
        )}
        {/* [변경: 2026-07-28 17:00, 김병현 수정] v3.1 — !qualified 대신 unqualifiedBy 로 뱃지를
            고른다(AC 50). 카운트 탭은 games 뿐이라 문구가 v2 와 똑같다(표본 부족) — 회귀 없음. */}
        {!row.isNew && row.unqualifiedBy !== "none" && (
          <Badge variant="team" className="ml-1.5">
            {GROWTH_UNQUALIFIED_LABELS[row.unqualifiedBy]}
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {row.prevGames}
      </TableCell>
      <TableCell className="text-right tabular-nums">{row.currGames}</TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {s.prev == null ? "—" : view.formatValue(s.prev)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {s.curr == null ? "—" : view.formatValue(s.curr)}
      </TableCell>
      <TableCell className={cn("text-right font-semibold tabular-nums", DELTA_CLASS[tone])}>
        {s.pct == null ? (
          <>
            — <span className="text-muted-foreground">{basisLabel}</span>
          </>
        ) : (
          <>
            {view.formatDelta(s.pct)}
            {/* [변경: 2026-07-28 18:00, 김병현 수정] v3.1 구현 리뷰 D5 — 단위를 글자로(WCAG 1.3.1)
                는 화면에 단위가 안 보일 때만 필요하다. 카운트 탭은 "+38.2%"에 이미 % 가 보여서
                deltaUnitSr 가 ''(빈 문자열)이다 — 그때는 sr-only 를 아예 안 그려 "퍼센트, 퍼센트"
                로 두 번 읽히는 걸 막는다. 성공률 탭("+10.0")만 실제로 그려진다. */}
            {view.deltaUnitSr && <span className="sr-only">{view.deltaUnitSr}</span>}
            {/* 색만으로 좋고 나쁨을 알리지 않는다(WCAG 1.4.1) — SynergyPage 와 같은 관례. */}
            {tone !== "flat" && (
              <span className="sr-only">{tone === "good" ? " 좋아짐" : " 나빠짐"}</span>
            )}
          </>
        )}
      </TableCell>
    </TableRow>
  );
}
