import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { saveBlob } from '../lib/download';
import { ErrorView } from './states';

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
    <section className="card upload-card">
      <div className="card-head">
        <h2 className="card-title">우승 기록 내려받기</h2>
        <span className="card-note">시트 2장</span>
      </div>

      <p className="field-hint">
        기록지 원본과 같은 모양으로 내려받아요. <b>우승</b> 시트엔 연도·시즌·우승팀·멤버가,
        <b> 우승횟수</b> 시트엔 선수별 통산 횟수가 들어가요.
      </p>

      <div className="export-controls">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
        >
          {exportMutation.isPending ? '만드는 중…' : '.xlsx 로 내려받기'}
        </button>
      </div>

      {exportMutation.error && (
        <div className="upload-feedback">
          <ErrorView message={exportMutation.error.message} />
        </div>
      )}

      {result && !exportMutation.isPending && (
        <div className="upload-info" aria-live="polite">
          <strong>
            내려받았어요
            {/* rowCount 가 null 이면 "모름"이다 — 0 으로 뭉개서 "0건"이라 거짓말하지 않는다. */}
            {result.rowCount != null && ` · 우승 ${result.rowCount.toLocaleString()}건`}
          </strong>
          <span className="field-hint">{result.fileName}</span>
        </div>
      )}
    </section>
  );
}
