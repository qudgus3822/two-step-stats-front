// [신설: 2026-07-27 16:14, 김병현 작성] 시너지 탭 — "기준 선수 + 동료 한 명"을 고르면
// 같이 뛸 때 스탯이 얼마나 좋아지는지(WOWY: with-or-without-you) 보여주는 화면.
//
// 요청은 1번(useSynergy 하나)이다 — 서버가 동료 전원의 지표 7종을 한 번에 계산해 주고,
// 지표 탭은 이미 받은 데이터 안에서 정렬만 바뀐다. 선택 상태(기준 선수/펼친 동료)는
// GameStatsPanel 관례처럼 useEffect 없이 파생 계산으로만 처리한다.
import { useState } from "react";
// [변경: 2026-07-29 10:36, 김병현 수정] 선수 링크를 PlayerLink 로 교체(마우스 올리면 상세 미리 받기).
import { PlayerLink } from "../components/PlayerLink";
// [신설: 2026-09-03 09:00, 김병현 작성] "동료" 열 아바타(계획서 §Phase 2-2 — 시각 정체성 개편).
import { PlayerAvatar } from "../components/PlayerAvatar";
// [변경: 2026-07-29 10:36, 김병현 수정] stale 판정을 isStaleView 로 공용화(기량 발전 화면과 같은 식).
import { isStaleView, usePlayers, useSynergy } from "../api/queries";
import { useCompetition } from "../context/CompetitionContext";
import {
  SYNERGY_METRICS,
  type SynergyMetric,
  type SynergyReport,
  type SynergyRow,
} from "../api/types";
import { StatCard } from "../components/StatCard";
// [변경: 2026-07-29 10:36, 김병현 수정] 스피너 → 표 모양 뼈대(TableSkeleton).
import { Empty, ErrorView, TableSkeleton } from "../components/states";
import {
  METRIC_LABELS,
  deltaTone,
  formatAvg,
  formatDelta,
} from "../lib/format";
import { useTheme } from "../theme/ThemeContext";
// [변경: 2026-09-02 17:40, 김병현 수정] 아래 8줄 — 계획서 §7 Phase 4c.
// .page* → PageHeader, .synergy-controls/-pick → NativeSelect, .metric-tabs* → useMetricTabs,
// .card* → SectionCard, .table-wrap/.table → TableScroller + shadcn Table,
// .link-btn → Button(variant=link), .badge → Badge(variant=team).
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { useMetricTabs } from "../components/MetricTabs";
import { TableScroller } from "../components/TableScroller";
import { NativeSelect, NativeSelectOption } from "../components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
// [신설: 2026-09-03 09:00, 김병현 작성] 페이지 아이콘(계획서 §Phase 2-3). navItems.ts 의
// '시너지' 메뉴와 같은 아이콘.
import { Users2 } from "lucide-react";
import { cn } from "../lib/utils";

// 발전률(delta) 톤 → 색 토큰. 시너지·기량발전 두 화면이 같은 규칙을 쓴다.
const DELTA_CLASS: Record<"good" | "bad" | "flat", string> = {
  good: "text-win",
  bad: "text-loss",
  flat: "text-muted-foreground",
};

export function SynergyPage() {
  const { competitionId, competitionLabel } = useCompetition();
  const playersQuery = usePlayers(competitionId);
  const players = playersQuery.data ?? [];

  const [pickedPlayer, setPickedPlayer] = useState<string | null>(null);
  const [metric, setMetric] = useState<SynergyMetric>("eff");
  const [pickedTeammate, setPickedTeammate] = useState<string | null>(null);

  // 기준 선수: 고른 게 지금 목록에 있으면 그걸, 아니면 목록 첫 번째(= 경기당 득점 1위).
  // [변경: 2026-07-28 15:44, 김병현 수정] 서버 정렬이 가나다순으로 바뀌어, 이제 첫 번째는
  // "이름이 제일 앞선 선수"다(득점 1위 아님). 로직은 그대로 — 기본값의 의미만 달라졌다.
  // 대회를 바꾸면 목록이 갈리므로 자동으로 첫 번째로 되돌아간다(별도 effect 불필요).
  const basePlayer =
    pickedPlayer && players.some((p) => p.player === pickedPlayer)
      ? pickedPlayer
      : (players[0]?.player ?? null);

  // 이름을 synergy* 로 구분한다. 선수 목록 쿼리(playersQuery)와 재시도 대상이 섞이면
  // "다시 시도" 버튼이 엉뚱한 쿼리를 부르게 된다.
  // [변경: 2026-07-29 10:36, 김병현 수정] 쿼리 객체를 통째로 들고 있는다(isStaleView 에 넘기려고).
  const synergyQuery = useSynergy(basePlayer, metric, competitionId);
  const {
    data,
    isLoading: synergyLoading,
    error: synergyError,
    refetch: synergyRefetch,
  } = synergyQuery;
  const rows = data?.rows ?? [];
  // 펼친 동료도 같은 방식(파생 계산)으로 검증한다. 지금 rows 에 없으면 상세를 안 그린다.
  // 지표 탭을 바꿔도 rows 가 (placeholderData 덕분에) 한 순간도 비지 않아 상세가 안 사라진다.
  // 기준 선수·대회를 바꿔 rows 자체가 갈리면, 새 rows 에 없는 동료의 상세는 자동으로 닫힌다.
  const detail: SynergyRow | null = pickedTeammate
    ? (rows.find((r) => r.teammate === pickedTeammate) ?? null)
    : null;

  // 지표/선수/대회 전환 중 잠깐 옛 표를 그대로 띄워 두는 구간(결정 9). 첫 로딩은 제외.
  // [변경: 2026-07-29 10:36, 김병현 수정] 같은 판정식을 여러 화면이 쓰게 돼서 isStaleView 로 옮겼다.
  // 덤으로 isPlaceholderData 도 함께 본다 — 갱신이 실패해 멈춰도 낡은 표가 또렷해지지 않는다
  // (기량 발전 화면이 리뷰 R1/R2 로 먼저 고쳤던 구멍이 여기에도 있었다).
  const stale = isStaleView(synergyQuery);

  // [신설: 2026-09-02 17:40, 김병현 작성] 탭 UI + 탭↔패널 ARIA 연결을 useMetricTabs 가 대신 짜 준다.
  const { tabs, panelProps } = useMetricTabs({
    metrics: SYNERGY_METRICS,
    labels: METRIC_LABELS,
    value: metric,
    onChange: setMetric,
    ariaLabel: "시너지 지표",
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={Users2}
        title="시너지"
        sub={`${competitionLabel ?? "전체 대회"} · 같은 팀으로 함께 뛴 경기 기준`}
      />

      {/* [변경: 2026-07-29 10:36, 김병현 수정] 스피너 → 동료 순위표 모양 뼈대(열 7개). */}
      {playersQuery.isLoading && <TableSkeleton rows={8} cols={7} />}
      {playersQuery.error && (
        <ErrorView
          message={playersQuery.error.message}
          onRetry={() => playersQuery.refetch()}
        />
      )}
      {playersQuery.data && playersQuery.data.length === 0 && (
        <Empty>이 대회엔 선수 기록이 없어요.</Empty>
      )}

      {basePlayer && (
        <>
          <label className="flex shrink-0 items-center gap-1.5 text-sm">
            <span className="shrink-0 text-muted-foreground">기준 선수</span>
            <NativeSelect
              className="max-w-[9rem] sm:max-w-none"
              value={basePlayer}
              onChange={(e) => setPickedPlayer(e.target.value)}
              aria-label="기준 선수 선택"
            >
              {players.map((p) => (
                <NativeSelectOption key={p.player} value={p.player}>
                  {p.player} ({p.games}경기)
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>

          {tabs}

          {synergyLoading && <TableSkeleton rows={8} cols={7} />}
          {synergyError && (
            <ErrorView
              message={synergyError.message}
              onRetry={() => synergyRefetch()}
            />
          )}
          {/* [변경: 2026-07-27 15:40, 김병현 수정] 이름 뒤에 "선수"를 끼운다.
              이름이 모음으로 끝나면("이준") "이준 의"가 어색해지는데, 받침을 판정하려면
              숫자로 끝나는 이름("김진우1")까지 규칙이 늘어난다. "선수" 한 글자면 항상 맞다. */}
          {data && data.games === 0 && (
            <Empty>{basePlayer} 선수의 기록이 이 대회엔 없어요.</Empty>
          )}
          {data && data.games > 0 && rows.length === 0 && (
            <Empty>같은 팀으로 함께 뛴 동료가 없어요.</Empty>
          )}

          {data && rows.length > 0 && (
            <div
              {...panelProps}
              className={cn("flex flex-col gap-4", stale && "opacity-55 transition-opacity")}
              aria-busy={stale}
            >
              <SynergyTable
                report={data}
                metric={metric}
                picked={pickedTeammate}
                onPick={setPickedTeammate}
              />
              {detail && <SynergyDetail report={data} detail={detail} />}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// 동료 순위표. 자격 미달 행은 흐리게 남기고(지우지 않음), 자격자가 항상 위(서버 정렬 그대로 표시).
function SynergyTable({
  report,
  metric,
  picked,
  onPick,
}: {
  report: SynergyReport;
  metric: SynergyMetric;
  picked: string | null;
  onPick: (teammate: string | null) => void;
}) {
  return (
    <SectionCard
      title={`${report.player} — ${METRIC_LABELS[metric]}`}
      note={
        <>
          평소(전체 {report.games}경기) 경기당{" "}
          {formatAvg(report.overall[metric])} · 함께 {report.minTogetherGames}
          경기 이상만 순위
        </>
      }
    >
      <TableScroller label="시너지 순위">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-right">#</TableHead>
              <TableHead className="text-left">동료</TableHead>
              <TableHead className="text-right">함께 뛴 수</TableHead>
              <TableHead className="text-right">따로 뛴 수</TableHead>
              <TableHead className="text-right">함께 평균</TableHead>
              <TableHead className="text-right">따로 평균</TableHead>
              <TableHead className="text-right">차이</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => {
              const s = row.metrics[metric];
              const isPicked = picked === row.teammate;
              const tone =
                s.delta == null
                  ? "flat"
                  : deltaTone(s.delta, report.betterWhen[metric]);
              return (
                <TableRow
                  key={row.teammate}
                  className={cn(!row.qualified && "opacity-60", isPicked && "bg-primary/10")}
                >
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {row.rank ?? "—"}
                  </TableCell>
                  <TableCell className="text-left">
                    {/* [변경: 2026-09-03 09:00, 김병현 수정] 아바타를 앞에 놓고 한 줄(flex)로
                        묶는다(계획서 §Phase 2-2). */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <PlayerAvatar name={row.teammate} />
                      {/* 상세를 여닫는 disclosure 버튼. aria-pressed 가 아니라 aria-expanded 다 —
                          같은 이름을 다시 누르면 접혀야 스크린리더 사용자에게 거짓말이 안 된다.
                          aria-controls 는 패널이 실제로 그려질 때만 건다(없는 id 를 가리키면 안 되니까).
                          [변경: 2026-09-02 17:40, 김병현 수정] .link-btn → Button(variant=link).
                          aria-expanded:underline 을 직접 이식 — 펼침의 유일한 시각 신호(계획서 §5-2). */}
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 aria-expanded:underline"
                        aria-expanded={isPicked}
                        aria-controls={isPicked ? "synergy-detail" : undefined}
                        onClick={() => onPick(isPicked ? null : row.teammate)}
                      >
                        {row.teammate}
                      </Button>
                      {!row.qualified && <Badge variant="team">표본 부족</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.togetherGames}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {row.apartGames}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatAvg(s.together)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {s.apart == null ? "—" : formatAvg(s.apart)}
                  </TableCell>
                  <TableCell className={cn("text-right font-semibold tabular-nums", DELTA_CLASS[tone])}>
                    {s.delta == null ? "—" : formatDelta(s.delta)}
                    {/* 색만으로 좋고 나쁨을 알리지 않는다(WCAG 1.4.1) — CompareTable.tsx 의 .sr-only 관례를 그대로 따른다. */}
                    {tone !== "flat" && (
                      <span className="sr-only">
                        {tone === "good" ? " 좋아짐" : " 나빠짐"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableScroller>
      <p className="mt-3 text-xs text-muted-foreground">
        같이 뛴 경기가 적으면 우연일 수 있어요. 기록이 하나도 없는 경기는
        출전으로 안 잡히고, 같은 경기라도 상대팀이었던 경기는 "따로"로 셉니다.
        선수는 이름으로만 구분해서 이름이 같은 사람은 한 사람으로 합쳐집니다.
      </p>
    </SectionCard>
  );
}

// 동료 한 명의 상세 — 지표 7개를 StatCard 로. 이름 붙은 region 이라 스크린리더가 건너뛸 수 있다.
// 포커스는 옮기지 않는다(effect+ref 가 필요한데, 이 페이지는 effect 0개 원칙을 지킨다).
function SynergyDetail({
  report,
  detail,
}: {
  report: SynergyReport;
  detail: SynergyRow;
}) {
  const { tokens } = useTheme();
  return (
    <section
      id="synergy-detail"
      role="region"
      aria-label={`${report.player} + ${detail.teammate} 상세`}
    >
      <SectionCard
        title={`${report.player} + ${detail.teammate}`}
        note={
          <>
            함께 {detail.togetherGames}경기 · 따로 {detail.apartGames}경기 ·{" "}
            <PlayerLink name={detail.teammate}>
              {detail.teammate} 상세 →
            </PlayerLink>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SYNERGY_METRICS.map((m) => {
            const s = detail.metrics[m];
            const tone =
              s.delta == null ? "flat" : deltaTone(s.delta, report.betterWhen[m]);
            // 색(accent)만으로는 방향이 안 읽히므로 label 에 좋아짐/나빠짐을 글자로 넣는다.
            // StatCard 를 안 고치고 접근성을 챙기는 방법(StatCard.value 는 string|number 라 마크업 불가).
            const toneSuffix =
              tone === "flat" ? "" : tone === "good" ? " (좋아짐)" : " (나빠짐)";
            return (
              <StatCard
                key={m}
                label={`경기당 ${METRIC_LABELS[m]}${toneSuffix}`}
                value={s.delta == null ? "—" : formatDelta(s.delta)}
                hint={`같이 ${formatAvg(s.together)} · 따로 ${s.apart == null ? "—" : formatAvg(s.apart)} · 평소 ${formatAvg(report.overall[m])}`}
                accent={
                  tone === "good"
                    ? tokens.good
                    : tone === "bad"
                      ? tokens.critical
                      : tokens.baseline
                }
              />
            );
          })}
        </div>
      </SectionCard>
    </section>
  );
}
