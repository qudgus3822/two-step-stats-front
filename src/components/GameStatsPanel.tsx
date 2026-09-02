import { useState } from 'react';
// [변경: 2026-07-15 10:28, 김병현 수정] useApi → React Query useGames/useGameBox 로 이관
// [변경: 2026-07-29 10:36, 김병현 수정] isStaleView 추가 — 경기를 바꾸는 동안 옛 표를 흐리게 유지.
import { isStaleView, useGameBox, useGames } from '../api/queries';
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — useSeason → useCompetition(리네임).
import { useCompetition } from '../context/CompetitionContext';
// 주의: GameBox 는 아래 TeamSummary({ box }: { box: GameBox }) 시그니처에서 여전히 쓰이므로 type import 는 유지.
import type { GameBox, GameSummary, PlayerLine } from '../api/types';
import { BoxScoreTable } from './BoxScoreTable';
import { CompetitionPicker } from './CompetitionPicker';
// [변경: 2026-07-29 10:36, 김병현 수정] 스피너 → 표 모양 뼈대(TableSkeleton).
import { Empty, ErrorView, TableSkeleton } from './states';
import { gameLabel } from '../lib/format';
import { seriesColor } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';
// [변경: 2026-09-02 17:00, 김병현 수정] 아래 4줄 — 계획서 §7 Phase 4a. .card* → SectionCard,
// .select → NativeSelect, "승" 꼬리표(.score-tag) → ResultBadge('W') 재사용(색·문구가 완전히 같다),
// .table-wrap/.table → TableScroller + shadcn Table.
import { ResultBadge } from './Badge';
import { SectionCard } from './SectionCard';
import { TableScroller } from './TableScroller';
import { cn } from '../lib/utils';
import { NativeSelect, NativeSelectOption } from './ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

// 대시보드 안에서 "경기 하나"를 골라 그 경기 스탯을 바로 보는 패널.
// 대회는 전역 필터(useCompetition)를 그대로 따라가고, 경기는 이 안의 드롭다운으로 고른다.
// 화면 이동 없이 대시보드에서 바로: (1) 팀 요약 한 줄씩 + (2) 선수별 박스스코어.
//
// props 없음 — 대회는 컨텍스트에서 읽고, 경기 선택/불러오기/합계는 전부 안에서 처리한다.
// 그래서 대시보드는 <GameStatsPanel /> 한 줄만 쓰면 된다.

export function GameStatsPanel() {
  const { competitionId } = useCompetition();
  const { tokens } = useTheme();

  // 대회 필터가 바뀌면 경기 목록도 다시 불러온다. 목록은 대회→주차→경기 오름차순.
  // [변경: 2026-07-15 10:28, 김병현 수정] useApi → useGames(React Query)
  const gamesQuery = useGames(competitionId);
  const games = gamesQuery.data;

  // 사용자가 고른 경기 id. 아직 안 골랐으면 null → 아래에서 '최신 경기'로 대체한다.
  const [pickedId, setPickedId] = useState<string | null>(null);

  // 실제로 보여줄 경기 id.
  // - 고른 게 지금 목록에 있으면 그걸 쓰고,
  // - 없으면(처음이거나 시즌을 바꿔 목록이 갈렸으면) 목록의 마지막 = 최신 경기.
  // 이렇게 계산으로만 처리하면 시즌 변경 시 자동으로 최신 경기로 리셋된다(별도 effect 불필요).
  const list = games ?? [];
  const activeId =
    pickedId && list.some((g) => g.id === pickedId)
      ? pickedId
      : (list[list.length - 1]?.id ?? null);

  // 고른 경기의 박스스코어(양 팀·선수별). 고른 경기가 없으면 아예 안 부른다.
  // [변경: 2026-07-15 10:28, 김병현 수정] useApi → useGameBox(React Query). activeId 가 null 이면
  // enabled:false 로 안 부른다(무한 스피너 방지는 loading→isLoading 매핑이 담당).
  const boxQuery = useGameBox(activeId);
  const box = boxQuery.data;
  // [변경: 2026-07-29 10:36, 김병현 수정] 드롭다운으로 경기를 바꾸면 새 표가 올 때까지 옛 표가
  // 깔려 있다(placeholderData). 그동안 흐리게 해서 "지금 보이는 건 아직 이전 경기"임을 알린다.
  // 표 안에 팀 이름과 점수가 같이 적혀 있어 무엇을 보고 있는지는 표 스스로 말해 준다.
  //
  // gamesQuery 까지 같이 보는 이유: 대회를 바꾸면 경기 "목록"이 먼저 갈리는데, 새 목록이 오기
  // 전까지 activeId 는 이전 대회의 경기다 → 박스스코어 자체는 신선(isFetching=false)해도
  // 지금 고른 대회의 경기가 아니다. 목록이 갱신 중이면 표도 아직 못 믿는다는 뜻이라 같이 흐린다.
  const boxStale = isStaleView(boxQuery) || isStaleView(gamesQuery);

  return (
    // [변경: 2026-09-02 17:00, 김병현 수정] <section className="card"> → SectionCard.
    // 대회·경기 조작부는 카드 헤더 오른쪽(CardAction 슬롯)으로 — 계획서 §7 Phase 4a 지시.
    <SectionCard
      title="경기 단위 통계"
      action={
        <div className="flex flex-wrap items-center gap-3.5">
          <CompetitionPicker />
          {/* 경기 드롭다운: 고른 대회 안의 경기 중 하나. 기본값은 최신 경기. */}
          {list.length > 0 && (
            <label className="flex shrink-0 items-center gap-1.5 text-sm">
              <span className="shrink-0 text-muted-foreground">경기</span>
              <NativeSelect
                className="max-w-[9rem] sm:max-w-none"
                value={activeId ?? ''}
                onChange={(e) => setPickedId(e.target.value)}
                aria-label="경기 선택"
              >
                {list.map((g) => (
                  <NativeSelectOption key={g.id} value={g.id}>
                    {optionLabel(g, competitionId)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
          )}
        </div>
      }
    >
      {/* [변경: 2026-07-15 10:28, 김병현 수정] loading→isLoading, error→error.message, reload→refetch */}
      {/* [변경: 2026-07-29 10:36, 김병현 수정] 스피너 → 표 모양 뼈대(팀 요약표 = 열 9개). */}
      {gamesQuery.isLoading && <TableSkeleton rows={4} cols={9} />}
      {gamesQuery.error && (
        <ErrorView message={gamesQuery.error.message} onRetry={() => gamesQuery.refetch()} />
      )}
      {games && games.length === 0 && (
        <Empty>{competitionId != null ? '이 대회엔' : '아직'} 경기 기록이 없어요.</Empty>
      )}

      {/* 고른 경기의 표: 팀 요약 → 팀별 선수 박스스코어 */}
      {list.length > 0 && (
        <>
          {/* [변경: 2026-07-15 10:28, 김병현 수정] loading→isLoading(isPending 아님 — 비활성 쿼리 무한 스피너 방지) */}
          {/* [변경: 2026-07-29 10:36, 김병현 수정] 스피너 → 표 모양 뼈대(박스스코어 = 열 9개). */}
          {boxQuery.isLoading && <TableSkeleton rows={8} cols={9} />}
          {boxQuery.error && (
            <ErrorView message={boxQuery.error.message} onRetry={() => boxQuery.refetch()} />
          )}
          {box && (
            // [변경: 2026-09-02 17:00, 김병현 수정] .is-stale → Tailwind 유틸리티(계획서 §5-4:
            // "TableScroller 의 stale prop 또는 cn(stale && 'opacity-55 transition-opacity') +
            // aria-busy"). 여기는 표 하나가 아니라 팀 요약+박스스코어 여러 개를 함께 흐리므로
            // TableScroller 가 아니라 이 옵션을 쓴다.
            <div className={cn(boxStale && 'opacity-55 transition-opacity')} aria-busy={boxStale}>
              <TeamSummary box={box} />
              {box.teams.map((t, i) => (
                <div className="mt-4" key={t.team}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className="inline-block size-3 rounded-[3px]"
                      style={{ background: seriesColor(tokens, i) }}
                      aria-hidden="true"
                    />
                    <span className="font-semibold">{t.team}</span>
                    <span className="tabular-nums text-secondary-foreground">{t.score}점</span>
                    {box.winner === t.team && <ResultBadge result="W" />}
                    <span className="text-sm text-muted-foreground">{t.players.length}명</span>
                  </div>
                  <BoxScoreTable players={t.players} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}

// 팀 요약 표: 경기당 팀마다 한 줄. 팀 합계(리바/AS/ST/BL/TO)와 야투%/3점%를 한눈에.
// 팀 스와치 색은 경기 상세와 똑같이 팀 순서(점수순) 기준으로 매긴다.
// [변경: 2026-09-02 17:00, 김병현 수정] .table-wrap/.table → TableScroller + shadcn Table
// (계획서 §7 Phase 4a — AC 59 에 이름이 올라 있던 표. Phase 3c 는 경계 밖이라 일부러 안 건드림).
function TeamSummary({ box }: { box: GameBox }) {
  const { tokens } = useTheme();
  return (
    <TableScroller label="팀 요약">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-left">팀</TableHead>
            <TableHead className="text-right">점수</TableHead>
            <TableHead className="text-right">리바운드</TableHead>
            <TableHead className="text-right">어시스트</TableHead>
            <TableHead className="text-right">스틸</TableHead>
            <TableHead className="text-right">블락</TableHead>
            <TableHead className="text-right">턴오버</TableHead>
            <TableHead className="text-right">야투%</TableHead>
            <TableHead className="text-right">3점%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {box.teams.map((t, i) => {
            const s = teamTotals(t.players);
            const win = box.winner === t.team;
            return (
              <TableRow key={t.team}>
                <TableCell className="text-left">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block size-3 shrink-0 rounded-[3px]"
                      style={{ background: seriesColor(tokens, i) }}
                      aria-hidden="true"
                    />
                    <span className={cn(win && 'font-semibold')}>{t.team}</span>
                    {win && <ResultBadge result="W" />}
                  </span>
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{t.score}</TableCell>
                <TableCell className="text-right tabular-nums">{s.reb}</TableCell>
                <TableCell className="text-right tabular-nums">{s.ast}</TableCell>
                <TableCell className="text-right tabular-nums">{s.stl}</TableCell>
                <TableCell className="text-right tabular-nums">{s.blk}</TableCell>
                <TableCell className="text-right tabular-nums">{s.tov}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {pctText(s.fgPct)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {pctText(s.fg3Pct)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableScroller>
  );
}

// 한 팀 선수 라인들을 더해 팀 합계로 만든다. 점수는 팀 공식 점수(t.score)를 쓰므로
// 여기선 리바/보조스탯과 야투/3점 성공·시도만 합친다.
// 성공률은 "성공률의 평균"이 아니라 "합계 성공 / 합계 시도"로 다시 계산해야 정확하다.
function teamTotals(players: PlayerLine[]) {
  const t = { reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0 };
  for (const p of players) {
    t.reb += p.reb;
    t.ast += p.ast;
    t.stl += p.stl;
    t.blk += p.blk;
    t.tov += p.tov;
    t.fgm += p.fgm;
    t.fga += p.fga;
    t.fg3m += p.fg3m;
    t.fg3a += p.fg3a;
  }
  return { ...t, fgPct: pct(t.fgm, t.fga), fg3Pct: pct(t.fg3m, t.fg3a) };
}

// 성공/시도 → 성공률(%). 시도 0이면 null(표엔 "—"). 백엔드 withPct 와 같은 규칙.
function pct(makes: number, atts: number): number | null {
  if (atts <= 0) return null;
  return Math.round((makes / atts) * 1000) / 10;
}

const pctText = (p: number | null) => (p == null ? '—' : `${p}%`);

// 드롭다운 한 줄 라벨. 전체 대회를 보고 있으면 대회 라벨도 붙여 주차·경기 충돌을 막는다.
// 예: "봄 · 3주 2경기 · A 58 : B 52"
// [변경: 2026-07-14 17:32, 김병현 수정] 시그니처 season:string → competitionId:number|null.
// g.competition(대회 표시 라벨)은 값 그대로 붙이고, "전체"인지 판단은 competitionId 로 한다.
// [변경: 2026-07-29 12:10, 김병현 수정] 연장경기면 "(연장)"을 붙인다.
// 드롭다운은 <option> 이라 뱃지(JSX)를 못 넣으므로 글자로 표시한다. 안 붙이면 "3주 2경기"와
// "3주 3경기"가 나란히 떠서 왜 하나가 유난히 짧은지 알 수가 없다.
function optionLabel(g: GameSummary, competitionId: number | null): string {
  const head = competitionId == null ? `${g.competition} · ` : '';
  const score = g.teams.map((t) => `${t.team} ${t.score}`).join(' : ');
  const tail = g.overtime ? ' (연장)' : '';
  return `${head}${gameLabel(g.week, g.game)}${tail}${score ? ` · ${score}` : ''}`;
}
