import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { useSeason } from '../context/SeasonContext';
import { BarRanking, type BarDatum } from '../components/charts/BarRanking';
import { StatCard } from '../components/StatCard';
import { Empty, ErrorView, Loading } from '../components/states';
import { statCodeLabel } from '../lib/format';
import { useTheme } from '../theme/ThemeContext';

// 대시보드: 전체 규모를 한눈에. 요약 카드 4개 + 득점 TOP + 스탯 코드 분포.

export function DashboardPage() {
  const { season } = useSeason();
  const { tokens } = useTheme();

  const summaryState = useApi(() => api.summary(season), [season]);
  const topState = useApi(() => api.leaderboard('pts', 8, season), [season]);

  const summary = summaryState.data;

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">대시보드</h1>
        <p className="page-sub">
          {season ? `${season} 시즌` : '전체 시즌'} 기록 요약
        </p>
      </div>

      {summaryState.loading && <Loading />}
      {summaryState.error && (
        <ErrorView message={summaryState.error} onRetry={summaryState.reload} />
      )}

      {summary && summary.events === 0 && (
        <Empty>
          아직 데이터가 없어요. API 서버에 엑셀을 업로드하면 여기에 통계가 채워집니다.
        </Empty>
      )}

      {summary && summary.events > 0 && (
        <>
          {/* 요약 카드: 큰 숫자 하나씩 */}
          <div className="stat-grid">
            <StatCard label="시즌" value={summary.seasons} accent={tokens.series[0]} />
            <StatCard label="경기" value={summary.games} accent={tokens.series[1]} />
            <StatCard label="선수" value={summary.players} accent={tokens.series[4]} />
            <StatCard
              label="기록 이벤트"
              value={summary.events.toLocaleString()}
              hint="엑셀에서 읽은 스탯 한 줄 = 1"
              accent={tokens.series[7]}
            />
          </div>

          <div className="grid-2">
            {/* 득점 TOP 8 */}
            <section className="card chart-card">
              <div className="card-head">
                <h2 className="card-title">득점 TOP 8</h2>
                <Link className="link" to="/leaderboard">
                  전체 리더보드 →
                </Link>
              </div>
              {topState.loading && <Loading />}
              {topState.error && <ErrorView message={topState.error} onRetry={topState.reload} />}
              {topState.data && topState.data.length > 0 && (
                <BarRanking
                  data={topState.data.map<BarDatum>((row) => ({
                    label: row.player,
                    value: row.total,
                  }))}
                  format={(v) => `${v}점`}
                />
              )}
            </section>

            {/* 스탯 코드 분포 히스토그램 */}
            <section className="card chart-card">
              <div className="card-head">
                <h2 className="card-title">스탯 코드 분포</h2>
                <span className="card-note">엑셀에서 어떤 기록이 많이 찍혔나</span>
              </div>
              <BarRanking
                data={byStatToBars(summary.byStat)}
                color={tokens.series[1]}
                format={(v) => v.toLocaleString()}
                labelWidth={112}
              />
            </section>
          </div>
        </>
      )}
    </div>
  );
}

// byStat 객체 → 많은 순 정렬된 막대 데이터. 라벨은 한국어 이름.
function byStatToBars(byStat: Record<string, number>): BarDatum[] {
  return Object.entries(byStat)
    .sort((a, b) => b[1] - a[1])
    .map(([code, count]) => ({ label: statCodeLabel(code), value: count }));
}
