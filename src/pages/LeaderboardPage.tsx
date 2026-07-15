import { useState } from 'react';
import { Link } from 'react-router-dom';
// [변경: 2026-07-15 10:28, 김병현 수정] useApi → React Query useLeaderboard 로 이관
import { useLeaderboard } from '../api/queries';
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — useSeason → useCompetition(리네임).
import { useCompetition } from '../context/CompetitionContext';
import { LEADERBOARD_METRICS, type LeaderboardMetric } from '../api/types';
import { BarRanking, type BarDatum } from '../components/charts/BarRanking';
import { Empty, ErrorView, Loading } from '../components/states';
// [변경: 2026-07-15 11:37, 김병현 수정] formatAvg import 추가 — 차트/표의 경기당 평균 표시용.
import { METRIC_LABELS, formatAvg } from '../lib/format';

// 리더보드: 지표를 골라 누적 순위를 막대 + 표로. 차트는 눈으로, 표는 정확한 값/평균으로.
// [변경: 2026-07-15 11:37, 김병현 수정] 메인 지표를 누적 → 경기당 평균으로. 정렬·차트·강조 모두 경기당 기준.

// [변경: 2026-07-14 17:49, 김병현 수정] 표는 전체 순위, 막대 차트만 상위 12명으로 제한.
const CHART_TOP_N = 12;

export function LeaderboardPage() {
  const { competitionId, competitionLabel } = useCompetition();
  const [metric, setMetric] = useState<LeaderboardMetric>('pts');
  // [변경: 2026-07-14 17:49, 김병현 수정] limit 생략 → 상위 N 제한 없이 전체 선수 조회.
  // [변경: 2026-07-15 10:28, 김병현 수정] useApi → useLeaderboard(React Query)
  const { data, isLoading, error, refetch } = useLeaderboard(metric, competitionId);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">리더보드</h1>
        <p className="page-sub">
          {/* [변경: 2026-07-14 17:49, 김병현 수정] "상위 N" → 전체 인원 수 표기. */}
          {/* [변경: 2026-07-15 11:37, 김병현 수정] "누적" → "경기당" 순위로 문구 변경. */}
          {competitionLabel ?? '전체 대회'} · 경기당 {METRIC_LABELS[metric]} 순위 (전체{' '}
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

      {/* [변경: 2026-07-15 10:28, 김병현 수정] loading→isLoading, error→error.message, reload→refetch */}
      {isLoading && <Loading />}
      {error && <ErrorView message={error.message} onRetry={() => refetch()} />}
      {data && data.length === 0 && <Empty>이 지표에 기록이 없어요.</Empty>}

      {data && data.length > 0 && (
        <div className="grid-2">
          <section className="card chart-card">
            <div className="card-head">
              {/* [변경: 2026-07-15 11:37, 김병현 수정] 차트가 경기당 평균 기준임을 제목에 명시. */}
              <h2 className="card-title">{METRIC_LABELS[metric]} 경기당 상위</h2>
            </div>
            <BarRanking
              data={data.slice(0, CHART_TOP_N).map<BarDatum>((row) => ({
                label: row.player,
                value: row.perGame, // [변경: 2026-07-15 11:37, 김병현 수정] 누적 → 경기당 평균
              }))}
              format={formatAvg} // [변경: 2026-07-15 11:37, 김병현 수정] 막대 라벨/툴팁 소수1자리
            />
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="card-title">전체 순위</h2>
              {/* [변경: 2026-07-15 11:37, 김병현 수정] "누적 · 경기당 평균" → "경기당 평균 · 누적"(경기당이 메인). */}
              <span className="card-note">경기당 평균 · 누적</span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="col-rank">#</th>
                    <th className="col-name">선수</th>
                    <th>출전</th>
                    {/* [변경: 2026-07-15 11:37, 김병현 수정] 표 컬럼 순서를 경기당 → 누적으로 교체. */}
                    <th>경기당</th>
                    <th>누적</th>
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
                      {/* [변경: 2026-07-15 11:37, 김병현 수정] 경기당(strong)·누적(muted) 순서·강조 교체. */}
                      <td className="num strong">{formatAvg(row.perGame)}</td>
                      <td className="num muted">{row.total}</td>
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
