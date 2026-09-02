// [신설: 2026-09-02 14:10, 김병현 작성] 헤더 메뉴 전체를 정의하는 단 하나의 배열.
// 데스크톱 바 / 모바일 가로 스크롤 탭 / Sheet 세 곳이 전부 이 배열(정확히는 아래
// PUBLIC_NAV_ITEMS·ADMIN_NAV_ITEMS)만 돈다(계획서 §D4). 메뉴 문자열을 세 곳에
// 따로 적으면 하나만 고치고 나머지를 빠뜨리는 사고가 난다 — 그걸 막는 게 이 파일의 이유다.
import type { NavItem } from '../../types/nav';

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '경기 결과', prefetch: '/' },
  { to: '/leaderboard', label: '리더보드', prefetch: '/leaderboard' },
  { to: '/synergy', label: '시너지', prefetch: '/synergy' },
  { to: '/growth', label: '기량 발전', prefetch: '/growth' },
  { to: '/hall-of-fame', label: '명예의 전당', prefetch: '/hall-of-fame' },
  // 운영자 묶음(비밀번호 게이트 뒤). /upload 는 prefetch 를 일부러 안 준다 —
  // 옛 Layout.tsx 도 그랬다(그 화면은 비밀번호 입력이 먼저라 데이터를 미리 받을 게 없다).
  { to: '/upload', label: '업로드', icon: '🔒', admin: true },
  {
    to: '/championships',
    label: '우승횟수 관리',
    icon: '🏆',
    admin: true,
    prefetch: '/championships',
  },
];

export const PUBLIC_NAV_ITEMS = NAV_ITEMS.filter((item) => !item.admin);
export const ADMIN_NAV_ITEMS = NAV_ITEMS.filter((item) => item.admin);
