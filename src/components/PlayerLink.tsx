// [신설: 2026-07-29 10:36, 김병현 작성] 선수 상세로 가는 링크 한 종류.
// 표마다 흩어져 있던 <Link to={`/players/${encodeURIComponent(...)}`}> 을 하나로 모은 것이다.
// 여기 모아 두면 "선수 링크에 마우스를 올리면 그 선수 상세를 미리 받는다"는 규칙을
// 한 곳에만 적으면 된다 — 표가 6군데라 각자 적으면 반드시 빠뜨리는 곳이 생긴다.
//
// 미리 받기(prefetch)는 통산 상세다. PlayerDetailPage 가 usePlayer(name, null) 로 부르므로
// 캐시 키가 정확히 일치해서, 클릭하면 이미 받아 둔 걸 그대로 쓴다.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { usePrefetch } from '../hooks/usePrefetch';

export function PlayerLink({ name, children }: { name: string; children?: ReactNode }) {
  const prefetch = usePrefetch();
  // onFocus 도 같이 거는 이유: 키보드로 표를 훑는 사람에게도 같은 이득을 준다(마우스 전용 X).
  return (
    <Link
      // [변경: 2026-09-02 15:35, 김병현 수정] .link → Tailwind 유틸리티(계획서 §5-2).
      className="font-medium text-primary hover:underline"
      to={`/players/${encodeURIComponent(name)}`}
      onMouseEnter={() => prefetch.player(name)}
      onFocus={() => prefetch.player(name)}
    >
      {children ?? name}
    </Link>
  );
}
