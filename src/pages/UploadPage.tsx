import {
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from 'react';
// [변경: 2026-07-27 11:24, 김병현 수정] 업로드 성공 시 대시보드 자동 이동을 위해 useNavigate 추가
import { Link, useNavigate } from 'react-router-dom';
// [변경: 2026-07-15 10:28, 김병현 수정] 업로드/삭제를 React Query 뮤테이션으로
import { useMutation, useQueryClient } from '@tanstack/react-query';
// 주의: queryKeys 는 import 하지 않는다 — 대회 목록 무효화는 컨텍스트가 노출한 refresh() 를 재사용한다.
import { invalidateAfterUpload } from '../api/queries';
// [변경: 2026-07-15 14:10, 김병현 수정] 409(중복 경기) 판별 에러 — 잡아서 덮어쓰기 확인 모달을 연다.
import { api, UploadConflictError } from '../api/client';
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — useSeason → useCompetition(리네임).
// 대회 목록은 이제 전역 컨텍스트가 들고 있어서(등록/새로고침 공유), 이 화면이 따로 fetch 하지 않는다.
import { useCompetition } from '../context/CompetitionContext';
// [변경: 2026-07-29 15:34, 김병현 수정] 409 에 '처음 보는 이름'이 같이 실려 온다.
import type { Competition, GameConflict, NewPlayer, UploadResult } from '../api/types';
import { ErrorView, Loading } from '../components/states';
// [변경: 2026-07-29 15:34, 김병현 수정] OverwriteConfirmModal → UploadConfirmModal 로 이름 변경.
import { UploadConfirmModal } from '../components/UploadConfirmModal';
// [변경: 2026-08-25 16:40, 김병현 수정] 원본 데이터 내려받기 카드(업로드의 반대 방향).
import { RawDataExportCard } from '../components/RawDataExportCard';
// [변경: 2026-09-02 19:50, 김병현 수정] 아래 8줄 — 계획서 §7 Phase 4g.
// .page* → PageHeader, .card.upload-card → SectionCard, .season-*/.field* → NativeSelect+Input,
// .season-chip* → Badge(data-selected), .dropzone* → Tailwind(data-state), .btn* → Button,
// .upload-warn/.upload-info → Alert, .code-chip* → Badge, .warn-list → list-disc pl-[18px].
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button, buttonVariants } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { NativeSelect, NativeSelectOption } from '../components/ui/native-select';

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
  // [변경: 2026-07-15 10:28, 김병현 수정] invalidateAfterUpload(queryClient) 에서 쓰인다(업로드 성공 시 캐시 정리).
  const queryClient = useQueryClient();
  // [변경: 2026-07-27 11:24, 김병현 수정] 업로드 성공 시 대시보드로 자동 이동하기 위한 네비게이터
  const navigate = useNavigate();
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
  // [변경: 2026-07-15 10:28, 김병현 수정] deletingId/competitionError 제거 → deleteMutation 상태로 대체.

  // 파일 업로드 상태
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // [변경: 2026-07-15 10:28, 김병현 수정] uploading/uploadError/result 제거 → uploadMutation 상태로 대체.
  const fileInputRef = useRef<HTMLInputElement>(null);
  // [변경: 2026-07-15 14:10, 김병현 수정] 409(중복 경기) 응답을 받으면 여기에 담아 확인 모달을 띄운다.
  // [변경: 2026-07-29 15:34, 김병현 수정] 409 에 '처음 보는 이름'이 같이 실려 온다.
  const [conflict, setConflict] = useState<{
    competition: string;
    games: GameConflict[];
    newPlayers: NewPlayer[];
  } | null>(null);

  // 업로드 뮤테이션: 파일+대회정보 → 서버 upsert+적재. 성공 시 광범위 무효화 후 방금 올린 대회로 이동.
  // [변경: 2026-07-15 10:28, 김병현 수정] useApi 대신 React Query useMutation. force 는 409(중복 경기)
  // 확인 모달에서 '덮어쓰기'를 눌렀을 때만 true — 기존 performUpload(force) 흐름은 그대로 유지한다.
  const uploadMutation = useMutation({
    mutationFn: (vars: {
      file: File;
      c: { year: number; seasonNo: number | null; name: string };
      force: boolean;
    }) => api.upload(vars.file, vars.c, { force: vars.force }), // mode 기본 'replace'
    onSuccess: async (res) => {
      setConflict(null); // 성공 → 모달 닫기(기존 catch 분기와 동일한 동작 유지)
      // append 모드는 competitionId 가 그대로라 세부 키가 안 바뀜 → 리소스 접두어로 통째 무효화(fan-out).
      await invalidateAfterUpload(queryClient);
      setCompetitionId(res.competitionId); // 방금 올린 대회로 이동 → 바로 확인
      // [변경: 2026-07-27 11:24, 김병현 수정] 업로드 완료 시 대시보드로 자동 이동.
      // 방금 올린 대회가 전역 필터로 선택된 상태라, 대시보드의 '경기 단위 통계'가
      // 그 대회의 최신 경기(=방금 올린 경기)를 기본으로 바로 보여준다.
      navigate('/');
    },
    // 409(중복 경기)면 모달을 열고, 그 외 에러는 uploadMutation.error 로 남겨 인라인 ErrorView 로 보여준다
    // (기존 try/catch 의 "UploadConflictError 면 모달, 아니면 uploadError" 상호배타 분기를 그대로 옮김).
    onError: (err) => {
      if (err instanceof UploadConflictError) {
        setConflict({ competition: err.competition, games: err.games, newPlayers: err.newPlayers });
      }
    },
  });

  // 대회 등록 해제 뮤테이션. 성공 시 컨텍스트의 refresh() 로 대회 목록만 무효화.
  // (경기 있는 대회는 서버가 409 로 막아 종속 무효화 불필요.
  //  "대회 목록 무효화" 지식은 컨텍스트에 이미 있으니 여기서 재구현하지 않고 재사용한다 = 정보은닉.)
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCompetition(id),
    onSuccess: () => refresh(),
  });

  // 대회명이 비어 있으면 라벨을 만들 수 없으니 미리보기도 비운다(입력 중엔 조용히 기다린다).
  const trimmedName = name.trim();
  const preview = trimmedName ? competitionLabel(year, seasonNo, trimmedName) : null;
  // [변경: 2026-07-15 10:28, 김병현 수정] uploading → uploadMutation.isPending
  const canUpload = !!file && !!trimmedName && year > 0 && !uploadMutation.isPending;
  // [변경: 2026-07-15 10:28, 김병현 수정] uploadMutation.error 파생값. UploadConflictError 는 모달로 따로
  // 보여주므로 인라인 에러 박스에서는 제외한다(기존 catch 분기와 동일한 상호배타 유지).
  const uploadError =
    uploadMutation.error && !(uploadMutation.error instanceof UploadConflictError)
      ? uploadMutation.error.message
      : null;
  const result = uploadMutation.data ?? null;

  // 등록된 칩을 누르면 그 대회의 (연도,시즌번호,대회명)으로 선택값을 채운다.
  function pickRegistered(c: Competition) {
    setYear(c.year);
    setSeasonNo(c.seasonNo);
    setName(c.name);
  }

  // 대회 등록 해제. FK(Restrict) 때문에 경기 기록이 있는 대회는 서버가 409 로 막는다 —
  // 그 경우 에러 메시지를 그대로 사람이 읽는 문구로 보여준다.
  // [변경: 2026-07-15 10:28, 김병현 수정] try/catch/finally → deleteMutation.mutate (이전 에러/상태는 mutate 가 알아서 리셋)
  function handleDelete(id: number) {
    deleteMutation.mutate(id);
  }

  // 파일 선택 확정(클릭 or 드롭 공용). 새 파일을 고르면 이전 결과/에러는 지운다.
  // [변경: 2026-07-15 10:28, 김병현 수정] setUploadError(null)+setResult(null) → uploadMutation.reset()
  function pickFile(next: File | null) {
    setFile(next);
    uploadMutation.reset();
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) pickFile(dropped);
  }

  // "또 올리기": 파일만 비우고 대회 선택은 유지(같은 대회에 다음 경기 올릴 때 편하게).
  // [변경: 2026-07-15 10:28, 김병현 수정] setUploadError(null)+setResult(null) → uploadMutation.reset()
  function resetFile() {
    setFile(null);
    uploadMutation.reset();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // 업로드: 파일 + 대회 정보(연도/시즌번호/대회명)를 서버로 보낸다.
  // 별도 등록 호출이 없다 — 서버가 POST /upload 안에서 대회를 upsert(멱등)하고 그 id 로 적재한다.
  // [변경: 2026-07-15 14:10, 김병현 수정] 제출과 '덮어쓰기 확인' 재전송이 같은 경로를 타도록 통합.
  // force=false 로 먼저 시도 → 서버가 409(중복)면 모달을 띄우고, 사용자가 확인하면 force=true 로 재전송.
  // 재전송에 필요한 file/year/seasonNo/trimmedName 은 이미 이 컴포넌트 state 에 그대로 남아 있어
  // (모달이 뜬 동안 화면 입력은 안 바뀜) 별도 스냅샷 없이 그대로 재사용한다.
  // [변경: 2026-07-15 10:28, 김병현 수정] try/catch/finally → uploadMutation.mutate
  function performUpload(force: boolean) {
    if (!file) return;
    uploadMutation.mutate({ file, c: { year, seasonNo, name: trimmedName }, force });
  }

  function handleUpload(e: FormEvent) {
    e.preventDefault();
    performUpload(false);
  }

  // [신설: 2026-09-02 19:50, 김병현 작성] 옛 `dropzone${dragOver?...}${file?...}` 템플릿 리터럴
  // 상태 클래스를 data-state 속성으로 바꿨다(AC 66 — className 안 ${} 상태 클래스 0건).
  const dropzoneState = dragOver ? 'drag' : file ? 'file' : undefined;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="기록지 업로드"
        sub="대회(연도+시즌번호+대회명)를 정하고 엑셀(.xlsx) 기록지를 올리면 서버가 읽어서 저장해요."
      />

      {/* 1) 대회 — 엑셀엔 대회 칸이 없어서 여기서 연도+시즌번호+대회명으로 정한다. 업로드 시 자동 등록(upsert). */}
      <SectionCard
        title="대회"
        note={
          <>
            선택한 대회: <b>{preview ?? '대회명을 입력하세요'}</b>
          </>
        }
        className="max-w-[660px]"
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">연도</span>
            <NativeSelect
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-label="연도 선택"
            >
              {YEAR_OPTIONS.map((y) => (
                <NativeSelectOption key={y} value={y}>
                  {y}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>

          {/* 시즌번호(선택) — 라벨/필드명은 그대로 "시즌번호". 지정안함 토글로 null ↔ 값을 오간다. */}
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">시즌번호</span>
            <div className="flex items-center gap-1.5">
              <Input
                className="w-[84px]"
                type="number"
                min={1}
                value={seasonNo ?? ''}
                disabled={seasonNo == null}
                onChange={(e) => setSeasonNo(parseSeasonNoInput(e.target.value))}
                aria-label="시즌번호 입력"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSeasonNo((prev) => (prev == null ? 1 : null))}
              >
                {seasonNo != null ? '지정안함' : '시즌번호 지정'}
              </Button>
            </div>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">대회명</span>
            <Input
              className="max-w-[320px]"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 나이배"
              aria-label="대회명 입력"
            />
          </label>

          <span className="pb-1.5 text-sm text-secondary-foreground" aria-live="polite">
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
        <div className="mt-3.5 flex flex-col gap-2">
          {competitionsLoading && <Loading label="등록된 대회 불러오는 중…" />}
          {competitionsError && <ErrorView message={competitionsError} onRetry={refresh} />}
          {competitions.length > 0 && (
            <>
              <span className="text-xs text-muted-foreground">등록된 대회 (눌러서 선택)</span>
              <div className="flex flex-wrap gap-2">
                {competitions.map((c) => {
                  const isSelected = c.label === preview;
                  return (
                    // [변경: 2026-09-02 19:50, 김병현 수정] .season-chip.is-selected →
                    // data-selected 속성 + group(계획서 §5-3). aria-pressed 는 그대로 유지.
                    <Badge
                      key={c.id}
                      variant="outline"
                      data-selected={isSelected}
                      className="group h-auto gap-0 overflow-hidden rounded-full p-0 data-[selected=true]:border-primary data-[selected=true]:bg-primary/12"
                    >
                      <button
                        type="button"
                        className="px-3.5 py-1.5 text-[13px] font-semibold group-data-[selected=true]:text-primary"
                        onClick={() => pickRegistered(c)}
                        aria-pressed={isSelected}
                      >
                        {c.label}
                      </button>
                      {/* [변경: 2026-07-15 10:28, 김병현 수정] deletingId → deleteMutation 진행 상태(어느 칩이 삭제 중인지는 variables 로 구분) */}
                      <button
                        type="button"
                        className="px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => handleDelete(c.id)}
                        disabled={deleteMutation.isPending && deleteMutation.variables === c.id}
                        aria-label={`${c.label} 등록 해제`}
                        title="등록 해제"
                      >
                        ✕
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </>
          )}
          {/* [변경: 2026-07-15 10:28, 김병현 수정] competitionError → deleteMutation.error.message */}
          {deleteMutation.error && (
            <span className="text-xs text-warning-foreground">{deleteMutation.error.message}</span>
          )}
        </div>
      </SectionCard>

      {/* 2) 파일 업로드 — 경기/주차/쿼터/선수/스텟/팀은 파일 안에서 읽는다 */}
      <Card className="max-w-[660px]">
        <form onSubmit={handleUpload}>
          <CardContent className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-base leading-snug font-medium">
                기록지 파일 (.xlsx)
              </h2>
              <span className="text-sm text-muted-foreground">
                업로드 대상: <b>{preview ?? '대회명을 입력하세요'}</b>
              </span>
            </div>

            <label
              data-state={dropzoneState}
              className="relative flex min-h-30 cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-dashed border-baseline p-5 text-center transition-colors hover:border-primary hover:bg-primary/5 data-[state=drag]:border-solid data-[state=drag]:bg-primary/10 data-[state=file]:border-solid data-[state=file]:border-chart-2 data-[state=file]:bg-chart-2/7"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                className="absolute inset-0 cursor-pointer opacity-0"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <span className="pointer-events-none inline-flex items-center gap-2.5 text-secondary-foreground">
                  <span className="text-2xl" aria-hidden="true">
                    📄
                  </span>
                  <span className="font-semibold break-all text-foreground">{file.name}</span>
                  <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                </span>
              ) : (
                <span className="pointer-events-none inline-flex items-center gap-2.5 text-secondary-foreground">
                  <span className="text-2xl" aria-hidden="true">
                    📥
                  </span>
                  <span>여기로 .xlsx 파일을 끌어다 놓거나 눌러서 고르세요</span>
                </span>
              )}
            </label>
            {file && !looksLikeXlsx(file) && (
              <span className="text-xs text-warning-foreground">
                .xlsx 파일이 아닌 것 같아요. 기록지 원본(.xlsx)이 맞는지 확인해 주세요.
              </span>
            )}

            {/* [변경: 2026-07-15 10:28, 김병현 수정] uploading → uploadMutation.isPending */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button type="submit" disabled={!canUpload}>
                {uploadMutation.isPending ? '업로드 중…' : preview ? `${preview} 로 업로드` : '업로드'}
              </Button>
              {file && !uploadMutation.isPending && (
                <Button type="button" variant="outline" onClick={resetFile}>
                  파일 지우기
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                같은 대회·경기를 다시 올리면 그 경기 기록만 새 파일로 덮어써요.
              </span>
            </div>
          </CardContent>
        </form>
      </Card>

      {uploadError && (
        <div className="max-w-[660px]">
          <ErrorView message={uploadError} />
        </div>
      )}

      {/* [변경: 2026-07-27 11:24, 김병현 수정] 성공 시 곧바로 대시보드로 이동하므로 이 카드는
          사실상 안 보인다(이동 전 찰나의 렌더 대비 안전망으로만 유지). */}
      {result && <UploadResultCard result={result} onReset={resetFile} />}

      {/* 3) 원본 데이터 내려받기 — 업로드의 반대 방향.
          업로드 폼 아래에 두는 이유: 이 화면에 온 사람의 주 목적은 '올리기'라,
          내려받기가 위에 있으면 매번 지나쳐야 한다. */}
      <RawDataExportCard />

      {/* [변경: 2026-07-15 14:10, 김병현 수정] 409(중복 경기) → 덮어쓰기 확인 모달.
          취소는 setConflict(null) 만 — 파일/대회 선택은 그대로 두고(에러 아님) 모달만 닫는다. */}
      {/* [변경: 2026-07-29 15:34, 김병현 수정] OverwriteConfirmModal → UploadConfirmModal, newPlayers 추가. */}
      {conflict && (
        <UploadConfirmModal
          competition={conflict.competition}
          games={conflict.games}
          newPlayers={conflict.newPlayers}
          // [변경: 2026-07-15 10:28, 김병현 수정] uploading → uploadMutation.isPending
          busy={uploadMutation.isPending}
          onConfirm={() => performUpload(true)}
          onCancel={() => setConflict(null)}
        />
      )}
    </div>
  );
}

// 업로드 성공 결과 카드: 적재 건수 + (있으면) 미등록 코드/경고 + 다음 행동 링크.
// [변경: 2026-09-02 19:50, 김병현 수정] 아이콘+제목+부제 조합 헤더가 SectionCard 의 표준
// 레이아웃(제목=h2 한 줄)과 달라서 Card 를 직접 쓴다(계획서 §3 "특이 헤더는 Card 직접 사용").
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
  // [신설: 2026-07-31 15:03, 김병현 작성] 한글로 친 코드를 자동 인식한 게 있으면 알려 준다.
  // ?? [] 인 이유: 타입은 필수 필드지만, 옛 서버 응답(캐시·배포 중 롤백·프록시가 물고 있던 응답)이
  //   섞이면 undefined 가 온다. 그때 .length 로 터지면 업로드는 됐는데 결과 카드가 통째로 하얘진다.
  //   위험이 낮다는 게 방어를 안 할 이유는 못 된다 — 글자 세 개로 0 이 된다.
  // 자르지 않는 이유: 되돌려서 코드가 될 수 있는 한글 조합은 이론상 최대 41가지뿐이다(전수 확인함).
  const hangulFixes = result.hangulCodes ?? [];
  const hangulRows = hangulFixes.reduce((sum, h) => sum + h.count, 0);
  // [신설: 2026-07-31 15:03, 김병현 작성] '스틸 자모가 턴오버로 읽힌다'는 주의는 T 로 읽은 게 있을 때만 띄운다.
  // 상관없는 주의를 매번 보여 주면 무뎌져서 정작 필요할 때 안 읽는다
  // (이 블록을 경고(warnings)와 따로 둔 것과 같은 이유다).
  const hasTurnover = hangulFixes.some((h) => h.to === 'T');

  return (
    <Card className="max-w-[660px]">
      <CardContent className="flex flex-col gap-3.5">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">
            ✅
          </span>
          <div>
            <strong className="text-base">업로드 완료</strong>
            <p className="mt-1 text-secondary-foreground">
              <b>{result.competition}</b> 대회에 {result.imported.toLocaleString()}건 적재
              <span className="mx-1.5">·</span>시트 {result.sheet}
              <span className="mx-1.5">·</span>
              {result.mode === 'replace' ? '그 경기 교체' : '증분 추가'}
            </p>
          </div>
        </div>

        {hangulFixes.length > 0 && (
          <Alert className="border-info-soft bg-info-soft">
            <AlertTitle>
              한글로 입력된 코드 {hangulFixes.length}종 {hangulRows.toLocaleString()}건을 자동 인식했어요
            </AlertTitle>
            <AlertDescription>
              <div className="flex flex-wrap gap-1.5">
                {hangulFixes.map((h) => (
                  <Badge
                    key={h.from}
                    variant="outline"
                    className="border-transparent bg-info-chip font-mono text-info-foreground"
                  >
                    {h.from} → {h.to} · {h.count.toLocaleString()}건
                  </Badge>
                ))}
              </div>
              <p className="mt-2">
                한영 전환을 깜빡하고 친 것으로 보여, 자판을 되돌려 읽었어요. <b>위 목록이 기록지에 적은 뜻과
                같은지 한 번만 봐 주세요.</b>
                {hasTurnover && (
                  <> 특히 스틸 뜻으로 적은 <code>ㅅ</code> 은 턴오버(<code>T</code>)로 읽힙니다.</>
                )}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {hasUnknown && (
          <Alert className="border-warning-soft bg-warning-soft">
            <AlertTitle>사전에 없는 스텟 코드 {result.unknownCodes.length}종</AlertTitle>
            <AlertDescription>
              <div className="flex flex-wrap gap-1.5">
                {result.unknownCodes.map((code) => (
                  <Badge
                    key={code}
                    variant="outline"
                    className="border-transparent bg-warning-chip font-mono text-warning-foreground"
                  >
                    {code}
                  </Badge>
                ))}
              </div>
              <p className="mt-2">기록지 오타일 수 있어요. 그래도 적재는 됐으니, 원본에서 한번 확인해 보세요.</p>
            </AlertDescription>
          </Alert>
        )}

        {hasWarnings && (
          <details className="text-sm text-secondary-foreground">
            <summary className="cursor-pointer font-semibold">
              경고 {result.warnings.length}건 자세히 보기
            </summary>
            {/* [변경: 2026-09-02 19:50, 김병현 수정] .warn-list → list-disc pl-[18px] 로 직접 지정
                (계획서 §5-5). preflight 가 지운 불릿을 되살리던 legacy 보정 CSS(.warn-list{list-style:disc})
                는 이 화면이 마지막 사용처라 styles.css 에서 같이 삭제한다. */}
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-[18px]">
              {result.warnings.slice(0, WARN_PREVIEW).map((w, i) => (
                <li key={`${w.row}-${i}`}>
                  {w.row}행 · {w.player} · <code>{w.code}</code>
                </li>
              ))}
            </ul>
            {result.warnings.length > WARN_PREVIEW && (
              <span className="text-xs text-muted-foreground">
                …외 {result.warnings.length - WARN_PREVIEW}건
              </span>
            )}
          </details>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          {/* [변경: 2026-09-02 19:50, 김병현 수정] Button asChild 대신 buttonVariants 를 Link 에 직접
              적용 — Radix 트리거 문맥이 아니라 순수 내비게이션 링크라 asChild 자체는 안전하지만
              (Phase 2 에서 확인), 콘솔 경고까지 없애려면 이 방법이 더 낫다(계획서 §D5 우회법 응용). */}
          <Link to="/games" className={buttonVariants({})}>
            경기로 확인하기
          </Link>
          <Link to="/" className={buttonVariants({ variant: 'outline' })}>
            대시보드
          </Link>
          <Button type="button" variant="outline" onClick={onReset}>
            또 올리기
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
