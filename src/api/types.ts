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
  // [변경: 2026-07-29 12:10, 김병현 수정] 이 경기가 앞 경기의 '연장'인지.
  // 목록엔 따로 한 줄로 보이지만, 평균 계산에선 앞 경기에 합쳐진다
  // (그래서 경기 목록 줄 수 > 리더보드의 경기 수 인 게 정상이다).
  overtime: boolean;
}

// GET /games/:id — competition 필드는 표시 라벨(=Competition.label) 문자열이다.
export interface GameBox {
  id: string;
  competition: string;
  week: number;
  game: number;
  winner: string | null;
  // [변경: 2026-07-29 12:10, 김병현 수정] 목록과 같은 연장 표시.
  overtime: boolean;
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
  // [변경: 2026-07-15 11:37, 김병현 수정] 경기당 득점(백엔드 listPlayers.ppg 미러).
  ppg: number;
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
// [변경: 2026-07-15 13:01, 김병현 수정] 13종(카운트) → 19종. EFF·성공률 4종·180클럽 추가(백엔드와 같은 순서).
export const LEADERBOARD_METRICS = [
  'pts',
  'eff',
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
  'fgPct',
  'fg2Pct',
  'fg3Pct',
  'ftPct',
  'club180',
] as const;
export type LeaderboardMetric = (typeof LEADERBOARD_METRICS)[number];

// GET /leaderboard
// [변경: 2026-07-15 13:01, 김병현 수정] 카운트 전용 → 3계열(카운트/비율/종합비율) 판별 유니온.
// 백엔드 aggregate.ts 의 LeaderboardRow/RowBody 미러. value = 정렬키 = 차트가 그리는 수.
interface LeaderboardRowBase {
  rank: number;
  player: string;
  games: number;
  value: number;
}
export type LeaderboardRow =
  | (LeaderboardRowBase & { kind: 'count'; total: number; perGame: number })
  | (LeaderboardRowBase & { kind: 'rate'; pct: number; makes: number; atts: number })
  | (LeaderboardRowBase & { kind: 'club180'; sum: number; fgPct: number; fg3Pct: number; ftPct: number });

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

// [신설: 2026-07-31 15:03, 김병현 작성] 한글로 친 코드를 자동 인식한 결과(서버 types.ts 의 HangulCodeFix 미러).
export interface HangulCodeFix {
  // [주의] 파일에 있던 글자 그대로가 아니라 '되돌리기에 넣은 값'이다(앞뒤 공백 제거 + 영문 대문자화).
  //   예) 파일 셀 '  2fㅁ  ' -> from '2Fㅁ'. 한글 부분은 파일과 글자 그대로 같다.
  from: string;
  to: string; // 되돌려 인식한 코드 (예: 2FA)
  count: number; // 그렇게 읽은 행 수
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
  // [신설: 2026-07-31 15:03, 김병현 작성] 한글로 친 코드를 되돌려 인식한 결과. 없으면 빈 배열.
  hangulCodes: HangulCodeFix[];
  warnings: ParseWarning[]; // 행 단위 경고 목록
}

// [변경: 2026-07-15 14:10, 김병현 수정] 업로드 중복 경기 409 계약(서버 types.ts 미러).
export interface GameConflict {
  week: number;
  game: number;
  existingCount: number;
}
// [신설: 2026-07-29 15:32, 김병현 작성] 처음 보는 선수 이름 한 명(서버 types.ts 의 NewPlayer 미러).
export interface NewPlayer {
  name: string; // 저장될 값 그대로(서버가 공백 제거해 정규화한 값)
  suggestions: string[]; // 비슷한 기존 이름(최대 3개). 없으면 빈 배열
}
export interface UploadConflictBody {
  conflict: true;
  competitionId: number;
  competition: string;
  games: GameConflict[];
  // [변경: 2026-07-29 15:32, 김병현 수정] ⚠ games 가 빈 배열인 409 가 생겼다(이름만 걸린 경우).
  newPlayers: NewPlayer[];
  message: string;
}

// [변경: 2026-07-27 16:14, 김병현 수정] 시너지 탭 — 백엔드 stats/synergy.ts 미러.
// 순서·이름을 백엔드와 똑같이 유지할 것(응답을 그대로 받아 쓰는 계약).
// ⚠ 백엔드와 똑같이 **한 줄**로. 줄바꿈하면 ASI 때문에 TS1434(컴파일 실패).
export const SYNERGY_METRICS = ['eff', 'pts', 'reb', 'ast', 'stl', 'blk', 'tov'] as const satisfies readonly LeaderboardMetric[];
export type SynergyMetric = (typeof SYNERGY_METRICS)[number];

// 동료 한 명 × 지표 하나의 함께/따로/차이. apart·delta 는 따로 뛴 경기가 0이면 null.
export interface SynergySplit {
  together: number;
  apart: number | null;
  delta: number | null;
}

// GET /synergy 의 표 한 줄 — 동료 한 명의 자격·경기 수·지표 7종 스플릿.
export interface SynergyRow {
  rank: number | null; // 자격 행에만 1,2,3… / 미자격은 null
  teammate: string;
  togetherGames: number;
  apartGames: number;
  qualified: boolean;
  value: number | null; // = metrics[metric].delta (정렬에 쓴 값)
  metrics: Record<SynergyMetric, SynergySplit>;
}

// GET /synergy?player=&metric=&competitionId= 응답. 기록 없는 이름도 200(빈 리포트)이다.
export interface SynergyReport {
  player: string;
  games: number;
  metric: SynergyMetric;
  betterWhen: Record<SynergyMetric, 'higher' | 'lower'>; // 지표별 방향 — 프론트가 'tov' 를 하드코딩 안 하게
  minTogetherGames: number;
  minApartGames: number;
  overall: Record<SynergyMetric, number>; // 동료와 무관한 "평소" 경기당 평균
  rows: SynergyRow[];
}

// [변경: 2026-07-28 15:00, 김병현 수정] 기량 발전 탭 — 백엔드 stats/growth.ts 미러.
// 순서·이름을 백엔드와 똑같이 유지할 것(응답을 그대로 받아 쓰는 계약).
// ⚠ 백엔드와 똑같이 **한 줄**로. 줄바꿈하면 ASI 때문에 TS1434(컴파일 실패).
// [변경: 2026-07-28 17:00, 김병현 수정] v3.1 — 성공률 2종('fg2Pct','fg3Pct') 을 카운트 7종 뒤에 추가(결정 14).
export const GROWTH_METRICS = ['eff', 'pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'fg2Pct', 'fg3Pct'] as const satisfies readonly LeaderboardMetric[];
export type GrowthMetric = (typeof GROWTH_METRICS)[number];

// [신설: 2026-07-28 17:00, 김병현 작성] 지표 계열(결정 11). 같은 GrowthSplit.pct 필드에
// 카운트는 "상대 증가율(%)", 성공률은 "두 값의 차이(퍼센트포인트)"가 들어간다 — 프론트는 이 값을
// 보고 표기를 고르지, 'fg2Pct'/'fg3Pct' 문자열을 하드코딩하지 않는다.
export type GrowthKind = 'perGame' | 'rate';

// [신설: 2026-07-28 18:00, 김병현 작성] v3.1 구현 리뷰 D6 — "성공률 탭에서 화면이 달라지는 것
// 전부"를 담는 기술자에 이름을 준다. 인라인 `(typeof X)[keyof typeof X]` 로 두면 읽는 사람이
// lib/format.ts 까지 따라가야 뜻을 안다(v2 리뷰 R4 와 같은 유형의 반복 — 타입 인라인 금지 규칙과도 맞는다).
// 실제 값 표는 lib/format.ts 의 GROWTH_KIND_VIEW 에 있다(이 타입은 그 표의 모양만 정의).
export interface GrowthKindView {
  valueColumnWord: string; // 열 제목 낱말: '평균' | '성공률'
  deltaColumnLabel: string; // 발전률 열 제목: '발전률' | '발전 (%p)'
  // [신설: 2026-07-28 18:00, 김병현 작성] v3.1 구현 리뷰 D5 — 값에 단위가 이미 화면에 보이면(perGame
  // 은 '+38.2%' 처럼 % 가 이미 붙는다) 빈 문자열을 준다. 스크린리더가 "퍼센트, 퍼센트"로 두 번
  // 읽는 걸 막는다 — 단위가 안 보이는 rate 탭('+10.0')만 이 낱말이 실제로 필요하다.
  deltaUnitSr: string; // 스크린리더용 단위 낱말: '' | '퍼센트포인트'
  cardNote: string; // '경기당 평균 기준' | '시즌 누적 성공/시도 기준'
  // [신설: 2026-07-28 18:00, 김병현 작성] v3.1 구현 리뷰 D1 — "직전 값이 0/작으면 —" 문장은
  // perGame 에만 맞는 말이다(rate 는 나눗셈이 없어 0.0% 도 정상값). 계열별로 다른 문장을 여기서 낸다.
  baseNote: string;
  formatValue: (n: number) => string; // '8.4' | '40.0%'
  formatDelta: (n: number) => string; // '+38.2%' | '+10.0'
  // rate 전용 안내 두 줄(자격 최소 시도 등). perGame 은 빈 배열을 준다.
  extraNotes: (minAttempts: number) => string[];
}

// [신설: 2026-07-28 17:00, 김병현 작성] 자격 미달 사유. 경기 수/시도 수 규칙을 프론트가 다시
// 계산하지 않게 서버가 알려 준다. qualified === (unqualifiedBy === 'none') 이 항상 성립한다.
export type GrowthUnqualified = 'none' | 'games' | 'attempts' | 'both';

// % 가 없는 이유. 화면이 "왜 —인지"를 사람 말로 바꿔 보여준다.
// [변경: 2026-07-28 17:00, 김병현 수정] v3.1 — 'no-attempts' 추가(성공률인데 그 시즌 시도가 0회).
export type GrowthBasis = 'ok' | 'no-prev' | 'from-zero' | 'both-zero' | 'tiny-base' | 'no-attempts';

// 비교에 쓴 시즌 한쪽의 신원.
export interface GrowthSeason {
  competitionId: number;
  label: string; // 표시 라벨(=Competition.label)
  games: number; // 그 시즌에 기록이 남은 경기 수
}

// 지표 하나의 직전/이번/발전률.
export interface GrowthSplit {
  prev: number | null; // 직전 시즌 경기당 평균. 직전에 안 뛰었으면 null(0이 아니다)
  // [변경: 2026-07-28 17:00, 김병현 수정] v3.1 — number 에서 number|null 로 바뀐다.
  // 성공률인데 이번 시즌 시도가 0회면 curr 도 값이 없다(no-attempts).
  curr: number | null; // 이번 시즌 경기당 평균(성공률 지표는 시즌 누적 성공률). 시도 0회면 null
  // [변경: 2026-07-28 17:00, 김병현 수정] pct 의 단위가 계열마다 다르다(결정 11) — kinds 를 보고 해석한다.
  pct: number | null; // 발전률. 방향 반영됨(항상 클수록 좋음). 못 구하면 null
  basis: GrowthBasis;
}

// GET /growth 의 표 한 줄 — 선수 한 명의 자격·경기 수·지표 9종 스플릿.
export interface GrowthRow {
  rank: number | null; // qualified && pct != null 인 행에만 1,2,3…
  player: string;
  prevGames: number; // 직전 시즌 출전(기록이 남은) 경기 수
  currGames: number;
  qualified: boolean; // 두 시즌 모두 minGames 이상
  // [신설: 2026-07-28 17:00, 김병현 작성] v3.1 — 요청 지표의 최소 시도(AND)까지 반영된 자격 미달 사유.
  unqualifiedBy: GrowthUnqualified;
  isNew: boolean; // 직전 시즌 기록이 아예 없음(= prevGames === 0)
  value: number | null; // = metrics[metric].pct (정렬에 쓴 값)
  metrics: Record<GrowthMetric, GrowthSplit>;
}

// GET /growth?competitionId=&metric= 응답. competitionId 는 필수(없으면 400), 없는 대회면 404.
export interface GrowthReport {
  current: GrowthSeason;
  previous: GrowthSeason | null; // 첫 시즌이면 null
  metric: GrowthMetric; // 정렬에 쓴 지표
  betterWhen: Record<GrowthMetric, 'higher' | 'lower'>; // 화면 문구용(프론트의 'tov' 하드코딩 방지)
  // [신설: 2026-07-28 17:00, 김병현 작성] 지표별 계열(결정 11). 프론트가 'fg2Pct'/'fg3Pct' 문자열로
  // 계열을 판단하지 않게 한다.
  kinds: Record<GrowthMetric, GrowthKind>;
  minGames: number; // 안내 문구용(상수 하드코딩 방지)
  // [신설: 2026-07-28 17:00, 김병현 작성] 지표별 최소 시도(결정 12). Record 인 이유는 B4 —
  // placeholderData 때문에 탭을 바꾸면 새 응답이 올 때까지 직전 지표의 리포트가 화면에 남는데,
  // 스칼라면 그 찰나에 엉뚱한 지표의 숫자를 말하는 사고가 난다.
  minAttempts: Record<GrowthMetric, number>;
  goneCount: number; // 직전엔 뛰었지만 이번 시즌 기록이 없는 선수 수
  tinyBaseCount: number; // 기준값이 너무 작아 발전률을 못 낸 선수 수(basis==='tiny-base'). 성공률 탭에선 구조적으로 항상 0
  rows: GrowthRow[]; // metric 기준으로 이미 정렬돼 있음
}
