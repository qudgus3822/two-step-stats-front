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
  // [변경: 2026-09-02 18:10, 김병현 수정] id 에 공백이 들어가면 안 된다(HTML 무효 — id 는
  // 공백 없는 토큰이어야 한다). ariaLabel(예: "시너지 지표")을 그대로 id 에 넣으면
  // `id="metric-panel-시너지 지표"`처럼 공백 섞인 id 가 생긴다. 실측(Phase 4c)에서
  // aria-controls/aria-labelledby 매칭 자체는 문자열이 같으면 동작하지만, HTML 표준을
  // 어기는 값이라 다른 도구(CSS #id 선택자 등)에서 깨질 수 있어 공백만 제거한다.
  const slug = ariaLabel.replace(/\s+/g, '-');
  const panelId = `metric-panel-${slug}`;
  const tabId = (m: M) => `metric-tab-${slug}-${m}`;

  // [변경: 2026-09-02 22:05, 김병현 수정] 한 줄 가로 스크롤 → **여러 줄로 접히는 알약 묶음**으로 되돌렸다.
  //
  // 왜: shadcn 의 Tabs 는 원래 '세그먼트 컨트롤'(2~4개짜리 작은 토글 묶음)용이다.
  // 회색 상자 안에 칸을 나눠 넣고 한 줄에 눕히는 모양이라, 지표가 19개인 리더보드에 쓰면
  // 전부 한 줄에 구겨넣고 옆으로 밀어야 보인다 — PC 는 아래로 빈 공간이 남아도는데 마지막
  // 지표가 잘려 있었고, 모바일도 마찬가지였다.
  //
  // 지표 탭은 세그먼트가 아니라 **고르는 칩 묶음**이다. 그래서 줄바꿈(flex-wrap)으로 되돌려
  // 19개가 한눈에 다 보이게 한다(옛 .metric-tabs 가 하던 그대로다).
  //
  // ⚠ TabsList 높이는 반드시 group-data-horizontal 접두어를 붙여 덮어야 한다.
  //   shadcn 기본값이 `group-data-horizontal/tabs:h-8`(32px 고정)이라, 접두어 없는 `h-auto`
  //   로는 안 이긴다 — 실제로 그래서 한 줄로 눌려 있었다.
  // ⚠ 활성 알약 색도 dark: 접두어까지 같이 덮어야 한다. 기본 스타일에
  //   `dark:data-active:bg-input/30` 이 따로 걸려 있어서, 접두어 없는 규칙만 주면
  //   다크 모드에서 파란 알약이 회색으로 돌아간다.
  const tabs = (
    <Tabs value={value} onValueChange={(v) => onChange(v as M)} activationMode="manual">
      <TabsList
        aria-label={ariaLabel}
        className="h-auto w-full flex-wrap justify-start gap-1.5 bg-transparent p-0 group-data-horizontal/tabs:h-auto"
      >
        {metrics.map((m) => (
          <TabsTrigger
            key={m}
            id={tabId(m)}
            value={m}
            className={
              'h-auto flex-none rounded-full border-border bg-background px-3 py-1.5 ' +
              'text-[13px] font-medium whitespace-nowrap text-muted-foreground ' +
              'hover:border-baseline hover:text-foreground ' +
              'data-active:border-primary data-active:bg-primary data-active:text-primary-foreground ' +
              'dark:data-active:border-primary dark:data-active:bg-primary dark:data-active:text-primary-foreground'
            }
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
