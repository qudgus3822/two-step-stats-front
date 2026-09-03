// [신설: 2026-09-02 15:20, 김병현 작성] 경기 하나(GameBox)에서 히어로 스코어보드·MVP 카드·
// 팀 요약 표·박스스코어 표가 공통으로 쓰는 파생 값을 계산한다.
//
// 숨기는 것: 팀 합계 집계 규칙("성공률의 평균"이 아니라 "합계 성공/합계 시도"로 재계산),
// MVP 선정 규칙(득점 1위, 동점이면 효율 높은 쪽). 화면마다 각자 계산하게 두면 어느 화면은
// 다른 반올림·동점 처리를 써서 같은 경기인데 숫자가 미묘하게 갈리는 사고가 난다 — 한 곳만
// 보고 계산하게 만들면 그 사고를 원천 차단한다.
//
// ⚠ 새 API를 만들지 않는다. 이미 받는 GameBox(선수별 박스스코어)만으로 전부 계산한다.
import type { GameBox, PlayerLine } from '../api/types';
import type { GameMvp, TeamTotals } from '../types/game';
import { efficiency } from './format';

// 한 팀 선수 라인들을 더해 팀 합계로 만든다(옛 GameStatsPanel 의 로컬 teamTotals 를 그대로 이전).
export function teamTotals(players: PlayerLine[]): TeamTotals {
  const t = { reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0 };
  for (const p of players) {
    t.reb += p.reb;
    t.ast += p.ast;
    t.stl += p.stl;
    t.blk += p.blk;
    t.tov += p.tov;
    t.fgm += p.fgm;
    t.fga += p.fga;
    t.fg3m += p.fg3m;
    t.fg3a += p.fg3a;
  }
  return { ...t, fgPct: pct(t.fgm, t.fga), fg3Pct: pct(t.fg3m, t.fg3a) };
}

// 성공/시도 → 성공률(%). 시도 0이면 null. 백엔드 withPct 와 같은 규칙.
function pct(makes: number, atts: number): number | null {
  if (atts <= 0) return null;
  return Math.round((makes / atts) * 1000) / 10;
}

// 이 경기 전체(양 팀 합쳐)에서 득점 1위 선수 = MVP. 동점이면 효율(EFF)이 더 높은 쪽,
// 그래도 같으면 데이터에 먼저 나온 선수를 유지한다(렌더마다 항상 같은 결과가 나오게).
export function findGameMvp(box: GameBox): GameMvp | null {
  let best: GameMvp | null = null;
  for (const t of box.teams) {
    for (const p of t.players) {
      const eff = efficiency(p);
      if (!best || p.pts > best.player.pts || (p.pts === best.player.pts && eff > best.eff)) {
        best = { team: t.team, player: p, eff };
      }
    }
  }
  return best;
}

// 팀 한 개 안에서 득점 1위 선수 이름. 박스스코어 표가 그 줄만 강조하는 데 쓴다.
// (findGameMvp 는 경기 전체 MVP, 이건 표 하나 안에서의 최고 득점자 — 범위가 다르다.)
export function topScorerName(players: PlayerLine[]): string | null {
  let top: PlayerLine | null = null;
  for (const p of players) {
    if (!top || p.pts > top.pts) top = p;
  }
  return top?.player ?? null;
}
