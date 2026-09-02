// [신설: 2026-09-02 14:10, 김병현 작성] 모바일 전체 메뉴 서랍(☰).
// 왜 필요한가: 모바일 헤더는 2줄뿐이라(§D4) 운영자 메뉴(업로드/우승횟수 관리) 둘이 설 자리가
// 없다. 그래서 전체 메뉴(공개 5 + 운영자 2)를 여기 한 곳에 모아 둔다.
// 포커스 가둠 · Esc 닫힘 · 닫을 때 트리거로 포커스 복귀는 Radix Dialog(Sheet 의 바탕)가
// 기본 제공한다 — 손으로 짜지 않는다.
import { Menu } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { usePrefetch } from '../../hooks/usePrefetch';
import { cn } from '../../lib/utils';
import { ADMIN_NAV_ITEMS, PUBLIC_NAV_ITEMS } from './navItems';
import { buttonVariants } from '../ui/button';
import { Separator } from '../ui/separator';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';

interface MobileNavSheetProps {
  className?: string; // 트리거(☰) 버튼에 그대로 전달 — 호출부가 md:hidden 등으로 노출 여부를 결정
}

export function MobileNavSheet({ className }: MobileNavSheetProps) {
  // 열림 상태는 Radix Dialog(Sheet)가 비제어(uncontrolled)로 직접 들고 있게 둔다.
  // 항목을 누르면 SheetClose 가 알아서 닫아 준다 — 우리가 useState 로 따로 들고 있을
  // 이유가 없다(들고 있으면 오히려 Radix 의 '닫힐 때 트리거로 포커스 복귀' 타이밍과
  // 어긋나는 걸 실측으로 확인했다).
  const prefetch = usePrefetch();

  return (
    <Sheet>
      {/* [변경: 2026-09-02 15:00, 김병현 수정] Button 을 asChild 로 감싸지 않고 SheetTrigger 를
          직접 버튼 모양으로 스타일링한다. 이유: ui/button.tsx 의 Button 은 React.forwardRef 가
          없는 일반 함수 컴포넌트다(shadcn 코드생성이 React 19 기준 — 19부턴 함수 컴포넌트도
          ref 를 prop 처럼 받는다). 이 프로젝트는 React 18.3.1 이라 asChild(Slot)가 Button 에
          ref 를 못 넘기고("cannot be given refs" 콘솔 경고), 그러면 Radix Dialog 가 "닫을 때
          어디로 포커스를 되돌릴지" 알 수 없어 Esc/닫기 후 포커스가 body 로 날아가 버린다
          (playwright 로 실측 확인). SheetTrigger(Radix 고유 컴포넌트)는 forwardRef 가 멀쩡하므로
          그대로 쓰고, 버튼처럼 보이게 buttonVariants 클래스만 입힌다. */}
      <SheetTrigger
        type="button"
        className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), className)}
        aria-label="전체 메뉴 열기"
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          {/* 화면엔 별도 제목 텍스트를 안 보여주지만, Radix Dialog 는 접근 가능한 이름이
              필요해서 SheetTitle 자체는 반드시 있어야 한다 — 시각적으로만 감춘다. */}
          <SheetTitle className="sr-only">전체 메뉴</SheetTitle>
        </SheetHeader>
        <nav aria-label="주요 메뉴" className="flex flex-col gap-1 px-4">
          {PUBLIC_NAV_ITEMS.map((item) => (
            <SheetClose asChild key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onMouseEnter={item.prefetch ? () => prefetch.route(item.prefetch!) : undefined}
                onFocus={item.prefetch ? () => prefetch.route(item.prefetch!) : undefined}
                className={({ isActive }) =>
                  cn(buttonVariants({ variant: isActive ? 'default' : 'ghost' }), 'justify-start')
                }
              >
                {item.label}
              </NavLink>
            </SheetClose>
          ))}
        </nav>
        <Separator />
        <nav aria-label="운영자 메뉴" className="flex flex-col gap-1 px-4">
          {ADMIN_NAV_ITEMS.map((item) => (
            <SheetClose asChild key={item.to}>
              <NavLink
                to={item.to}
                title="운영자 전용 · 비밀번호 필요"
                onMouseEnter={item.prefetch ? () => prefetch.route(item.prefetch!) : undefined}
                onFocus={item.prefetch ? () => prefetch.route(item.prefetch!) : undefined}
                className={({ isActive }) =>
                  cn(
                    buttonVariants({ variant: isActive ? 'default' : 'ghost' }),
                    'justify-start gap-2',
                  )
                }
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
