// [신설: 2026-07-27 16:25, 김병현 작성]
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCompetition } from '../context/CompetitionContext';

// 비교 화면의 "지금 뭘 고른 상태인가"를 URL과 전역 대회 선택에서 하나로 합쳐 준다.
//
// 숨기는 것: URL 파라미터 이름(a/b/competitionId), 전체 대회를 뜻하는 'all' 표기,
// 빈 문자열→null 정규화, 히스토리 오염을 막는 replace 쓰기, 최신 setSearchParams 래치,
// 그리고 "주소로 들어온 대회를 첫 렌더부터 쓰고, 전역 선택에는 한 번만 반영한다"는 규칙.
//
// 조용히 안 되는 경우(주의):
//  - CompetitionProvider 밖에서 쓰면 useCompetition 이 던진다(즉시 실패라 안전).
//  - 라우터 밖에서 쓰면 useSearchParams 가 던진다.
export interface CompareSelection {
  playerA: string | null;
  playerB: string | null;
  competitionId: number | null; // 이 화면의 대회 스코프
  competitionLabel: string | null; // 그 스코프의 표시 이름(전체면 null)
  isScopeSettled: boolean; // 스코프가 확정됐나. 아직이면 화면은 로딩만 보여준다
  scopeError: string | null; // 대회 목록을 못 불러왔을 때의 메시지(화면은 '전체 대회' 기준으로 계속 동작)
  selectPlayerA: (name: string | null) => void; // 평생 같은 참조(ref 래치 덕분)
  selectPlayerB: (name: string | null) => void;
  swap: () => void;
}

// URL 의 competitionId 파라미터 문자열 → 스코프 값.
// 'all'/숫자 아님/0 이하 → null(전체), 양의 정수 → 그 숫자, 파라미터 자체가 없음 → undefined
// (undefined 는 "아직 이 화면이 대회를 안 정했다"는 뜻 — Context 의 explicitCompetitionId 와 같은 3값 규칙).
function parseScopeParam(raw: string | null): number | null | undefined {
  if (raw == null) return undefined;
  if (raw === 'all') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function useCompareSelection(): CompareSelection {
  const [params, setParams] = useSearchParams();
  const { labelOf, competitionId: ctxCompetitionId, setCompetitionId, loading, error: scopeError } =
    useCompetition();

  // ── URL 쓰기: 최신 setSearchParams 를 상자에 담아 두고 그것만 쓴다(ref 래치).
  // react-router 의 setSearchParams 는 주소가 바뀔 때마다 새 함수다(dist/index.js:1024~1034,
  // useCallback(..., [navigate, searchParams]) 이고 searchParams 는 location.search 로 매번 새로 만들어짐).
  // 그대로 deps 에 넣으면 (1) 콜백이 매번 새로 만들어져 "참조 안정" 약속이 깨지고,
  // (2) 반대로 deps 를 비우면 옛 함수를 붙잡아 prev 가 낡은 값이 된다(A 고르고 B 고르면 A 가 날아감).
  // 상자에 담아 두면 함수는 그대로면서 값은 항상 최신이다.
  const setParamsRef = useRef(setParams);
  useEffect(() => {
    setParamsRef.current = setParams;
  });

  // 불변식(gotcha 21): updateParams 는 한 이벤트에서 한 번만 부른다.
  // 래치는 렌더 사이에만 갱신되므로, 한 핸들러에서 두 번 부르면 두 번째가 첫 번째 결과를 못 보고
  // 낡은 prev 를 읽어 첫 변경이 날아간다. 여러 값을 바꿔야 하면 한 번의 호출 안에서 다 바꿔라(swap 처럼).
  const updateParams = useCallback((mutate: (next: URLSearchParams) => void) => {
    setParamsRef.current(
      (prev) => {
        const next = new URLSearchParams(prev);
        mutate(next);
        return next;
      },
      { replace: true }, // 히스토리 안 쌓이게(뒤로가기 눌러도 대회/선수 변경 이력이 없음)
    );
  }, []);

  // ── 선수 선택
  const playerA = params.get('a') || null; // 빈 문자열도 null 로 정규화
  const playerB = params.get('b') || null;

  const selectPlayerA = useCallback(
    (name: string | null) => updateParams((n) => (name ? n.set('a', name) : n.delete('a'))),
    [updateParams],
  );
  const selectPlayerB = useCallback(
    (name: string | null) => updateParams((n) => (name ? n.set('b', name) : n.delete('b'))),
    [updateParams],
  );

  // swap: 한 번의 updateParams 안에서 a/b 를 맞바꾼다(불변식 준수 — 두 번 부르지 않는다).
  // a/b 를 먼저 다 읽고 나서 set/delete 해야 한다 — 먼저 쓰고 나서 읽으면 이미 덮인 값을 읽게 된다.
  // 빈 쪽은 반드시 delete — set(key, undefined) 하면 URL 에 문자열 "undefined" 가 박히고
  // 그 이름으로 API 를 때린다. 한쪽만 고른 상태면 선택이 반대편으로 '옮겨간다'(AC 86).
  const swap = useCallback(() => {
    updateParams((n) => {
      const a = n.get('a');
      const b = n.get('b');
      if (b) n.set('a', b);
      else n.delete('a');
      if (a) n.set('b', a);
      else n.delete('b');
    });
  }, [updateParams]);

  // ── 대회 스코프: 주소에 적힌 값이 있으면 첫 렌더부터 그걸 쓴다.
  //    (안 그러면 통산으로 한 번, 그 대회로 또 한 번 조회하는 낭비가 생긴다.)
  const [pendingUrlScope, setPendingUrlScope] = useState<number | null | undefined>(() =>
    parseScopeParam(params.get('competitionId')),
  );
  const hadUrlScopeRef = useRef(pendingUrlScope !== undefined);

  useEffect(() => {
    if (pendingUrlScope !== undefined) setCompetitionId(pendingUrlScope);
    setPendingUrlScope(undefined); // 이제부터는 전역 Context 값이 진짜
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 1회만 적용하는 딥링크 반영
  }, []);

  const competitionId = pendingUrlScope !== undefined ? pendingUrlScope : ctxCompetitionId;
  // 라벨 규칙은 Context labelOf 한 곳에만 산다(AC 85·57) — 여기선 부르기만 한다.
  const competitionLabel = labelOf(competitionId);
  // 스코프가 확정됐나: 주소에 값이 있었으면 처음부터 확정, 없었으면 대회 목록 로딩이 끝나야 확정.
  const isScopeSettled = hadUrlScopeRef.current || !loading;

  // ── 전역 선택 → URL (스코프가 자리 잡은 뒤에만 쓴다: all → 3 으로 두 번 쓰기 방지)
  useEffect(() => {
    if (!isScopeSettled) return;
    updateParams((n) => n.set('competitionId', competitionId == null ? 'all' : String(competitionId)));
  }, [isScopeSettled, competitionId, updateParams]);

  return {
    playerA,
    playerB,
    competitionId,
    competitionLabel,
    isScopeSettled,
    scopeError,
    selectPlayerA,
    selectPlayerB,
    swap,
  };
}
