import { useCompetition } from '../context/CompetitionContext';
import { NativeSelect, NativeSelectOption } from './ui/native-select';

// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — 옛 SeasonPicker(문자열 드롭다운)를
// CompetitionPicker 로 리네임. 대회 고르는 드롭다운. 전역 CompetitionContext 를 그대로 읽고 쓴다.
// option value 는 대회 id(숫자→문자열), 빈 값('')은 "전체 대회". 대회가 하나도 없으면 안내 문구만.
//
// [변경: 2026-09-02 14:20, 김병현 수정] <select className="select"> → shadcn NativeSelect 로 이전.
// Radix Select(팝업형)를 안 쓴 이유는 계획서 §D3 — 대회가 많아질수록 OS 네이티브 휠이 폰에서 낫고
// 화면 밖으로 넘치지 않는다. "대회" 캡션에 shrink-0 을 준 이유: 헤더가 좁아질 때 이 글자가
// 찌그러지며 세로로 꺾이던(대/회) 게 원래 버그였다(§D4 진단) — 안 줄어들게 고정한다.
export function CompetitionPicker() {
  const { competitions, competitionId, setCompetitionId, loading } = useCompetition();

  if (loading)
    return <span className="shrink-0 text-sm text-muted-foreground">대회 로딩…</span>;
  if (competitions.length === 0)
    return <span className="shrink-0 text-sm text-muted-foreground">대회 없음</span>;

  return (
    <label className="flex shrink-0 items-center gap-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">대회</span>
      <NativeSelect
        className="max-w-[9rem] sm:max-w-none"
        value={competitionId == null ? '' : String(competitionId)}
        onChange={(e) => {
          const v = e.target.value;
          setCompetitionId(v === '' ? null : Number(v));
        }}
        aria-label="대회 선택"
      >
        <NativeSelectOption value="">전체 대회</NativeSelectOption>
        {competitions.map((c) => (
          <NativeSelectOption key={c.id} value={String(c.id)}>
            {c.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </label>
  );
}
