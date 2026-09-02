// [신설: 2026-09-02 16:00, 김병현 작성] 화면 제목 한 벌.
// 감추는 것: h1 레벨, 자간, 부제 줄바꿈/여백. 13개 화면이 전부 이 모양(제목+부제)을
// 반복하고 있어서 하나로 뽑았다 — 옛 .page-head/.page-title/.page-sub 대응(계획서 §5-1).
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  sub?: ReactNode;
}

export function PageHeader({ title, sub }: PageHeaderProps) {
  return (
    <div className="mb-5">
      {/* [변경: 2026-09-02 15:50, 김병현 수정] 중계 그래픽 리디자인(broadcast-redesign) Phase D —
          26px/650(옛) → 24px/700(Phase 4a) → 30px/800(지금). 페이지 제목이 카드 제목·본문과
          한눈에 구분되도록 위계를 한 단 더 올렸다(계획서 "타이포 위계 강화"). 자간은 그대로. */}
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      {sub && <p className="mt-1.5 text-muted-foreground">{sub}</p>}
    </div>
  );
}
