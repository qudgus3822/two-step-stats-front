import type { ChampionshipWin } from '../api/types';
import { groupByYear, groupWinsByCompetition } from '../lib/championships';
import { PlayerLink } from './PlayerLink';
import { Empty } from './states';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

// [신설: 2026-09-02 김병현 작성] 역대 우승 명단.
//
// 서버가 주는 건 '선수 한 명 = 한 줄'인데, 사람이 보고 싶은 건 '대회 하나 = 우승팀 하나'다.
// 그 되묶기는 lib/championships.ts 가 하고, 여기선 묶인 걸 그리기만 한다.
//
// 표가 아니라 카드로 그리는 이유: 대회마다 인원이 6~10명으로 제각각이라 표로 만들면
// 칸 수가 안 맞아 빈칸이 줄줄이 생긴다. 명단은 그냥 이름을 늘어놓는 게 읽기 좋다.
//
// [변경: 2026-09-02 16:20, 김병현 수정] .hof-* → shadcn Card/Badge + Tailwind 유틸리티
// (계획서 §7 Phase 3c).
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
    <div className="flex flex-col gap-4">
      {years.map(({ year, groups }) => (
        <section key={year}>
          <h3 className="mb-2 text-sm font-bold tracking-wide text-muted-foreground">{year}년</h3>
          <ul className="flex flex-col gap-2.5">
            {groups.map((g) => (
              <li key={g.competitionId}>
                <Card className="gap-1.5 bg-primary/4 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 시즌번호가 없는 대회(예: 나이배)면 대회명을 그 자리에 쓴다. */}
                    <span className="text-[13.5px] font-bold">
                      {g.seasonNo != null ? `시즌${g.seasonNo}` : g.competitionName}
                    </span>
                    <Badge variant="team">{g.teamName}</Badge>
                    <span className="ml-auto text-[12.5px] text-muted-foreground">
                      {g.players.length}명
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[13px]">
                    {g.players.map((p) => (
                      <PlayerLink key={p} name={p} />
                    ))}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
