import { useChampionships } from '../api/queries';
import { ChampionshipHistory } from '../components/ChampionshipHistory';
import { PlayerWinsTable } from '../components/PlayerWinsTable';
import { ErrorView, TableSkeleton } from '../components/states';
// [변경: 2026-09-02 19:20, 김병현 수정] .page* → PageHeader, .card* → SectionCard(계획서 §7 Phase 4f).
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';

// [신설: 2026-09-02 김병현 작성] 명예의 전당 — 우승 기록 '보기 전용' 화면.
//
// 우승횟수 관리(/championships)와 짝이다. 저쪽은 운영자가 [+] 로 '고치는' 곳이고,
// 여기는 누구나 들어와 '보는' 곳이다. 그래서 비밀번호 게이트가 없다.
//
// 서버 호출은 완전히 같은 것 하나(GET /championships)를 쓴다 — React Query 가 같은 키로
// 캐시를 공유하므로, 운영자가 관리 화면을 보다 이 탭으로 와도 요청이 다시 나가지 않는다.
// (그래서 여기 전용 API 를 새로 만들지 않았다.)

export function HallOfFamePage() {
  const query = useChampionships();
  const overview = query.data ?? null;
  // [변경: 2026-09-02 21:10, 김병현 수정] 우승 0회 선수를 따로 가르지 않는다.
  // playerWins 를 서버가 준 순서 그대로 통산 우승 순위 표 하나에 넘긴다.
  const playerWins = overview?.playerWins ?? [];
  const winnerCount = playerWins.filter((p) => p.wins > 0).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="명예의 전당"
        sub={
          overview
            ? `역대 우승 ${overview.wins.length}건 · 선수 ${playerWins.length}명 중 우승 경험 ${winnerCount}명`
            : '역대 우승팀과 선수별 통산 우승횟수'
        }
      />

      {query.error && (
        <ErrorView message={query.error.message} onRetry={() => void query.refetch()} />
      )}

      <SectionCard title="통산 우승 순위" note="승률 = 우승 ÷ 뛴 시즌">
        {query.isLoading && <TableSkeleton rows={10} cols={6} />}
        {overview && !query.error && <PlayerWinsTable players={playerWins} />}
      </SectionCard>

      <SectionCard title="역대 우승팀" note="최근 시즌부터">
        {query.isLoading && <TableSkeleton rows={6} cols={3} />}
        {overview && !query.error && <ChampionshipHistory wins={overview.wins} />}
      </SectionCard>
    </div>
  );
}
