import { useSeason } from '../context/SeasonContext';

// 시즌 고르는 드롭다운. 전역 SeasonContext 를 그대로 읽고 쓴다.
// 빈 값('')은 "전체 시즌". 시즌이 하나도 없으면 안내 문구만 보여준다.
export function SeasonPicker() {
  const { seasons, season, setSeason, loading } = useSeason();

  if (loading) return <span className="season-picker season-picker--muted">시즌 로딩…</span>;
  if (seasons.length === 0)
    return <span className="season-picker season-picker--muted">시즌 없음</span>;

  return (
    <label className="season-picker">
      <span className="season-picker-caption">시즌</span>
      <select
        className="select"
        value={season}
        onChange={(e) => setSeason(e.target.value)}
        aria-label="시즌 선택"
      >
        <option value="">전체 시즌</option>
        {seasons.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}
