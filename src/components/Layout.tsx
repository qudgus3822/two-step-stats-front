import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '../theme/ThemeContext';
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — SeasonPicker → CompetitionPicker(리네임).
import { CompetitionPicker } from './CompetitionPicker';
// [변경: 2026-07-29 10:36, 김병현 수정] 탭에 마우스만 올려도 그 화면 데이터를 미리 받는다(체감속도).
import { usePrefetch, type PrefetchRoute } from '../hooks/usePrefetch';

// 앱 껍데기: 위쪽 헤더(로고 + 메뉴 + 대회선택 + 다크모드 토글) + 아래 본문.
// 모든 페이지가 이 안에 <Outlet/> 으로 끼워진다.

// 라이트/다크 전환 버튼. 해/달 이모지로 지금 상태를 보여준다.
function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const dark = mode === 'dark';
  return (
    <button
      type="button"
      className="btn btn--icon"
      onClick={toggle}
      aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      title={dark ? '라이트 모드' : '다크 모드'}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'nav-link nav-link--active' : 'nav-link';

// [변경: 2026-07-27 12:15, 김병현 수정] 운영자 메뉴(업로드)용 클래스 조합.
// 활성/비활성 판정은 navClass 가 이미 알고 있으니 그대로 쓰고, 구분용 --admin 만 덧붙인다.
const adminNavClass = (state: { isActive: boolean }) => `${navClass(state)} nav-link--admin`;

export function Layout() {
  // [변경: 2026-07-29 10:36, 김병현 수정] 미리 받기 트리거.
  const prefetch = usePrefetch();
  // 탭 하나에 붙일 이벤트 한 벌. 마우스를 올렸을 때(hover)와 키보드로 옮겨왔을 때(focus) 둘 다.
  // 스프레드로 붙이는 이유: 탭이 6개라 각 NavLink 에 두 줄씩 적으면 12줄이 똑같이 반복된다.
  const prefetchOn = (route: PrefetchRoute) => ({
    onMouseEnter: () => prefetch.route(route),
    onFocus: () => prefetch.route(route),
  });

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="투스텝 스탯 홈">
          <span className="brand-mark" aria-hidden="true">
            🏀
          </span>
          <span className="brand-text">투스텝 스탯</span>
        </NavLink>

        <nav className="nav" aria-label="주요 메뉴">
          {/* [변경: 2026-07-29 10:36, 김병현 수정] 각 탭에 prefetchOn 추가 — 클릭 전에 미리 받는다. */}
          <NavLink to="/" end className={navClass} {...prefetchOn('/')}>
            경기 결과
          </NavLink>
          {/* <NavLink to="/games" className={navClass}>
            경기
          </NavLink> */}
          {/* <NavLink to="/players" className={navClass} {...prefetchOn('/players')}>
            선수
          </NavLink> */}
          {/* [변경: 2026-07-27 16:40, 김병현 수정] 선수 비교 화면 진입점. "선수" 다음에 추가. */}
          {/* <NavLink to="/compare" className={navClass} {...prefetchOn('/compare')}>
            선수 비교
          </NavLink> */}
          <NavLink to="/leaderboard" className={navClass} {...prefetchOn('/leaderboard')}>
            리더보드
          </NavLink>
          {/* [변경: 2026-07-27 16:14, 김병현 수정] 시너지(동료별 WOWY) 탭 추가. "리더보드" 다음. */}
          <NavLink to="/synergy" className={navClass} {...prefetchOn('/synergy')}>
            시너지
          </NavLink>
          {/* [변경: 2026-07-28 15:00, 김병현 수정] 기량 발전(직전 시즌 대비 상승률) 탭 추가. "시너지" 다음. */}
          <NavLink to="/growth" className={navClass} {...prefetchOn('/growth')}>
            기량 발전
          </NavLink>
          {/* [신설: 2026-09-02 김병현 작성] 명예의 전당(역대 우승·통산 순위). 보기 전용이라
              운영자 묶음이 아니라 일반 메뉴에 둔다. */}
          <NavLink to="/hall-of-fame" className={navClass} {...prefetchOn('/hall-of-fame')}>
            명예의 전당
          </NavLink>
        </nav>

        <div className="topbar-controls">
          {/* [변경: 2026-07-27 12:15, 김병현 수정] 업로드는 운영자 기능이라 일반 메뉴에서 떼어
              오른쪽 컨트롤 묶음으로 옮겼다(탭을 숨기는 게 아니라 자리만 분리).
              .topbar-controls 에 이미 margin-left:auto 가 있어서 여기 넣기만 하면 오른쪽으로 간다.
              별도 <nav> 로 감싸는 이유: '주요 메뉴' 랜드마크 밖으로 나왔으니 자기 이름표가 있어야
              스크린리더에서 "메뉴가 두 묶음"이라는 구조가 그대로 전달된다. */}
          {/* [변경: 2026-07-14 14:21, 김병현 수정] 엑셀 기록지 업로드 탭 추가 */}
          <nav className="nav nav--admin" aria-label="운영자 메뉴">
            <NavLink to="/upload" className={adminNavClass} title="운영자 전용 · 비밀번호 필요">
              <span aria-hidden="true">🔒</span>
              업로드
            </NavLink>
            {/* [신설: 2026-09-02 김병현 작성] 우승횟수 관리. 업로드와 같은 운영자 묶음에 둔다 —
                기록을 '고치는' 화면이라 성격이 같고, 같은 비밀번호 게이트 뒤에 있다. */}
            <NavLink
              to="/championships"
              className={adminNavClass}
              title="운영자 전용 · 비밀번호 필요"
              {...prefetchOn('/championships')}
            >
              <span aria-hidden="true">🏆</span>
              우승횟수 관리
            </NavLink>
          </nav>
          <CompetitionPicker />
          <ThemeToggle />
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
