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
  accent?: string; // 왼쪽 강조 바 색(선택)
}) {
  return (
    <div className="stat-card" style={accent ? { borderLeftColor: accent } : undefined}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
