// [신설: 2026-07-27 15:50, 김병현 작성]
import type { PlayerDetail } from '../api/types';
import { efficiency, perGameAvg } from './format';

// 선수 상세 응답을 "화면이 바로 쓰는 요약 수치"로 바꾼다.
//
// 숨기는 것: 평균의 분모(출전 경기 수 = games.length), 반올림 규칙(perGameAvg),
// 효율(EFF) 공식. 덕분에 선수 상세 카드와 비교 표가 같은 숫자를 보장한다.
//
// 전제: playerDetail 은 이벤트가 있어야만 반환되므로 games.length >= 1.
// (0이어도 perGameAvg 가 0을 돌려주니 터지지는 않는다.)

// 슈팅 한 종류의 성공률. 서버가 준 pct 를 그대로 들고 다닌다(시도 0이면 null).
export interface ShotRate {
  pct: number | null;
  makes: number;
  atts: number;
}

export interface PlayerSummary {
  player: string;
  games: number; // 출전 경기 수
  perGame: { pts: number; reb: number; ast: number; eff: number };
  totals: { pts: number; reb: number; ast: number; eff: number };
  // 성공률에 필요한 것만 담는다. 박스스코어를 통째로 들고 다니면
  // totals.pts 와 shooting.pts 처럼 같은 숫자의 출처가 둘이 된다.
  shooting: { fg: ShotRate; fg2: ShotRate; fg3: ShotRate; ft: ShotRate };
}

export function summarizePlayer(detail: PlayerDetail): PlayerSummary {
  const games = detail.games.length;
  // EFF 는 백엔드와 같은 공식(lib/format.ts 의 efficiency)을 그대로 재사용한다.
  const eff = efficiency(detail.totals);

  return {
    player: detail.player,
    games,
    perGame: {
      pts: perGameAvg(detail.totals.pts, games),
      reb: perGameAvg(detail.totals.reb, games),
      ast: perGameAvg(detail.totals.ast, games),
      eff: perGameAvg(eff, games),
    },
    totals: {
      pts: detail.totals.pts,
      reb: detail.totals.reb,
      ast: detail.totals.ast,
      eff,
    },
    shooting: {
      fg: { pct: detail.totals.fgPct, makes: detail.totals.fgm, atts: detail.totals.fga },
      fg2: { pct: detail.totals.fg2Pct, makes: detail.totals.fg2m, atts: detail.totals.fg2a },
      fg3: { pct: detail.totals.fg3Pct, makes: detail.totals.fg3m, atts: detail.totals.fg3a },
      ft: { pct: detail.totals.ftPct, makes: detail.totals.ftm, atts: detail.totals.fta },
    },
  };
}
