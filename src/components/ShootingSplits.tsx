import type { BoxScoreView } from '../api/types';
import { Progress } from './ui/progress';

// 슈팅 성공률 4종(필드골/2점/3점/자유투)을 가로 막대 게이지로 보여준다.
// 값(%)이 없으면(시도 0) "—" 로 비워둔다. 성공/시도도 같이 적어 신뢰도를 알 수 있게.
//
// [변경: 2026-09-02 16:20, 김병현 수정] 손으로 짠 막대(.split-meter/.split-fill) →
// shadcn Progress(계획서 §7 Phase 3c). role="img" + aria-label 은 유지 —
// 이 게이지는 "몇 % 성공"이라는 값 하나를 통째로 그림처럼 보여주는 용도라
// Radix 기본(role="progressbar", min/max 세분화)보다 이 편이 더 정확하다.
//
// ⚠ 마지막 칸(퍼센트 숫자)은 옛 CSS 에서 고정 46px 이었는데, Geist 폰트의 숫자 폭이
// 시스템 폰트보다 넓어서 "35.7%" 가 "35.7"/"%" 로 줄바꿈되는 게 실측으로 확인됐다
// (Tailwind 이전 작업이 만든 회귀 — 여기서 같이 고친다). minmax(3.5rem, auto) 로 바꿔
// 필요하면 칸이 늘어나게 하고, whitespace-nowrap 으로 이중으로 막는다.
interface SplitRow {
  label: string;
  pct: number | null;
  makes: number;
  atts: number;
}

export function ShootingSplits({ box }: { box: BoxScoreView }) {
  const rows: SplitRow[] = [
    { label: '필드골', pct: box.fgPct, makes: box.fgm, atts: box.fga },
    { label: '2점', pct: box.fg2Pct, makes: box.fg2m, atts: box.fg2a },
    { label: '3점', pct: box.fg3Pct, makes: box.fg3m, atts: box.fg3a },
    { label: '자유투', pct: box.ftPct, makes: box.ftm, atts: box.fta },
  ];

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div
          className="grid grid-cols-[52px_1fr_54px_minmax(3.5rem,auto)] items-center gap-2.5"
          key={r.label}
        >
          <span className="text-[13px] font-medium text-secondary-foreground">{r.label}</span>
          <Progress
            value={r.pct ?? 0}
            role="img"
            aria-label={`${r.label} 성공률 ${r.pct ?? 0}%`}
            className="h-2.5"
          />
          <span className="text-right text-[12.5px] tabular-nums text-muted-foreground">
            {r.makes}/{r.atts}
          </span>
          <span className="text-right font-semibold tabular-nums whitespace-nowrap">
            {r.pct == null ? '—' : `${r.pct}%`}
          </span>
        </div>
      ))}
    </div>
  );
}
