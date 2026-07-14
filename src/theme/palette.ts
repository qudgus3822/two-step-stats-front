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

// 라이트 모드 토큰
export const lightTokens: ThemeTokens = {
  surface: '#fcfcfb',
  page: '#f9f9f7',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  muted: '#898781',
  grid: '#e1e0d9',
  baseline: '#c3c2b7',
  series: [
    '#2a78d6', // 1 파랑
    '#1baf7a', // 2 아쿠아
    '#eda100', // 3 노랑
    '#008300', // 4 초록
    '#4a3aa7', // 5 보라
    '#e34948', // 6 빨강
    '#e87ba4', // 7 마젠타
    '#eb6834', // 8 주황
  ],
  sequential: '#2a78d6',
  good: '#0ca30c',
  critical: '#d03b3b',
  warning: '#fab219',
};

// 다크 모드 토큰 (같은 8색을 어두운 배경용 단계로 바꾼 것)
export const darkTokens: ThemeTokens = {
  surface: '#1a1a19',
  page: '#0d0d0d',
  textPrimary: '#ffffff',
  textSecondary: '#c3c2b7',
  muted: '#898781',
  grid: '#2c2c2a',
  baseline: '#383835',
  series: [
    '#3987e5', // 1 파랑
    '#199e70', // 2 아쿠아
    '#c98500', // 3 노랑
    '#008300', // 4 초록
    '#9085e9', // 5 보라
    '#e66767', // 6 빨강
    '#d55181', // 7 마젠타
    '#d95926', // 8 주황
  ],
  sequential: '#3987e5',
  good: '#0ca30c',
  critical: '#d03b3b',
  warning: '#fab219',
};

export const tokensFor = (mode: ThemeMode): ThemeTokens =>
  mode === 'dark' ? darkTokens : lightTokens;

// 팀 인덱스로 시리즈 색 하나 고르기 (8색을 넘으면 다시 앞으로 — 동호회 팀은
// 한 경기에 보통 2팀이라 넘칠 일은 거의 없음).
export const seriesColor = (tokens: ThemeTokens, index: number): string =>
  tokens.series[index % tokens.series.length];
