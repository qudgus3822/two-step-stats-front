import type { GameResult } from '../api/types';

// 작은 알약 모양 라벨. 팀 이름이나 승/패/무 표시에 쓴다.

const RESULT_LABEL: Record<GameResult, string> = { W: '승', L: '패', D: '무' };
const RESULT_CLASS: Record<GameResult, string> = {
  W: 'badge--win',
  L: 'badge--loss',
  D: 'badge--draw',
};

// 승/패/무 뱃지. 색만이 아니라 글자(승/패/무)로도 구분되게 해서 색맹도 읽을 수 있음.
export function ResultBadge({ result }: { result: GameResult }) {
  return <span className={`badge ${RESULT_CLASS[result]}`}>{RESULT_LABEL[result]}</span>;
}

// 팀 이름 뱃지. 색 점(dot)으로 팀 색을 같이 보여줄 수 있다.
export function TeamBadge({ team, color }: { team: string; color?: string }) {
  return (
    <span className="badge badge--team">
      {color && <span className="badge-dot" style={{ background: color }} aria-hidden="true" />}
      {team}
    </span>
  );
}
