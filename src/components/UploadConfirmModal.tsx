import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { GameConflict, NewPlayer } from '../api/types';

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

// [변경: 2026-07-29 15:33, 김병현 수정] 접두어를 owc(OverwriteConfirm)에서 ucm(UploadConfirmModal)으로.
const TITLE_ID = 'ucm-title';
const DESC_ID = 'ucm-desc';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // 최신 값은 ref 로 읽는다(리스너 재등록 회피). 부모(UploadPage)가 uploading 을 토글하면 이
  // 모달이 리렌더되고 busy/onCancel 은 매번 새 값·새 클로저가 된다. 이걸 이펙트 deps 에 넣으면
  // 리스너가 계속 재등록되고, []로 고정하면 첫 렌더의 busy=false 가 캡처돼 "재전송 중에도 Esc 가
  // 먹는" 정책 위반이 생긴다. ref 로 읽으면 리스너는 한 번만 붙이고도 항상 최신 값을 본다.
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  // 키보드 이펙트 = 마운트 1회([]). Esc = 취소(단, busy 면 무시), Tab/Shift+Tab = 모달 안에서만
  // 순환하는 포커스 트랩. 확인(Enter) 키 정책은 일부러 안 넣는다 — '덮어쓰기'는 위험한 동작이라
  // 버튼 클릭으로만 확정하게 한다(그래서 onConfirm 은 ref 로 안 감싸고 버튼 onClick 에서 직접 씀).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (!busyRef.current) onCancelRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      // busy 면 두 버튼 다 disabled 라 Tab 이 옮겨갈 유효한 대상이 없다 — 이 경우 이동은 안 하고
      // 그냥 막기만 하면서 포커스를 모달 컨테이너(tabIndex=-1)에 담아 body 로 새는 것을 막는다.
      const focusables = [cancelBtnRef.current, confirmBtnRef.current].filter(
        (el): el is HTMLButtonElement => !!el && !el.disabled,
      );
      if (focusables.length === 0) {
        e.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const activeIndex = focusables.findIndex((el) => el === active);
      if (e.shiftKey) {
        if (activeIndex <= 0) {
          e.preventDefault();
          last.focus();
        }
      } else if (activeIndex === -1 || activeIndex === focusables.length - 1) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 포커스 저장/복원 이펙트 = 마운트 1회([]). 열기 직전 포커스를 저장해두고 안전한 쪽(취소)으로
  // 옮긴 뒤, 언마운트(닫힘) 시 원래 있던 곳으로 되돌린다. onCancel 같은 매 렌더 새 클로저를 deps 에
  // 넣으면 부모 리렌더마다 재실행돼 "이미 모달 안으로 옮긴 포커스"를 다시 저장해버려, 닫을 때
  // 복원 대상이 틀어진다.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null; // 열기 직전 포커스 저장
    cancelBtnRef.current?.focus(); // 안전한 쪽(취소)에 포커스
    return () => prev?.focus(); // 언마운트 시 복원
  }, []);

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

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        aria-describedby={DESC_ID}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={TITLE_ID} className="modal-title">
          {title}
        </h2>
        <p className="modal-body">
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
        </p>

        {hasGames && (
          <>
            {hasPlayers && <h3 className="modal-section-title">겹친 경기 {games.length}개</h3>}
            <ul className="conflict-game-list">
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
            {hasGames && <h3 className="modal-section-title">처음 보는 이름 {newPlayers.length}명</h3>}
            <ul className="new-player-list">
              {newPlayers.slice(0, NEW_PLAYER_PREVIEW).map((p) => (
                <li key={p.name} className="new-player-item">
                  <b className="new-player-name">{p.name}</b>
                  {p.suggestions.length > 0 && (
                    <span className="new-player-hint">
                      혹시 {p.suggestions.map(revealWhitespace).join(' / ')} ?
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {restCount > 0 && <span className="field-hint">…외 {restCount}명 더</span>}
          </>
        )}

        {/* 안내 문구 2줄: id=owc-desc 로 dialog 의 aria-describedby 에 연결(스크린리더 보강) */}
        {/* [변경: 2026-07-29 15:33, 김병현 수정] id 는 ucm-desc 로 바뀌었고, 이제 문장이 항상 2줄은
            아니다(경우에 따라 1~4줄) — 그래도 세 경우 모두 항상 렌더돼 aria-describedby 가 항상 유효하다. */}
        <p id={DESC_ID} className="modal-body">
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
        <div className="modal-actions">
          <button
            ref={cancelBtnRef}
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => {
              if (!busy) onCancel();
            }}
          >
            취소
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className="btn btn--primary"
            disabled={busy}
            onClick={() => {
              if (!busy) onConfirm();
            }}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
