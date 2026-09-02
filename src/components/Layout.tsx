import { Outlet } from 'react-router-dom';
// [변경: 2026-09-02 14:25, 김병현 수정] 헤더 전체(브랜드/메뉴/대회피커/테마토글/모바일 Sheet)를
// AppHeader.tsx 로 이전. Layout 은 이제 "헤더 + 본문 폭" 조립만 담당한다(계획서 §7 Phase 2).
import { AppHeader } from './layout/AppHeader';

// 앱 껍데기: 위쪽 헤더 + 아래 본문. 모든 페이지가 이 안에 <Outlet/> 으로 끼워진다.
export function Layout() {
  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1120px] px-4 pb-16 pt-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
