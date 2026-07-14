import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '../theme/ThemeContext';
import { SeasonPicker } from './SeasonPicker';

// 앱 껍데기: 위쪽 헤더(로고 + 메뉴 + 시즌선택 + 다크모드 토글) + 아래 본문.
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

export function Layout() {
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
          <NavLink to="/" end className={navClass}>
            대시보드
          </NavLink>
          <NavLink to="/games" className={navClass}>
            경기
          </NavLink>
          <NavLink to="/players" className={navClass}>
            선수
          </NavLink>
          <NavLink to="/leaderboard" className={navClass}>
            리더보드
          </NavLink>
          {/* [변경: 2026-07-14 14:21, 김병현 수정] 엑셀 기록지 업로드 탭 추가 */}
          <NavLink to="/upload" className={navClass}>
            업로드
          </NavLink>
        </nav>

        <div className="topbar-controls">
          <SeasonPicker />
          <ThemeToggle />
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
