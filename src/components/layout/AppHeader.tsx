// [신설: 2026-09-02 14:15, 김병현 작성] 앱 상단 헤더 — 데스크톱 1줄 / 모바일 2줄(§D4).
//
// 감추는 것: 데스크톱/모바일 분기(전부 CSS `md:` 접두어로만 — JS 미디어쿼리 훅 없음),
// 운영자 메뉴가 폭이 좁을 때 Sheet 로 빠지는 것, 활성 탭 판정(NavLink 가 대신 해줌),
// prefetch 연결(마우스오버/포커스 시 데이터 미리 받기).
// 인터페이스: <AppHeader /> — props 0개. 메뉴 내용이 바뀌어도 이 컴포넌트의 시그니처는
// 그대로다(navItems.ts 배열만 고치면 됨).
//
// 왜 모바일이 2줄인가: 숫자 훑어보기용 앱이라 탭이 안 보이면 다 눌러봐야 한다(2클릭).
// 그렇다고 운영자 메뉴까지 그 줄에 넣으면 다시 넘친다 → 운영자 2개만 ☰ Sheet 로 뺐다.
import { Link, NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { usePrefetch, type PrefetchRoute, type Prefetcher } from '../../hooks/usePrefetch';
import { ADMIN_NAV_ITEMS, PUBLIC_NAV_ITEMS } from './navItems';
import { CompetitionPicker } from '../CompetitionPicker';
import { ThemeToggle } from './ThemeToggle';
import { MobileNavSheet } from './MobileNavSheet';
import { buttonVariants } from '../ui/button';
import { Separator } from '../ui/separator';

// 탭 하나에 붙일 이벤트 한 벌(마우스 올림 + 키보드 포커스). prefetch 가 없는 항목(/upload)엔
// 아무것도 안 붙인다 — 옛 Layout.tsx 의 prefetchOn 을 그대로 옮겼다.
function prefetchOn(prefetch: Prefetcher, route: PrefetchRoute | undefined) {
  if (!route) return {};
  return {
    onMouseEnter: () => prefetch.route(route),
    onFocus: () => prefetch.route(route),
  };
}

export function AppHeader() {
  const prefetch = usePrefetch();

  return (
    <header className="sticky top-0 z-30 border-b bg-card/85 backdrop-blur-md">
      {/* 1줄: 브랜드 + (데스크톱만) 공개 탭 + 오른쪽 컨트롤 묶음 */}
      <div className="mx-auto flex max-w-[1120px] items-center gap-2 px-4 py-2 sm:px-6">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 font-bold tracking-tight"
          aria-label="투스텝 스탯 홈"
        >
          <span aria-hidden="true">🏀</span>
          <span>투스텝 스탯</span>
        </Link>

        <nav aria-label="주요 메뉴" className="ml-4 hidden items-center gap-1 md:flex">
          {PUBLIC_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              {...prefetchOn(prefetch, item.prefetch)}
              className={({ isActive }) =>
                cn(
                  buttonVariants({ variant: isActive ? 'default' : 'ghost', size: 'sm' }),
                  'shrink-0 whitespace-nowrap rounded-full',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <nav aria-label="운영자 메뉴" className="hidden items-center gap-1 md:flex">
            <Separator orientation="vertical" className="mx-1 h-5" />
            {ADMIN_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title="운영자 전용 · 비밀번호 필요"
                {...prefetchOn(prefetch, item.prefetch)}
                className={({ isActive }) =>
                  cn(
                    buttonVariants({ variant: isActive ? 'default' : 'ghost', size: 'sm' }),
                    'shrink-0 gap-1.5 whitespace-nowrap rounded-full',
                  )
                }
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <CompetitionPicker />
          <ThemeToggle />
          {/* ☰ — 모바일에서만 보임. 공개 5 + 운영자 2 전체 메뉴는 이 안에 있다. */}
          <MobileNavSheet className="md:hidden" />
        </div>
      </div>

      {/* 2줄 — 모바일 전용 가로 스크롤 탭. scroll-fade-x/no-scrollbar 는 shadcn/tailwind.css 가
          @utility 로 제공한다(계획서 rev.3 — 리뷰에서 확인됨, 별도 정의 불필요). */}
      <nav
        aria-label="주요 메뉴"
        className="scroll-fade-x no-scrollbar flex items-center gap-1 overflow-x-auto border-t px-4 py-1.5 md:hidden"
      >
        {PUBLIC_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            {...prefetchOn(prefetch, item.prefetch)}
            className={({ isActive }) =>
              cn(
                buttonVariants({ variant: isActive ? 'default' : 'ghost', size: 'sm' }),
                'shrink-0 whitespace-nowrap rounded-full',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
