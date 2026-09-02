// [신설: 2026-09-02 15:20, 김병현 작성] 대시보드 최상단 히어로 스코어보드.
//
// 감추는 것: 팀 합계(야투%·리바·AS) 계산(teamTotals), 승팀 판정, 팀 색 배정(seriesColor).
// 존재 이유: "OB 55 : YB 45" 가 드롭다운 라벨 글자로만 있던 문제(중계 그래픽 리디자인
// 진단 1번) — 경기 결과가 이 화면의 주인공이 되게, 점수를 화면에서 제일 큰 요소로 만든다.
//
// 팀은 항상 둘(box.teams)이라고 가정한다 — 농구 경기 데이터 모델 자체가 그렇다(GameBox 계약).
// 팀 색은 그라데이션 대신 얇은 상단 바(테두리)로만 쓴다 — 계획서 제약("그라데이션 남발 금지")과
// GameDetailPage.tsx 의 기존 스코어보드 카드가 이미 쓰는 시각 언어(테두리 바)를 그대로 따른다.
import type { GameBox } from '../api/types';
import { OvertimeBadge, ResultBadge } from './Badge';
import { teamTotals } from '../lib/gameBoxSummary';
import { formatPctOrDash, gameLabel } from '../lib/format';
import { seriesColor } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';
import { cn } from '../lib/utils';

export function ScoreboardHero({ box }: { box: GameBox }) {
  const { tokens } = useTheme();

  return (
    // [변경: 2026-09-02 15:50, 김병현 수정] data-slot="card" 추가 — Card(ui/card.tsx)와 같은
    // 표면이라는 뜻으로, index.css 의 다크 카드 그림자 규칙(Phase D)이 여기도 똑같이 적용되게 한다.
    <div data-slot="card" className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      {/* 어느 경기인지 — 시각적으로는 작지만, 시맨틱으로는 이 섹션의 h2(옛 "경기 단위 통계"
          제목 자리를 대신한다. 헤딩 탐색을 쓰는 스크린리더 사용자에게 "무슨 경기인지"를
          바로 알려주는 편이 일반 이름표보다 더 유용하다는 판단. */}
      <h2 className="border-b border-border px-4 py-2.5 text-sm text-muted-foreground sm:px-6">
        {box.competition} · {gameLabel(box.week, box.game)}
        {box.overtime && (
          <span className="ml-1.5 align-middle">
            <OvertimeBadge />
          </span>
        )}
      </h2>

      <div className="flex divide-x divide-border">
        {box.teams.map((t, i) => {
          const win = box.winner === t.team;
          const totals = teamTotals(t.players);
          const color = seriesColor(tokens, i);
          return (
            <div
              key={t.team}
              className="min-w-0 flex-1 border-t-[3px] px-4 py-5 sm:px-8 sm:py-7"
              style={{ borderTopColor: color }}
            >
              <div className="flex items-center gap-1.5 text-sm font-medium sm:text-base">
                <span
                  className="inline-block size-2.5 shrink-0 rounded-[2px]"
                  style={{ background: color }}
                  aria-hidden="true"
                />
                <span className="truncate">{t.team}</span>
                {win && <ResultBadge result="W" />}
              </div>

              {/* 큰 점수 — 48~72px, tabular-nums, 자간 좁게. 승팀은 팀 색 + 더 굵게. */}
              <div
                className={cn(
                  'font-heading text-[clamp(3rem,9vw,4.5rem)] leading-none font-extrabold tabular-nums tracking-tight',
                  !win && 'text-foreground/70',
                )}
                style={win ? { color } : undefined}
              >
                {t.score}
              </div>

              <dl className="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground sm:text-[13px]">
                <div className="flex gap-1">
                  <dt>야투</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {formatPctOrDash(totals.fgPct)}
                  </dd>
                </div>
                <div className="flex gap-1">
                  <dt>리바</dt>
                  <dd className="font-medium tabular-nums text-foreground">{totals.reb}</dd>
                </div>
                <div className="flex gap-1">
                  <dt>AS</dt>
                  <dd className="font-medium tabular-nums text-foreground">{totals.ast}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}
