import type { LeaderboardMetric } from '../api/types';

// 화면에 보이는 라벨/포맷 모음. 코드값을 사람이 읽는 한국어로 바꿔준다.

// 리더보드 지표 → 한국어 이름
export const METRIC_LABELS: Record<LeaderboardMetric, string> = {
  pts: '득점',
  reb: '리바운드',
  oreb: '공격 리바운드',
  dreb: '수비 리바운드',
  ast: '어시스트',
  stl: '스틸',
  blk: '블락',
  tov: '턴오버',
  fgm: '필드골 성공',
  fg2m: '2점 성공',
  fg3m: '3점 성공',
  ftm: '자유투 성공',
  andOne: '앤드원',
};

// 스탯 코드(엑셀 원본) → 한국어 이름. 히스토그램을 친절하게 보여주려고.
export const STAT_CODE_LABELS: Record<string, string> = {
  '1': '앤드원(+1)',
  '2': '2점 성공',
  '3': '3점 성공',
  '1F': '자유투1 성공',
  '2F': '자유투2 성공',
  '1FA': '자유투1 실패',
  '2FA': '자유투2 실패',
  '2A': '2점 실패',
  '3A': '3점 실패',
  A: '어시스트',
  S: '스틸',
  B: '블락',
  T: '턴오버',
  OR: '공격 리바운드',
  DR: '수비 리바운드',
};

export const statCodeLabel = (code: string): string => STAT_CODE_LABELS[code] ?? code;

// "3주 2경기" 같은 경기 라벨
export const gameLabel = (week: number, game: number): string => `${week}주 ${game}경기`;

// [변경: 2026-07-15 11:37, 김병현 수정] 경기당 평균(소수1자리) 계산 — 선수상세 카드가 프론트에서 직접 파생.
// 주의: 백엔드 aggregate.ts 의 perGameAvg 와 반올림 표현식을 반드시 같게 유지할 것(리더보드/상세 값이 갈리지 않게).
// (선언형은 달라도 됨: 여기 const 화살표 vs 백엔드 function. 같아야 하는 건 반올림 표현식.)
export const perGameAvg = (total: number, games: number): number =>
  games > 0 ? Math.round((total / games) * 10) / 10 : 0;

// [변경: 2026-07-15 11:37, 김병현 수정] 평균을 항상 소수1자리로 표시("12"가 아니라 "12.0" → 평균임이 드러남).
export const formatAvg = (n: number): string => n.toFixed(1);
