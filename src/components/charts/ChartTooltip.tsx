import { useTheme } from '../../theme/ThemeContext';

// Recharts 차트 위에 뜨는 말풍선(툴팁). 기본 툴팁은 흰 배경이라 다크모드에서
// 튀어서, 우리 색 토큰으로 다시 그린다. Recharts 가 active/payload/label 을 넣어준다.

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

interface ExtraKey {
  key: string; // payload 에서 꺼낼 필드
  label: string; // 툴팁에 보일 이름
}

export function ChartTooltip({
  active,
  payload,
  label,
  format,
  extraKeys,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  format?: (value: number) => string; // 숫자 값 표기 방식
  extraKeys?: ExtraKey[]; // 원본 데이터에서 더 보여줄 항목들
}) {
  const { tokens } = useTheme();
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0];
  const formatValue = (v: number | string | undefined) =>
    typeof v === 'number' && format ? format(v) : String(v ?? '');

  return (
    <div
      style={{
        background: tokens.surface,
        border: `1px solid ${tokens.baseline}`,
        borderRadius: 8,
        padding: '8px 10px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        fontSize: 13,
        color: tokens.textPrimary,
        minWidth: 120,
      }}
    >
      {label != null && (
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{String(label)}</div>
      )}
      {payload.map((entry, i) => (
        <div
          key={i}
          style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.7 }}
        >
          {entry.color && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: entry.color,
                flex: '0 0 auto',
              }}
            />
          )}
          <span style={{ color: tokens.textSecondary }}>{entry.name}</span>
          <span style={{ marginLeft: 'auto', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {formatValue(entry.value)}
          </span>
        </div>
      ))}
      {extraKeys?.map(({ key, label: name }) => {
        const value = row.payload?.[key];
        if (value == null || value === '') return null;
        return (
          <div
            key={key}
            style={{ display: 'flex', gap: 10, lineHeight: 1.7, color: tokens.textSecondary }}
          >
            <span>{name}</span>
            <span style={{ marginLeft: 'auto', color: tokens.textPrimary }}>{String(value)}</span>
          </div>
        );
      })}
    </div>
  );
}
