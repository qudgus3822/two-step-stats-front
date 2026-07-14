import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../theme/ThemeContext';
import { ChartTooltip } from './ChartTooltip';

// 가로 막대 순위 차트. 리더보드·스탯코드 히스토그램처럼 "누가/무엇이 큰가"에 쓴다.
// dataviz 기준: 하나의 크기(양) 지표 = 시퀀셜 단일 블루, 둥근 오른쪽 끝, 희미한 그리드,
// 값은 막대 끝에 직접 라벨로.

export interface BarDatum {
  label: string; // 세로축 라벨(선수명/코드)
  value: number; // 막대 길이
  highlight?: boolean; // 강조할 항목(예: 지금 보는 선수)
}

export function BarRanking({
  data,
  color,
  format,
  labelWidth = 100,
}: {
  data: BarDatum[];
  color?: string; // 막대 색(기본 시퀀셜 블루)
  format?: (v: number) => string; // 값 표기 방식
  labelWidth?: number; // 라벨(세로축) 폭
}) {
  const { tokens } = useTheme();
  const barColor = color ?? tokens.sequential;
  const fmt = format ?? ((v: number) => String(v));
  const rowHeight = 32;
  const height = Math.max(120, data.length * rowHeight + 16);

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 48, bottom: 4, left: 4 }}
          barCategoryGap={6}
        >
          {/* 세로 눈금선만 희미하게, 가로선은 지워 잡음을 줄인다 */}
          <CartesianGrid horizontal={false} stroke={tokens.grid} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={labelWidth}
            tickLine={false}
            axisLine={false}
            tick={{ fill: tokens.textSecondary, fontSize: 13 }}
          />
          <Tooltip
            cursor={{ fill: tokens.grid, opacity: 0.4 }}
            content={<ChartTooltip format={fmt} />}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.highlight ? tokens.series[7] : barColor} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: number) => fmt(v)}
              fill={tokens.textSecondary}
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
