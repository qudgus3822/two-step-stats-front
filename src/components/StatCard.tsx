// [변경: 2026-09-02 15:35, 김병현 수정] 내부를 shadcn Card 기반으로 교체. props 시그니처 그대로.
import { Card } from './ui/card';

// 큰 숫자 하나를 강조해서 보여주는 타일 (요약 지표용).
// dataviz 기준: 값 하나가 헤드라인이면 차트보다 "큰 숫자"가 더 잘 읽힌다.

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string; // 위 라벨(예: "총 경기")
  value: string | number; // 큰 숫자
  hint?: string; // 아래 작은 설명(선택)
  accent?: string; // 왼쪽 강조 바 색(선택) — 없으면 기본 브랜드색(--primary)
}) {
  return (
    <Card
      className="gap-1 border-l-4 border-l-primary px-4 py-3.5"
      style={accent ? { borderLeftColor: accent } : undefined}
    >
      <div className="text-[13px] font-medium text-secondary-foreground">{label}</div>
      <div className="text-[28px] font-bold tracking-tight">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}
