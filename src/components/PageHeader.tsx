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
      {/* 26px/650 → 24px/700(shadcn 스케일)로 승격, 자간은 유지(계획서 §D11) */}
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {sub && <p className="mt-1.5 text-muted-foreground">{sub}</p>}
    </div>
  );
}
