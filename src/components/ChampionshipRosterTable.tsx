import type { ChampionshipRoster, ChampionshipRosterPlayer } from '../api/types';
import { Empty } from './states';

// [신설: 2026-09-02 김병현 작성] 우승 관리 화면의 선수 표.
//
// 이 표가 존재하는 이유 하나: **"이 사람 우승자 맞아?"를 눈으로 판단하게 하는 것.**
// 그래서 스탯을 늘어놓지 않고, 판단에 실제로 쓰이는 두 가지만 보여준다.
//   1) 어느 팀으로 몇 경기 뛰었나  → 8경기 중 7경기면 주전, 8경기 중 2경기면 용병
//   2) 통산 몇 번 우승했나         → 눌렀을 때 그 자리에서 바로 올라간다
//
// 이 컴포넌트는 저장을 모른다. 누가 눌렸는지만 위로 알리고(onToggle), 실제 [+]/[취소] 처리는
// 화면(ChampionshipPage)이 한다. 그래야 이 표는 "보여주기"만 책임지고 끝난다.

interface ChampionshipRosterTableProps {
  roster: ChampionshipRoster;
  // 지금 보이는 게 최신이 아님(대회를 바꾸는 중). 흐리게 표시하는 데만 쓴다.
  stale: boolean;
  // 지금 서버에 다녀오는 중인 선수 이름. 그 줄의 버튼만 잠근다(표 전체를 잠그면 답답하다).
  pendingPlayer: string | null;
  onToggle: (player: ChampionshipRosterPlayer) => void;
}

export function ChampionshipRosterTable({
  roster,
  stale,
  pendingPlayer,
  onToggle,
}: ChampionshipRosterTableProps) {
  if (roster.players.length === 0) {
    return (
      <Empty>
        <strong>이 대회엔 아직 경기 기록이 없어요</strong>
        <span>기록지를 먼저 업로드하면 뛴 선수들이 여기 나와요.</span>
      </Empty>
    );
  }

  const wonCount = roster.players.filter((p) => p.won).length;

  return (
    <div className={`table-wrap ${stale ? 'is-stale' : ''}`} aria-busy={stale}>
      <table className="table">
        <caption className="sr-only">
          {roster.competitionLabel} 출전 선수 {roster.players.length}명 중 우승자 {wonCount}명
        </caption>
        <thead>
          <tr>
            <th className="col-name">선수</th>
            <th>가장 많이 뛴 팀</th>
            <th className="num">통산 우승</th>
            {/* 버튼 칸은 제목이 없다 — 화면엔 안 보이되 스크린리더엔 이름이 있어야 한다. */}
            <th>
              <span className="sr-only">우승 등록</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {roster.players.map((p) => {
            const pending = pendingPlayer === p.player;
            // 우승 확정 뒤에 경기 기록이 고쳐지면 저장된 팀과 지금 계산값이 갈릴 수 있다.
            // 조용히 계산값으로 덮어 보여주면 "내가 등록한 게 뭐였지"를 알 수 없게 된다 → 둘 다 보여준다.
            const teamMismatch = p.won && p.wonTeamName != null && p.wonTeamName !== p.topTeam;
            return (
              <tr key={p.player} className={p.won ? 'champ-row is-won' : 'champ-row'}>
                <td className="col-name">
                  <span className="strong">{p.player}</span>
                  {p.won && (
                    <span className="badge badge--win champ-tag" title="이 대회 우승자">
                      우승
                    </span>
                  )}
                </td>
                <td>
                  {p.topTeam ? (
                    <>
                      <span className="champ-team">{p.topTeam}</span>{' '}
                      <span className="champ-games">
                        {p.topTeamGames}/{p.totalGames}경기
                      </span>
                      {teamMismatch && (
                        <span className="champ-warn" role="note">
                          등록된 팀: {p.wonTeamName}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="muted">-</span>
                  )}
                </td>
                <td className="num">{p.careerWins}</td>
                <td>
                  <button
                    type="button"
                    className={`btn btn--sm ${p.won ? '' : 'btn--primary'}`}
                    disabled={pending}
                    onClick={() => onToggle(p)}
                    // 버튼 글자만으론 "무엇의 +인지" 안 들린다 → 줄마다 완전한 이름을 붙인다.
                    aria-label={
                      p.won
                        ? `${p.player} 우승 등록 취소`
                        : `${p.player} 우승으로 등록 (${p.topTeam ?? '팀 없음'})`
                    }
                  >
                    {pending ? '…' : p.won ? '취소' : '+'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
