import { Link, useParams } from 'react-router-dom';
// [변경: 2026-07-15 10:28, 김병현 수정] useApi → React Query useGameBox 로 이관
// [변경: 2026-07-29 10:36, 김병현 수정] isStaleView 추가 — 다른 경기로 옮기는 동안 옛 표를 흐리게 유지.
import { isStaleView, useGameBox } from '../api/queries';
import { BoxScoreTable } from '../components/BoxScoreTable';
// [변경: 2026-07-29 10:36, 김병현 수정] 스피너 → 표 모양 뼈대(TableSkeleton).
import { Empty, ErrorView, TableSkeleton } from '../components/states';
import { gameLabel } from '../lib/format';
// [변경: 2026-07-29 12:10, 김병현 수정] 연장경기 표시 뱃지.
import { OvertimeBadge, ResultBadge } from '../components/Badge';
import { seriesColor } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';
// [변경: 2026-09-02 18:30, 김병현 수정] 아래 3줄 — 계획서 §7 Phase 4d.
// .breadcrumb → Breadcrumb, .page-head/.page-title/.page-sub → PageHeader,
// .scoreboard/.score-team* → Tailwind grid + Card 룩, .card* → SectionCard.
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from '../components/ui/breadcrumb';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
// [신설: 2026-09-03 09:00, 김병현 작성] 페이지 아이콘(계획서 §Phase 2-3) — 중계 화면 느낌을
// 살리는 방송(Radio) 아이콘. nav 에는 없는 페이지라 여기서만 고른다.
import { Radio } from 'lucide-react';
import { cn } from '../lib/utils';

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
    <div className="flex flex-col gap-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/games">← 경기 목록</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* [변경: 2026-07-15 10:28, 김병현 수정] loading→isLoading, error→error.message, reload→refetch */}
      {/* [변경: 2026-07-29 10:36, 김병현 수정] 스피너 → 표 모양 뼈대(박스스코어 = 열 9개). */}
      {isLoading && <TableSkeleton rows={8} cols={9} />}
      {error && <ErrorView message={error.message} onRetry={() => refetch()} />}
      {!isLoading && !error && !data && <Empty>경기를 찾을 수 없어요.</Empty>}

      {data && (
        // [변경: 2026-07-29 10:36, 김병현 수정] 다른 경기로 옮기는 동안 옛 스코어보드·표를 흐리게 유지.
        <div className={cn('flex flex-col gap-4', stale && 'opacity-55 transition-opacity')} aria-busy={stale}>
          <PageHeader
            icon={Radio}
            title={
              <>
                {gameLabel(data.week, data.game)}
                {/* [변경: 2026-07-29 12:10, 김병현 수정] 연장경기면 제목 옆에 표시. */}
                {data.overtime && <OvertimeBadge />}
              </>
            }
            sub={
              <>
                {/* [변경: 2026-07-14 17:32, 김병현 수정] data.season(문자열) → data.competition(대회 라벨) */}
                {data.competition}
                {/* [변경: 2026-07-29 12:10, 김병현 수정] 왜 따로 보이는지 한 줄로 설명.
                    이 화면엔 연장만의 박스스코어가 뜨는데, 선수 평균은 앞 경기와 합쳐 계산된다. */}
                {data.overtime && ' · 앞 경기의 연장이에요 (평균 계산은 앞 경기와 한 경기로)'}
              </>
            }
          />

          {/* 최종 스코어보드 — [변경: 2026-09-02 18:30, 김병현 수정] .scoreboard → grid + Card 룩(계획서 §5-5) */}
          <div className="grid grid-cols-2 gap-3.5">
            {data.teams.map((t, i) => (
              <div
                className={cn(
                  'rounded-[calc(var(--radius)-4px)] border-t-[3px] bg-foreground/3 px-4 py-3.5',
                  data.winner === t.team && 'bg-primary/8',
                )}
                key={t.team}
                style={{ borderTopColor: seriesColor(tokens, i) }}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {t.team}
                  {data.winner === t.team && <ResultBadge result="W" />}
                </div>
                <div className="text-[34px] leading-none font-extrabold tracking-tight">{t.score}</div>
              </div>
            ))}
          </div>

          {/* 팀별 박스스코어 */}
          {data.teams.map((t) => (
            <SectionCard
              key={t.team}
              title={
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block size-3 rounded-[3px]"
                    style={{ background: seriesColor(tokens, data.teams.indexOf(t)) }}
                    aria-hidden="true"
                  />
                  {t.team} · {t.score}점
                </span>
              }
              note={`${t.players.length}명`}
            >
              <BoxScoreTable players={t.players} />
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
