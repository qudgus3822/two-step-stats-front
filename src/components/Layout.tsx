import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '../theme/ThemeContext';
// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — SeasonPicker → CompetitionPicker(리네임).
import { CompetitionPicker } from './CompetitionPicker';

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
          {/* <NavLink to="/games" className={navClass}>
            경기
          </NavLink> */}
          <NavLink to="/players" className={navClass}>
            선수
          </NavLink>
          {/* [변경: 2026-07-27 16:40, 김병현 수정] 선수 비교 화면 진입점. "선수" 다음에 추가. */}
          <NavLink to="/compare" className={navClass}>
            선수 비교
          </NavLink>
          <NavLink to="/leaderboard" className={navClass}>
            리더보드
          </NavLink>
          {/* [변경: 2026-07-27 16:14, 김병현 수정] 시너지(동료별 WOWY) 탭 추가. "리더보드" 다음. */}
          <NavLink to="/synergy" className={navClass}>
            시너지
          </NavLink>
          {/* [변경: 2026-07-28 15:00, 김병현 수정] 기량 발전(직전 시즌 대비 상승률) 탭 추가. "시너지" 다음. */}
          <NavLink to="/growth" className={navClass}>
            기량 발전
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
