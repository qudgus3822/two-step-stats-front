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
// [변경: 2026-07-15 13:01, 김병현 수정] formatPct import 추가 — 성공률(rate) 계열 표시용.
import { METRIC_LABELS, formatAvg, formatPct } from '../lib/format';

// 리더보드: 지표를 골라 누적 순위를 막대 + 표로. 차트는 눈으로, 표는 정확한 값/평균으로.
// [변경: 2026-07-15 11:37, 김병현 수정] 메인 지표를 누적 → 경기당 평균으로. 정렬·차트·강조 모두 경기당 기준.
// [변경: 2026-07-15 13:01, 김병현 수정] 지표가 19종(카운트/성공률/180클럽 3계열)으로 늘어 계열별 차트·표 분기 추가.

// [변경: 2026-07-14 17:49, 김병현 수정] 표는 전체 순위, 막대 차트만 상위 12명으로 제한.
const CHART_TOP_N = 12;

export function LeaderboardPage() {
  const { competitionId, competitionLabel } = useCompetition();
  const [metric, setMetric] = useState<LeaderboardMetric>('pts');
  // [변경: 2026-07-14 17:49, 김병현 수정] limit 생략 → 상위 N 제한 없이 전체 선수 조회.
  // [변경: 2026-07-15 10:28, 김병현 수정] useApi → useLeaderboard(React Query)
  const { data, isLoading, error, refetch } = useLeaderboard(metric, competitionId);
  // [변경: 2026-07-15 13:01, 김병현 수정] 계열(family)은 지표키에서 유추하지 않고 실제 응답 첫 행의 kind 로 정한다.
  // (부제 문구도 계열별로 달라야 해서 data.length>0 JSX 블록보다 앞에서 한 번만 계산해 재사용.)
  const family = data && data.length > 0 ? data[0].kind : null;

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">리더보드</h1>
        <p className="page-sub">
          {/* [변경: 2026-07-14 17:49, 김병현 수정] "상위 N" → 전체 인원 수 표기. */}
          {/* [변경: 2026-07-15 11:37, 김병현 수정] "누적" → "경기당" 순위로 문구 변경. */}
          {/* [변경: 2026-07-15 13:01, 김병현 수정] 계열별 부제 분기: count 는 기존 "경기당" 문구 유지,
              rate/club180 은 "경기당" 빼고 지표명만 + 최소 시도 자격 안내(AC19/21). */}
          {competitionLabel ?? '전체 대회'} ·{' '}
          {family === 'rate' || family === 'club180'
            ? `${METRIC_LABELS[metric]} 순위 (최소 시도 자격을 채운 ${data ? data.length : 0}명)`
            : `경기당 ${METRIC_LABELS[metric]} 순위 (전체 ${data ? `${data.length}명` : ''})`}
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
      {/* [변경: 2026-07-15 13:01, 김병현 수정] 빈 상태 문구를 계열 무관하게 일반화(AC20). */}
      {data && data.length === 0 && (
        <Empty>이 지표에 표시할 선수가 없어요 (기록이 없거나 최소 시도 자격 미달).</Empty>
      )}

      {data && data.length > 0 && (
        <div className="grid-2">
          <section className="card chart-card">
            <div className="card-head">
              {/* [변경: 2026-07-15 11:37, 김병현 수정] 차트가 경기당 평균 기준임을 제목에 명시. */}
              {/* [변경: 2026-07-15 13:01, 김병현 수정] rate/club180 은 "경기당" 문구 없이 지표명만(AC21). */}
              <h2 className="card-title">
                {METRIC_LABELS[metric]} {family === 'rate' || family === 'club180' ? '상위' : '경기당 상위'}
              </h2>
            </div>
            <BarRanking
              data={data.slice(0, CHART_TOP_N).map<BarDatum>((row) => ({
                label: row.player,
                // [변경: 2026-07-15 13:01, 김병현 수정] 계열별 값(perGame/pct/sum)을 공통 row.value 로 통일.
                value: row.value,
              }))}
              // [변경: 2026-07-15 13:01, 김병현 수정] rate 계열은 %, 그 외(count/club180)는 소수1자리 평균.
              format={family === 'rate' ? formatPct : formatAvg}
            />
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="card-title">전체 순위</h2>
              {/* [변경: 2026-07-15 11:37, 김병현 수정] "누적 · 경기당 평균" → "경기당 평균 · 누적"(경기당이 메인). */}
              {/* [변경: 2026-07-15 13:01, 김병현 수정] rate/club180 은 자격 안내로 카드노트 문구 교체(AC19). */}
              <span className="card-note">
                {family === 'rate' && '최소 시도 자격을 채운 선수만 · 성공률 · 성공/시도'}
                {family === 'club180' && '최소 시도 자격을 채운 선수만 · 180점 · 성공률 3종'}
                {family === 'count' && '경기당 평균 · 누적'}
              </span>
            </div>
            <div className="table-wrap">
              <table className="table">
                {/* [변경: 2026-07-15 13:01, 김병현 수정] 표를 계열별 3레이아웃으로 분기(AC18).
                    family 는 레이아웃 선택에만 쓰고, 실제 필드 접근은 각 행에서 row.kind 로 다시 좁힌다
                    (배열 전체가 한 계열이란 건 런타임 보장일 뿐 타입 보장이 아니라서 — tsc 통과 위해 필수). */}
                {family === 'count' && (
                  <>
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
                      {data.map((row) => {
                        if (row.kind !== 'count') return null;
                        return (
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
                        );
                      })}
                    </tbody>
                  </>
                )}
                {family === 'rate' && (
                  <>
                    <thead>
                      <tr>
                        <th className="col-rank">#</th>
                        <th className="col-name">선수</th>
                        <th>출전</th>
                        <th>성공률</th>
                        <th>성공/시도</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row) => {
                        if (row.kind !== 'rate') return null;
                        return (
                          <tr key={row.player}>
                            <td className="num muted">{row.rank}</td>
                            <td className="col-name">
                              <Link className="link" to={`/players/${encodeURIComponent(row.player)}`}>
                                {row.player}
                              </Link>
                            </td>
                            <td className="num">{row.games}</td>
                            <td className="num strong">{formatPct(row.pct)}</td>
                            <td className="num muted">
                              {row.makes}/{row.atts}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}
                {family === 'club180' && (
                  <>
                    <thead>
                      <tr>
                        <th className="col-rank">#</th>
                        <th className="col-name">선수</th>
                        <th>출전</th>
                        <th>180점</th>
                        <th>야투%</th>
                        <th>3점%</th>
                        <th>자유투%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row) => {
                        if (row.kind !== 'club180') return null;
                        return (
                          <tr key={row.player}>
                            <td className="num muted">{row.rank}</td>
                            <td className="col-name">
                              <Link className="link" to={`/players/${encodeURIComponent(row.player)}`}>
                                {row.player}
                              </Link>
                            </td>
                            <td className="num">{row.games}</td>
                            <td className="num strong">{formatAvg(row.sum)}</td>
                            <td className="num muted">{formatPct(row.fgPct)}</td>
                            <td className="num muted">{formatPct(row.fg3Pct)}</td>
                            <td className="num muted">{formatPct(row.ftPct)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
