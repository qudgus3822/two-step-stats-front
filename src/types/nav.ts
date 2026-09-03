// [신설: 2026-09-02 14:10, 김병현 작성] 헤더 메뉴 한 칸의 모양.
// 왜 타입을 따로 두나: 이 배열을 데스크톱 바 / 모바일 가로 스크롤 탭 / Sheet 세 곳이 돌린다.
// 모양이 흔들리면 세 곳이 동시에 깨지므로 이름 붙은 계약이 있어야 한다.
import type { LucideIcon } from 'lucide-react';
import type { PrefetchRoute } from '../hooks/usePrefetch';

export interface NavItem {
  // 라우트 주소. PrefetchRoute 로 좁히면 안 된다 — 그 유니온엔 '/upload' 가 없어서
  // (usePrefetch.ts:36-45) 운영자 메뉴를 넣는 순간 tsc 가 죽는다.
  to: string;
  label: string;
  // 미리 받기 키. 주소와 '다른 개념'이라 따로 둔다.
  // 지금 Layout.tsx 도 /upload 링크에만 prefetch 를 안 붙였다 — 그 의도를 타입으로 옮긴 것이다.
  prefetch?: PrefetchRoute;
  // [변경: 2026-09-03 09:00, 김병현 수정] 이모지 문자열 → lucide 아이콘 컴포넌트로 교체하며
  // 필수로 바꿨다(계획서 §Phase 2-3 — "네비게이션 아이콘을 일관되게", 즉 전부 있어야 한다).
  // 크기는 소비처(AppHeader/MobileNavSheet)가 size-4 로 통일해서 붙인다 — 여기선
  // "어떤 아이콘인지"만 정한다.
  icon: LucideIcon;
  admin?: boolean; // true = 운영자 묶음(비밀번호 게이트 뒤)
}
