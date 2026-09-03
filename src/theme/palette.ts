// 차트/화면 색 토큰 한 곳 모음.
// dataviz 스킬의 "검증된 기본 팔레트"를 그대로 옮긴 값이라, 색맹 안전성·명암비가
// 이미 검증돼 있다. 라이트/다크 각각 같은 8색을 각 배경에 맞게 단계만 바꾼 것.
//
// 왜 CSS 변수 말고 JS 객체로도 두냐면 — Recharts 같은 차트 라이브러리는 색을
// "문자열 값"으로 넘겨야 해서, 화면 CSS(styles.css)와 차트 JS가 같은 값을
// 공유하도록 여기서 한 번 정의한다.

export type ThemeMode = 'light' | 'dark';

export interface ThemeTokens {
  surface: string; // 카드/차트 표면
  page: string; // 페이지 배경
  textPrimary: string; // 본문 기본 글자
  textSecondary: string; // 보조 글자
  muted: string; // 축 눈금/희미한 라벨
  grid: string; // 그리드 실선(가는 선)
  baseline: string; // 축선/구분선
  series: string[]; // 카테고리 8색 (고정 순서, 절대 돌려쓰지 않음)
  sequential: string; // 크기(양)를 나타내는 단일 블루
  good: string; // 상태: 좋음(승)
  critical: string; // 상태: 위험(패)
  warning: string; // 상태: 주의(무)
}

// [변경: 2026-09-03 09:00, 김병현 수정] 시각 정체성 개편(visual-identity) Phase 1 — 팔레트 개편.
// 그대로 옮기기만 했던 옛 팔레트를 여기서 처음으로 실제로 바꾼다(계획서 §Phase 1).
// 중립색(secondary/muted/grid/baseline)을 누런 회색(#898781 계열)에서 Tailwind Slate
// 스케일(파랑기 도는 차가운 회색)로 바꾸고, sequential(=brand accent)을 더 선명하게,
// 배경/표면 간격을 벌렸다. series[1..7](2~8번 색)과 good/critical/warning(승/패/무 의미색)은
// 색맹 안전성이 검증된 값이라 그대로 둔다 — 바뀐 건 딱 "중립"과 "강조" 두 축뿐이다.
// 라이트/다크 대비 계산 근거는 index.css 의 같은 주석을 참고(같은 표를 두 곳에 안 베낀다).

// 라이트 모드 토큰
export const lightTokens: ThemeTokens = {
  surface: '#ffffff', // 옛 #fcfcfb → 배경과 카드의 차이를 눈에 띄게 벌리려고 순백으로
  page: '#f1f5f9', // 옛 #f9f9f7(누런 크림) → slate-100(차가운 회백)
  textPrimary: '#0f172a', // 옛 #0b0b0b → slate-900
  textSecondary: '#475569', // 옛 #52514e(누런 회색) → slate-600
  muted: '#5b6b80', // 옛 #898781 → slate-500(#64748b)은 배경 대비 4.39:1로 AA 미달이라
  // slate-500과 600 사이 값으로 직접 골랐다(대비 계산은 index.css 주석 참고).
  grid: '#e2e8f0', // 옛 #e1e0d9 → slate-200
  baseline: '#cbd5e1', // 옛 #c3c2b7 → slate-300
  series: [
    '#2563eb', // 1 파랑 — sequential/brand accent. 이전보다 채도를 올려 "이 앱의 색"으로 보이게.
    '#1baf7a', // 2 아쿠아 (미변경 — 색맹 안전 검증값)
    '#eda100', // 3 노랑 (미변경)
    '#008300', // 4 초록 (미변경)
    '#4a3aa7', // 5 보라 (미변경)
    '#e34948', // 6 빨강 (미변경)
    '#e87ba4', // 7 마젠타 (미변경)
    '#eb6834', // 8 주황 (미변경)
  ],
  sequential: '#2563eb',
  good: '#0ca30c', // 승 — 의미색, 미변경
  critical: '#d03b3b', // 패 — 의미색, 미변경
  warning: '#fab219', // 무 — 의미색, 미변경
};

// 다크 모드 토큰 (같은 8색을 어두운 배경용 단계로 바꾼 것)
export const darkTokens: ThemeTokens = {
  surface: '#1e293b', // 옛 #1a1a19 → slate-800. 배경(아래)과의 명암비를 1.12→1.38로 벌렸다
  // ("카드가 배경에 묻힌다"는 진단의 핵심 — 실측 기반 재조정, index.css 주석 참고).
  page: '#020617', // 옛 #0d0d0d(중성 검정) → slate-950(파랑기 도는 검정)
  textPrimary: '#f8fafc', // 옛 #ffffff → slate-50(순백보다 살짝 부드러운 흰색, 대비는 여전히 최상급)
  textSecondary: '#cbd5e1', // 옛 #c3c2b7(누런 회색) → slate-300
  muted: '#94a3b8', // 옛 #898781 → slate-400
  grid: '#0f172a', // 옛 #2c2c2a → slate-900 (배경과 카드 사이 중간 표면 — 표 줄무늬 등)
  baseline: '#475569', // 옛 #383835 → slate-600
  series: [
    '#2f6fe0', // 1 파랑 — sequential/brand accent. 이전 값은 흰 글자 대비가 3.64:1로 AA
    // 미달이었다(다크 버튼 등). 더 선명하면서 대비도 통과하는 값으로 교체(4.70:1, 주석 참고).
    '#199e70', // 2 아쿠아 (미변경)
    '#c98500', // 3 노랑 (미변경)
    '#008300', // 4 초록 (미변경)
    '#9085e9', // 5 보라 (미변경)
    '#e66767', // 6 빨강 (미변경)
    '#d55181', // 7 마젠타 (미변경)
    '#d95926', // 8 주황 (미변경)
  ],
  sequential: '#2f6fe0',
  good: '#0ca30c', // 승 — 의미색, 미변경
  critical: '#d03b3b', // 패 — 의미색, 미변경
  warning: '#fab219', // 무 — 의미색, 미변경
};

export const tokensFor = (mode: ThemeMode): ThemeTokens =>
  mode === 'dark' ? darkTokens : lightTokens;

// 팀 인덱스로 시리즈 색 하나 고르기 (8색을 넘으면 다시 앞으로 — 동호회 팀은
// 한 경기에 보통 2팀이라 넘칠 일은 거의 없음).
export const seriesColor = (tokens: ThemeTokens, index: number): string =>
  tokens.series[index % tokens.series.length];
