import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import type { GameResult } from '../api/types';
import { ResultBadge, TeamBadge } from '../components/Badge';
import { ShootingSplits } from '../components/ShootingSplits';
import { StatCard } from '../components/StatCard';
import { TrendLine, type TrendPoint } from '../components/charts/TrendLine';
import { Empty, ErrorView, Loading } from '../components/states';
import { gameLabel } from '../lib/format';
import { useTheme } from '../theme/ThemeContext';

// 선수 상세: 누적 요약 + 경기별 득점 추이(라인) + 슈팅 성공률 + 경기 로그 표.

const RESULT_TEXT: Record<GameResult, string> = { W: '승', L: '패', D: '무' };

export function PlayerDetailPage() {
  const { name = '' } = useParams();
  const { tokens } = useTheme();
  const { data, loading, error, reload } = useApi(() => api.player(name), [name]);

  return (
    <div className="page">
      <div className="breadcrumb">
        <Link className="link" to="/players">
          ← 선수 목록
        </Link>
      </div>

      {loading && <Loading />}
      {error && <ErrorView message={error} onRetry={reload} />}
      {!loading && !error && !data && <Empty>선수를 찾을 수 없어요.</Empty>}

      {data && (
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
          <div className="stat-grid">
            <StatCard label="출전" value={data.games.length} accent={tokens.series[0]} />
            <StatCard label="누적 득점" value={data.totals.pts} accent={tokens.series[7]} />
            <StatCard label="리바운드" value={data.totals.reb} accent={tokens.series[1]} />
            <StatCard label="어시스트" value={data.totals.ast} accent={tokens.series[4]} />
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
                  seriesName="득점"
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
                    <th>리바</th>
                    <th>AS</th>
                    <th>ST</th>
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
