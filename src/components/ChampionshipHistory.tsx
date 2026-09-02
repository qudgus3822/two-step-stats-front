import type { ChampionshipWin } from '../api/types';
import { groupByYear, groupWinsByCompetition } from '../lib/championships';
import { PlayerLink } from './PlayerLink';
import { Empty } from './states';

// [신설: 2026-09-02 김병현 작성] 역대 우승 명단.
//
// 서버가 주는 건 '선수 한 명 = 한 줄'인데, 사람이 보고 싶은 건 '대회 하나 = 우승팀 하나'다.
// 그 되묶기는 lib/championships.ts 가 하고, 여기선 묶인 걸 그리기만 한다.
//
// 표가 아니라 카드로 그리는 이유: 대회마다 인원이 6~10명으로 제각각이라 표로 만들면
// 칸 수가 안 맞아 빈칸이 줄줄이 생긴다. 명단은 그냥 이름을 늘어놓는 게 읽기 좋다.

export function ChampionshipHistory({ wins }: { wins: ChampionshipWin[] }) {
  if (wins.length === 0) {
    return (
      <Empty>
        <strong>아직 등록된 우승이 없어요</strong>
        <span>운영자가 우승횟수 관리 화면에서 등록하면 여기 쌓여요.</span>
      </Empty>
    );
  }

  // 서버가 최신 대회부터 정렬해 보내주므로, 묶기만 하면 최신 연도가 위로 온다.
  const years = groupByYear(groupWinsByCompetition(wins));

  return (
    <div className="hof-years">
      {years.map(({ year, groups }) => (
        <section key={year} className="hof-year">
          <h3 className="hof-year-title">{year}년</h3>
          <ul className="hof-list">
            {groups.map((g) => (
              <li key={g.competitionId} className="hof-item">
                <div className="hof-item-head">
                  {/* 시즌번호가 없는 대회(예: 나이배)면 대회명을 그 자리에 쓴다. */}
                  <span className="hof-season">
                    {g.seasonNo != null ? `시즌${g.seasonNo}` : g.competitionName}
                  </span>
                  <span className="badge badge--team hof-team">{g.teamName}</span>
                  <span className="hof-count">{g.players.length}명</span>
                </div>
                <div className="hof-players">
                  {g.players.map((p) => (
                    <PlayerLink key={p} name={p} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
