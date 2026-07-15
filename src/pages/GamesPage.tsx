import { Link } from 'react-router-dom';
// [변경: 2026-07-15 10:28, 김병현 수정] useApi → React Query useGames 로 이관
import { useGames } from '../api/queries';
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — useSeason → useCompetition(리네임).
import { useCompetition } from '../context/CompetitionContext';
import type { GameSummary } from '../api/types';
import { Empty, ErrorView, Loading } from '../components/states';
import { gameLabel } from '../lib/format';

// 경기 목록: 대회 안의 모든 경기를 점수/승패와 함께 카드로 나열. 누르면 박스스코어로.

export function GamesPage() {
  const { competitionId, competitionLabel } = useCompetition();
  // [변경: 2026-07-15 10:28, 김병현 수정] useApi → useGames(React Query)
  const { data, isLoading, error, refetch } = useGames(competitionId);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">경기</h1>
        <p className="page-sub">{competitionLabel ?? '전체 대회'} · 눌러서 박스스코어 보기</p>
      </div>

      {/* [변경: 2026-07-15 10:28, 김병현 수정] loading→isLoading, error→error.message, reload→refetch */}
      {isLoading && <Loading />}
      {error && <ErrorView message={error.message} onRetry={() => refetch()} />}
      {data && data.length === 0 && <Empty>경기 기록이 없어요.</Empty>}

      {data && data.length > 0 && (
        <ul className="game-list">
          {data.map((game) => (
            <li key={game.id}>
              <GameRow game={game} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GameRow({ game }: { game: GameSummary }) {
  return (
    <Link className="game-row card" to={`/games/${encodeURIComponent(game.id)}`}>
      <div className="game-when">
        <span className="game-week">{gameLabel(game.week, game.game)}</span>
        {/* [변경: 2026-07-14 17:32, 김병현 수정] game.season(문자열) → game.competition(대회 라벨) */}
        <span className="game-season">{game.competition}</span>
      </div>

      <div className="game-score">
        {game.teams.map((t, i) => (
          <span className="game-side" key={t.team}>
            <span className={`game-team ${game.winner === t.team ? 'is-winner' : ''}`}>{t.team}</span>
            <span className={`game-points ${game.winner === t.team ? 'is-winner' : ''}`}>
              {t.score}
            </span>
            {i < game.teams.length - 1 && <span className="game-colon">:</span>}
          </span>
        ))}
      </div>

      <div className="game-meta">
        {game.winner ? `${game.winner} 승` : '무승부'}
        <span className="dot-sep">·</span>
        {game.events} 이벤트
      </div>
    </Link>
  );
}
