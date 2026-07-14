import { useCompetition } from '../context/CompetitionContext';

// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — 옛 SeasonPicker(문자열 드롭다운)를
// CompetitionPicker 로 리네임. 대회 고르는 드롭다운. 전역 CompetitionContext 를 그대로 읽고 쓴다.
// option value 는 대회 id(숫자→문자열), 빈 값('')은 "전체 대회". 대회가 하나도 없으면 안내 문구만.
export function CompetitionPicker() {
  const { competitions, competitionId, setCompetitionId, loading } = useCompetition();

  if (loading)
    return <span className="season-picker season-picker--muted">대회 로딩…</span>;
  if (competitions.length === 0)
    return <span className="season-picker season-picker--muted">대회 없음</span>;

  return (
    <label className="season-picker">
      <span className="season-picker-caption">대회</span>
      <select
        className="select"
        value={competitionId == null ? '' : String(competitionId)}
        onChange={(e) => {
          const v = e.target.value;
          setCompetitionId(v === '' ? null : Number(v));
        }}
        aria-label="대회 선택"
      >
        <option value="">전체 대회</option>
        {competitions.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.label}
          </option>
        ))}
      </select>
    </label>
  );
}
