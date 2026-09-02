import { useChampionships } from '../api/queries';
import { ChampionshipHistory } from '../components/ChampionshipHistory';
import { PlayerWinsTable } from '../components/PlayerWinsTable';
// [변경: 2026-09-02 김병현 수정] 우승자 표와 '아직 우승 없음' 표를 나눴다.
import { WinlessPlayersTable } from '../components/WinlessPlayersTable';
import { ErrorView, TableSkeleton } from '../components/states';
import { splitByWins } from '../lib/championships';

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
  // [변경: 2026-09-02 김병현 수정] playerWins 에는 우승 0회 선수도 들어 있다 → 두 무리로 가른다.
  // 가르는 규칙(정렬 포함)은 lib 에 한 벌만 둔다 — 관리 화면도 같은 함수를 쓴다.
  const { winners, winless } = splitByWins(overview?.playerWins ?? []);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">명예의 전당</h1>
        <p className="page-sub">
          {overview
            ? `역대 우승 ${overview.wins.length}건 · 우승 경험 ${winners.length}명 · 아직 없는 선수 ${winless.length}명`
            : '역대 우승팀과 선수별 통산 우승횟수'}
        </p>
      </div>

      {query.error && (
        <ErrorView message={query.error.message} onRetry={() => void query.refetch()} />
      )}

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">통산 우승 순위</h2>
          <span className="card-note">승률 = 우승 ÷ 뛴 시즌</span>
        </div>
        {query.isLoading && <TableSkeleton rows={10} cols={6} />}
        {overview && !query.error && <PlayerWinsTable winners={winners} />}
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">아직 우승이 없어요 ㅜ.ㅜ</h2>
          <span className="card-note">오래 뛴 순</span>
        </div>
        {query.isLoading && <TableSkeleton rows={6} cols={2} />}
        {overview && !query.error && <WinlessPlayersTable winless={winless} />}
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">역대 우승팀</h2>
          <span className="card-note">최근 시즌부터</span>
        </div>
        {query.isLoading && <TableSkeleton rows={6} cols={3} />}
        {overview && !query.error && <ChampionshipHistory wins={overview.wins} />}
      </section>
    </div>
  );
}
