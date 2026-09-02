import type { ChampionshipGroup, ChampionshipWin } from '../api/types';

// [신설: 2026-09-02 김병현 작성] 우승 줄(선수 단위) → 대회 단위로 되묶기.
//
// 서버는 '선수 한 명 = 한 줄'로 준다. 그래야 [+]/[취소] 가 선수 단위로 되니까.
// 그런데 사람이 "역대 우승"을 볼 땐 '대회 하나 = 우승팀 하나'가 자연스럽다.
// 그 간극을 메우는 게 이 파일 전부다. 순수 함수라 서버도 네트워크도 모른다.

// 대회별로 묶는다. **들어온 순서를 그대로 지킨다** — 서버가 이미 최신 대회부터 정렬해
// 보내주기 때문에, 여기서 다시 정렬하면 그 규칙이 두 곳으로 갈라진다.
export function groupWinsByCompetition(wins: ChampionshipWin[]): ChampionshipGroup[] {
  // Map 은 넣은 순서를 기억한다 → 첫 등장 순 = 서버가 준 순서.
  const groups = new Map<number, ChampionshipWin[]>();
  for (const w of wins) {
    const bucket = groups.get(w.competitionId);
    if (bucket) bucket.push(w);
    else groups.set(w.competitionId, [w]);
  }

  return [...groups.values()].map((rows) => ({
    competitionId: rows[0].competitionId,
    competitionLabel: rows[0].competitionLabel,
    year: rows[0].year,
    seasonNo: rows[0].seasonNo,
    competitionName: rows[0].competitionName,
    teamName: dominantTeamName(rows),
    players: rows.map((r) => r.player).sort((a, b) => a.localeCompare(b, 'ko')),
  }));
}

// 대회 묶음들을 다시 연도별로 묶는다(화면이 연도 제목 아래에 시즌들을 늘어놓기 때문).
// 반환을 객체가 아니라 배열로 하는 이유: 객체 키는 순서를 보장하지 않는다(숫자 키는 특히
// 오름차순으로 재정렬된다) — 최신 연도부터 보여주려면 순서가 살아 있어야 한다.
export function groupByYear(
  groups: ChampionshipGroup[],
): { year: number; groups: ChampionshipGroup[] }[] {
  const byYear = new Map<number, ChampionshipGroup[]>();
  for (const g of groups) {
    const bucket = byYear.get(g.year);
    if (bucket) bucket.push(g);
    else byYear.set(g.year, [g]);
  }
  return [...byYear.entries()].map(([year, list]) => ({ year, groups: list }));
}

// 그 대회의 대표 팀 이름 = 줄들에 가장 많이 나온 이름.
//
// 왜 다수결인가: 팀 이름은 선수마다 따로 저장된다(그 선수가 그때 가장 많이 뛴 팀).
// 우승 확정 뒤에 경기 기록이 고쳐지면 한 대회 안에서 이름이 갈릴 수 있다. 그때 아무거나
// 집으면 새로고침할 때마다 표시가 달라진다. 다수결 + 동률이면 가나다순으로 못박아
// **같은 데이터면 항상 같은 화면**이 되게 한다.
// (서버 championshipExport.ts 가 엑셀에서 같은 규칙을 쓴다 — 파일과 화면이 같은 답을 내야 한다.)
function dominantTeamName(rows: ChampionshipWin[]): string {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.teamName, (counts.get(r.teamName) ?? 0) + 1);
  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'),
  )[0][0];
}
