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

// [신설: 2026-07-29 10:36, 김병현 작성] 표가 올 자리를 미리 잡아 두는 회색 뼈대(스켈레톤).
//
// 왜 스피너 대신 이걸 쓰나 — 실제 걸리는 시간은 똑같은데 사람이 더 짧게 느낀다. 두 가지 이유:
//  1) 스피너는 "뭔가 돌고 있다"만 말하고, 뼈대는 "여기 표가 이만큼 들어온다"까지 말해 준다.
//  2) 자리를 미리 차지하니까 데이터가 도착해도 화면이 덜컹 밀리지 않는다. 그 덜컹거림이
//     실제로는 "느리다"로 읽히는 큰 원인이다.
//
// rows/cols 는 "대충 비슷하게"면 충분하다. 픽셀 단위로 맞추려 들면 표를 고칠 때마다 같이
// 고쳐야 하는 짐이 된다 — 첫 칸만 이름처럼 넓게 두고 나머지는 균등하게 나눈다.
export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  const columns = Math.max(cols, 2);
  // 첫 칸 = 이름 열(넓게), 나머지 = 숫자 열(균등).
  const gridTemplateColumns = `2.2fr ${'1fr '.repeat(columns - 1).trim()}`;

  return (
    <div className="skeleton-table" role="status" aria-live="polite">
      {/* 뼈대 자체는 장식이라 스크린리더에서 숨기고(aria-hidden), 말로 된 안내만 남긴다.
          안 그러면 "빈 칸 40개"를 하나씩 읽는다. */}
      <span className="sr-only">불러오는 중…</span>
      {Array.from({ length: rows + 1 }, (_, r) => (
        <div
          key={r}
          // 0번 줄은 표의 머리(제목 행)라 조금 얇게 그린다.
          className={`skeleton-row ${r === 0 ? 'skeleton-row--head' : ''}`}
          style={{ gridTemplateColumns }}
          aria-hidden="true"
        >
          {Array.from({ length: columns }, (_, c) => (
            <span className="skeleton-cell" key={c} />
          ))}
        </div>
      ))}
    </div>
  );
}
