// [신설: 2026-07-27 15:55, 김병현 작성]
import type { PlayerDetail } from '../api/types';
import type { TrendPoint, TrendSeries } from '../components/charts/TrendLine';
import { formatAvg, formatPct, gameLabel } from './format';
import type { PlayerSummary, ShotRate } from './playerSummary';

// 두 선수를 "나란히 놓고 비교하는 규칙"을 한 곳에 모은 모듈.
//
// 화면(CompareTable)은 지표가 뭔지·누가 더 나은지 모른다. 여기서 정한 행 목록만 그린다.
// 숨기는 것: 지표 목록과 한국어 라벨, 표시 포맷(소수1자리 / % / '—'),
// 승자 판정 규칙(높을수록 좋음, 동률·판정불가는 강조 없음), 추이 차트의 x축 정렬·결측 처리.
export interface ComparisonRow {
  label: string; // 지표 이름(가운데 칸)
  left: string; // 왼쪽 선수 표시값
  right: string;
  leftHint?: string; // 값 아래 작은 글씨(누적/시도 등)
  rightHint?: string;
  better: 'left' | 'right' | null; // 강조할 쪽. 동률/판정불가면 null
}

// 큰 쪽이 이긴다. 같거나 한쪽이 null(시도 0 등)이면 강조하지 않는다.
function higherWins(a: number | null, b: number | null): 'left' | 'right' | null {
  if (a == null || b == null || a === b) return null;
  return a > b ? 'left' : 'right';
}

// 요약 스탯 5행 — 출전(강조 없음) + 경기당 득점/리바운드/어시스트/효율(hint=누적).
export function buildSummaryRows(left: PlayerSummary, right: PlayerSummary): ComparisonRow[] {
  return [
    {
      label: '출전',
      left: String(left.games),
      right: String(right.games),
      better: null, // 많이 뛴 게 더 잘한 건 아니므로 항상 강조 없음
    },
    {
      label: '경기당 득점',
      left: formatAvg(left.perGame.pts),
      leftHint: `누적 ${left.totals.pts}`,
      right: formatAvg(right.perGame.pts),
      rightHint: `누적 ${right.totals.pts}`,
      better: higherWins(left.perGame.pts, right.perGame.pts),
    },
    {
      label: '경기당 리바운드',
      left: formatAvg(left.perGame.reb),
      leftHint: `누적 ${left.totals.reb}`,
      right: formatAvg(right.perGame.reb),
      rightHint: `누적 ${right.totals.reb}`,
      better: higherWins(left.perGame.reb, right.perGame.reb),
    },
    {
      label: '경기당 어시스트',
      left: formatAvg(left.perGame.ast),
      leftHint: `누적 ${left.totals.ast}`,
      right: formatAvg(right.perGame.ast),
      rightHint: `누적 ${right.totals.ast}`,
      better: higherWins(left.perGame.ast, right.perGame.ast),
    },
    {
      label: '경기당 효율',
      left: formatAvg(left.perGame.eff),
      leftHint: `누적 ${left.totals.eff}`,
      right: formatAvg(right.perGame.eff),
      rightHint: `누적 ${right.totals.eff}`,
      better: higherWins(left.perGame.eff, right.perGame.eff),
    },
  ];
}

// 슈팅 성공률 한 행. 시도 0(pct null)이면 값은 '—', hint는 makes/atts.
function shootingRow(label: string, left: ShotRate, right: ShotRate): ComparisonRow {
  return {
    label,
    left: left.pct == null ? '—' : formatPct(left.pct),
    leftHint: `${left.makes}/${left.atts}`,
    right: right.pct == null ? '—' : formatPct(right.pct),
    rightHint: `${right.makes}/${right.atts}`,
    better: higherWins(left.pct, right.pct),
  };
}

// 슈팅 성공률 4행 — 필드골/2점/3점/자유투.
export function buildShootingRows(left: PlayerSummary, right: PlayerSummary): ComparisonRow[] {
  return [
    shootingRow('필드골', left.shooting.fg, right.shooting.fg),
    shootingRow('2점', left.shooting.fg2, right.shooting.fg2),
    shootingRow('3점', left.shooting.fg3, right.shooting.fg3),
    shootingRow('자유투', left.shooting.ft, right.shooting.ft),
  ];
}

export interface ComparisonTrend {
  points: TrendPoint[];
  series: TrendSeries[];
}

// 한 경기의 두 선수 득점을 모으는 중간 행.
interface TrendRow {
  competition: string;
  week: number;
  game: number;
  left: number | null;
  right: number | null;
}

// 경기별 득점 추이 — 두 선수 경기의 합집합을 x축으로 겹쳐 그린다.
// 1) gameId → 행으로 모은다(같은 경기면 한 행에 두 값). 2) 대회 → 주차 → 경기 순 정렬
// (백엔드 sortByGame 과 같은 순서). 3) 대회가 2개 이상 섞이면 라벨 앞에 대회명을 붙인다.
// 4) 안 뛴 쪽은 null(0 이 아니다 — 0으로 채우면 "0점 기록"이라고 거짓말하게 된다).
export function buildComparisonTrend(left: PlayerDetail, right: PlayerDetail): ComparisonTrend {
  const rows = new Map<string, TrendRow>();

  const collect = (games: PlayerDetail['games'], side: 'left' | 'right') => {
    for (const g of games) {
      let row = rows.get(g.id);
      if (!row) {
        row = { competition: g.competition, week: g.week, game: g.game, left: null, right: null };
        rows.set(g.id, row);
      }
      row[side] = g.pts;
    }
  };
  collect(left.games, 'left');
  collect(right.games, 'right');

  const sorted = [...rows.values()].sort(
    (a, b) => a.competition.localeCompare(b.competition) || a.week - b.week || a.game - b.game,
  );

  const multiCompetition = new Set(sorted.map((r) => r.competition)).size >= 2;

  const points: TrendPoint[] = sorted.map((r) => ({
    label: multiCompetition
      ? `${r.competition} ${gameLabel(r.week, r.game)}`
      : gameLabel(r.week, r.game),
    left: r.left,
    right: r.right,
  }));

  return {
    points,
    series: [
      { key: 'left', name: left.player },
      { key: 'right', name: right.player },
    ],
  };
}
