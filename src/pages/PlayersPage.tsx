import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
// [변경: 2026-07-15 10:28, 김병현 수정] useApi → React Query usePlayers 로 이관
import { usePlayers } from '../api/queries';
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — useSeason → useCompetition(리네임).
import { useCompetition } from '../context/CompetitionContext';
import { Empty, ErrorView, Loading } from '../components/states';
// [변경: 2026-07-15 11:37, 김병현 수정] formatAvg import 추가 — 경기당 득점 표시용.
import { formatAvg } from '../lib/format';

// 선수 목록: 득점 많은 순 표. 이름으로 즉석 검색(클라이언트 필터)도 된다.
// [변경: 2026-07-15 11:37, 김병현 수정] 메인 지표를 누적 득점 → 경기당 득점으로.

export function PlayersPage() {
  const { competitionId, competitionLabel } = useCompetition();
  // [변경: 2026-07-15 10:28, 김병현 수정] useApi → usePlayers(React Query)
  const { data, isLoading, error, refetch } = usePlayers(competitionId);
  const [query, setQuery] = useState('');

  // 검색어로 거른 목록. 대소문자/공백 무시.
  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((p) => p.player.toLowerCase().includes(q));
  }, [data, query]);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">선수</h1>
        {/* [변경: 2026-07-15 11:37, 김병현 수정] "득점순" → "경기당 득점순"으로 문구 변경. */}
        <p className="page-sub">{competitionLabel ?? '전체 대회'} · 경기당 득점순</p>
      </div>

      {/* [변경: 2026-07-15 10:28, 김병현 수정] loading→isLoading, error→error.message, reload→refetch */}
      {isLoading && <Loading />}
      {error && <ErrorView message={error.message} onRetry={() => refetch()} />}
      {data && data.length === 0 && <Empty>선수 기록이 없어요.</Empty>}

      {data && data.length > 0 && (
        <>
          <input
            className="search"
            type="search"
            placeholder="선수 이름 검색…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="선수 이름 검색"
          />

          <div className="table-wrap card">
            <table className="table">
              <thead>
                <tr>
                  <th className="col-rank">#</th>
                  <th className="col-name">선수</th>
                  <th>팀</th>
                  <th>출전</th>
                  {/* [변경: 2026-07-15 11:37, 김병현 수정] "경기당" strong 컬럼 추가, 기존 "누적 득점"은 muted 보조로. */}
                  <th>경기당</th>
                  <th>누적</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.player}>
                    <td className="num muted">{i + 1}</td>
                    <td className="col-name">
                      <Link className="link" to={`/players/${encodeURIComponent(p.player)}`}>
                        {p.player}
                      </Link>
                    </td>
                    <td className="muted">{p.teams.join(', ')}</td>
                    <td className="num">{p.games}</td>
                    {/* [변경: 2026-07-15 11:37, 김병현 수정] 경기당(strong) 추가, 누적(muted)으로 강등. */}
                    <td className="num strong">{formatAvg(p.ppg)}</td>
                    <td className="num muted">{p.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="table-empty">"{query}" 와 맞는 선수가 없어요.</div>}
          </div>
        </>
      )}
    </div>
  );
}
