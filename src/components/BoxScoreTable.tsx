import { Link } from 'react-router-dom';
import type { PlayerLine } from '../api/types';
// [변경: 2026-07-15 13:01, 김병현 수정] EFF(효율수치)를 이 표에 컬럼으로 끼움 — efficiency 헬퍼 재사용.
import { efficiency } from '../lib/format';

// 한 팀의 선수별 박스스코어 표. 경기 상세에서 팀마다 하나씩 그린다.
// 숫자는 세로로 줄 맞추려고 tabular-nums 를 쓴다(표에서만).
// [변경: 2026-07-15 13:01, 김병현 수정] 득점 옆에 "효율" 컬럼 추가 — 이 경기에서 그 선수의 EFF(=efficiency(선수 박스)).
// 한 경기 값이라 정수(소수 없음). 대시보드·경기상세 박스스코어에 함께 뜬다.

// 성공-시도를 "m/a" 로 합쳐 표기(자리 절약). 시도 0이면 "0/0".
const ma = (m: number, a: number) => `${m}/${a}`;
const pctText = (p: number | null) => (p == null ? '—' : `${p}%`);

export function BoxScoreTable({ players }: { players: PlayerLine[] }) {
  return (
    <div className="table-wrap">
      <table className="table stat-table">
        <thead>
          <tr>
            <th className="col-name">선수</th>
            <th>득점</th>
            {/* [변경: 2026-07-15 13:01, 김병현 수정] 효율(EFF) 컬럼 — 득점 옆에. */}
            <th>효율</th>
            <th>리바운드</th>
            <th>어시스트</th>
            <th>스틸</th>
            <th>블락</th>
            <th>턴오버</th>
            <th>야투</th>
            <th>3점</th>
            <th>자유투</th>
            <th>야투%</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.player}>
              <td className="col-name">
                <Link className="link" to={`/players/${encodeURIComponent(p.player)}`}>
                  {p.player}
                </Link>
              </td>
              <td className="num strong">{p.pts}</td>
              {/* [변경: 2026-07-15 13:01, 김병현 수정] 이 경기 EFF = efficiency(선수 박스). PlayerLine 이 BoxScore 를 상속해 그대로 넘김. */}
              <td className="num strong">{efficiency(p)}</td>
              <td className="num">{p.reb}</td>
              <td className="num">{p.ast}</td>
              <td className="num">{p.stl}</td>
              <td className="num">{p.blk}</td>
              <td className="num">{p.tov}</td>
              <td className="num">{ma(p.fgm, p.fga)}</td>
              <td className="num">{ma(p.fg3m, p.fg3a)}</td>
              <td className="num">{ma(p.ftm, p.fta)}</td>
              <td className="num muted">{pctText(p.fgPct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
