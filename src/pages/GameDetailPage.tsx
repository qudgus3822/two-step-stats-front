import { Link, useParams } from 'react-router-dom';
// [변경: 2026-07-15 10:28, 김병현 수정] useApi → React Query useGameBox 로 이관
// [변경: 2026-07-29 10:36, 김병현 수정] isStaleView 추가 — 다른 경기로 옮기는 동안 옛 표를 흐리게 유지.
import { isStaleView, useGameBox } from '../api/queries';
import { BoxScoreTable } from '../components/BoxScoreTable';
// [변경: 2026-07-29 10:36, 김병현 수정] 스피너 → 표 모양 뼈대(TableSkeleton).
import { Empty, ErrorView, TableSkeleton } from '../components/states';
import { gameLabel } from '../lib/format';
import { seriesColor } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';

// 경기 상세: 최종 점수 + 팀별 선수 박스스코어 표.

export function GameDetailPage() {
  const { id = '' } = useParams();
  const { tokens } = useTheme();
  // [변경: 2026-07-15 10:28, 김병현 수정] useApi → useGameBox(React Query)
  // [변경: 2026-07-29 10:36, 김병현 수정] 쿼리 객체를 통째로 — isStaleView 가 isFetching/isPlaceholderData 까지 본다.
  const boxQuery = useGameBox(id);
  const { data, isLoading, error, refetch } = boxQuery;
  const stale = isStaleView(boxQuery);

  return (
    <div className="page">
      <div className="breadcrumb">
        <Link className="link" to="/games">
          ← 경기 목록
        </Link>
      </div>

      {/* [변경: 2026-07-15 10:28, 김병현 수정] loading→isLoading, error→error.message, reload→refetch */}
      {/* [변경: 2026-07-29 10:36, 김병현 수정] 스피너 → 표 모양 뼈대(박스스코어 = 열 9개). */}
      {isLoading && <TableSkeleton rows={8} cols={9} />}
      {error && <ErrorView message={error.message} onRetry={() => refetch()} />}
      {!isLoading && !error && !data && <Empty>경기를 찾을 수 없어요.</Empty>}

      {data && (
        // [변경: 2026-07-29 10:36, 김병현 수정] 다른 경기로 옮기는 동안 옛 스코어보드·표를 흐리게 유지.
        <div className={stale ? 'is-stale' : ''} aria-busy={stale}>
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
        </div>
      )}
    </div>
  );
}
