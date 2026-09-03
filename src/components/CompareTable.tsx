// [신설: 2026-07-27 16:20, 김병현 작성]
import type { ComparisonRow } from '../lib/comparison';
import { cn } from '../lib/utils';
import { TableScroller } from './TableScroller';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

// 두 선수를 한 줄씩 마주 보게 놓는 표. [왼쪽 값] [지표] [오른쪽 값].
// 이 컴포넌트는 계산을 하지 않는다 — 무엇을 강조할지는 rows.better 가 이미 정해서 온다.
// 지표 이름·포맷·승자 판정은 전부 lib/comparison.ts 의 몫이다(여긴 그리기만 한다).
//
// [변경: 2026-09-02 16:20, 김병현 수정] .table-wrap → TableScroller, <table> → shadcn Table
// (계획서 §7 Phase 3c). 좌우 대조 정렬(가운데 지표 칸을 향해 마주보기)은 옛 CSS 그대로
// text-right/text-left 로 재현. is-better 강조는 --series-1/2 → --chart-1/2 로 이관.
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
    <TableScroller label={`${leftName} · ${rightName} 비교`}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">
              <span
                className="mr-1.5 inline-block size-3 rounded-[3px] bg-chart-1 align-middle"
                aria-hidden="true"
              />
              {leftName}
            </TableHead>
            <TableHead className="text-center text-muted-foreground">지표</TableHead>
            <TableHead className="text-left">
              {rightName}
              <span
                className="ml-1.5 inline-block size-3 rounded-[3px] bg-chart-2 align-middle"
                aria-hidden="true"
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.label}>
              <TableCell
                className={cn(
                  'text-right font-semibold tabular-nums',
                  r.better === 'left' && 'font-extrabold text-chart-1',
                )}
              >
                {r.left}
                {/* 강조 이유를 색만으로 알리지 않게 스크린리더용 숨김 텍스트를 붙인다. */}
                {r.better === 'left' && <span className="sr-only">더 높음</span>}
                {r.leftHint && (
                  <span className="block text-xs text-muted-foreground">{r.leftHint}</span>
                )}
              </TableCell>
              {/* 행 머리글 — 화면에선 가운데 칸, 스크린리더에겐 "이 행이 무슨 지표인지". */}
              <TableHead scope="row" className="text-center text-[12.5px] text-muted-foreground">
                {r.label}
              </TableHead>
              <TableCell
                className={cn(
                  'text-left font-semibold tabular-nums',
                  r.better === 'right' && 'font-extrabold text-chart-2',
                )}
              >
                {r.right}
                {r.better === 'right' && <span className="sr-only">더 높음</span>}
                {r.rightHint && (
                  <span className="block text-xs text-muted-foreground">{r.rightHint}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableScroller>
  );
}
