import type { PlayerWins } from '../api/types';
// [변경: 2026-09-03 09:00, 김병현 수정] PlayerLink 단독 → PlayerCell(아바타+링크)로 교체
// (계획서 §Phase 2-2 — 시각 정체성 개편).
import { PlayerCell } from './PlayerCell';
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

// [신설: 2026-09-02 김병현 작성] 통산 우승 순위표 — **선수 전원**이 들어온다.
//
// 이 숫자는 어디에도 저장돼 있지 않다 — 우승 줄을 그때그때 센 값이다.
// 그래서 "왜 5회지?"를 되물을 수 없으면 안 된다. titles(어느 대회들에서 우승했나)를
// 같이 보여주는 이유가 그거다. 숫자와 근거가 늘 한 줄에 같이 있다.
//
// [변경: 2026-09-02 21:10, 김병현 수정] 우승 0회 선수를 따로 뽑아 두던 표
// ('아직 우승이 없어요 ㅜ.ㅜ')를 없애고 이 표 하나에 다 넣는다.
// 표가 둘이면 같은 질문("이 사람 몇 번 우승했지?")에 볼 곳이 두 군데가 된다.
// 하나로 합치면 위에서부터 쭉 읽으면 끝이고, 0회도 명단 안에서 제자리를 갖는다.
//
// 순서는 서버가 준 그대로 쓴다(우승 많은 순 → 이름순). 0회 선수는 자연히 뒤에 모인다.
// 여기서 다시 정렬하지 않는 이유: 정렬 규칙이 서버와 화면 두 곳으로 갈라지면
// 나중에 한쪽만 고쳐져 서로 어긋난다.
//
// [변경: 2026-09-02 16:20, 김병현 수정] .table-wrap → TableScroller, <table> → shadcn Table
// (계획서 §7 Phase 3c). caption sr-only 유지.
export function PlayerWinsTable({ players }: { players: PlayerWins[] }) {
  if (players.length === 0) {
    return (
      <Empty>
        <strong>아직 선수 기록이 없어요</strong>
        <span>경기 기록이 올라오면 여기 쌓여요.</span>
      </Empty>
    );
  }

  return (
    <TableScroller label="통산 우승 순위">
      <Table>
        <TableCaption className="sr-only">통산 우승 순위 {players.length}명</TableCaption>
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
          {players.map((p, i) => (
            <TableRow key={p.player}>
              {/* 서버가 이미 '우승 많은 순'으로 정렬해 줬다 → 순서 그대로가 곧 순위다.
                  동률에 같은 번호를 붙이는 진짜 등수 계산은 하지 않는다(순위표라기보단 명단이다). */}
              <TableCell className="text-right">{i + 1}</TableCell>
              <TableCell className="text-left font-semibold">
                <PlayerCell name={p.player} />
              </TableCell>
              {/* 우승 0회는 0 을 흐리게 — 숫자를 지우진 않는다(0 도 사실이다).
                  다만 굵게 두면 우승자 줄과 무게가 같아 보여서 순위표가 안 읽힌다. */}
              <TableCell
                className={
                  p.wins > 0
                    ? 'text-right font-semibold tabular-nums'
                    : 'text-right tabular-nums text-muted-foreground'
                }
              >
                {p.wins}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {p.seasons}
              </TableCell>
              {/* 승률 = 우승 ÷ 뛴 시즌. null 은 '못 잼'이라 0% 로 뭉개지 않고 '-' 로 둔다. */}
              <TableCell className="text-right tabular-nums">
                {p.winRate != null ? `${p.winRate}%` : '-'}
              </TableCell>
              {/* 우승이 없으면 적을 대회도 없다. 빈칸으로 두면 '데이터가 빠졌나?'로 읽히니 '-' 로. */}
              <TableCell className="text-muted-foreground">
                {p.titles.length > 0 ? p.titles.join(', ') : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableScroller>
  );
}
