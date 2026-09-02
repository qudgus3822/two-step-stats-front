import type { PlayerWins } from '../api/types';
import { PlayerLink } from './PlayerLink';
import { Empty } from './states';

// [신설: 2026-09-02 김병현 작성] 아직 우승이 없는 선수 명단.
//
// 우승자 표와 굳이 나눈 이유는 lib/championships.ts 의 splitByWins 주석에 있다 —
// 한 줄로 줄이면: 두 무리는 읽는 방법이 다르다(등수 표 vs 등수 없는 명단).
//
// 칸이 우승자 표보다 적은 것도 같은 이유다. 우승이 전부 0이라 '우승' 칸은 0만 늘어놓는
// 죽은 칸이고, 승률도 전부 0.0% 라 마찬가지다. 여기서 뜻이 있는 건 **뛴 시즌 수** 하나다
// ("12시즌 뛰었는데 아직" 이 이 표가 하려는 이야기다).

export function WinlessPlayersTable({ winless }: { winless: PlayerWins[] }) {
  if (winless.length === 0) {
    return (
      <Empty>
        <strong>모두 한 번씩은 우승했어요 🎉</strong>
        <span>기록이 있는 선수 전원이 우승 경험자예요.</span>
      </Empty>
    );
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <caption className="sr-only">아직 우승이 없는 선수 {winless.length}명</caption>
        <thead>
          <tr>
            <th className="col-name">선수</th>
            {/* 뛴 시즌 많은 순으로 정렬돼 있다(splitByWins) → 위쪽이 제일 오래 기다린 사람. */}
            <th className="num">뛴 시즌</th>
          </tr>
        </thead>
        <tbody>
          {winless.map((p) => (
            <tr key={p.player}>
              <td className="col-name">
                <PlayerLink name={p.player} />
              </td>
              <td className="num muted">{p.seasons}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
