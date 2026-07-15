// 백엔드(two-step-stats-api) 응답 모양을 그대로 옮긴 타입들.
// 원본: api/src/stats/types.ts + aggregate.ts. API가 바뀌면 여기도 맞춰야 한다.

// 원시 카운트만 담는 박스스코어(누적 스탯)
export interface BoxScore {
  pts: number; // 득점
  fgm: number; // 필드골 성공(2+3점)
  fga: number; // 필드골 시도
  fg2m: number; // 2점 성공
  fg2a: number; // 2점 시도
  fg3m: number; // 3점 성공
  fg3a: number; // 3점 시도
  ftm: number; // 자유투 성공
  fta: number; // 자유투 시도
  andOne: number; // 앤드원 횟수
  oreb: number; // 공격 리바운드
  dreb: number; // 수비 리바운드
  reb: number; // 총 리바운드
  ast: number; // 어시스트
  stl: number; // 스틸
  blk: number; // 블락
  tov: number; // 턴오버
}

// 박스스코어 + 성공률(%). 시도 0이면 null.
export interface BoxScoreView extends BoxScore {
  fgPct: number | null;
  fg2Pct: number | null;
  fg3Pct: number | null;
  ftPct: number | null;
}

// 한 선수의 스탯 라인(박스스코어 + 누구/어느 팀)
export interface PlayerLine extends BoxScoreView {
  player: string;
  team: string;
}

export interface TeamScore {
  team: string;
  score: number;
}

// GET /summary
export interface Summary {
  seasons: number;
  games: number;
  players: number;
  events: number;
  byStat: Record<string, number>; // 스탯 코드별 등장 횟수
}

// GET /games — competition 필드는 표시 라벨(=Competition.label) 문자열이다.
export interface GameSummary {
  id: string;
  competition: string;
  week: number;
  game: number;
  teams: TeamScore[];
  winner: string | null; // 무승부면 null
  events: number;
}

// GET /games/:id — competition 필드는 표시 라벨(=Competition.label) 문자열이다.
export interface GameBox {
  id: string;
  competition: string;
  week: number;
  game: number;
  winner: string | null;
  teams: {
    team: string;
    score: number;
    players: PlayerLine[];
  }[];
}

// GET /players
export interface PlayerListItem {
  player: string;
  teams: string[];
  games: number;
  pts: number;
}

export type GameResult = 'W' | 'L' | 'D';

// GET /players/:name 안의 경기별 라인 — competition 필드는 표시 라벨 문자열이다.
export interface PlayerGameLine extends PlayerLine {
  id: string;
  competition: string;
  week: number;
  game: number;
  opponent: string | null;
  teamScore: number;
  opponentScore: number | null;
  result: GameResult;
}

// GET /players/:name
export interface PlayerDetail {
  player: string;
  totals: BoxScoreView;
  games: PlayerGameLine[];
}

// 리더보드에서 정렬 가능한 지표 (백엔드 LEADERBOARD_METRICS 와 동일)
export const LEADERBOARD_METRICS = [
  'pts',
  'reb',
  'oreb',
  'dreb',
  'ast',
  'stl',
  'blk',
  'tov',
  'fgm',
  'fg2m',
  'fg3m',
  'ftm',
  'andOne',
] as const;
export type LeaderboardMetric = (typeof LEADERBOARD_METRICS)[number];

// GET /leaderboard
export interface LeaderboardRow {
  rank: number;
  player: string;
  games: number;
  total: number;
  perGame: number;
}

// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — 대회를 "진짜 행"(Competition)으로 승격.
// 원본: api/src/stats/competition.service.ts(CompetitionRow) + stats.controller.ts(upload/competitions)

// GET /competitions — DB에서 관리하는 '등록된 대회'. (연도, 시즌번호(선택), 대회명)으로 관리한다.
export interface Competition {
  id: number;
  year: number; // 연도 (예: 2026)
  seasonNo: number | null; // 시즌번호(선택). 지정 안 하면 null.
  name: string; // 대회명 (예: 나이배)
  label: string; // 표시 라벨(예: "2026 시즌3 · 나이배" / "2026 나이배"). 업로드/집계에서 쓰는 값.
  createdAt: string; // 등록 시각(ISO 문자열)
}

// 파싱 중 발견한 경고 한 건 (미등록 스텟 코드 등). 기록지 오타 조기 발견용.
export interface ParseWarning {
  row: number; // 엑셀 기준 행 번호(1-based)
  player: string; // 그 행의 선수
  code: string; // 문제의 스텟 코드
  message: string; // 사람이 읽는 설명
}

// POST /upload 응답: 엑셀 파싱 → 대회 upsert → DB 적재 결과
export interface UploadResult {
  ok: boolean;
  competitionId: number; // 적재된 대회의 id
  competition: string; // 적재된 대회의 표시 라벨(=label)
  sheet: string; // 서버가 읽은 시트 이름(보통 Rawdata)
  mode: 'replace' | 'append'; // 교체 적재 / 증분 추가
  imported: number; // 적재된 이벤트(스탯) 행 수
  unknownCodes: string[]; // 사전에 없는 스텟 코드 목록(오타 의심)
  warnings: ParseWarning[]; // 행 단위 경고 목록
}

// [변경: 2026-07-15 14:10, 김병현 수정] 업로드 중복 경기 409 계약(서버 types.ts 미러).
export interface GameConflict {
  week: number;
  game: number;
  existingCount: number;
}
export interface UploadConflictBody {
  conflict: true;
  competitionId: number;
  competition: string;
  games: GameConflict[];
  message: string;
}
