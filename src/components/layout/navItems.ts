// [신설: 2026-09-02 14:10, 김병현 작성] 헤더 메뉴 전체를 정의하는 단 하나의 배열.
// 데스크톱 바 / 모바일 가로 스크롤 탭 / Sheet 세 곳이 전부 이 배열(정확히는 아래
// PUBLIC_NAV_ITEMS·ADMIN_NAV_ITEMS)만 돈다(계획서 §D4). 메뉴 문자열을 세 곳에
// 따로 적으면 하나만 고치고 나머지를 빠뜨리는 사고가 난다 — 그걸 막는 게 이 파일의 이유다.
// [변경: 2026-09-03 09:00, 김병현 수정] 전 메뉴에 lucide 아이콘을 달았다(계획서 §Phase 2-3).
// 페이지별 아이콘은 각 페이지의 PageHeader 도 같은 걸 쓴다(navItems 를 다시 import 하지 않고
// 같은 lucide 컴포넌트를 각자 import 한다 — 페이지가 메뉴 설정에 의존하지 않게 하려고).
import { Award, LayoutDashboard, Lock, Medal, TrendingUp, Trophy, Users2 } from 'lucide-react';
import type { NavItem } from '../../types/nav';

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '경기 결과', prefetch: '/', icon: LayoutDashboard },
  { to: '/leaderboard', label: '리더보드', prefetch: '/leaderboard', icon: Trophy },
  { to: '/synergy', label: '시너지', prefetch: '/synergy', icon: Users2 },
  { to: '/growth', label: '기량 발전', prefetch: '/growth', icon: TrendingUp },
  { to: '/hall-of-fame', label: '명예의 전당', prefetch: '/hall-of-fame', icon: Award },
  // 운영자 묶음(비밀번호 게이트 뒤). /upload 는 prefetch 를 일부러 안 준다 —
  // 옛 Layout.tsx 도 그랬다(그 화면은 비밀번호 입력이 먼저라 데이터를 미리 받을 게 없다).
  { to: '/upload', label: '업로드', icon: Lock, admin: true },
  {
    to: '/championships',
    label: '우승횟수 관리',
    icon: Medal,
    admin: true,
    prefetch: '/championships',
  },
];

export const PUBLIC_NAV_ITEMS = NAV_ITEMS.filter((item) => !item.admin);
export const ADMIN_NAV_ITEMS = NAV_ITEMS.filter((item) => item.admin);
