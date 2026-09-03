// [신설: 2026-09-03 09:00, 김병현 작성] 시각 정체성 개편(visual-identity) Phase 2.
//
// 표의 "선수" 열 한 칸 = 아바타 + 이름 링크. 이 조합을 표마다 따로 짜면 아바타 크기·간격이
// 표마다 제각각이 된다(계획서 AC-5 "제각각 크기 금지") — 그래서 조합 자체를 여기 한 곳에 모았다.
// PlayerLink(마우스오버 prefetch)는 그대로 감싸 쓴다 — 이 컴포넌트는 "옆에 아바타를 놓는
// 배치"만 책임지고, 링크·prefetch 는 여전히 PlayerLink 가 책임진다(중복 없음).
import { PlayerAvatar } from './PlayerAvatar';
import { PlayerLink } from './PlayerLink';
import { cn } from '../lib/utils';

interface PlayerCellProps {
  name: string;
  className?: string;
}

export function PlayerCell({ name, className }: PlayerCellProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <PlayerAvatar name={name} size="sm" />
      <PlayerLink name={name} />
    </div>
  );
}
