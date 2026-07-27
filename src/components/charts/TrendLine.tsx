import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../theme/ThemeContext';
import { seriesColor } from '../../theme/palette';
import { ChartTooltip } from './ChartTooltip';

// 시간(경기) 흐름에 따른 값 변화를 보여주는 라인차트. 선수 상세의 "경기별 득점 추이"용.
// 단일 시리즈라 범례는 없고(제목이 시리즈를 대신함), 점 지름 ~10px, 십자선 툴팁.
//
// [변경: 2026-07-27 16:05, 김병현 수정] "n개 시리즈" 하나로 일반화 — 비교 화면에서 두 선수 라인을
// 겹쳐 그리는 데 재사용한다. 단일/다중 두 갈래로 안 쪼갠다(옵션 폭발 예방). series.length > 1
// 일 때만 범례를 그려서, 기존 단일 시리즈 화면은 전과 픽셀 동일하게 유지한다.

// x축 한 칸. label 은 눈금, 나머지 키는 시리즈 값(안 뛴 경기는 null) 또는 툴팁용 원본 필드.
export interface TrendPoint {
  label: string; // x축 라벨(예: "1주 2경기")
  [seriesKey: string]: string | number | null;
}

// 라인 하나. color 를 안 주면 팔레트 순서(0=파랑, 1=아쿠아)로 자동 배정.
export interface TrendSeries {
  key: string; // TrendPoint 에서 이 라인이 읽을 필드명
  name: string; // 범례/툴팁에 보일 이름
  color?: string;
}

export function TrendLine({
  data,
  series,
  format,
  extraKeys,
  height = 260,
}: {
  data: TrendPoint[];
  series: TrendSeries[]; // 그릴 라인들(1개=기존 단일 시리즈 화면, 2개 이상=겹쳐 그리기)
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
          {series.map((s, i) => {
            const color = s.color ?? seriesColor(tokens, i);
            return (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 4, fill: tokens.surface, stroke: color, strokeWidth: 2 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
                connectNulls
              />
            );
          })}
          {series.length > 1 && (
            <Legend wrapperStyle={{ fontSize: 12, color: tokens.textSecondary }} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
