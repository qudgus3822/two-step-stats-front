import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { useSeason } from '../context/SeasonContext';
import { LEADERBOARD_METRICS, type LeaderboardMetric } from '../api/types';
import { BarRanking, type BarDatum } from '../components/charts/BarRanking';
import { Empty, ErrorView, Loading } from '../components/states';
import { METRIC_LABELS } from '../lib/format';

// 리더보드: 지표를 골라 누적 순위를 막대 + 표로. 차트는 눈으로, 표는 정확한 값/평균으로.

const TOP_N = 20;

export function LeaderboardPage() {
  const { season } = useSeason();
  const [metric, setMetric] = useState<LeaderboardMetric>('pts');
  const { data, loading, error, reload } = useApi(
    () => api.leaderboard(metric, TOP_N, season),
    [metric, season],
  );

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">리더보드</h1>
        <p className="page-sub">
          {season ? `${season} 시즌` : '전체 시즌'} · 누적 {METRIC_LABELS[metric]} 순위 (상위 {TOP_N})
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
              data={data.slice(0, 12).map<BarDatum>((row) => ({
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
