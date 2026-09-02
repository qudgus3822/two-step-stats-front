// [신설: 2026-09-02 16:00, 김병현 작성] 표를 카드 안에서 가로로 굴리는 **유일한** 상자.
//
// 옛 .table-wrap(overflow-x:auto) 을 대신하면서 네 가지를 더 한다:
//  1) 양 끝 페이드(scroll-fade-x) — "옆으로 더 있어요"가 눈에 보인다.
//     옛 화면은 표가 카드 오른쪽에서 뚝 잘려 밀 수 있다는 걸 아무도 몰랐다.
//  2) tabIndex=0 + role="region" + aria-label — 스크롤 상자는 키보드로도 굴릴 수 있어야 한다(WCAG 2.1.1).
//  3) stale 하나로 '흐림'과 'aria-busy'를 **둘 다** 책임진다.
//     호출부가 aria-busy 를 또 넘기지 않는다(옛 코드는 두 곳에서 짝으로 적고 있었다).
//  4) ⚠ 스크롤 주인이 여기 하나뿐이라는 게 전제다. shadcn Table 원본은 자기 안에
//     <div data-slot="table-container" class="overflow-x-auto"> 를 갖고 있어서 그대로 두면
//     안쪽이 스크롤을 먹고 위 1~2가 전부 죽는다 → ui/table.tsx 에서 그 div 를 제거했다.
//
// data-scroller 는 순전히 내부 식별용이다(§8-4 자동 검증이 "스크롤 상자가 몇 개인지" 셀 때 씀).
// 호출부는 몰라도 된다 — props 로 노출하지 않는다.
import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface TableScrollerProps {
  children: ReactNode;
  label: string; // 예: "선수별 박스스코어" — 랜드마크에 이름이 없으면 "영역"으로만 읽힌다
  stale?: boolean; // 새 데이터 기다리는 중 → 흐림 + aria-busy
  className?: string;
}

export function TableScroller({ children, label, stale, className }: TableScrollerProps) {
  return (
    <div
      data-scroller
      role="region"
      aria-label={label}
      aria-busy={stale ? true : undefined}
      tabIndex={0}
      className={cn(
        'scroll-fade-x overflow-x-auto rounded-lg',
        stale && 'opacity-55 transition-opacity',
        className,
      )}
    >
      {children}
    </div>
  );
}
