import { Link, useParams } from 'react-router-dom';
// [변경: 2026-07-15 10:28, 김병현 수정] useApi → React Query usePlayer 로 이관
import { usePlayer } from '../api/queries';
import type { GameResult } from '../api/types';
import { ResultBadge, TeamBadge } from '../components/Badge';
import { ShootingSplits } from '../components/ShootingSplits';
import { StatCard } from '../components/StatCard';
import { TrendLine, type TrendPoint } from '../components/charts/TrendLine';
// [변경: 2026-07-29 10:36, 김병현 수정] 스피너 → 표 모양 뼈대(TableSkeleton).
// (선수 목록/리더보드에서 이름에 마우스만 올려도 미리 받아 두므로, 보통은 이 뼈대도 안 보인다.)
import { Empty, ErrorView, TableSkeleton } from '../components/states';
// [변경: 2026-07-15 11:37, 김병현 수정] perGameAvg, formatAvg import 추가 — 요약 카드 경기당 평균 계산·표시용.
// [변경: 2026-07-15 13:01, 김병현 수정] efficiency import 추가 — 경기당 효율(EFF) 카드 계산용.
// [변경: 2026-07-27 16:10, 김병현 수정] 경기당 평균/EFF 계산을 summarizePlayer 로 옮겨서
// perGameAvg·efficiency 는 더 이상 이 파일에서 안 쓴다(formatAvg 는 여전히 표시용으로 씀).
import { gameLabel, formatAvg } from '../lib/format';
import { summarizePlayer } from '../lib/playerSummary';
import { useTheme } from '../theme/ThemeContext';

// 선수 상세: 누적 요약 + 경기별 득점 추이(라인) + 슈팅 성공률 + 경기 로그 표.
// [변경: 2026-07-15 11:37, 김병현 수정] 요약 카드를 누적 → 경기당 평균(통산, 누적은 hint)으로.

const RESULT_TEXT: Record<GameResult, string> = { W: '승', L: '패', D: '무' };

export function PlayerDetailPage() {
  const { name = '' } = useParams();
  const { tokens } = useTheme();
  // [변경: 2026-07-15 10:28, 김병현 수정] useApi → usePlayer(React Query)
  // [변경: 2026-07-27 15:20, 김병현 수정] usePlayer 가 competitionId 를 받게 됨 — 이 화면은 통산 고정이라 null.
  const { data, isLoading, error, refetch } = usePlayer(name, null);
  // [변경: 2026-07-27 16:10, 김병현 수정] 요약 카드 계산을 summarizePlayer 로 위임 —
  // 분모·반올림·EFF 공식을 비교 화면과 여기서 같은 곳(lib/playerSummary.ts)에서 가져온다.
  const summary = data ? summarizePlayer(data) : null;

  return (
    <div className="page">
      <div className="breadcrumb">
        <Link className="link" to="/players">
          ← 선수 목록
        </Link>
      </div>

      {/* [변경: 2026-07-15 10:28, 김병현 수정] loading→isLoading, error→error.message, reload→refetch */}
      {/* [변경: 2026-07-29 10:36, 김병현 수정] 경기 로그 표(열 8개) 자리를 미리 잡는다. */}
      {isLoading && <TableSkeleton rows={8} cols={8} />}
      {error && <ErrorView message={error.message} onRetry={() => refetch()} />}
      {!isLoading && !error && !data && <Empty>선수를 찾을 수 없어요.</Empty>}

      {data && summary && (
        <>
          <div className="page-head">
            <h1 className="page-title">{data.player}</h1>
            <p className="page-sub">
              {teamsOf(data.games).map((t) => (
                <TeamBadge key={t} team={t} />
              ))}
            </p>
          </div>

          {/* 누적 요약 카드 */}
          {/* [변경: 2026-07-15 11:37, 김병현 수정] value=경기당 평균(통산), hint=누적. 라벨에 (통산) — 상세는 통산 스코프. */}
          <div className="stat-grid">
            <StatCard label="출전" value={summary.games} accent={tokens.series[0]} />
            <StatCard
              label="경기당 득점(통산)"
              value={formatAvg(summary.perGame.pts)}
              hint={`누적 ${summary.totals.pts}`}
              accent={tokens.series[7]}
            />
            <StatCard
              label="경기당 리바운드(통산)"
              value={formatAvg(summary.perGame.reb)}
              hint={`누적 ${summary.totals.reb}`}
              accent={tokens.series[1]}
            />
            <StatCard
              label="경기당 어시스트(통산)"
              value={formatAvg(summary.perGame.ast)}
              hint={`누적 ${summary.totals.ast}`}
              accent={tokens.series[4]}
            />
            {/* [변경: 2026-07-15 13:01, 김병현 수정] 경기당 효율(EFF) 카드 추가(통산 스코프, 5번째 카드). */}
            <StatCard
              label="경기당 효율(통산)"
              value={formatAvg(summary.perGame.eff)}
              hint={`누적 ${summary.totals.eff}`}
              accent={tokens.series[3]}
            />
          </div>

          <div className="grid-2">
            {/* 경기별 득점 추이 */}
            <section className="card chart-card">
              <div className="card-head">
                <h2 className="card-title">경기별 득점 추이</h2>
              </div>
              {data.games.length > 0 ? (
                <TrendLine
                  data={toTrend(data.games)}
                  series={[{ key: 'value', name: '득점' }]}
                  format={(v) => `${v}점`}
                  extraKeys={[
                    { key: 'opponent', label: '상대' },
                    { key: 'score', label: '스코어' },
                    { key: 'resultText', label: '결과' },
                  ]}
                />
              ) : (
                <Empty>경기 기록이 없어요.</Empty>
              )}
            </section>

            {/* 슈팅 성공률 */}
            <section className="card chart-card">
              <div className="card-head">
                <h2 className="card-title">슈팅 성공률(누적)</h2>
              </div>
              <ShootingSplits box={data.totals} />
            </section>
          </div>

          {/* 경기 로그 */}
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">경기 로그</h2>
              <span className="card-note">{data.games.length}경기</span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="col-name">경기</th>
                    <th>상대</th>
                    <th>결과</th>
                    <th>스코어</th>
                    <th>득점</th>
                    <th>리바운드</th>
                    <th>어시스트</th>
                    <th>스틸</th>
                  </tr>
                </thead>
                <tbody>
                  {data.games.map((g) => (
                    <tr key={g.id}>
                      <td className="col-name">
                        <Link className="link" to={`/games/${encodeURIComponent(g.id)}`}>
                          {gameLabel(g.week, g.game)}
                        </Link>
                      </td>
                      <td className="muted">{g.opponent ?? '—'}</td>
                      <td>
                        <ResultBadge result={g.result} />
                      </td>
                      <td className="num muted">
                        {g.teamScore}
                        {g.opponentScore != null ? `:${g.opponentScore}` : ''}
                      </td>
                      <td className="num strong">{g.pts}</td>
                      <td className="num">{g.reb}</td>
                      <td className="num">{g.ast}</td>
                      <td className="num">{g.stl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

// 이 선수가 뛴 팀들(중복 제거)
function teamsOf(games: { team: string }[]): string[] {
  return [...new Set(games.map((g) => g.team))];
}

// 경기별 라인 → 추이 차트 데이터. 툴팁에 상대/스코어/결과도 넣는다.
function toTrend(
  games: {
    week: number;
    game: number;
    pts: number;
    opponent: string | null;
    teamScore: number;
    opponentScore: number | null;
    result: GameResult;
  }[],
): TrendPoint[] {
  return games.map((g) => ({
    label: gameLabel(g.week, g.game),
    value: g.pts,
    opponent: g.opponent ?? '—',
    score: g.opponentScore != null ? `${g.teamScore}:${g.opponentScore}` : String(g.teamScore),
    resultText: RESULT_TEXT[g.result],
  }));
}
