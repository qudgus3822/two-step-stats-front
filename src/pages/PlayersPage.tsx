import { useMemo, useState } from 'react';
// [변경: 2026-07-15 10:28, 김병현 수정] useApi → React Query usePlayers 로 이관
// [변경: 2026-07-29 10:36, 김병현 수정] isStaleView 추가 — 대회를 바꾸는 동안 옛 표를 흐리게 유지.
import { isStaleView, usePlayers } from '../api/queries';
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — useSeason → useCompetition(리네임).
import { useCompetition } from '../context/CompetitionContext';
// [변경: 2026-09-03 09:00, 김병현 수정] PlayerLink 단독 → PlayerCell(아바타+링크)로 교체
// (계획서 §Phase 2-2 — 시각 정체성 개편).
import { PlayerCell } from '../components/PlayerCell';
import { Empty, ErrorView, TableSkeleton } from '../components/states';
// [변경: 2026-07-15 11:37, 김병현 수정] formatAvg import 추가 — 경기당 득점 표시용.
import { formatAvg } from '../lib/format';
// [변경: 2026-09-02 18:50, 김병현 수정] 아래 5줄 — 계획서 §7 Phase 4e.
// .page* → PageHeader, .search → Input, .table-wrap.card → Card+TableScroller,
// .table-empty → Empty, .table → shadcn Table.
import { PageHeader } from '../components/PageHeader';
// [신설: 2026-09-03 09:00, 김병현 작성] 페이지 아이콘(계획서 §Phase 2-3).
import { Users } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { TableScroller } from '../components/TableScroller';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { cn } from '../lib/utils';

// 선수 목록: 득점 많은 순 표. 이름으로 즉석 검색(클라이언트 필터)도 된다.
// [변경: 2026-07-15 11:37, 김병현 수정] 메인 지표를 누적 득점 → 경기당 득점으로.
// [변경: 2026-07-28 15:44, 김병현 수정] 정렬 기준이 이름 가나다순으로 바뀌었다(서버 listPlayers).
// 경기당/누적 득점은 여전히 보여주지만, 이제 줄 세우는 기준은 아니다.

export function PlayersPage() {
  const { competitionId, competitionLabel } = useCompetition();
  // [변경: 2026-07-15 10:28, 김병현 수정] useApi → usePlayers(React Query)
  // [변경: 2026-07-29 10:36, 김병현 수정] 쿼리 객체를 통째로 들고 있는다 — isStaleView 가
  // isFetching/isPlaceholderData 까지 봐야 해서 구조분해만으로는 부족하다.
  const playersQuery = usePlayers(competitionId);
  const { data, isLoading, error, refetch } = playersQuery;
  // 대회를 바꾸면 새 목록이 올 때까지 옛 목록이 깔려 있다(placeholderData). 그동안 흐리게.
  const stale = isStaleView(playersQuery);
  const [query, setQuery] = useState('');

  // 검색어로 거른 목록. 대소문자/공백 무시.
  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((p) => p.player.toLowerCase().includes(q));
  }, [data, query]);

  return (
    <div className="flex flex-col gap-4">
      {/* [변경: 2026-07-15 11:37, 김병현 수정] "득점순" → "경기당 득점순"으로 문구 변경. */}
      {/* [변경: 2026-07-28 15:44, 김병현 수정] 실제 정렬이 가나다순으로 바뀌어 문구도 맞춘다. */}
      <PageHeader icon={Users} title="선수" sub={`${competitionLabel ?? '전체 대회'} · 가나다순`} />

      {/* [변경: 2026-07-15 10:28, 김병현 수정] loading→isLoading, error→error.message, reload→refetch */}
      {/* [변경: 2026-07-29 10:36, 김병현 수정] 스피너 → 표 모양 뼈대. 열 6개(#/선수/팀/출전/경기당/누적). */}
      {isLoading && <TableSkeleton rows={10} cols={6} />}
      {error && <ErrorView message={error.message} onRetry={() => refetch()} />}
      {data && data.length === 0 && <Empty>선수 기록이 없어요.</Empty>}

      {data && data.length > 0 && (
        <>
          <Input
            className="max-w-[320px]"
            type="search"
            placeholder="선수 이름 검색…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="선수 이름 검색"
          />

          {/* [변경: 2026-07-29 10:36, 김병현 수정] 검색창은 그대로 두고 표만 흐리게 — 대회를 바꿔도
              입력한 검색어는 계속 또렷하게 보여야 "내가 친 건 살아 있다"가 읽힌다. */}
          <Card
            className={cn(stale && 'opacity-55 transition-opacity')}
            aria-busy={stale}
          >
            <CardContent>
              <TableScroller label="선수 목록">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-right">#</TableHead>
                      <TableHead className="text-left">선수</TableHead>
                      <TableHead className="text-left">팀</TableHead>
                      <TableHead className="text-right">출전</TableHead>
                      {/* [변경: 2026-07-15 11:37, 김병현 수정] "경기당" strong 컬럼 추가, 기존 "누적 득점"은 muted 보조로. */}
                      <TableHead className="text-right">경기당</TableHead>
                      <TableHead className="text-right">누적</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p, i) => (
                      <TableRow key={p.player}>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {i + 1}
                        </TableCell>
                        <TableCell className="text-left">
                          <PlayerCell name={p.player} />
                        </TableCell>
                        <TableCell className="text-left text-muted-foreground">
                          {p.teams.join(', ')}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{p.games}</TableCell>
                        {/* [변경: 2026-07-15 11:37, 김병현 수정] 경기당(strong) 추가, 누적(muted)으로 강등. */}
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatAvg(p.ppg)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {p.pts}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableScroller>
              {filtered.length === 0 && <Empty>"{query}" 와 맞는 선수가 없어요.</Empty>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
