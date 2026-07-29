import { useMemo, useState } from 'react';
// [변경: 2026-07-15 10:28, 김병현 수정] useApi → React Query usePlayers 로 이관
// [변경: 2026-07-29 10:36, 김병현 수정] isStaleView 추가 — 대회를 바꾸는 동안 옛 표를 흐리게 유지.
import { isStaleView, usePlayers } from '../api/queries';
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — useSeason → useCompetition(리네임).
import { useCompetition } from '../context/CompetitionContext';
// [변경: 2026-07-29 10:36, 김병현 수정] 선수 링크를 PlayerLink 로 교체(마우스 올리면 상세 미리 받기).
import { PlayerLink } from '../components/PlayerLink';
import { Empty, ErrorView, TableSkeleton } from '../components/states';
// [변경: 2026-07-15 11:37, 김병현 수정] formatAvg import 추가 — 경기당 득점 표시용.
import { formatAvg } from '../lib/format';

// 선수 목록: 득점 많은 순 표. 이름으로 즉석 검색(클라이언트 필터)도 된다.
// [변경: 2026-07-15 11:37, 김병현 수정] 메인 지표를 누적 득점 → 경기당 득점으로.
// [변경: 2026-07-28 15:44, 김병현 수정] 정렬 기준이 이름 가나다순으로 바뀌었다(서버 listPlayers).
// 경기당/누적 득점은 여전히 보여주지만, 이제 줄 세우는 기준은 아니다.

export function PlayersPage() {
  const { competitionId, competitionLabel } = useCompetition();
  // [변경: 2026-07-15 10:28, 김병현 수정] useApi → usePlayers(React Query)
  // [변경: 2026-07-29 10:36, 김병현 수정] 쿼리 객체를 통째로 들고 있는다 — isStaleView 가
  // isFetching/isPlaceholderData 까지 봐야 해서 구조분해만으로는 부족하다.
  const playersQuery = usePlayers(competitionId);
  const { data, isLoading, error, refetch } = playersQuery;
  // 대회를 바꾸면 새 목록이 올 때까지 옛 목록이 깔려 있다(placeholderData). 그동안 흐리게.
  const stale = isStaleView(playersQuery);
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
        {/* [변경: 2026-07-28 15:44, 김병현 수정] 실제 정렬이 가나다순으로 바뀌어 문구도 맞춘다. */}
        <p className="page-sub">{competitionLabel ?? '전체 대회'} · 가나다순</p>
      </div>

      {/* [변경: 2026-07-15 10:28, 김병현 수정] loading→isLoading, error→error.message, reload→refetch */}
      {/* [변경: 2026-07-29 10:36, 김병현 수정] 스피너 → 표 모양 뼈대. 열 6개(#/선수/팀/출전/경기당/누적). */}
      {isLoading && <TableSkeleton rows={10} cols={6} />}
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

          {/* [변경: 2026-07-29 10:36, 김병현 수정] 검색창은 그대로 두고 표만 흐리게 — 대회를 바꿔도
              입력한 검색어는 계속 또렷하게 보여야 "내가 친 건 살아 있다"가 읽힌다. */}
          <div className={`table-wrap card ${stale ? 'is-stale' : ''}`} aria-busy={stale}>
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
                      <PlayerLink name={p.player} />
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
