import type { GameConflict, NewPlayer } from '../api/types';
// [변경: 2026-09-02 19:30, 김병현 수정] 계획서 §7 Phase 4g — .modal* 일습(포커스 트랩/Esc/
// 포커스 저장·복원/portal 을 손으로 짠 60여 줄) → shadcn AlertDialog(Radix)로 전면 교체.
// Radix 가 포커스 트랩·Esc·포커스 저장복원·aria·portal 을 전부 대신한다.
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

// [변경: 2026-07-29 15:33, 김병현 수정] OverwriteConfirmModal → UploadConfirmModal 로 이름 변경.
// 왜: 이제 이 모달은 '덮어쓰기'만 묻지 않는다. 겹친 경기가 없고 처음 보는 이름만 있을 때도 뜨는데,
// 그때 버튼이 '덮어쓰기'라고 쓰여 있으면 거짓말이다(덮어쓰는 게 없다). 이름이 정확해야 문구도 정확해진다.
//
// [변경: 2026-07-15 14:10, 김병현 수정] 업로드 중복 경기 덮어쓰기 확인 모달 신설.
// 왜 별도 컴포넌트인가: 포커스 트랩/Esc/aria/portal 같은 접근성 기계장치를 화면(UploadPage)
// 코드에서 떼어내 여기 한 곳에만 숨겨두기 위해서다. 소비자는 conflicts/onConfirm/onCancel/busy 만 넘긴다.
// [변경: 2026-07-29 15:33, 김병현 수정] 위 '소비자는 conflicts/…만 넘긴다'는 옛 Props 기준이다 —
// 지금은 conflicts 대신 games + newPlayers 두 배열을 받는다(아래 Props 참고).
interface UploadConfirmModalProps {
  competition: string; // 표시 라벨
  games: GameConflict[]; // 겹친 경기들
  // [변경: 2026-07-29 15:33, 김병현 수정] 필드명 conflicts → games, 이제 빈 배열일 수 있다(처음 보는 이름만 있는 경우).
  newPlayers: NewPlayer[]; // [신설: 2026-07-29 15:33, 김병현 작성] 처음 보는 이름들(없으면 빈 배열)
  busy: boolean; // force 재전송 중(버튼 비활성 + "덮어쓰는 중…")
  onConfirm: () => void; // '덮어쓰기'
  // [변경: 2026-07-29 15:33, 김병현 수정] 위 두 줄의 라벨은 hasGames 일 때 기준이다 —
  // hasGames 가 false 면 버튼 라벨은 '이대로 올리기'/'올리는 중…'이다(아래 분기 참고).
  onCancel: () => void; // '취소'/Esc/백드롭
}

// [신설: 2026-07-29 15:33, 김병현 작성] 새 이름이 아주 많으면 앞 30명만 보여준다.
// (UploadResultCard 의 WARN_PREVIEW=50 과 같은 패턴 — 목록이 무한정 길어지는 걸 막는다.)
const NEW_PLAYER_PREVIEW = 30;

// [신설: 2026-07-29 15:33, 김병현 작성] 표시 전용 — 안 보이는 공백을 ␣ 로 바꿔 눈에 보이게.
// 왜 필요한가: 제안은 'DB 옛 값'이라 앞뒤 공백이나 폭 없는 공백이 들어 있을 수 있다. 그대로 그리면
// "처음 보는 이름 김병현 / 혹시 김병현 ?" 이라는 말도 안 되는 화면이 된다.
// 왜 이 방법인가: 따옴표로 감싸는 방법(혹시 '김병현 ' ?)은 앞뒤 공백만 겨우 보이고 ZWSP 는 여전히
// 안 보인다. <code> 로 감싸도 마찬가지. ␣ 치환만이 '모든' 공백을 실제로 드러낸다.
// ⚠ 표시에만 쓴다. 이 값이 서버로 돌아가거나 저장되는 일은 절대 없다.
// ⚠ p.name 에는 안 쓴다 — 그건 이미 정규화된 값이라 공백이 있을 수 없다.
// [신설: 2026-07-29 15:33, 김병현 작성] ⚠ 서버 playerCheck.normalizePlayerName 의 문자 클래스를
//   '손으로 맞춘' 복사본이다(레포가 달라 코드 공유가 불가능하다).
//   한쪽을 고치면 반드시 다른 쪽도 고칠 것 — 어긋났는지 기계로 대조하는 명령은 §9 / AC 65-b 에 있다.
const WHITESPACE_FOR_DISPLAY = /[\s\u200B-\u200D\uFEFF]/g;
function revealWhitespace(name: string): string {
  return name.replace(WHITESPACE_FOR_DISPLAY, '␣');
}

export function UploadConfirmModal({
  competition,
  games,
  newPlayers,
  busy,
  onConfirm,
  onCancel,
}: UploadConfirmModalProps) {
  // [신설: 2026-07-29 15:33, 김병현 작성] 칸이 둘(겹친 경기 / 처음 보는 이름) 중 뭐가 뜨는지로
  // 제목·리드문단·h3·버튼 라벨·설명 문장이 전부 갈린다. 별도 타입 별칭을 안 만드는 이유는
  // CLAUDE.md 의 인라인 예외(컴포넌트 Props/함수 지역 타입)에 안 맞고, 애초에 불리언 2개로 충분해서다.
  const hasGames = games.length > 0;
  const hasPlayers = newPlayers.length > 0;
  const restCount = Math.max(0, newPlayers.length - NEW_PLAYER_PREVIEW);

  const title =
    hasGames && hasPlayers
      ? '올리기 전에 확인해 주세요'
      : hasPlayers
        ? '처음 보는 선수가 있어요'
        : '이미 있는 경기예요';

  // hasGames && !hasPlayers 일 때는 기존 화면과 글자 하나까지 같아야 한다(AC 60).
  const confirmLabel = hasGames ? '덮어쓰기' : '이대로 올리기';
  const busyLabel = hasGames ? '덮어쓰는 중…' : '올리는 중…';

  return (
    // [변경: 2026-09-02 19:30, 김병현 수정] open 을 프로그램적으로 제어(트리거 버튼 없음) —
    // 409 응답을 받으면 부모(UploadPage)가 conflict state 를 채워 이 컴포넌트를 마운트한다.
    // onOpenChange 는 Esc/바깥 클릭으로 닫힐 때 호출되는데, busy 중엔 무시해야 하는 정책(D5)이라
    // 여기서 한 번 더 막는다 — onEscapeKeyDown 은 Esc 만 잡고 바깥 클릭까지는 안 잡아서다.
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onCancel();
      }}
    >
      <AlertDialogContent
        // ⚠ busy 중엔 Esc 로 못 닫는다(기존 정책). Radix 기본은 닫히므로 여기서 막는다.
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {/* [변경: 2026-09-02 19:30, 김병현 수정] 원래 이 리드 문단은 aria-describedby 대상이
              아니었다(그건 맨 아래 "덮어쓰면…" 문단이었다) — AlertDialogDescription 이 자동으로
              Content 의 aria-describedby 를 자기 자신에 연결해 주므로, 여기(관례상 제목 바로
              아래)에 두는 게 자연스럽고 스크린리더 보강도 오히려 더 즉시 읽힌다(개선, 회귀 아님). */}
          <AlertDialogDescription>
            {hasGames && hasPlayers && (
              <>
                <b>{competition}</b> 대회에 확인할 게 두 가지 있어요.
              </>
            )}
            {hasPlayers && !hasGames && (
              <>
                <b>{competition}</b> 대회에 처음 보는 이름이 {newPlayers.length}명 있어요.
              </>
            )}
            {!hasPlayers && (
              <>
                <b>{competition}</b> 대회에 이미 기록된 경기가 있어요.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* [변경: 2026-09-02 19:30, 김병현 수정] 목록(<ul>)은 AlertDialogDescription(=<p>) 밖에
            둔다 — <p> 안에 <ul> 을 넣으면 HTML 이 무효다. */}
        {hasGames && (
          <>
            {hasPlayers && (
              <h3 className="text-sm font-bold text-secondary-foreground">
                겹친 경기 {games.length}개
              </h3>
            )}
            <ul className="flex list-none flex-col gap-1 rounded-md bg-warning-soft p-3 text-sm">
              {games.map((g) => (
                <li key={`${g.week}-${g.game}`}>
                  {g.week}주차 {g.game}경기 · 기존 {g.existingCount}건
                </li>
              ))}
            </ul>
          </>
        )}

        {hasPlayers && (
          <>
            {hasGames && (
              <h3 className="text-sm font-bold text-secondary-foreground">
                처음 보는 이름 {newPlayers.length}명
              </h3>
            )}
            <ul className="flex list-none flex-col gap-1.5 rounded-md bg-warning-soft p-3 text-sm">
              {newPlayers.slice(0, NEW_PLAYER_PREVIEW).map((p) => (
                <li key={p.name} className="flex flex-wrap items-baseline gap-1.5">
                  <b className="font-bold">{p.name}</b>
                  {p.suggestions.length > 0 && (
                    <span className="text-xs text-secondary-foreground">
                      혹시 {p.suggestions.map(revealWhitespace).join(' / ')} ?
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {restCount > 0 && (
              <span className="text-xs text-muted-foreground">…외 {restCount}명 더</span>
            )}
          </>
        )}

        {/* 안내 문구: 원래 aria-describedby 로 dialog 와 연결돼 있던 문단(스크린리더 보강용).
            지금은 AlertDialogDescription 이 위 리드 문단으로 그 역할을 대신하고, 여기는
            일반 본문으로 남는다(순서는 원본과 동일하게 목록 뒤). */}
        <p className="text-sm text-muted-foreground">
          {hasGames && (
            <>
              덮어쓰면 이 경기의 기존 기록은 새 파일로 통째로 바뀌어요.
              <br />
              그리고 이 파일에 겹치지 않는 새 경기가 있으면, 그건 그대로 함께 추가돼요.
            </>
          )}
          {hasGames && hasPlayers && <br />}
          {hasPlayers && (
            <>이름이 한 글자만 달라도 아예 다른 선수로 기록돼요. 오타면 취소하고 파일을 고친 뒤 다시 올려 주세요.</>
          )}
        </p>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={busy}
            onClick={(e) => {
              // AlertDialogCancel 은 기본적으로 클릭 시 다이얼로그를 닫는다(onOpenChange(false) 유발).
              // busy 중엔 그 기본 동작 자체를 막아야 한다(Esc 와 같은 정책).
              if (busy) e.preventDefault();
            }}
          >
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            // ⚠ Action 은 기본이 '누르면 닫힘'. 여기선 서버 응답 뒤 부모가 conflict 를 지워서
            // 닫으므로(성공 시) 여기서 자동 닫힘을 막고 onConfirm 만 호출한다.
            onClick={(e) => {
              e.preventDefault();
              if (!busy) onConfirm();
            }}
          >
            {busy ? busyLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
