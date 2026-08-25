import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { useCompetition } from '../context/CompetitionContext';
import { saveBlob } from '../lib/download';
import { ErrorView } from './states';

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
    <section className="card upload-card">
      <div className="card-head">
        <h2 className="card-title">원본 데이터 내려받기</h2>
        <span className="card-note">
          받을 범위: <b>{scopeLabel}</b>
        </span>
      </div>

      <p className="field-hint">
        저장된 기록을 기록지 원본과 <b>똑같은 12칸 양식</b>(연도·시즌·주차·경기·쿼터·선수·스텟·팀명·
        팀index·활동여부·주차인덱스·득점)으로 내려받아요. 받은 파일은 그대로 다시 올릴 수도 있어요.
      </p>

      <div className="export-controls">
        <label className="field season-field">
          <span className="field-label">대회</span>
          <select
            className="select"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            disabled={exportMutation.isPending}
            aria-label="내려받을 대회 선택"
          >
            <option value={ALL_SCOPE}>전체 대회 (한 파일)</option>
            {competitions.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn btn--primary"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending || competitionsLoading}
        >
          {exportMutation.isPending ? '만드는 중…' : '.xlsx 로 내려받기'}
        </button>
      </div>

      {/* 전체 내려받기는 7만 행 넘는 파일이 나온다 — 눌러 놓고 멈춘 줄 알 수 있어서 미리 알린다. */}
      <span className="field-hint">
        {competitionId == null
          ? '전체 대회는 파일이 커서(수만 행) 만드는 데 몇 초 걸릴 수 있어요.'
          : '팀index·활동여부 칸은 저장되는 값이 아니라 빈칸으로 나가요.'}
      </span>

      {exportMutation.error && (
        <div className="upload-feedback">
          <ErrorView message={exportMutation.error.message} />
        </div>
      )}

      {result && !exportMutation.isPending && (
        <div className="upload-info" aria-live="polite">
          <strong>
            내려받았어요
            {/* rowCount 가 null 이면 "모름"이다 — 0 으로 뭉개서 "0행"이라고 거짓말하지 않는다. */}
            {result.rowCount != null && ` · ${result.rowCount.toLocaleString()}행`}
          </strong>
          <span className="field-hint">{result.fileName}</span>
        </div>
      )}
    </section>
  );
}
