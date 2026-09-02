import { Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
// [변경: 2026-09-02 20:10, 김병현 수정] NotFound 가 .state/.state--empty/.link 대신
// shadcn Empty + Button 룩(buttonVariants)을 쓴다(계획서 §7 Phase 4h).
import { Empty } from './components/states';
import { buttonVariants } from './components/ui/button';
// [변경: 2026-07-27 16:40, 김병현 수정] 선수 비교 화면 라우트 추가.
import { ComparePage } from './pages/ComparePage';
import { DashboardPage } from './pages/DashboardPage';
import { GameDetailPage } from './pages/GameDetailPage';
import { GamesPage } from './pages/GamesPage';
// [변경: 2026-07-28 15:00, 김병현 수정] 기량 발전(직전 시즌 대비 상승률) 화면 라우트 추가.
import { GrowthPage } from './pages/GrowthPage';
// [신설: 2026-09-02 김병현 작성] 명예의 전당(우승 기록 보기 전용) 화면 라우트 추가.
import { HallOfFamePage } from './pages/HallOfFamePage';
// [신설: 2026-09-02 김병현 작성] 우승횟수 관리 화면 라우트 추가.
import { ChampionshipPage } from './pages/ChampionshipPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { PlayerDetailPage } from './pages/PlayerDetailPage';
import { PlayersPage } from './pages/PlayersPage';
// [변경: 2026-07-27 16:14, 김병현 수정] 시너지(동료별 WOWY) 화면 라우트 추가.
import { SynergyPage } from './pages/SynergyPage';
// [변경: 2026-07-14 14:21, 김병현 수정] 엑셀 업로드 화면 라우트 추가
import { UploadPage } from './pages/UploadPage';
// [변경: 2026-07-27 12:15, 김병현 수정] 업로드 화면은 프론트 전용 비밀번호 잠금 뒤로 보낸다.
import { UploadPasswordGate } from './components/UploadPasswordGate';

// 라우팅 표: 어떤 주소에서 어떤 화면을 보여줄지. 전부 Layout(헤더+본문) 안에 들어간다.
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="games" element={<GamesPage />} />
        <Route path="games/:id" element={<GameDetailPage />} />
        <Route path="players" element={<PlayersPage />} />
        <Route path="players/:name" element={<PlayerDetailPage />} />
        {/* [변경: 2026-07-27 16:40, 김병현 수정] 선수 비교 화면. Layout 하위라 헤더의 대회 피커를 그대로 쓴다. */}
        <Route path="compare" element={<ComparePage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        {/* [변경: 2026-07-27 16:14, 김병현 수정] 시너지 화면. Layout 하위라 헤더의 대회 피커를 그대로 쓴다. */}
        <Route path="synergy" element={<SynergyPage />} />
        {/* [변경: 2026-07-28 15:00, 김병현 수정] 기량 발전 화면. Layout 하위라 헤더의 대회 피커를 그대로 쓴다. */}
        <Route path="growth" element={<GrowthPage />} />
        {/* [신설: 2026-09-02 김병현 작성] 명예의 전당 — 우승 기록 '보기 전용'.
            /championships(운영자용, 게이트 뒤)와 짝이지만 이쪽은 누구나 볼 수 있다.
            대회 필터와 무관한 통산 화면이라 헤더의 대회 피커를 쓰지 않는다. */}
        <Route path="hall-of-fame" element={<HallOfFamePage />} />
        {/* [변경: 2026-07-27 12:15, 김병현 수정] 업로드는 오늘 비밀번호를 맞춰야 열린다.
            JSX 는 "설명서"일 뿐이라, 게이트가 children 을 반환하기 전까지 UploadPage 는
            마운트되지 않는다 = 훅도 쿼리도 하나도 실행되지 않는다. */}
        <Route
          path="upload"
          element={
            <UploadPasswordGate>
              <UploadPage />
            </UploadPasswordGate>
          }
        />
        {/* [신설: 2026-09-02 김병현 작성] 우승횟수 관리도 기록을 '고치는' 화면이라
            업로드와 같은 게이트 뒤에 둔다. 게이트는 sessionStorage 로 해제를 기억하므로,
            업로드에서 이미 풀었으면 여기선 다시 안 묻는다(같은 열쇠 하나). */}
        <Route
          path="championships"
          element={
            <UploadPasswordGate>
              <ChampionshipPage />
            </UploadPasswordGate>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

// 없는 주소로 왔을 때
// [변경: 2026-09-02 20:10, 김병현 수정] .page/.state.state--empty/.link → Empty + Link
// (buttonVariants 로 버튼처럼 스타일링). Button asChild 대신 buttonVariants 를 Link 에 직접
// 적용한 이유는 UploadPage.tsx 와 같다 — 이 자리는 Radix 트리거 문맥이 아니라 순수 내비게이션
// 링크라 asChild 자체는 안전하지만(Phase 2 에서 확인된 사실), 콘솔 경고까지 없애는 쪽을 택했다.
function NotFound() {
  return (
    <Empty>
      <strong>페이지를 찾을 수 없어요</strong>
      <Link to="/" className={buttonVariants({ variant: 'outline' })}>
        대시보드로 돌아가기
      </Link>
    </Empty>
  );
}
