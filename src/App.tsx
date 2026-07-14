import { Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { GameDetailPage } from './pages/GameDetailPage';
import { GamesPage } from './pages/GamesPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { PlayerDetailPage } from './pages/PlayerDetailPage';
import { PlayersPage } from './pages/PlayersPage';

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
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

// 없는 주소로 왔을 때
function NotFound() {
  return (
    <div className="page">
      <div className="state state--empty">
        <strong>페이지를 찾을 수 없어요</strong>
        <Link className="link" to="/">
          대시보드로 돌아가기
        </Link>
      </div>
    </div>
  );
}
