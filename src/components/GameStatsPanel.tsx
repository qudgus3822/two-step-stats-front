import { useState } from 'react';
// [변경: 2026-07-15 10:28, 김병현 수정] useApi → React Query useGames/useGameBox 로 이관
import { useGameBox, useGames } from '../api/queries';
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — useSeason → useCompetition(리네임).
import { useCompetition } from '../context/CompetitionContext';
// 주의: GameBox 는 아래 TeamSummary({ box }: { box: GameBox }) 시그니처에서 여전히 쓰이므로 type import 는 유지.
import type { GameBox, GameSummary, PlayerLine } from '../api/types';
import { BoxScoreTable } from './BoxScoreTable';
import { CompetitionPicker } from './CompetitionPicker';
import { Empty, ErrorView, Loading } from './states';
import { gameLabel } from '../lib/format';
import { seriesColor } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';

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

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">경기 단위 통계</h2>
        {/* [변경: 2026-07-14 17:32, 김병현 수정] 대회 선택과 경기 선택을 따로 둔다.
            대회 선택기(CompetitionPicker=전역 대회 필터 재사용) + 경기 선택기를 나란히·분리 배치. */}
        <div className="stat-filters">
          <CompetitionPicker />
          {/* 경기 드롭다운: 고른 대회 안의 경기 중 하나. 기본값은 최신 경기. */}
          {list.length > 0 && (
            <label className="game-pick">
              <span className="game-pick-caption">경기</span>
              <select
                className="select"
                value={activeId ?? ''}
                onChange={(e) => setPickedId(e.target.value)}
                aria-label="경기 선택"
              >
                {list.map((g) => (
                  <option key={g.id} value={g.id}>
                    {optionLabel(g, competitionId)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {/* [변경: 2026-07-15 10:28, 김병현 수정] loading→isLoading, error→error.message, reload→refetch */}
      {gamesQuery.isLoading && <Loading />}
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
          {boxQuery.isLoading && <Loading />}
          {boxQuery.error && (
            <ErrorView message={boxQuery.error.message} onRetry={() => boxQuery.refetch()} />
          )}
          {box && (
            <>
              <TeamSummary box={box} />
              {box.teams.map((t, i) => (
                <div className="team-box" key={t.team}>
                  <div className="team-box-head">
                    <span
                      className="team-swatch"
                      style={{ background: seriesColor(tokens, i) }}
                      aria-hidden="true"
                    />
                    <span className="team-box-name">{t.team}</span>
                    <span className="team-box-score">{t.score}점</span>
                    {box.winner === t.team && <span className="score-tag">승</span>}
                    <span className="card-note">{t.players.length}명</span>
                  </div>
                  <BoxScoreTable players={t.players} />
                </div>
              ))}
            </>
          )}
        </>
      )}
    </section>
  );
}

// 팀 요약 표: 경기당 팀마다 한 줄. 팀 합계(리바/AS/ST/BL/TO)와 야투%/3점%를 한눈에.
// 팀 스와치 색은 경기 상세와 똑같이 팀 순서(점수순) 기준으로 매긴다.
function TeamSummary({ box }: { box: GameBox }) {
  const { tokens } = useTheme();
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th className="col-name">팀</th>
            <th>점수</th>
            <th>리바운드</th>
            <th>어시스트</th>
            <th>스틸</th>
            <th>블락</th>
            <th>턴오버</th>
            <th>야투%</th>
            <th>3점%</th>
          </tr>
        </thead>
        <tbody>
          {box.teams.map((t, i) => {
            const s = teamTotals(t.players);
            const win = box.winner === t.team;
            return (
              <tr key={t.team}>
                <td className="col-name">
                  <span
                    className="team-swatch"
                    style={{ background: seriesColor(tokens, i) }}
                    aria-hidden="true"
                  />
                  <span className={win ? 'strong' : ''}>{t.team}</span>
                  {win && <span className="score-tag">승</span>}
                </td>
                <td className="num strong">{t.score}</td>
                <td className="num">{s.reb}</td>
                <td className="num">{s.ast}</td>
                <td className="num">{s.stl}</td>
                <td className="num">{s.blk}</td>
                <td className="num">{s.tov}</td>
                <td className="num muted">{pctText(s.fgPct)}</td>
                <td className="num muted">{pctText(s.fg3Pct)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
function optionLabel(g: GameSummary, competitionId: number | null): string {
  const head = competitionId == null ? `${g.competition} · ` : '';
  const score = g.teams.map((t) => `${t.team} ${t.score}`).join(' : ');
  return `${head}${gameLabel(g.week, g.game)}${score ? ` · ${score}` : ''}`;
}
