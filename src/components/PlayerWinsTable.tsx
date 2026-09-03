import type { PlayerWins } from '../api/types';
// [변경: 2026-09-03 09:00, 김병현 수정] PlayerLink 단독 → PlayerCell(아바타+링크)로 교체
// (계획서 §Phase 2-2 — 시각 정체성 개편).
import { PlayerCell } from './PlayerCell';
// [신설: 2026-09-03 09:00, 김병현 작성] 1~3위 강조(계획서 §Phase 3 — 리더보드와 같은 규칙 재사용).
import { RankCell } from './RankBadge';
// [신설: 2026-09-03 09:00, 김병현 작성] "· -" 데이터 표시 버그 수정(계획서 §Phase 3, AC-6).
import { cleanCompetitionLabel } from '../lib/format';
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
                  동률에 같은 번호를 붙이는 진짜 등수 계산은 하지 않는다(순위표라기보단 명단이다).
                  [변경: 2026-09-03 09:00, 김병현 수정] 1~3위 강조(계획서 §Phase 3 — 리더보드와
                  같은 RankCell 재사용). */}
              <RankCell rank={i + 1} />
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
              <TableCell className="whitespace-normal text-muted-foreground">
                <TitlesCell titles={p.titles} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableScroller>
  );
}

// [신설: 2026-09-03 09:00, 김병현 작성] "우승한 대회" 열 — 표가 아니라 이 칸 하나만 접는다.
//
// 왜 필요한가: 다승자는 대회를 10개 넘게 들고 있어서, 다 펼쳐 적으면 이 칸 하나가 표 전체
// 너비를 끌고 늘어난다(계획서 §Phase 3 진단). 최근 3개만 항상 보여주고, 나머지는 네이티브
// <details> 로 접는다 — React state 없이 브라우저가 여닫음을 대신 해 준다(이 표는 effect/state
// 없이 순수 렌더만 하는 원칙을 그대로 지킨다).
//
// [변경: 2026-09-03] cleanCompetitionLabel 로 "· -" 꼬리를 지운다 — 서버 값(competitionLabel)이
// 시즌은 있고 대회명이 '-'뿐인 대회에서 이 꼬리를 그대로 붙여 보낸다(AC-6).
const VISIBLE_TITLE_COUNT = 3;

function TitlesCell({ titles }: { titles: string[] }) {
  if (titles.length === 0) return <>-</>;

  const cleaned = titles.map(cleanCompetitionLabel);
  const visible = cleaned.slice(0, VISIBLE_TITLE_COUNT);
  const rest = cleaned.slice(VISIBLE_TITLE_COUNT);

  return (
    <span>
      {visible.join(', ')}
      {rest.length > 0 && (
        <details className="inline">
          <summary className="ml-1 inline cursor-pointer list-none text-primary underline-offset-2 hover:underline marker:content-['']">
            +{rest.length}개 더
          </summary>
          {', '}
          {rest.join(', ')}
        </details>
      )}
    </span>
  );
}
