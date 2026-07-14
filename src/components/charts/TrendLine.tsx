import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../theme/ThemeContext';
import { ChartTooltip } from './ChartTooltip';

// 시간(경기) 흐름에 따른 값 변화를 보여주는 라인차트. 선수 상세의 "경기별 득점 추이"용.
// 단일 시리즈라 범례는 없고(제목이 시리즈를 대신함), 점 지름 ~10px, 십자선 툴팁.

export interface TrendPoint {
  label: string; // x축 라벨(예: "1주 2경기")
  value: number; // y값(득점 등)
  [extra: string]: string | number | null; // 툴팁에 더 보여줄 원본 필드(상대/스코어/결과)
}

export function TrendLine({
  data,
  seriesName,
  format,
  extraKeys,
  height = 260,
}: {
  data: TrendPoint[];
  seriesName: string; // 시리즈 이름(툴팁에 표시)
  format?: (v: number) => string;
  extraKeys?: { key: string; label: string }[];
  height?: number;
}) {
  const { tokens } = useTheme();
  const fmt = format ?? ((v: number) => String(v));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
          {/* 가로 기준선만 희미하게 */}
          <CartesianGrid vertical={false} stroke={tokens.grid} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: tokens.baseline }}
            tick={{ fill: tokens.muted, fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: tokens.muted, fontSize: 12 }}
            width={44}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: tokens.baseline, strokeWidth: 1 }}
            content={<ChartTooltip format={fmt} extraKeys={extraKeys} />}
          />
          <Line
            type="monotone"
            dataKey="value"
            name={seriesName}
            stroke={tokens.sequential}
            strokeWidth={2}
            dot={{ r: 4, fill: tokens.surface, stroke: tokens.sequential, strokeWidth: 2 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
