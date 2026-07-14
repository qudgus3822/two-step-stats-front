import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { useSeason } from '../context/SeasonContext';
import type { GameSummary } from '../api/types';
import { Empty, ErrorView, Loading } from '../components/states';
import { gameLabel } from '../lib/format';

// 경기 목록: 시즌 안의 모든 경기를 점수/승패와 함께 카드로 나열. 누르면 박스스코어로.

export function GamesPage() {
  const { season } = useSeason();
  const { data, loading, error, reload } = useApi(() => api.games(season), [season]);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">경기</h1>
        <p className="page-sub">{season ? `${season} 시즌` : '전체 시즌'} · 눌러서 박스스코어 보기</p>
      </div>

      {loading && <Loading />}
      {error && <ErrorView message={error} onRetry={reload} />}
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
        <span className="game-season">{game.season}</span>
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
