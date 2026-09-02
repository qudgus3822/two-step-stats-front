// [신설: 2026-07-27 16:35, 김병현 작성]
import { Link } from 'react-router-dom';
// [변경: 2026-07-29 10:36, 김병현 수정] isStaleView 추가 — 대회 스코프를 바꾸는 동안 옛 비교표를 흐리게 유지.
import { isStaleView, usePlayer, usePlayers } from '../api/queries';
import type { PlayerDetail, PlayerListItem } from '../api/types';
import { ResultBadge } from '../components/Badge';
import { CompareTable } from '../components/CompareTable';
import { TrendLine } from '../components/charts/TrendLine';
// [변경: 2026-07-29 10:36, 김병현 수정] 스피너 → 비교표 모양 뼈대(TableSkeleton, 지표+두 선수 = 열 3개).
import { Empty, ErrorView, TableSkeleton } from '../components/states';
import { useCompareSelection } from '../hooks/useCompareSelection';
import { buildComparisonTrend, buildShootingRows, buildSummaryRows } from '../lib/comparison';
import { gameLabel } from '../lib/format';
import { summarizePlayer } from '../lib/playerSummary';
// [변경: 2026-09-02 19:10, 김병현 수정] 아래 6줄 — 계획서 §7 Phase 4e.
// .page* → PageHeader, .compare-picker/-field → NativeSelect, 스왑 버튼 → Button(size=icon),
// .card* → SectionCard, .grid-2 → Tailwind grid, .table-wrap/.table → TableScroller+shadcn Table.
import { ArrowLeftRight } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { TableScroller } from '../components/TableScroller';
import { Button } from '../components/ui/button';
import { NativeSelect, NativeSelectOption } from '../components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { cn } from '../lib/utils';

// 선수 두 명 + 대회를 고르면 요약/추이/슈팅/경기 로그를 나란히 대조해서 보여주는 화면.
// 계산은 lib/playerSummary·lib/comparison 이 다 하고, 여기는 상태 판정 + 조립만 한다.

export function ComparePage() {
  const {
    playerA,
    playerB,
    competitionId,
    competitionLabel,
    isScopeSettled,
    scopeError,
    selectPlayerA,
    selectPlayerB,
    swap,
  } = useCompareSelection();

  const playersQuery = usePlayers(competitionId);
  const leftQuery = usePlayer(playerA ?? '', competitionId);
  const rightQuery = usePlayer(playerB ?? '', competitionId);

  const players = playersQuery.data ?? [];
  // 페이지 수준: 목록이 없으면 아무것도 고를 수 없다.
  const pageLoading = !isScopeSettled || playersQuery.isLoading;
  const pageError = playersQuery.error;
  // 결과 영역 수준: 선택된 선수의 상세만 본다(미선택 쿼리는 enabled:false 라 항상 조용하다).
  const detailLoading = leftQuery.isLoading || rightQuery.isLoading;
  const detailError = leftQuery.error ?? rightQuery.error;
  // [변경: 2026-07-29 10:36, 김병현 수정] 대회 스코프만 바꾸면(같은 두 선수) 옛 비교표가 깔린 채로
  // 새 값이 온다(playerOptions 의 조건부 placeholderData). 둘 중 하나라도 갱신 중이면 흐리게.
  const detailStale = isStaleView(leftQuery) || isStaleView(rightQuery);

  const bothPicked = !!playerA && !!playerB && playerA !== playerB;
  const left = leftQuery.data;
  const right = rightQuery.data;

  return (
    <div className="flex flex-col gap-4">
      {/* 1. 페이지 헤더 — 로딩·에러 중에도 항상 보인다. */}
      <PageHeader title="선수 비교" sub={buildSubtitle(competitionId, competitionLabel, scopeError)} />

      {/* 2~4. 페이지 수준 판정: 목록 자체를 못 가져오면 여기서 끝난다. */}
      {pageError ? (
        <ErrorView message={pageError.message} onRetry={() => playersQuery.refetch()} />
      ) : pageLoading ? (
        <TableSkeleton rows={6} cols={3} />
      ) : players.length === 0 ? (
        <Empty>이 대회엔 선수 기록이 없어요.</Empty>
      ) : (
        <>
          {/* 5. 선택 바 — 여기부터는 아래 결과 영역이 무슨 상태든 계속 보인다. */}
          <div className="flex flex-wrap items-end gap-3">
            <PlayerSelect
              caption="선수 A"
              value={playerA}
              onChange={selectPlayerA}
              players={players}
              takenName={playerB}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={swap}
              aria-label="두 선수 자리 바꾸기"
              title="자리 바꾸기"
            >
              <ArrowLeftRight />
            </Button>
            <PlayerSelect
              caption="선수 B"
              value={playerB}
              onChange={selectPlayerB}
              players={players}
              takenName={playerA}
            />
          </div>

          {/* 6~10. 결과 영역 판정. */}
          {!bothPicked ? (
            <Empty>{pickerEmptyMessage(playerA, playerB)}</Empty>
          ) : detailError ? (
            <ErrorView
              message={detailError.message}
              onRetry={() => {
                leftQuery.refetch();
                rightQuery.refetch();
              }}
            />
          ) : detailLoading ? (
            <TableSkeleton rows={6} cols={3} />
          ) : !left || !right ? (
            <Empty>{missingRecordMessage(playerA ?? '', playerB ?? '', left, right)}</Empty>
          ) : (
            // [변경: 2026-07-29 10:36, 김병현 수정] 선택 바는 또렷하게 두고 결과만 흐리게 —
            // 방금 바꾼 선택이 화면에 그대로 남아 있어야 "먹혔다"가 읽힌다.
            <div
              className={cn('flex flex-col gap-4', detailStale && 'opacity-55 transition-opacity')}
              aria-busy={detailStale}
            >
              <CompareResults left={left} right={right} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// 부제 문구 — "아는 것 먼저" 원칙: competitionId 가 있는데 라벨을 아직 모르면(로딩 중이거나
// 목록 조회 실패) '전체 대회'라고 단정하지 않는다. scopeError 안내("전체 대회 기준")도
// 스코프가 실제로 전체(competitionId === null)일 때만 보여준다 — 딥링크로 특정 대회를 골랐는데
// 목록만 실패한 경우까지 "전체 대회 기준"이라고 하면 실제 스코프와 화면 문구가 어긋난다.
function buildSubtitle(
  competitionId: number | null,
  competitionLabel: string | null,
  scopeError: string | null,
): string {
  if (competitionId == null) {
    return scopeError
      ? '대회 목록을 못 불러왔어요 · 전체 대회 기준'
      : '전체 대회';
  }
  return `${competitionLabel ?? '대회 확인 중'}`;
}

// 선수 둘 다 고르기 전(AC 68 앞 3가지)의 안내 문구.
function pickerEmptyMessage(a: string | null, b: string | null): string {
  if (!a && !b) return '선수 두 명을 고르면 나란히 비교해요.';
  if (a && b && a === b) return '서로 다른 선수 두 명을 골라주세요.';
  return '한 명 더 고르면 비교가 시작돼요.';
}

// 선수는 골랐는데 이 대회 기록이 없는 경우(AC 68 뒤 2가지). 두 이름을 가운뎃점으로 잇는다 —
// 한 명만 골라 쓰면 "누가 없다는 거지?" 하게 된다.
function missingRecordMessage(
  a: string,
  b: string,
  left: PlayerDetail | null | undefined,
  right: PlayerDetail | null | undefined,
): string {
  if (!left && !right) {
    return `${a}·${b} 둘 다 이 대회 기록이 없어요. 다른 대회를 고르거나 선수를 바꿔보세요.`;
  }
  const missingName = !left ? a : b;
  return `${missingName}은(는) 이 대회 기록이 없어요. 다른 대회를 고르거나 선수를 바꿔보세요.`;
}

// 정상 상태 네 블록: 요약 비교표 → (grid-2) 득점 추이 + 슈팅 성공률 → (grid-2) 경기 로그 2장.
function CompareResults({ left, right }: { left: PlayerDetail; right: PlayerDetail }) {
  const leftSummary = summarizePlayer(left);
  const rightSummary = summarizePlayer(right);
  const trend = buildComparisonTrend(left, right);

  return (
    <>
      <SectionCard title="요약 비교">
        <CompareTable
          leftName={left.player}
          rightName={right.player}
          rows={buildSummaryRows(leftSummary, rightSummary)}
        />
      </SectionCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard title="경기별 득점 추이" note="미출전 경기는 건너뛰고 이어 그렸어요.">
          {/* 비교 차트는 extraKeys 를 안 넘긴다 — ChartTooltip 은 그 x 지점 데이터 행 통째를
              읽는데, 우리 행은 키 하나에 값 하나뿐이라 두 선수의 상대/스코어가 부딪힌다. */}
          <TrendLine data={trend.points} series={trend.series} format={(v) => `${v}점`} />
        </SectionCard>

        <SectionCard title="슈팅 성공률(누적)" note="시도가 적으면 성공률이 크게 튈 수 있어요.">
          <CompareTable
            leftName={left.player}
            rightName={right.player}
            rows={buildShootingRows(leftSummary, rightSummary)}
          />
        </SectionCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <PlayerGameLog detail={left} />
        <PlayerGameLog detail={right} />
      </div>
    </>
  );
}

// 경기 로그 카드 — 선수 상세와 같은 8열(AC 72). 두 선수가 뛴 경기가 달라 합치지 않고 카드 두 장.
function PlayerGameLog({ detail }: { detail: PlayerDetail }) {
  return (
    <SectionCard title={`${detail.player} 경기 로그`} note={`${detail.games.length}경기`}>
      <TableScroller label={`${detail.player} 경기 로그`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">경기</TableHead>
              <TableHead className="text-left">상대</TableHead>
              <TableHead className="text-left">결과</TableHead>
              <TableHead className="text-right">스코어</TableHead>
              <TableHead className="text-right">득점</TableHead>
              <TableHead className="text-right">리바운드</TableHead>
              <TableHead className="text-right">어시스트</TableHead>
              <TableHead className="text-right">스틸</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.games.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="text-left">
                  <Link
                    className="font-medium text-primary hover:underline"
                    to={`/games/${encodeURIComponent(g.id)}`}
                  >
                    {gameLabel(g.week, g.game)}
                  </Link>
                </TableCell>
                <TableCell className="text-left text-muted-foreground">{g.opponent ?? '—'}</TableCell>
                <TableCell className="text-left">
                  <ResultBadge result={g.result} />
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {g.teamScore}
                  {g.opponentScore != null ? `:${g.opponentScore}` : ''}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{g.pts}</TableCell>
                <TableCell className="text-right tabular-nums">{g.reb}</TableCell>
                <TableCell className="text-right tabular-nums">{g.ast}</TableCell>
                <TableCell className="text-right tabular-nums">{g.stl}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableScroller>
    </SectionCard>
  );
}

// 선수 셀렉트 하나(A/B 공용). 상대가 고른 선수는 disabled, 대회를 바꿔 목록에서 빠진
// 선택값은 "(이 대회 기록 없음)" 으로 표시만 하고 선택은 유지한다(AC 66·67).
function PlayerSelect({
  caption,
  value,
  onChange,
  players,
  takenName,
}: {
  caption: string;
  value: string | null;
  onChange: (name: string | null) => void;
  players: PlayerListItem[];
  takenName: string | null;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted-foreground">{caption}</span>
      <NativeSelect
        aria-label={`${caption} 선택`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <NativeSelectOption value="">선수 선택…</NativeSelectOption>
        {value && !players.some((p) => p.player === value) && (
          <NativeSelectOption value={value} disabled>
            {value} (이 대회 기록 없음)
          </NativeSelectOption>
        )}
        {players.map((p) => (
          <NativeSelectOption key={p.player} value={p.player} disabled={p.player === takenName}>
            {p.player}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </label>
  );
}
