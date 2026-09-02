import type { PlayerWins } from '../api/types';
// [변경: 2026-09-02 김병현 수정] 표의 선수 이름은 이 저장소에선 전부 상세로 가는 링크다
// (마우스만 올려도 그 선수 상세를 미리 받는다).
import { PlayerLink } from './PlayerLink';
import { Empty } from './states';
import { TableScroller } from './TableScroller';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

// [신설: 2026-09-02 김병현 작성] 통산 우승 순위표 — **우승 경험이 있는 선수만** 들어온다.
//
// 이 숫자는 어디에도 저장돼 있지 않다 — 우승 줄을 그때그때 센 값이다.
// 그래서 "왜 5회지?"를 되물을 수 없으면 안 된다. titles(어느 대회들에서 우승했나)를
// 같이 보여주는 이유가 그거다. 숫자와 근거가 늘 한 줄에 같이 있다.
//
// 우승 0회 선수는 여기 안 온다 — 옆 표(WinlessPlayersTable)가 따로 맡는다.
// 가르는 일은 lib/championships.ts 의 splitByWins 가 한다(그 주석에 이유가 있다).
//
// [변경: 2026-09-02 16:20, 김병현 수정] .table-wrap → TableScroller, <table> → shadcn Table
// (계획서 §7 Phase 3c). caption sr-only 유지.
export function PlayerWinsTable({ winners }: { winners: PlayerWins[] }) {
  if (winners.length === 0) {
    return (
      <Empty>
        <strong>아직 등록된 우승이 없어요</strong>
        <span>운영자가 우승횟수 관리 화면에서 등록하면 여기 쌓여요.</span>
      </Empty>
    );
  }

  return (
    <TableScroller label="통산 우승 순위">
      <Table>
        <TableCaption className="sr-only">통산 우승 순위 {winners.length}명</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 text-right">#</TableHead>
            <TableHead className="text-left">선수</TableHead>
            <TableHead className="text-right">우승</TableHead>
            <TableHead className="text-right">뛴 시즌</TableHead>
            <TableHead className="text-right">승률</TableHead>
            <TableHead>우승한 대회</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {winners.map((p, i) => (
            <TableRow key={p.player}>
              {/* 서버가 이미 '우승 많은 순'으로 정렬해 줬다 → 순서 그대로가 곧 순위다.
                  동률에 같은 번호를 붙이는 진짜 등수 계산은 하지 않는다(순위표라기보단 명단이다). */}
              <TableCell className="text-right">{i + 1}</TableCell>
              <TableCell className="text-left font-semibold">
                <PlayerLink name={p.player} />
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{p.wins}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {p.seasons}
              </TableCell>
              {/* 승률 = 우승 ÷ 뛴 시즌. null 은 '못 잼'이라 0% 로 뭉개지 않고 '-' 로 둔다. */}
              <TableCell className="text-right tabular-nums">
                {p.winRate != null ? `${p.winRate}%` : '-'}
              </TableCell>
              <TableCell className="text-muted-foreground">{p.titles.join(', ')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableScroller>
  );
}
