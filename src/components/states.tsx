import type { ReactNode } from 'react';
// [변경: 2026-09-02 15:35, 김병현 수정] 내부 구현을 shadcn Spinner/Alert/Empty/Skeleton 으로 교체.
// export 4개(Loading/ErrorView/Empty/TableSkeleton)의 이름·props·반환 의미는 그대로다.
import { Inbox } from 'lucide-react';
import { cn } from '../lib/utils';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Empty as ShadcnEmpty, EmptyMedia } from './ui/empty';
import { Skeleton } from './ui/skeleton';
import { Spinner } from './ui/spinner';

// 로딩/에러/빈 상태를 보여주는 자잘한 공용 컴포넌트 모음.
// 화면마다 "불러오는 중…", "에러", "데이터 없음"을 똑같이 그리지 않으려고 한 곳에 뒀다.

export function Loading({ label = '불러오는 중…' }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center gap-2.5 py-11 text-center text-secondary-foreground"
      role="status"
      aria-live="polite"
    >
      {/* Spinner 자신의 role=status/aria-label 은 우리 wrapper 와 중복 안내가 되므로
          aria-hidden 으로 죽이고, 실제 안내는 아래 label 텍스트가 맡는다.
          text-primary: 옛 .spinner 의 강조색(border-top-color: var(--series-1))과 맞춘다. */}
      <Spinner aria-hidden="true" className="size-6 text-primary" />
      <span>{label}</span>
    </div>
  );
}

// 에러 + 다시 시도 버튼(있으면). 서버 꺼짐 같은 상황을 사람 말로 보여준다.
export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    // Alert 자체가 role="alert" 를 이미 갖고 있다(ui/alert.tsx).
    <Alert variant="destructive" className="items-center text-center">
      <AlertTitle>문제가 생겼어요</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-1.5 justify-self-center" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </Alert>
  );
}

// 데이터가 0건일 때. 대개 아직 엑셀 업로드 전이라는 뜻.
// [변경: 2026-09-03 09:00, 김병현 수정] 아이콘 추가(계획서 §Phase 2-3 "빈 상태에... 아이콘을
// 일관되게"). 상자가 비어 있다는 뜻의 Inbox 하나로 통일 — 빈 상태마다 다른 아이콘을 고르면
// "왜 이 화면은 이 아이콘이지"를 매번 설명해야 해서, 문맥은 항상 children(문구)이 맡긴다.
export function Empty({ children }: { children: ReactNode }) {
  // [변경: 2026-09-02 16:10, 김병현 수정] 옛 .state--empty 는 color: var(--muted) 였다
  // (--text-2/secondary-foreground 보다 옅은 톤) — text-muted-foreground 로 정확히 대응.
  return (
    <ShadcnEmpty className="border-none p-6 text-muted-foreground">
      <EmptyMedia variant="icon">
        <Inbox aria-hidden="true" />
      </EmptyMedia>
      {children}
    </ShadcnEmpty>
  );
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
//
// [변경: 2026-09-02 15:35, 김병현 수정] shadcn Skeleton(animate-pulse) 으로 교체.
// reduced-motion 가드는 index.css 의 @layer base 전역 규칙(.animate-pulse 끄기)이 대신한다.
export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  const columns = Math.max(cols, 2);
  // 첫 칸 = 이름 열(넓게), 나머지 = 숫자 열(균등).
  const gridTemplateColumns = `2.2fr ${'1fr '.repeat(columns - 1).trim()}`;

  return (
    <div className="flex flex-col gap-3 py-2.5" role="status" aria-live="polite">
      {/* 뼈대 자체는 장식이라 스크린리더에서 숨기고(aria-hidden), 말로 된 안내만 남긴다.
          안 그러면 "빈 칸 40개"를 하나씩 읽는다. */}
      <span className="sr-only">불러오는 중…</span>
      {Array.from({ length: rows + 1 }, (_, r) => (
        <div
          key={r}
          className="grid items-center gap-3.5"
          style={{ gridTemplateColumns }}
          aria-hidden="true"
        >
          {Array.from({ length: columns }, (_, c) => (
            // 0번 줄은 표의 머리(제목 행)라 조금 얇고 흐리게 그린다.
            <Skeleton key={c} className={cn('h-3.5', r === 0 && 'h-2.5 opacity-75')} />
          ))}
        </div>
      ))}
    </div>
  );
}
