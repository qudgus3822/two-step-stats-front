// [변경: 2026-07-15 13:01, 김병현 수정] efficiency 계산에 BoxScore 필요 — import 추가.
// [변경: 2026-07-28 15:00, 김병현 수정] 기량 발전 표시 헬퍼용 GrowthBasis 타입 추가.
// [변경: 2026-07-28 17:00, 김병현 수정] v3.1 — GrowthKind·GrowthUnqualified 타입 추가.
// [변경: 2026-07-28 18:00, 김병현 수정] v3.1 구현 리뷰 D6 — 기술자 타입을 GrowthKindView 로 이름 붙여 import.
import type {
  BoxScore,
  GrowthBasis,
  GrowthKind,
  GrowthKindView,
  GrowthUnqualified,
  LeaderboardMetric,
} from '../api/types';

// 화면에 보이는 라벨/포맷 모음. 코드값을 사람이 읽는 한국어로 바꿔준다.

// 리더보드 지표 → 한국어 이름
// [변경: 2026-07-15 13:01, 김병현 수정] 6키 추가(eff·fgPct·fg2Pct·fg3Pct·ftPct·club180) — 19키 전부 채움.
export const METRIC_LABELS: Record<LeaderboardMetric, string> = {
  pts: '득점',
  eff: '효율(EFF)',
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
  fgPct: '야투 성공률',
  fg2Pct: '2점 성공률',
  fg3Pct: '3점 성공률',
  ftPct: '자유투 성공률',
  club180: '180클럽',
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

// [변경: 2026-07-15 13:01, 김병현 수정] EFF 경기당/누적을 선수상세 카드가 프론트에서 파생.
// 주의: 백엔드 aggregate.ts 의 efficiency 와 식을 반드시 같게 유지(같은 선수 EFF가 화면마다 갈리지 않게).
export const efficiency = (box: BoxScore): number =>
  (box.pts + box.reb + box.ast + box.stl + box.blk)
  - (box.fga - box.fgm) - (box.fta - box.ftm) - box.tov;

// [변경: 2026-07-15 13:01, 김병현 수정] 성공률을 "%" 문자열로. 리더보드 비율 차트/표 표시용.
export const formatPct = (n: number): string => `${n}%`;

// [변경: 2026-07-27 16:14, 김병현 수정] 시너지 델타 표시 — 부호를 붙여 방향이 바로 보이게. 0은 "0.0".
export const formatDelta = (n: number): string => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;

// [변경: 2026-07-27 16:14, 김병현 수정] 델타를 '좋아짐/나빠짐/그대로'로 번역한다.
// 방향(betterWhen)은 서버 응답에서 받는다 — 턴오버처럼 낮을수록 좋은 지표를 프론트가 기억하지 않게.
export type DeltaTone = 'good' | 'bad' | 'flat';
export const deltaTone = (delta: number, betterWhen: 'higher' | 'lower'): DeltaTone => {
  if (delta === 0) return 'flat';
  return (betterWhen === 'higher' ? delta > 0 : delta < 0) ? 'good' : 'bad';
};

// [변경: 2026-07-28 15:00, 김병현 수정] 발전률 표시. 부호 규칙은 formatDelta 를 그대로 재사용한다.
export const formatGrowthPct = (n: number): string => `${formatDelta(n)}%`;

// [변경: 2026-07-28 15:00, 김병현 수정] % 를 못 낸 이유를 사람 말로. 백엔드 GrowthBasis 미러.
// [변경: 2026-07-28 17:00, 김병현 수정] v3.1 — 'no-attempts' 추가(타입이 강제해서 빠뜨릴 수 없다).
export const GROWTH_BASIS_LABELS: Record<GrowthBasis, string> = {
  ok: '',
  'no-prev': '신규',
  'from-zero': '직전 0',
  'both-zero': '변화 없음',
  'tiny-base': '기준값 작음',
  'no-attempts': '시도 없음',
};

// [신설: 2026-07-28 17:00, 김병현 작성] 자격 미달 사유를 사람 말로. 카운트 탭(games)은 v2 와
// 똑같이 '표본 부족'이라 기존 화면 문구가 안 바뀐다(v3.1 리뷰 A2). 'both'도 결국 표본이 부족한
// 상태라 같은 문구를 쓴다 — 뱃지 하나에 "경기도 부족하고 시도도 부족해요"까지 구분해 보여줄
// 필요는 없다(표의 직전/이번 열에서 숫자로 이미 드러난다).
export const GROWTH_UNQUALIFIED_LABELS: Record<GrowthUnqualified, string> = {
  none: '',
  games: '표본 부족',
  attempts: '시도 부족',
  both: '표본 부족',
};

// [신설: 2026-07-28 17:00, 김병현 작성] v3.1 — "성공률 탭에서 화면이 달라지는 것 전부"를 여기
// 한 표에 모은다(v3 리뷰 D2). 계열이 셋으로 늘어도 이 표에 한 줄만 추가하면 된다 — 컴포넌트
// 안에 kind==='rate' 삼항/&& 분기를 흩어 두지 않는다(그중 상당수는 컴파일러가 못 잡는다).
// 기존 formatGrowthPct·formatAvg·formatDelta 는 지우지 않고 이 표 안에서 재사용한다.
// [변경: 2026-07-28 18:00, 김병현 수정] v3.1 구현 리뷰 D6 — 타입을 인라인에서 이름 있는
// GrowthKindView(api/types.ts)로 옮겼다. 모양이 바뀐 건 없다.
export const GROWTH_KIND_VIEW: Record<GrowthKind, GrowthKindView> = {
  perGame: {
    valueColumnWord: '평균',
    deltaColumnLabel: '발전률',
    // [변경: 2026-07-28 18:00, 김병현 수정] v3.1 구현 리뷰 D5 — '퍼센트' → ''.
    // formatDelta(=formatGrowthPct) 가 이미 화면에 '%' 를 붙이므로(예: "+38.2%"), sr-only 로
    // "퍼센트"를 또 읽게 하면 "…퍼센트, 퍼센트"로 두 번 들린다(카운트 7개 탭의 회귀였다).
    deltaUnitSr: '',
    cardNote: '경기당 평균 기준',
    // [신설: 2026-07-28 18:00, 김병현 작성] v3.1 구현 리뷰 D1 — 카운트 계열의 원래 문장.
    baseNote: '직전 값이 0이거나 너무 작으면 %가 의미 없어서 —로 둡니다.',
    formatValue: (n) => formatAvg(n),
    formatDelta: (n) => formatGrowthPct(n),
    extraNotes: () => [],
  },
  rate: {
    valueColumnWord: '성공률',
    deltaColumnLabel: '발전 (%p)',
    deltaUnitSr: '퍼센트포인트',
    cardNote: '시즌 누적 성공/시도 기준',
    // [신설: 2026-07-28 18:00, 김병현 작성] v3.1 구현 리뷰 D1 — 성공률은 나눗셈이 아니라 단순
    // 차이(결정 9)라서 카운트 계열의 "0이면 —" 문장이 거짓말이 된다(0.0% → 20.0% 도 정상 +20.0).
    // 이 문장이 이 요구의 핵심(사용자가 상대증가율 대신 단순 차이를 고른 이유)을 그대로 설명한다.
    baseNote: '직전이 0.0%여도 정상값으로 잽니다 — 나눗셈이 아니라 두 값의 차이라서 0으로 나눌 일이 없어요.',
    formatValue: (n) => `${formatAvg(n)}%`,
    // ⚠ % 를 안 붙인다 — 붙이면 "10% 상승(상대)"으로 읽힌다(gotcha 39). 단위는 열 제목·sr-only 가 책임진다.
    formatDelta: (n) => formatDelta(n),
    extraNotes: (minAttempts) => [
      '성공률은 두 값의 차이로 잽니다 (40% → 50% = 10 상승).',
      `두 시즌 각각 ${minAttempts}회 이상 시도한 선수만 순위에 넣어요. 시도가 한 번도 없으면 0%가 아니라 '시도 없음'입니다.`,
    ],
  },
};
