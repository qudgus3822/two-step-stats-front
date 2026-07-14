import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — useSeason → useCompetition(리네임).
import { useCompetition } from '../context/CompetitionContext';
import { Empty, ErrorView, Loading } from '../components/states';

// 선수 목록: 득점 많은 순 표. 이름으로 즉석 검색(클라이언트 필터)도 된다.

export function PlayersPage() {
  const { competitionId, competitionLabel } = useCompetition();
  const { data, loading, error, reload } = useApi(
    () => api.players(competitionId),
    [competitionId],
  );
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
        <p className="page-sub">{competitionLabel ?? '전체 대회'} · 득점순</p>
      </div>

      {loading && <Loading />}
      {error && <ErrorView message={error} onRetry={reload} />}
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
                  <th>누적 득점</th>
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
                    <td className="num strong">{p.pts}</td>
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
