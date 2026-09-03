// [신설: 2026-09-03 09:00, 김병현 작성] 시각 정체성 개편(visual-identity) Phase 3 —
// 순위 1~3위 강조 칩. 리더보드(broadcast-redesign Phase C)에서 먼저 만들었던 걸 명예의 전당도
// 똑같이 써야 해서 공용 파일로 뽑았다(두 표에 같은 로직을 복제하지 않는다).
//
// 색만으로 구분하지 않는다 — 칩 배경 진하기 3단계 + 글자 굵기가 함께 바뀐다(색맹 대비).
// 금/은/동 같은 새 팔레트 색은 안 쓰고 기존 토큰(primary·foreground 투명도)만 조합해서
// checkPalette 게이트에 색을 새로 안 늘린다.
import { TableCell } from './ui/table';
import { cn } from '../lib/utils';

const RANK_TOP_STYLE: Record<number, string> = {
  1: 'bg-primary text-primary-foreground font-bold',
  2: 'bg-foreground/15 text-foreground font-bold',
  3: 'bg-foreground/8 text-foreground font-semibold',
};

export function RankCell({ rank }: { rank: number }) {
  const topStyle = RANK_TOP_STYLE[rank];
  return (
    <TableCell className="text-right tabular-nums">
      <span
        className={cn(
          'inline-flex size-6 items-center justify-center rounded-full text-xs',
          topStyle ?? 'text-muted-foreground',
        )}
      >
        {rank}
      </span>
    </TableCell>
  );
}
