import type { BoxScoreView } from '../api/types';

// 슈팅 성공률 4종(필드골/2점/3점/자유투)을 가로 막대 게이지로 보여준다.
// 값(%)이 없으면(시도 0) "—" 로 비워둔다. 성공/시도도 같이 적어 신뢰도를 알 수 있게.

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
    <div className="splits">
      {rows.map((r) => (
        <div className="split-row" key={r.label}>
          <span className="split-label">{r.label}</span>
          <div className="split-meter" role="img" aria-label={`${r.label} 성공률 ${r.pct ?? 0}%`}>
            <span className="split-fill" style={{ width: `${r.pct ?? 0}%` }} />
          </div>
          <span className="split-attempts">
            {r.makes}/{r.atts}
          </span>
          <span className="split-value">{r.pct == null ? '—' : `${r.pct}%`}</span>
        </div>
      ))}
    </div>
  );
}
