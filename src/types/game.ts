// [신설: 2026-09-02 15:20, 김병현 작성] 경기 하나(GameBox)에서 화면이 "계산해서" 쓰는 값들.
// api/types.ts 는 서버 응답을 그대로 미러한 것이고, 여기는 그걸 가공한 화면 전용 모양이다.
// src/lib/gameBoxSummary.ts 가 이 타입들을 채워서 돌려준다(히어로 스코어보드·MVP 카드·
// 팀 요약 표가 공유).
import type { PlayerLine } from '../api/types';

// 팀 한 개의 합계 스탯. 점수(팀 공식 점수)는 이미 GameBox.teams[].score 에 있으므로
// 여기 포함하지 않는다 — 리바/보조스탯 합계와 성공률(합계 성공/합계 시도로 재계산한 값)만 담는다.
export interface TeamTotals {
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  fgm: number;
  fga: number;
  fg3m: number;
  fg3a: number;
  fgPct: number | null;
  fg3Pct: number | null;
}

// 경기 하나의 최고 기록(MVP) — 득점 1위 선수. 동점이면 효율(EFF)이 더 높은 쪽을 고른다.
export interface GameMvp {
  team: string;
  player: PlayerLine;
  eff: number; // efficiency(player) — 호출부가 다시 계산하지 않게 값으로 들고 다닌다.
}
