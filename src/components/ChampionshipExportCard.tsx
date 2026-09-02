import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { saveBlob } from '../lib/download';
import { ErrorView } from './states';
// [변경: 2026-09-02 19:20, 김병현 수정] 아래 3줄 — 계획서 §7 Phase 4f.
// .card.upload-card → SectionCard, .field-hint → text-xs text-muted-foreground,
// 성공 안내(.upload-info) → Alert, .btn.btn--primary → Button.
import { SectionCard } from './SectionCard';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';

// [신설: 2026-09-02 김병현 작성] 우승 기록 엑셀 내려받기 카드.
//
// RawDataExportCard 와 같은 얼개인데, 다른 게 하나 있다: **대회를 안 고른다.**
// 우승 기록은 "누가 통산 몇 번"이 요점이라 통산으로 보는 게 기본이고,
// 전부 합쳐도 수백 줄이라 나눌 이유가 없다. 고를 게 없으니 드롭다운도 없다.
//
// 파일 이름은 서버가 짓는다(lib/download.ts 의 fileNameFromHeader 주석 참고 — 규칙이
// 두 벌이 되면 반드시 한쪽만 고쳐져서 어긋난다).

export function ChampionshipExportCard() {
  // 성공하면 곧바로 저장시킨다(버튼을 한 번 더 누르게 하지 않는다).
  const exportMutation = useMutation({
    mutationFn: () => api.exportChampionships(),
    onSuccess: (file) => saveBlob(file.blob, file.fileName),
  });

  const result = exportMutation.data ?? null;

  return (
    <SectionCard title="우승 기록 내려받기" note="시트 2장" className="max-w-[660px]">
      <p className="text-xs text-muted-foreground">
        기록지 원본과 같은 모양으로 내려받아요. <b>우승</b> 시트엔 연도·시즌·우승팀·멤버가,
        <b> 우승횟수</b> 시트엔 선수별 통산 횟수가 들어가요.
      </p>

      <div className="mt-3.5 flex flex-wrap items-end gap-2.5">
        <Button
          type="button"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
        >
          {exportMutation.isPending ? '만드는 중…' : '.xlsx 로 내려받기'}
        </Button>
      </div>

      {exportMutation.error && <ErrorView message={exportMutation.error.message} />}

      {/* [변경: 2026-09-02 19:45, 김병현 수정] 옛 .upload-info(series-1 10%) → bg-info-soft
          (계획서 §5-5 "정보 → Alert + bg-info-soft"). */}
      {result && !exportMutation.isPending && (
        <Alert className="mt-3.5 border-info-soft bg-info-soft" aria-live="polite">
          <AlertTitle>
            내려받았어요
            {/* rowCount 가 null 이면 "모름"이다 — 0 으로 뭉개서 "0건"이라 거짓말하지 않는다. */}
            {result.rowCount != null && ` · 우승 ${result.rowCount.toLocaleString()}건`}
          </AlertTitle>
          <AlertDescription>{result.fileName}</AlertDescription>
        </Alert>
      )}
    </SectionCard>
  );
}
