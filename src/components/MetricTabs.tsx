// [신설: 2026-09-02 16:00, 김병현 작성] 지표 고르는 탭 줄. 리더보드(19)/시너지(7)/기량발전(9)
// 세 화면이 각자 손으로 짜던 탭 UI를 하나로 모았다.
//
// 감추는 것: Radix Tabs 조립, activationMode="manual", 모바일 가로 스크롤 + 페이드,
// 그리고 탭↔패널 ARIA 연결(aria-controls/id/aria-labelledby)을 손으로 안 짜도 되게 하는 것.
//
// ⚠ activationMode="manual" 이 핵심이다. 기본값(automatic)이면 ←→ 로 포커스만 옮겨도
// 탭이 바뀌어 그때마다 서버 요청이 나간다 — 리더보드는 지표가 19개라 치명적이다.
//
// TabsContent 는 쓰지 않는다 — 탭 아래 내용은 호출부가 직접 그린다(옛 구조 유지, 화면마다
// 레이아웃이 상당히 다르다). 대신 panelProps 로 { id, role, aria-labelledby } 를 돌려주어
// 호출부가 id 문자열을 손으로 조립하지 않게 한다 — 반대 방향(aria-controls + 패널 id)까지
// 이걸로 채워진다(옛 GrowthPage 는 aria-labelledby 방향만 있었다).
import type { ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

interface MetricTabsProps<M extends string> {
  metrics: readonly M[];
  labels: Record<M, string>;
  value: M;
  onChange: (metric: M) => void;
  ariaLabel: string;
}

interface MetricTabsPanelProps {
  id: string;
  role: 'tabpanel';
  'aria-labelledby': string;
}

interface MetricTabsResult {
  tabs: ReactNode;
  panelProps: MetricTabsPanelProps;
}

// 왜 컴포넌트가 아니라 훅인가: 탭 UI(JSX)만 필요하면 컴포넌트로 충분하지만, 이건 그 아래
// 패널에 붙일 id/role/aria-labelledby 를 **호출부에게 돌려줘야** 한다(그래야 호출부가 그 문자열을
// 손으로 조립하지 않는다). 컴포넌트는 자기 서브트리 밖으로 값을 돌려줄 방법이 없다 —
// children-as-function 도 가능하지만 자기 완결형 `<MetricTabs .../>` 로 못 쓰게 된다.
// "JSX 와 데이터를 함께 반환"은 훅이 자연스럽다(react-deep-hook-design: 반환값이 콜백/데이터
// 묶음일 때는 훅).
export function useMetricTabs<M extends string>({
  metrics,
  labels,
  value,
  onChange,
  ariaLabel,
}: MetricTabsProps<M>): MetricTabsResult {
  const panelId = `metric-panel-${ariaLabel}`;
  const tabId = (m: M) => `metric-tab-${ariaLabel}-${m}`;

  const tabs = (
    <Tabs value={value} onValueChange={(v) => onChange(v as M)} activationMode="manual">
      <TabsList
        aria-label={ariaLabel}
        className="scroll-fade-x h-auto w-full justify-start overflow-x-auto"
      >
        {metrics.map((m) => (
          <TabsTrigger
            key={m}
            id={tabId(m)}
            value={m}
            className="shrink-0 whitespace-nowrap"
            aria-controls={panelId}
          >
            {labels[m]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  return {
    tabs,
    panelProps: { id: panelId, role: 'tabpanel', 'aria-labelledby': tabId(value) },
  };
}
