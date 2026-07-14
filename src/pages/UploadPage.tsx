import {
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — useSeason → useCompetition(리네임).
// 대회 목록은 이제 전역 컨텍스트가 들고 있어서(등록/새로고침 공유), 이 화면이 따로 fetch 하지 않는다.
import { useCompetition } from '../context/CompetitionContext';
import type { Competition, UploadResult } from '../api/types';
import { ErrorView, Loading } from '../components/states';

// 기록지 엑셀 업로드 화면.
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — 업로드할 엑셀은 여전히 6컬럼
// (주차/경기/쿼터/선수/스텟/팀명)이라 '대회' 정보가 없다. 그래서 대회는 여기서
// '연도 + 시즌번호(선택) + 대회명' 3개를 입력받아 정한다(파일 안에서 안 읽음).
// 고른 대회는 업로드할 때 서버가 자동으로 upsert 한다(이미 있으면 그대로 재사용 — 멱등).
// 파싱→DB 적재는 전부 백엔드(POST /upload). 같은 (대회,경기) 재업로드는 그 경기만 덮어쓴다.

// 연도+시즌번호(선택)+대회명 → 라벨.
// [변경: 2026-07-14 17:32, 김병현 수정] 규칙 동기화 주의: 이 함수는 백엔드
// competition.service.ts 의 competitionLabel() 과 반드시 글자 그대로 동일해야 한다.
// (여긴 업로드 전 "미리보기" 전용이고, 실제 저장되는 라벨은 서버가 만든다 — 화면 표시는
// 대부분 서버가 준 label 을 그대로 쓰므로 이 복제가 어긋나도 실제 데이터는 안전하다.)
function competitionLabel(year: number, seasonNo: number | null, name: string): string {
  return seasonNo != null ? `${year} 시즌${seasonNo} · ${name}` : `${year} ${name}`;
}

// 바이트를 사람이 읽는 크기로 (파일 미리보기용)
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// .xlsx 인지 대략 확인 (서버도 검증하지만, 올리기 전에 미리 안내)
function looksLikeXlsx(file: File): boolean {
  return /\.xlsx$/i.test(file.name);
}

// 시즌번호 입력값 → 안전한 양의 정수(파싱 실패/0 이하면 1).
function parseSeasonNoInput(raw: string): number {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// 연도 선택 후보: 올해 기준으로 최근 몇 년(고정 리스트가 아니라 넉넉히). 2023~2030 정도면 충분.
const YEAR_OPTIONS = [2030, 2029, 2028, 2027, 2026, 2025, 2024, 2023];

export function UploadPage() {
  const {
    competitions,
    refresh,
    setCompetitionId,
    loading: competitionsLoading,
    error: competitionsError,
  } = useCompetition();

  // 대회 선택 상태 (연도 + 시즌번호(선택) + 대회명). 라벨은 이 셋으로 자동 조합.
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [seasonNo, setSeasonNo] = useState<number | null>(null);
  const [name, setName] = useState<string>('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [competitionError, setCompetitionError] = useState<string | null>(null);

  // 파일 업로드 상태
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 대회명이 비어 있으면 라벨을 만들 수 없으니 미리보기도 비운다(입력 중엔 조용히 기다린다).
  const trimmedName = name.trim();
  const preview = trimmedName ? competitionLabel(year, seasonNo, trimmedName) : null;
  const canUpload = !!file && !!trimmedName && year > 0 && !uploading;

  // 등록된 칩을 누르면 그 대회의 (연도,시즌번호,대회명)으로 선택값을 채운다.
  function pickRegistered(c: Competition) {
    setYear(c.year);
    setSeasonNo(c.seasonNo);
    setName(c.name);
  }

  // 대회 등록 해제. FK(Restrict) 때문에 경기 기록이 있는 대회는 서버가 409 로 막는다 —
  // 그 경우 에러 메시지를 그대로 사람이 읽는 문구로 보여준다.
  async function handleDelete(id: number) {
    setDeletingId(id);
    setCompetitionError(null);
    try {
      await api.deleteCompetition(id);
      await refresh();
    } catch (err) {
      setCompetitionError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingId(null);
    }
  }

  // 파일 선택 확정(클릭 or 드롭 공용). 새 파일을 고르면 이전 결과/에러는 지운다.
  function pickFile(next: File | null) {
    setFile(next);
    setUploadError(null);
    setResult(null);
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) pickFile(dropped);
  }

  // "또 올리기": 파일만 비우고 대회 선택은 유지(같은 대회에 다음 경기 올릴 때 편하게).
  function resetFile() {
    setFile(null);
    setUploadError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // 업로드: 파일 + 대회 정보(연도/시즌번호/대회명)를 서버로 보낸다.
  // 별도 등록 호출이 없다 — 서버가 POST /upload 안에서 대회를 upsert(멱등)하고 그 id 로 적재한다.
  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setResult(null);
    try {
      const res = await api.upload(file, { year, seasonNo, name: trimmedName });
      setResult(res);
      await refresh(); // 새로 등록된 대회가 아래 칩/전역 목록에 뜨도록
      setCompetitionId(res.competitionId); // 방금 올린 대회로 이동 → 바로 확인
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">기록지 업로드</h1>
        <p className="page-sub">
          대회(연도+시즌번호+대회명)를 정하고 엑셀(.xlsx) 기록지를 올리면 서버가 읽어서 저장해요.
        </p>
      </div>

      {/* 1) 대회 — 엑셀엔 대회 칸이 없어서 여기서 연도+시즌번호+대회명으로 정한다. 업로드 시 자동 등록(upsert). */}
      <section className="card upload-card">
        <div className="card-head">
          <h2 className="card-title">대회</h2>
          <span className="card-note">
            선택한 대회: <b>{preview ?? '대회명을 입력하세요'}</b>
          </span>
        </div>

        <div className="season-compose">
          <label className="field season-field">
            <span className="field-label">연도</span>
            <select
              className="select"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-label="연도 선택"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          {/* 시즌번호(선택) — 라벨/필드명은 그대로 "시즌번호". 지정안함 토글로 null ↔ 값을 오간다. */}
          <div className="field season-field">
            <span className="field-label">시즌번호</span>
            <div className="season-seasonno">
              <input
                className="select"
                type="number"
                min={1}
                value={seasonNo ?? ''}
                disabled={seasonNo == null}
                onChange={(e) => setSeasonNo(parseSeasonNoInput(e.target.value))}
                aria-label="시즌번호 입력"
              />
              <button
                type="button"
                className="btn"
                onClick={() => setSeasonNo((prev) => (prev == null ? 1 : null))}
              >
                {seasonNo != null ? '지정안함' : '시즌번호 지정'}
              </button>
            </div>
          </div>

          <label className="field season-field">
            <span className="field-label">대회명</span>
            <input
              className="search field-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 나이배"
              aria-label="대회명 입력"
            />
          </label>

          <span className="season-label-preview" aria-live="polite">
            {preview ? (
              <>
                → <b>{preview}</b> 로 저장돼요
              </>
            ) : (
              '대회명을 입력하면 저장될 라벨이 여기 나와요'
            )}
          </span>
        </div>

        {/* 이미 등록된 대회 (눌러서 빠르게 선택 / ✕ 로 등록 해제) */}
        <div className="season-registered">
          {competitionsLoading && <Loading label="등록된 대회 불러오는 중…" />}
          {competitionsError && (
            <ErrorView message={competitionsError} onRetry={refresh} />
          )}
          {competitions.length > 0 && (
            <>
              <span className="field-hint">등록된 대회 (눌러서 선택)</span>
              <div className="season-chips">
                {competitions.map((c) => (
                  <div
                    key={c.id}
                    className={`season-chip${c.label === preview ? ' is-selected' : ''}`}
                  >
                    <button
                      type="button"
                      className="season-chip-name"
                      onClick={() => pickRegistered(c)}
                      aria-pressed={c.label === preview}
                    >
                      {c.label}
                    </button>
                    <button
                      type="button"
                      className="season-chip-del"
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      aria-label={`${c.label} 등록 해제`}
                      title="등록 해제"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {competitionError && (
            <span className="field-hint field-hint--warn">{competitionError}</span>
          )}
        </div>
      </section>

      {/* 2) 파일 업로드 — 경기/주차/쿼터/선수/스텟/팀은 파일 안에서 읽는다 */}
      <form className="card upload-card" onSubmit={handleUpload}>
        <div className="card-head">
          <h2 className="card-title">기록지 파일 (.xlsx)</h2>
          <span className="card-note">
            업로드 대상: <b>{preview ?? '대회명을 입력하세요'}</b>
          </span>
        </div>

        <label
          className={`dropzone${dragOver ? ' is-dragover' : ''}${file ? ' has-file' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            className="dropzone-input"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <span className="dropzone-file">
              <span className="dropzone-icon" aria-hidden="true">
                📄
              </span>
              <span className="dropzone-name">{file.name}</span>
              <span className="dropzone-size">{formatBytes(file.size)}</span>
            </span>
          ) : (
            <span className="dropzone-empty">
              <span className="dropzone-icon" aria-hidden="true">
                📥
              </span>
              <span>여기로 .xlsx 파일을 끌어다 놓거나 눌러서 고르세요</span>
            </span>
          )}
        </label>
        {file && !looksLikeXlsx(file) && (
          <span className="field-hint field-hint--warn">
            .xlsx 파일이 아닌 것 같아요. 기록지 원본(.xlsx)이 맞는지 확인해 주세요.
          </span>
        )}

        <div className="upload-actions">
          <button type="submit" className="btn btn--primary" disabled={!canUpload}>
            {uploading ? '업로드 중…' : preview ? `${preview} 로 업로드` : '업로드'}
          </button>
          {file && !uploading && (
            <button type="button" className="btn" onClick={resetFile}>
              파일 지우기
            </button>
          )}
          <span className="field-hint">
            같은 대회·경기를 다시 올리면 그 경기 기록만 새 파일로 덮어써요.
          </span>
        </div>
      </form>

      {uploadError && (
        <div className="upload-feedback">
          <ErrorView message={uploadError} />
        </div>
      )}

      {result && <UploadResultCard result={result} onReset={resetFile} />}
    </div>
  );
}

// 업로드 성공 결과 카드: 적재 건수 + (있으면) 미등록 코드/경고 + 다음 행동 링크.
function UploadResultCard({
  result,
  onReset,
}: {
  result: UploadResult;
  onReset: () => void;
}) {
  const WARN_PREVIEW = 50; // 경고가 많으면 앞에서 이만큼만 미리보기
  const hasUnknown = result.unknownCodes.length > 0;
  const hasWarnings = result.warnings.length > 0;

  return (
    <div className="card upload-result">
      <div className="upload-result-head">
        <span className="upload-result-icon" aria-hidden="true">
          ✅
        </span>
        <div>
          <strong className="upload-result-title">업로드 완료</strong>
          <p className="upload-result-sub">
            <b>{result.competition}</b> 대회에 {result.imported.toLocaleString()}건 적재
            <span className="dot-sep">·</span>시트 {result.sheet}
            <span className="dot-sep">·</span>
            {result.mode === 'replace' ? '그 경기 교체' : '증분 추가'}
          </p>
        </div>
      </div>

      {hasUnknown && (
        <div className="upload-warn">
          <strong>사전에 없는 스텟 코드 {result.unknownCodes.length}종</strong>
          <div className="code-chips">
            {result.unknownCodes.map((code) => (
              <span key={code} className="code-chip">
                {code}
              </span>
            ))}
          </div>
          <span className="field-hint">
            기록지 오타일 수 있어요. 그래도 적재는 됐으니, 원본에서 한번 확인해 보세요.
          </span>
        </div>
      )}

      {hasWarnings && (
        <details className="upload-warn-detail">
          <summary>경고 {result.warnings.length}건 자세히 보기</summary>
          <ul className="warn-list">
            {result.warnings.slice(0, WARN_PREVIEW).map((w, i) => (
              <li key={`${w.row}-${i}`}>
                {w.row}행 · {w.player} · <code>{w.code}</code>
              </li>
            ))}
          </ul>
          {result.warnings.length > WARN_PREVIEW && (
            <span className="field-hint">…외 {result.warnings.length - WARN_PREVIEW}건</span>
          )}
        </details>
      )}

      <div className="upload-actions">
        <Link className="btn btn--primary" to="/games">
          경기로 확인하기
        </Link>
        <Link className="btn" to="/">
          대시보드
        </Link>
        <button type="button" className="btn" onClick={onReset}>
          또 올리기
        </button>
      </div>
    </div>
  );
}
