import { Link } from 'react-router-dom';
// [변경: 2026-07-15 10:28, 김병현 수정] useApi → React Query useGames 로 이관
// [변경: 2026-07-29 10:36, 김병현 수정] isStaleView 추가 — 대회를 바꾸는 동안 옛 목록을 흐리게 유지.
import { isStaleView, useGames } from '../api/queries';
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — useSeason → useCompetition(리네임).
import { useCompetition } from '../context/CompetitionContext';
import type { GameSummary } from '../api/types';
import { Empty, ErrorView, Loading } from '../components/states';
import { gameLabel } from '../lib/format';
// [변경: 2026-07-29 12:10, 김병현 수정] 연장경기 표시 뱃지.
import { OvertimeBadge } from '../components/Badge';
// [변경: 2026-09-02 18:30, 김병현 수정] .page* → PageHeader (계획서 §7 Phase 4d).
import { PageHeader } from '../components/PageHeader';
import { cn } from '../lib/utils';

// 경기 목록: 대회 안의 모든 경기를 점수/승패와 함께 카드로 나열. 누르면 박스스코어로.

export function GamesPage() {
  const { competitionId, competitionLabel } = useCompetition();
  // [변경: 2026-07-15 10:28, 김병현 수정] useApi → useGames(React Query)
  // [변경: 2026-07-29 10:36, 김병현 수정] 쿼리 객체를 통째로 — isStaleView 가 isFetching/isPlaceholderData 까지 본다.
  const gamesQuery = useGames(competitionId);
  const { data, isLoading, error, refetch } = gamesQuery;
  const stale = isStaleView(gamesQuery);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="경기" sub={`${competitionLabel ?? '전체 대회'} · 눌러서 박스스코어 보기`} />

      {/* [변경: 2026-07-15 10:28, 김병현 수정] loading→isLoading, error→error.message, reload→refetch */}
      {isLoading && <Loading />}
      {error && <ErrorView message={error.message} onRetry={() => refetch()} />}
      {data && data.length === 0 && <Empty>경기 기록이 없어요.</Empty>}

      {data && data.length > 0 && (
        // [변경: 2026-07-29 10:36, 김병현 수정] 대회를 바꾸는 동안 옛 목록을 지우지 않고 흐리게만.
        // [변경: 2026-09-02 18:30, 김병현 수정] .game-list → grid gap-3(계획서 §5-5).
        <ul className={cn('grid gap-3', stale && 'opacity-55 transition-opacity')} aria-busy={stale}>
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
    // [변경: 2026-09-02 18:30, 김병현 수정] .game-row.card → Card 룩을 입힌 Link(계획서 §5-5).
    // 모바일(<sm)은 2열(1fr auto), sm 이상은 3열(1fr auto 1fr) — 옛 @media(max-560) 의
    // .game-meta 숨김을 hidden sm:block 으로 그대로 옮긴다.
    <Link
      className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-card px-4 py-3.5 text-sm text-card-foreground ring-1 ring-foreground/10 shadow-sm transition-colors hover:ring-primary active:translate-y-px sm:grid-cols-[1fr_auto_1fr]"
      to={`/games/${encodeURIComponent(game.id)}`}
    >
      <div className="flex flex-col">
        <span className="font-semibold">
          {gameLabel(game.week, game.game)}
          {/* [변경: 2026-07-29 12:10, 김병현 수정] 연장은 목록에 따로 한 줄로 나오되 표시를 단다.
              평균 계산에선 앞 경기에 합쳐지므로, 표시가 없으면 "목록 3경기 vs 리더보드 2경기"가
              버그로 보인다. */}
          {game.overtime && <OvertimeBadge />}
        </span>
        {/* [변경: 2026-07-14 17:32, 김병현 수정] game.season(문자열) → game.competition(대회 라벨) */}
        <span className="text-[12.5px] text-muted-foreground">{game.competition}</span>
      </div>

      <div className="inline-flex items-center gap-2.5 tabular-nums">
        {game.teams.map((t, i) => (
          <span className="inline-flex items-center gap-2" key={t.team}>
            <span
              className={cn(
                'font-semibold text-secondary-foreground',
                game.winner === t.team && 'text-primary',
              )}
            >
              {t.team}
            </span>
            <span
              className={cn(
                'text-xl font-bold',
                game.winner === t.team && 'text-primary',
              )}
            >
              {t.score}
            </span>
            {i < game.teams.length - 1 && <span className="mx-0.5 text-muted-foreground">:</span>}
          </span>
        ))}
      </div>

      <div className="hidden text-right text-[13px] text-muted-foreground sm:block">
        {game.winner ? `${game.winner} 승` : '무승부'}
        <span className="mx-1.5">·</span>
        {game.events} 이벤트
      </div>
    </Link>
  );
}
