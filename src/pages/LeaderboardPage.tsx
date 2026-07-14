import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — useSeason → useCompetition(리네임).
import { useCompetition } from '../context/CompetitionContext';
import { LEADERBOARD_METRICS, type LeaderboardMetric } from '../api/types';
import { BarRanking, type BarDatum } from '../components/charts/BarRanking';
import { Empty, ErrorView, Loading } from '../components/states';
import { METRIC_LABELS } from '../lib/format';

// 리더보드: 지표를 골라 누적 순위를 막대 + 표로. 차트는 눈으로, 표는 정확한 값/평균으로.

// [변경: 2026-07-14 17:49, 김병현 수정] 표는 전체 순위, 막대 차트만 상위 12명으로 제한.
const CHART_TOP_N = 12;

export function LeaderboardPage() {
  const { competitionId, competitionLabel } = useCompetition();
  const [metric, setMetric] = useState<LeaderboardMetric>('pts');
  // [변경: 2026-07-14 17:49, 김병현 수정] limit 생략 → 상위 N 제한 없이 전체 선수 조회.
  const { data, loading, error, reload } = useApi(
    () => api.leaderboard(metric, undefined, competitionId),
    [metric, competitionId],
  );

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">리더보드</h1>
        <p className="page-sub">
          {/* [변경: 2026-07-14 17:49, 김병현 수정] "상위 N" → 전체 인원 수 표기. */}
          {competitionLabel ?? '전체 대회'} · 누적 {METRIC_LABELS[metric]} 순위 (전체{' '}
          {data ? `${data.length}명` : ''})
        </p>
      </div>

      {/* 지표 선택 탭 */}
      <div className="metric-tabs" role="tablist" aria-label="리더보드 지표">
        {LEADERBOARD_METRICS.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={m === metric}
            className={`metric-tab ${m === metric ? 'is-active' : ''}`}
            onClick={() => setMetric(m)}
          >
            {METRIC_LABELS[m]}
          </button>
        ))}
      </div>

      {loading && <Loading />}
      {error && <ErrorView message={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty>이 지표에 기록이 없어요.</Empty>}

      {data && data.length > 0 && (
        <div className="grid-2">
          <section className="card chart-card">
            <div className="card-head">
              <h2 className="card-title">{METRIC_LABELS[metric]} 상위</h2>
            </div>
            <BarRanking
              data={data.slice(0, CHART_TOP_N).map<BarDatum>((row) => ({
                label: row.player,
                value: row.total,
              }))}
            />
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="card-title">전체 순위</h2>
              <span className="card-note">누적 · 경기당 평균</span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="col-rank">#</th>
                    <th className="col-name">선수</th>
                    <th>출전</th>
                    <th>누적</th>
                    <th>경기당</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.player}>
                      <td className="num muted">{row.rank}</td>
                      <td className="col-name">
                        <Link className="link" to={`/players/${encodeURIComponent(row.player)}`}>
                          {row.player}
                        </Link>
                      </td>
                      <td className="num">{row.games}</td>
                      <td className="num strong">{row.total}</td>
                      <td className="num muted">{row.perGame}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
