import type { ReactNode } from 'react';

// 로딩/에러/빈 상태를 보여주는 자잘한 공용 컴포넌트 모음.
// 화면마다 "불러오는 중…", "에러", "데이터 없음"을 똑같이 그리지 않으려고 한 곳에 뒀다.

export function Loading({ label = '불러오는 중…' }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

// 에러 + 다시 시도 버튼(있으면). 서버 꺼짐 같은 상황을 사람 말로 보여준다.
export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <strong>문제가 생겼어요</strong>
      <span>{message}</span>
      {onRetry && (
        <button className="btn" onClick={onRetry} type="button">
          다시 시도
        </button>
      )}
    </div>
  );
}

// 데이터가 0건일 때. 대개 아직 엑셀 업로드 전이라는 뜻.
export function Empty({ children }: { children: ReactNode }) {
  return <div className="state state--empty">{children}</div>;
}
