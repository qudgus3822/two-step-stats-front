import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  invalidateAfterChampionshipChange,
  isStaleView,
  useChampionshipRoster,
  useChampionships,
} from '../api/queries';
import type { ChampionshipRosterPlayer } from '../api/types';
import { useCompetition } from '../context/CompetitionContext';
import { ChampionshipExportCard } from '../components/ChampionshipExportCard';
import { ChampionshipRosterTable } from '../components/ChampionshipRosterTable';
import { PlayerWinsTable } from '../components/PlayerWinsTable';
import { Empty, ErrorView, TableSkeleton } from '../components/states';
// [변경: 2026-09-02 19:20, 김병현 수정] 아래 4줄 — 계획서 §7 Phase 4f.
// .page* → PageHeader, .card* → SectionCard, .field.season-field+.select → NativeSelect,
// .field-hint → text-xs text-muted-foreground.
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { NativeSelect, NativeSelectOption } from '../components/ui/native-select';

// [신설: 2026-09-02 김병현 작성] 우승횟수 관리 화면.
//
// 하는 일: 대회 하나를 고르면 그 대회에서 뛴 선수를 전부 늘어놓고, 한 명씩 [+] 로 우승자를 찍는다.
//
// 왜 자동이 아닌가 — 이 동호회는 같은 시즌에 상대팀으로도 한 번 뛰고, 용병으로 여러 경기를
// 뛰고도 우승자로는 안 치는 경우가 있다. "가장 많이 뛴 팀 = 우승팀"이 늘 맞지는 않다는 뜻이다.
// 그래서 화면은 판단을 대신하지 않고 **판단 재료(어느 팀으로 몇 경기)만 차려 주고**, 결정은 사람이 한다.
//
// 대회 드롭다운을 헤더의 전역 대회 선택과 일부러 분리한 이유:
// 전역 선택은 "지금 보고 있는 화면의 범위"라 다른 화면에 갔다 오면 몰래 바뀌어 있을 수 있다.
// 여기선 잘못 고르면 **엉뚱한 대회에 우승이 박힌다** — 되돌릴 수는 있어도 눈치채기 어렵다.
// 그래서 기준을 눈앞에 붙박아 둔다(RawDataExportCard 가 같은 이유로 같은 선택을 했다).

export function ChampionshipPage() {
  const queryClient = useQueryClient();
  const {
    competitions,
    loading: competitionsLoading,
    error: competitionsError,
  } = useCompetition();

  // 사용자가 아직 안 고른 상태(null)면 '가장 최근 대회'로 본다.
  // useEffect 로 초기값을 밀어넣지 않고 파생으로 계산하는 이유: effect 는 목록이 도착한
  // '다음' 렌더에서야 값을 넣어서, 그 한 틈에 "대회 없음" 화면이 깜빡인다.
  // (CompetitionContext 가 같은 함정을 겪고 파생 계산으로 바꾼 전례가 있다.)
  const [pickedId, setPickedId] = useState<number | null>(null);
  const scopeId = pickedId ?? competitions[0]?.id ?? null;

  const rosterQuery = useChampionshipRoster(scopeId);
  const championshipsQuery = useChampionships();
  const rosterStale = isStaleView(rosterQuery);

  // [+] / [취소] 한 벌. 어느 쪽이든 끝나면 낡는 캐시가 똑같아서 뮤테이션 하나로 묶었다
  // (두 개로 나누면 onSuccess 무효화 코드가 그대로 복사된다).
  const toggleMutation = useMutation({
    // 응답 본문은 버린다(반환 타입 void). 두 호출이 서로 다른 모양을 돌려주는데, 화면이
    // 그걸 쓰지 않아서다 — 바뀐 화면은 아래 무효화가 서버에서 다시 받아 그린다.
    // (응답으로 캐시를 직접 고치면 서버가 실제로 저장한 것과 어긋날 여지가 생긴다.)
    mutationFn: async (vars: { competitionId: number; player: string; won: boolean }) => {
      if (vars.won) await api.removeChampionshipWin(vars.competitionId, vars.player);
      else await api.addChampionshipWin(vars.competitionId, vars.player);
    },
    // 한 번의 클릭이 두 곳을 낡게 만든다(그 대회 표 + 모두의 통산 횟수) → 둘 다 무효화.
    onSuccess: () => invalidateAfterChampionshipChange(queryClient),
  });

  // 지금 서버에 다녀오는 중인 선수. 그 줄의 버튼만 잠근다 — 표 전체를 잠그면 답답하고,
  // 안 잠그면 같은 줄을 연타해 [+] 와 [취소] 가 뒤엉킨다.
  const pendingPlayer = toggleMutation.isPending
    ? (toggleMutation.variables?.player ?? null)
    : null;

  function handleToggle(p: ChampionshipRosterPlayer) {
    if (scopeId == null) return;
    toggleMutation.mutate({ competitionId: scopeId, player: p.player, won: p.won });
  }

  const roster = rosterQuery.data ?? null;
  const overview = championshipsQuery.data ?? null;
  // [변경: 2026-09-02 21:10, 김병현 수정] 우승 0회를 따로 가르지 않고 한 표에 다 넣는다
  // (명예의 전당과 같은 방식). 서버가 준 순서 그대로 쓴다.
  const playerWins = overview?.playerWins ?? [];
  const wonCount = roster ? roster.players.filter((p) => p.won).length : 0;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="우승횟수 관리"
        sub={
          <>
            대회에서 뛴 선수 중 우승한 사람 옆의 <b>+</b> 를 누르면 통산 우승횟수가 올라가요.
            상대팀으로 한 경기만 뛴 선수나 용병은 자동으로 들어가지 않아요 — 직접 골라 주세요.
          </>
        }
      />

      {competitionsError && <ErrorView message={competitionsError} />}

      {!competitionsError && competitions.length === 0 && !competitionsLoading && (
        <Empty>
          <strong>등록된 대회가 없어요</strong>
          <span>기록지를 먼저 업로드하면 그 대회가 여기 목록에 나와요.</span>
        </Empty>
      )}

      {competitions.length > 0 && (
        <SectionCard
          title="출전 선수"
          note={
            roster
              ? `${roster.players.length}명 중 우승자 ${wonCount}명 · 전체 ${roster.gameCount}경기`
              : '불러오는 중…'
          }
        >
          <div className="flex flex-wrap items-end gap-2.5">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">대회</span>
              <NativeSelect
                value={scopeId ?? ''}
                onChange={(e) => setPickedId(Number(e.target.value))}
                aria-label="우승을 등록할 대회 선택"
              >
                {competitions.map((c) => (
                  <NativeSelectOption key={c.id} value={String(c.id)}>
                    {c.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <span className="pb-1.5 text-xs text-muted-foreground">
              이 선택은 이 화면에서만 써요 — 위쪽 대회 선택과 따로 움직여요.
            </span>
          </div>

          {/* 뮤테이션 에러(예: 그 대회에서 뛴 기록이 없는 이름)는 표 위에 그대로 보여준다. */}
          {toggleMutation.error && (
            <div className="mt-3.5">
              <ErrorView message={toggleMutation.error.message} />
            </div>
          )}

          {rosterQuery.error && (
            <ErrorView
              message={rosterQuery.error.message}
              onRetry={() => void rosterQuery.refetch()}
            />
          )}

          {rosterQuery.isLoading && <TableSkeleton rows={10} cols={4} />}

          {roster && !rosterQuery.error && (
            <ChampionshipRosterTable
              roster={roster}
              stale={rosterStale}
              pendingPlayer={pendingPlayer}
              onToggle={handleToggle}
            />
          )}
        </SectionCard>
      )}

      <SectionCard
        title="통산 우승횟수"
        note={
          overview
            ? `우승 ${overview.wins.length}건 · 선수 ${playerWins.length}명 중 우승 경험 ${
                playerWins.filter((p) => p.wins > 0).length
              }명`
            : ''
        }
      >
        {championshipsQuery.error && (
          <ErrorView
            message={championshipsQuery.error.message}
            onRetry={() => void championshipsQuery.refetch()}
          />
        )}
        {championshipsQuery.isLoading && <TableSkeleton rows={8} cols={6} />}
        {overview && !championshipsQuery.error && <PlayerWinsTable players={playerWins} />}
      </SectionCard>

      <ChampionshipExportCard />
    </div>
  );
}
