// [신설: 2026-09-03 09:00, 김병현 작성] 시각 정체성 개편(visual-identity) Phase 2 — 선수 아바타.
//
// "표·상세·MVP 카드에 이름 옆 원형 이니셜 배지"(계획서 §Phase 2-2)를 이 컴포넌트 하나로.
// shadcn Avatar 를 그대로 쓰고(손으로 원 div 를 만들지 않는다), 안에 채우는 이니셜과
// 색만 이름에서 계산한다. 색은 palette.ts 의 차트 8색을 재사용한다 — 아바타 전용으로
// 새 색을 만들지 않는다(새 색이 늘면 checkPalette 대조표도 늘려야 한다).
//
// 인터페이스: <PlayerAvatar name="김병현" size="sm|default|lg" />. 감추는 것: 해시로 색
// 고르기, Avatar/AvatarFallback 조립, 옅은 배경+글자 색 조합(color-mix 로 대비 확보).
import { Avatar, AvatarFallback } from './ui/avatar';
import { playerColorIndex, playerInitial } from '../lib/playerAvatar';
import { seriesColor } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';
import { cn } from '../lib/utils';

interface PlayerAvatarProps {
  name: string;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function PlayerAvatar({ name, size = 'sm', className }: PlayerAvatarProps) {
  const { tokens } = useTheme();
  const color = seriesColor(tokens, playerColorIndex(name, tokens.series.length));

  return (
    // [변경: 2026-09-03] aria-hidden — 이 아바타는 항상 실제 이름(PlayerLink 등) 바로 옆에
    // 붙어 나온다. 안 감추면 스크린리더가 "김, 김병현"처럼 이니셜을 이름과 따로 두 번 읽는다.
    <Avatar aria-hidden="true" size={size} className={cn('shrink-0', className)}>
      {/* 배경은 그 선수 색의 옅은 틴트, 글자는 그 색 그대로 — Badge(variant=team)와 같은
          "옅은 배경 + 진한 글자" 조합이라 이 화면의 다른 칩들과 톤이 어긋나지 않는다. */}
      <AvatarFallback
        className="bg-transparent font-semibold"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`, color }}
      >
        {playerInitial(name)}
      </AvatarFallback>
    </Avatar>
  );
}
