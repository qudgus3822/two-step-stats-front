import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { useSeason } from '../context/SeasonContext';
import type { UploadResult } from '../api/types';
import { ErrorView, Loading } from '../components/states';

// 기록지 엑셀 업로드 화면.
// 엑셀엔 시즌 컬럼이 없어서(주차/경기/쿼터/선수/스텟/팀명 6개뿐) 시즌은 자유 입력이 아니라
// 'DB에 등록된 시즌' 중에서 고른다 → 라벨 오타/표기흔들림 방지. 이 화면에서 시즌 등록도 한다.
// 고른 시즌명 + 파일을 서버로 보내면 파싱→DB 적재는 전부 백엔드(POST /upload)가 한다.
// 같은 (시즌, 경기)를 다시 올리면 그 경기만 덮어쓴다(서버 replace 규칙).

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

export function UploadPage() {
  const { setSeason: setGlobalSeason, refresh } = useSeason();

  // 등록된 시즌 목록 (허용 시즌명 사전)
  const {
    data: seasons,
    loading: seasonsLoading,
    error: seasonsError,
    reload: reloadSeasons,
  } = useApi(() => api.seasonRegistry(), []);

  // 시즌 등록/선택 상태
  const [selected, setSelected] = useState(''); // 업로드 대상 시즌명
  const [newName, setNewName] = useState(''); // 새로 등록할 시즌명
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [seasonError, setSeasonError] = useState<string | null>(null);

  // 파일 업로드 상태
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 목록이 바뀌면 선택값을 유효하게 유지: 지워졌거나 아직 없으면 첫 시즌(또는 없음)으로.
  useEffect(() => {
    if (!seasons) return;
    const names = seasons.map((s) => s.name);
    setSelected((cur) => (cur && names.includes(cur) ? cur : names[0] ?? ''));
  }, [seasons]);

  const canUpload = !!selected && !!file && !uploading;

  // 시즌 등록: 등록 후 목록 새로고침 + 방금 등록한 시즌을 업로드 대상으로 선택.
  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || registering) return;
    setRegistering(true);
    setSeasonError(null);
    try {
      const created = await api.createSeason(name);
      setNewName('');
      setSelected(created.name);
      await reloadSeasons();
    } catch (err) {
      setSeasonError(err instanceof Error ? err.message : String(err));
    } finally {
      setRegistering(false);
    }
  }

  // 시즌 등록 해제 (경기 기록은 서버에서 유지됨 — 허용 목록에서만 빠진다)
  async function handleDelete(id: number) {
    setDeletingId(id);
    setSeasonError(null);
    try {
      await api.deleteSeason(id);
      await reloadSeasons();
    } catch (err) {
      setSeasonError(err instanceof Error ? err.message : String(err));
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

  // "또 올리기": 파일만 비우고 시즌 선택은 유지(같은 시즌에 다음 경기 올릴 때 편하게).
  function resetFile() {
    setFile(null);
    setUploadError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!file || !selected) return;
    setUploading(true);
    setUploadError(null);
    setResult(null);
    try {
      const res = await api.upload(file, selected);
      setResult(res);
      await refresh(); // 새 시즌이 상단 시즌선택 드롭다운에 뜨도록 목록 새로고침
      setGlobalSeason(res.season); // 방금 올린 시즌으로 전역 필터 이동 → 바로 확인 가능
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
          시즌을 고르고 엑셀(.xlsx) 기록지를 올리면 서버가 읽어서 저장해요.
        </p>
      </div>

      {/* 1) 시즌 — 자유 입력이 아니라 등록된 시즌 중에서 고른다. 없으면 여기서 등록. */}
      <section className="card upload-card">
        <div className="card-head">
          <h2 className="card-title">시즌</h2>
          <span className="card-note">엑셀엔 시즌 정보가 없어서 여기서 골라야 해요</span>
        </div>

        {seasonsLoading && <Loading label="시즌 목록 불러오는 중…" />}
        {seasonsError && <ErrorView message={seasonsError} onRetry={reloadSeasons} />}

        {seasons && (
          <>
            {seasons.length > 0 ? (
              <div className="season-chips">
                {seasons.map((s) => (
                  <div
                    key={s.id}
                    className={`season-chip${selected === s.name ? ' is-selected' : ''}`}
                  >
                    <button
                      type="button"
                      className="season-chip-name"
                      onClick={() => setSelected(s.name)}
                      aria-pressed={selected === s.name}
                    >
                      {s.name}
                    </button>
                    <button
                      type="button"
                      className="season-chip-del"
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                      aria-label={`${s.name} 등록 해제`}
                      title="등록 해제"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="field-hint">등록된 시즌이 없어요. 아래에서 새 시즌을 먼저 등록하세요.</p>
            )}

            {/* 새 시즌 등록 */}
            <form className="season-register" onSubmit={handleRegister}>
              <input
                className="search field-input"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="새 시즌 이름 (예: 나이배)"
                aria-label="새 시즌 이름"
              />
              <button
                type="submit"
                className="btn"
                disabled={!newName.trim() || registering}
              >
                {registering ? '등록 중…' : '시즌 등록'}
              </button>
            </form>
            {seasonError && (
              <span className="field-hint field-hint--warn">{seasonError}</span>
            )}
          </>
        )}
      </section>

      {/* 2) 파일 업로드 — 경기/주차/쿼터/선수/스텟/팀은 파일 안에서 읽는다 */}
      <form className="card upload-card" onSubmit={handleUpload}>
        <div className="card-head">
          <h2 className="card-title">기록지 파일 (.xlsx)</h2>
          <span className="card-note">
            {selected ? (
              <>
                업로드 대상: <b>{selected}</b>
              </>
            ) : (
              '위에서 시즌을 먼저 고르세요'
            )}
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
            {uploading ? '업로드 중…' : '업로드'}
          </button>
          {file && !uploading && (
            <button type="button" className="btn" onClick={resetFile}>
              파일 지우기
            </button>
          )}
          <span className="field-hint">
            같은 시즌·경기를 다시 올리면 그 경기 기록만 새 파일로 덮어써요.
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
            <b>{result.season}</b> 시즌에 {result.imported.toLocaleString()}건 적재
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
