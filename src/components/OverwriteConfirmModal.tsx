import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { GameConflict } from '../api/types';

// [변경: 2026-07-15 14:10, 김병현 수정] 업로드 중복 경기 덮어쓰기 확인 모달 신설.
// 왜 별도 컴포넌트인가: 포커스 트랩/Esc/aria/portal 같은 접근성 기계장치를 화면(UploadPage)
// 코드에서 떼어내 여기 한 곳에만 숨겨두기 위해서다. 소비자는 conflicts/onConfirm/onCancel/busy 만 넘긴다.
interface OverwriteConfirmModalProps {
  competition: string; // 표시 라벨
  conflicts: GameConflict[]; // 겹친 경기들
  busy: boolean; // force 재전송 중(버튼 비활성 + "덮어쓰는 중…")
  onConfirm: () => void; // '덮어쓰기'
  onCancel: () => void; // '취소'/Esc/백드롭
}

const TITLE_ID = 'owc-title';
const DESC_ID = 'owc-desc';

export function OverwriteConfirmModal({
  competition,
  conflicts,
  busy,
  onConfirm,
  onCancel,
}: OverwriteConfirmModalProps) {
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
          이미 있는 경기예요
        </h2>
        <p className="modal-body">
          <b>{competition}</b> 대회에 이미 기록된 경기가 있어요.
        </p>
        <ul className="conflict-game-list">
          {conflicts.map((g) => (
            <li key={`${g.week}-${g.game}`}>
              {g.week}주차 {g.game}경기 · 기존 {g.existingCount}건
            </li>
          ))}
        </ul>
        {/* 안내 문구 2줄: id=owc-desc 로 dialog 의 aria-describedby 에 연결(스크린리더 보강) */}
        <p id={DESC_ID} className="modal-body">
          덮어쓰면 이 경기의 기존 기록은 새 파일로 통째로 바뀌어요.
          <br />
          그리고 이 파일에 겹치지 않는 새 경기가 있으면, 그건 그대로 함께 추가돼요.
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
            {busy ? '덮어쓰는 중…' : '덮어쓰기'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
