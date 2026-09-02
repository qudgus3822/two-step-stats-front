import type { GameResult } from '../api/types';
// [변경: 2026-09-02 15:30, 김병현 수정] 내부 구현을 shadcn Badge 로 교체.
// export 3개(ResultBadge/OvertimeBadge/TeamBadge)의 이름·props·반환 의미는 그대로다 —
// 호출부(12곳+) 전부 diff 없이 그대로 동작해야 한다.
import { Badge } from './ui/badge';

// 작은 알약 모양 라벨. 팀 이름이나 승/패/무 표시에 쓴다.

const RESULT_LABEL: Record<GameResult, string> = { W: '승', L: '패', D: '무' };
// [변경: 2026-09-02 15:30, 김병현 수정] 클래스 이름 대신 Badge variant 이름으로 대응.
const RESULT_VARIANT: Record<GameResult, 'win' | 'loss' | 'draw'> = {
  W: 'win',
  L: 'loss',
  D: 'draw',
};

// 승/패/무 뱃지. 색만이 아니라 글자(승/패/무)로도 구분되게 해서 색맹도 읽을 수 있음.
export function ResultBadge({ result }: { result: GameResult }) {
  return <Badge variant={RESULT_VARIANT[result]}>{RESULT_LABEL[result]}</Badge>;
}

// [신설: 2026-07-29 12:10, 김병현 작성] 연장경기 뱃지.
// 왜 필요한가: 연장은 경기 목록엔 한 줄로 따로 나오지만 평균 계산에선 앞 경기에 합쳐진다.
// 표시가 없으면 "목록은 3경기인데 리더보드는 2경기"가 그냥 버그로 보인다 — 이 뱃지가 그 설명이다.
export function OvertimeBadge() {
  return (
    <Badge
      variant="overtime"
      title="앞 경기의 연장이에요. 평균 계산에선 앞 경기와 한 경기로 칩니다."
    >
      연장
    </Badge>
  );
}

// 팀 이름 뱃지. 색 점(dot)으로 팀 색을 같이 보여줄 수 있다.
export function TeamBadge({ team, color }: { team: string; color?: string }) {
  return (
    <Badge variant="team">
      {color && (
        <span className="size-2 rounded-[2px]" style={{ background: color }} aria-hidden="true" />
      )}
      {team}
    </Badge>
  );
}
