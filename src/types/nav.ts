// [신설: 2026-09-02 14:10, 김병현 작성] 헤더 메뉴 한 칸의 모양.
// 왜 타입을 따로 두나: 이 배열을 데스크톱 바 / 모바일 가로 스크롤 탭 / Sheet 세 곳이 돌린다.
// 모양이 흔들리면 세 곳이 동시에 깨지므로 이름 붙은 계약이 있어야 한다.
import type { PrefetchRoute } from '../hooks/usePrefetch';

export interface NavItem {
  // 라우트 주소. PrefetchRoute 로 좁히면 안 된다 — 그 유니온엔 '/upload' 가 없어서
  // (usePrefetch.ts:36-45) 운영자 메뉴를 넣는 순간 tsc 가 죽는다.
  to: string;
  label: string;
  // 미리 받기 키. 주소와 '다른 개념'이라 따로 둔다.
  // 지금 Layout.tsx 도 /upload 링크에만 prefetch 를 안 붙였다 — 그 의도를 타입으로 옮긴 것이다.
  prefetch?: PrefetchRoute;
  icon?: string; // 자물쇠/트로피 같은 장식 이모지 (aria-hidden)
  admin?: boolean; // true = 운영자 묶음(비밀번호 게이트 뒤)
}
