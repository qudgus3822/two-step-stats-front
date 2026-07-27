// [신설: 2026-07-27 16:20, 김병현 작성]
import type { ComparisonRow } from '../lib/comparison';

// 두 선수를 한 줄씩 마주 보게 놓는 표. [왼쪽 값] [지표] [오른쪽 값].
// 이 컴포넌트는 계산을 하지 않는다 — 무엇을 강조할지는 rows.better 가 이미 정해서 온다.
// 지표 이름·포맷·승자 판정은 전부 lib/comparison.ts 의 몫이다(여긴 그리기만 한다).
export function CompareTable({
  leftName,
  rightName,
  rows,
}: {
  leftName: string;
  rightName: string;
  rows: ComparisonRow[];
}) {
  return (
    <div className="table-wrap">
      <table className="table compare-table">
        <thead>
          <tr>
            <th className="compare-side compare-side--left">
              <span className="team-swatch compare-swatch--left" aria-hidden="true" />
              {leftName}
            </th>
            <th className="compare-metric">지표</th>
            <th className="compare-side compare-side--right">
              <span className="team-swatch compare-swatch--right" aria-hidden="true" />
              {rightName}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td className={`num compare-cell${r.better === 'left' ? ' is-better is-left' : ''}`}>
                <span className="compare-value">{r.left}</span>
                {/* 강조 이유를 색만으로 알리지 않게 스크린리더용 숨김 텍스트를 붙인다. */}
                {r.better === 'left' && <span className="sr-only">더 높음</span>}
                {r.leftHint && <span className="compare-hint">{r.leftHint}</span>}
              </td>
              {/* 행 머리글 — 화면에선 가운데 칸, 스크린리더에겐 "이 행이 무슨 지표인지". */}
              <th scope="row" className="compare-metric">
                {r.label}
              </th>
              <td className={`num compare-cell${r.better === 'right' ? ' is-better is-right' : ''}`}>
                <span className="compare-value">{r.right}</span>
                {r.better === 'right' && <span className="sr-only">더 높음</span>}
                {r.rightHint && <span className="compare-hint">{r.rightHint}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
