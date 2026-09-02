import { Link } from 'react-router-dom';
import type { PlayerLine } from '../api/types';
// [변경: 2026-07-15 13:01, 김병현 수정] EFF(효율수치)를 이 표에 컬럼으로 끼움 — efficiency 헬퍼 재사용.
import { efficiency } from '../lib/format';
import { TableScroller } from './TableScroller';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

// 한 팀의 선수별 박스스코어 표. 경기 상세에서 팀마다 하나씩 그린다.
// 숫자는 세로로 줄 맞추려고 tabular-nums 를 쓴다(표에서만).
// [변경: 2026-07-15 13:01, 김병현 수정] 득점 옆에 "효율" 컬럼 추가 — 이 경기에서 그 선수의 EFF(=efficiency(선수 박스)).
// 한 경기 값이라 정수(소수 없음). 대시보드·경기상세 박스스코어에 함께 뜬다.

// 성공-시도를 "m/a" 로 합쳐 표기(자리 절약). 시도 0이면 "0/0".
const ma = (m: number, a: number) => `${m}/${a}`;
const pctText = (p: number | null) => (p == null ? '—' : `${p}%`);

// [변경: 2026-09-02 16:20, 김병현 수정] .table-wrap → TableScroller, <table> → shadcn Table
// (계획서 §7 Phase 3c). 스크롤 힌트(페이드)·키보드 스크롤이 이제 진짜로 동작한다.
export function BoxScoreTable({ players }: { players: PlayerLine[] }) {
  return (
    <TableScroller label="선수별 박스스코어">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-left">선수</TableHead>
            <TableHead className="text-right">득점</TableHead>
            {/* [변경: 2026-07-15 13:01, 김병현 수정] 효율(EFF) 컬럼 — 득점 옆에. */}
            <TableHead className="text-right">효율</TableHead>
            <TableHead className="text-right">리바운드</TableHead>
            <TableHead className="text-right">어시스트</TableHead>
            <TableHead className="text-right">스틸</TableHead>
            <TableHead className="text-right">블락</TableHead>
            <TableHead className="text-right">턴오버</TableHead>
            <TableHead className="text-right">야투</TableHead>
            <TableHead className="text-right">3점</TableHead>
            <TableHead className="text-right">자유투</TableHead>
            <TableHead className="text-right">야투%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((p) => (
            <TableRow key={p.player}>
              <TableCell className="text-left">
                <Link
                  className="font-medium text-primary hover:underline"
                  to={`/players/${encodeURIComponent(p.player)}`}
                >
                  {p.player}
                </Link>
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{p.pts}</TableCell>
              {/* [변경: 2026-07-15 13:01, 김병현 수정] 이 경기 EFF = efficiency(선수 박스). PlayerLine 이 BoxScore 를 상속해 그대로 넘김. */}
              <TableCell className="text-right font-semibold tabular-nums">
                {efficiency(p)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{p.reb}</TableCell>
              <TableCell className="text-right tabular-nums">{p.ast}</TableCell>
              <TableCell className="text-right tabular-nums">{p.stl}</TableCell>
              <TableCell className="text-right tabular-nums">{p.blk}</TableCell>
              <TableCell className="text-right tabular-nums">{p.tov}</TableCell>
              <TableCell className="text-right tabular-nums">{ma(p.fgm, p.fga)}</TableCell>
              <TableCell className="text-right tabular-nums">{ma(p.fg3m, p.fg3a)}</TableCell>
              <TableCell className="text-right tabular-nums">{ma(p.ftm, p.fta)}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {pctText(p.fgPct)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableScroller>
  );
}
