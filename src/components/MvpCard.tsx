// [신설: 2026-09-02 15:20, 김병현 작성] "이 경기 최고 기록" 카드 — 득점 1위 선수를 큰 숫자로.
//
// 감추는 것: MVP 선정 규칙(findGameMvp — 득점 1위, 동점이면 효율 높은 쪽), 그 선수의 팀 색 조회.
// ⚠ 새 API를 쓰지 않는다 — 대시보드가 이미 받는 GameBox(박스스코어)에서 계산만 한다.
import type { GameBox } from '../api/types';
import { findGameMvp } from '../lib/gameBoxSummary';
import { Card } from './ui/card';
import { PlayerLink } from './PlayerLink';
// [신설: 2026-09-03 09:00, 김병현 작성] MVP 카드에도 아바타(계획서 §Phase 2-2).
import { PlayerAvatar } from './PlayerAvatar';
import { TeamBadge } from './Badge';
import { seriesColor } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';

export function MvpCard({ box }: { box: GameBox }) {
  const { tokens } = useTheme();
  const mvp = findGameMvp(box);
  // 이론상 선수가 아무도 없으면(박스스코어가 비어 있으면) 아무것도 그리지 않는다 —
  // "0점 MVP" 같은 무의미한 카드를 보여주는 것보다 조용히 안 보이는 게 낫다.
  if (!mvp) return null;

  const teamIndex = box.teams.findIndex((t) => t.team === mvp.team);
  const color = seriesColor(tokens, teamIndex < 0 ? 0 : teamIndex);

  return (
    <Card className="h-full justify-center gap-2 border-l-4 px-4 py-3.5" style={{ borderLeftColor: color }}>
      <div className="text-[13px] font-medium text-secondary-foreground">이 경기 최고 기록</div>
      <div className="flex flex-wrap items-center gap-1.5">
        <PlayerAvatar name={mvp.player.player} />
        <PlayerLink name={mvp.player.player} />
        <TeamBadge team={mvp.team} color={color} />
      </div>
      <div className="font-heading text-[44px] leading-none font-extrabold tabular-nums tracking-tight">
        {mvp.player.pts}
        <span className="ml-1 text-sm font-medium text-muted-foreground">점</span>
      </div>
      <dl className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <div className="flex gap-1">
          <dt>효율</dt>
          <dd className="font-semibold tabular-nums text-foreground">{mvp.eff}</dd>
        </div>
        <div className="flex gap-1">
          <dt>리바</dt>
          <dd className="font-semibold tabular-nums text-foreground">{mvp.player.reb}</dd>
        </div>
        <div className="flex gap-1">
          <dt>AS</dt>
          <dd className="font-semibold tabular-nums text-foreground">{mvp.player.ast}</dd>
        </div>
      </dl>
    </Card>
  );
}
