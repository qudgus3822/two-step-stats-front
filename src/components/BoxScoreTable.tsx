import { Link } from 'react-router-dom';
import type { PlayerLine } from '../api/types';
// [변경: 2026-07-15 13:01, 김병현 수정] EFF(효율수치)를 이 표에 컬럼으로 끼움 — efficiency 헬퍼 재사용.
// [변경: 2026-09-02 15:20, 김병현 수정] pctText 로컬 헬퍼 → formatPctOrDash(lib/format) 재사용
// (GameStatsPanel 의 팀 요약 표와 똑같은 헬퍼를 각자 들고 있던 중복 제거).
import { efficiency, formatPctOrDash } from '../lib/format';
// [신설: 2026-09-02 15:20, 김병현 작성] 팀 안 최고 득점자 찾기 — 그 줄만 강조한다.
import { topScorerName } from '../lib/gameBoxSummary';
// [신설: 2026-09-03 09:00, 김병현 작성] 박스스코어 행에도 아바타(계획서 §Phase 2-2).
import { PlayerAvatar } from './PlayerAvatar';
import { TableScroller } from './TableScroller';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { cn } from '../lib/utils';

// 한 팀의 선수별 박스스코어 표. 경기 상세·대시보드에서 팀마다 하나씩 그린다.
// 숫자는 세로로 줄 맞추려고 tabular-nums 를 쓴다(표에서만).
// [변경: 2026-07-15 13:01, 김병현 수정] 득점 옆에 "효율" 컬럼 추가 — 이 경기에서 그 선수의 EFF(=efficiency(선수 박스)).
// 한 경기 값이라 정수(소수 없음). 대시보드·경기상세 박스스코어에 함께 뜬다.

// 성공-시도를 "m/a" 로 합쳐 표기(자리 절약). 시도 0이면 "0/0".
const ma = (m: number, a: number) => `${m}/${a}`;

// [변경: 2026-09-02 16:20, 김병현 수정] .table-wrap → TableScroller, <table> → shadcn Table
// (계획서 §7 Phase 3c). 스크롤 힌트(페이드)·키보드 스크롤이 이제 진짜로 동작한다.
// [변경: 2026-09-02 15:20, 김병현 수정] 중계 그래픽 리디자인(broadcast-redesign) Phase B —
// 은은한 줄무늬(zebra) + 팀 안 최고 득점자 강조 + 선택적 팀 컬러 헤더 밑줄을 추가했다.
interface BoxScoreTableProps {
  players: PlayerLine[];
  // [신설] 팀 컬러. 헤더 아래쪽에 은은한 선으로 얹어 이 표가 어느 팀 것인지 표 스스로 말하게
  // 한다(계획서 "팀 헤더에 팀 컬러 적용"). border-b 유틸리티 대신 box-shadow 로 그리는 이유:
  // ui/table.tsx 의 TableHeader 가 `[&_tr]:border-b`(자손 선택자)로 이미 테두리 폭을 정해 둬서,
  // tr 자신의 border-* 유틸리티로는 CSS 명시도 싸움에서 진다(계획서 §"shadcn 스타일 덮는 법"과
  // 같은 함정). box-shadow 는 border 와 겹치지 않는 별도 속성이라 그 싸움 자체가 없다.
  accentColor?: string;
}

export function BoxScoreTable({ players, accentColor }: BoxScoreTableProps) {
  // 이 표(한 팀) 안에서 득점 1위 선수 — 중계 화면처럼 시선이 갈 곳을 표가 먼저 알려준다.
  const topName = topScorerName(players);

  return (
    <TableScroller label="선수별 박스스코어">
      <Table>
        <TableHeader>
          <TableRow style={accentColor ? { boxShadow: `inset 0 -2px 0 0 ${accentColor}` } : undefined}>
            <TableHead className="text-left">선수</TableHead>
            {/* [변경: 2026-07-15 13:01, 김병현 수정] 효율(EFF) 컬럼 — 득점 옆에. */}
            <TableHead className="text-right">득점</TableHead>
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
          {players.map((p, i) => {
            const isTop = p.player === topName;
            return (
              // 은은한 줄무늬(짝수 행) + 최고 득점자 강조(둘이 겹치면 강조가 이긴다 — 뒤에 오는
              // 클래스가 twMerge 로 앞의 것을 이긴다. cn 안 순서가 그 우선순위 그대로다).
              <TableRow
                key={p.player}
                className={cn(i % 2 === 1 && 'bg-muted/30', isTop && 'bg-primary/10 hover:bg-primary/15')}
              >
                <TableCell className="text-left">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar name={p.player} />
                    <Link
                      className={cn('font-medium text-primary hover:underline', isTop && 'font-semibold')}
                      to={`/players/${encodeURIComponent(p.player)}`}
                    >
                      {p.player}
                    </Link>
                  </div>
                </TableCell>
                {/* [변경: 2026-07-15 13:01, 김병현 수정] 이 경기 EFF = efficiency(선수 박스). PlayerLine 이 BoxScore 를 상속해 그대로 넘김. */}
                <TableCell
                  className={cn('text-right tabular-nums', isTop ? 'font-bold' : 'font-semibold')}
                >
                  {p.pts}
                </TableCell>
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
                  {formatPctOrDash(p.fgPct)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableScroller>
  );
}
