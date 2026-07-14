import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { BoxScoreTable } from '../components/BoxScoreTable';
import { Empty, ErrorView, Loading } from '../components/states';
import { gameLabel } from '../lib/format';
import { seriesColor } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';

// 경기 상세: 최종 점수 + 팀별 선수 박스스코어 표.

export function GameDetailPage() {
  const { id = '' } = useParams();
  const { tokens } = useTheme();
  const { data, loading, error, reload } = useApi(() => api.game(id), [id]);

  return (
    <div className="page">
      <div className="breadcrumb">
        <Link className="link" to="/games">
          ← 경기 목록
        </Link>
      </div>

      {loading && <Loading />}
      {error && <ErrorView message={error} onRetry={reload} />}
      {!loading && !error && !data && <Empty>경기를 찾을 수 없어요.</Empty>}

      {data && (
        <>
          <div className="page-head">
            <h1 className="page-title">{gameLabel(data.week, data.game)}</h1>
            {/* [변경: 2026-07-14 17:32, 김병현 수정] data.season(문자열) → data.competition(대회 라벨) */}
            <p className="page-sub">{data.competition}</p>
          </div>

          {/* 최종 스코어보드 */}
          <div className="scoreboard card">
            {data.teams.map((t, i) => (
              <div
                className={`score-team ${data.winner === t.team ? 'is-winner' : ''}`}
                key={t.team}
                style={{ borderTopColor: seriesColor(tokens, i) }}
              >
                <div className="score-team-name">
                  {t.team}
                  {data.winner === t.team && <span className="score-tag">승</span>}
                </div>
                <div className="score-team-pts">{t.score}</div>
              </div>
            ))}
          </div>

          {/* 팀별 박스스코어 */}
          {data.teams.map((t) => (
            <section className="card" key={t.team}>
              <div className="card-head">
                <h2 className="card-title">
                  <span
                    className="team-swatch"
                    style={{ background: seriesColor(tokens, data.teams.indexOf(t)) }}
                    aria-hidden="true"
                  />
                  {t.team} · {t.score}점
                </h2>
                <span className="card-note">{t.players.length}명</span>
              </div>
              <BoxScoreTable players={t.players} />
            </section>
          ))}
        </>
      )}
    </div>
  );
}
