import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { useCompetition } from '../context/CompetitionContext';
import { saveBlob } from '../lib/download';
import { ErrorView } from './states';
// [변경: 2026-09-02 19:45, 김병현 수정] 아래 4줄 — 계획서 §7 Phase 4g.
// .card.upload-card → SectionCard, .field.season-field+.select → NativeSelect,
// .field-hint → text-xs text-muted-foreground, 성공 안내(.upload-info) → Alert,
// .btn.btn--primary → Button. .warn-list/p.field-hint preflight 보정은 이 파일이
// field-hint 를 마지막으로 떠나는 지점이라 삭제한다(계획서 §D6-1 P2, styles.css 에서 처리).
import { SectionCard } from './SectionCard';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { NativeSelect, NativeSelectOption } from './ui/native-select';

// [신설: 2026-08-25 16:40, 김병현 작성] 원본(rawdata) 데이터 내려받기 카드.
//
// 업로드 화면에 붙는다 — 올리기와 내려받기는 같은 문의 양쪽이라 한 화면에 있는 게 맞다
// (둘 다 운영자 기능이고, 이 화면은 이미 비밀번호 게이트 뒤에 있다).
//
// 만드는 건 전부 서버가 한다. 이 컴포넌트가 아는 건 딱 둘:
//   1) 어느 대회를 받을지 고르게 하기
//   2) 받아온 파일을 저장시키기(saveBlob)
// 파일 이름도 서버가 지어 보낸다 — 이유는 lib/download.ts 의 fileNameFromHeader 주석 참고.

// 내려받을 범위. '' = 전체 대회(빈 문자열을 쓰는 이유는 <select> 의 value 가 문자열이라서).
const ALL_SCOPE = '';

export function RawDataExportCard() {
  const { competitions, loading: competitionsLoading } = useCompetition();

  // 헤더의 대회 선택(전역)과 일부러 분리해 뒀다. 전역 선택은 "지금 보고 있는 화면의 범위"라
  // 화면을 옮기면 따라 바뀐다. 내려받기는 "이 파일 하나에 뭘 담을까"라 그 순간에만 필요한
  // 선택이고, 실수로 엉뚱한 대회를 받는 걸 막으려면 눈앞에 그대로 보이는 게 낫다.
  const [scope, setScope] = useState<string>(ALL_SCOPE);
  const competitionId = scope === ALL_SCOPE ? null : Number(scope);
  const scopeLabel =
    competitions.find((c) => c.id === competitionId)?.label ?? '전체 대회';

  // 내려받기 뮤테이션. 성공하면 곧바로 저장시킨다(사용자가 버튼을 한 번 더 누를 필요 없게).
  const exportMutation = useMutation({
    mutationFn: () => api.exportRawData(competitionId),
    onSuccess: (file) => saveBlob(file.blob, file.fileName),
  });

  const result = exportMutation.data ?? null;

  return (
    <SectionCard
      title="원본 데이터 내려받기"
      note={
        <>
          받을 범위: <b>{scopeLabel}</b>
        </>
      }
      className="max-w-[660px]"
    >
      <p className="text-xs text-muted-foreground">
        저장된 기록을 기록지 원본과 <b>똑같은 12칸 양식</b>(연도·시즌·주차·경기·쿼터·선수·스텟·팀명·
        팀index·활동여부·주차인덱스·득점)으로 내려받아요. 받은 파일은 그대로 다시 올릴 수도 있어요.
      </p>

      <div className="mt-3.5 flex flex-wrap items-end gap-2.5">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">대회</span>
          <NativeSelect
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            disabled={exportMutation.isPending}
            aria-label="내려받을 대회 선택"
          >
            <NativeSelectOption value={ALL_SCOPE}>전체 대회 (한 파일)</NativeSelectOption>
            {competitions.map((c) => (
              <NativeSelectOption key={c.id} value={String(c.id)}>
                {c.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>

        <Button
          type="button"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending || competitionsLoading}
        >
          {exportMutation.isPending ? '만드는 중…' : '.xlsx 로 내려받기'}
        </Button>
      </div>

      {/* 전체 내려받기는 7만 행 넘는 파일이 나온다 — 눌러 놓고 멈춘 줄 알 수 있어서 미리 알린다. */}
      <p className="mt-2 text-xs text-muted-foreground">
        {competitionId == null
          ? '전체 대회는 파일이 커서(수만 행) 만드는 데 몇 초 걸릴 수 있어요.'
          : '팀index·활동여부 칸은 저장되는 값이 아니라 빈칸으로 나가요.'}
      </p>

      {exportMutation.error && <ErrorView message={exportMutation.error.message} />}

      {/* [변경: 2026-09-02 19:45, 김병현 수정] 옛 .upload-info(series-1 10%) → bg-info-soft.
          plan §5-5: "정보 → Alert + bg-info-soft" — growth-scope-note 의 좌측 강조선과는
          다른 패턴이다(그건 border-l 계열, 이건 배경 채움 계열). */}
      {result && !exportMutation.isPending && (
        <Alert className="mt-3.5 border-info-soft bg-info-soft" aria-live="polite">
          <AlertTitle>
            내려받았어요
            {/* rowCount 가 null 이면 "모름"이다 — 0 으로 뭉개서 "0행"이라고 거짓말하지 않는다. */}
            {result.rowCount != null && ` · ${result.rowCount.toLocaleString()}행`}
          </AlertTitle>
          <AlertDescription>{result.fileName}</AlertDescription>
        </Alert>
      )}
    </SectionCard>
  );
}
