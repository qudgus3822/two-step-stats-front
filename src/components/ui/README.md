# [신설: 2026-09-02 13:25, 김병현 작성] `src/components/ui/` 안내

이 폴더는 `npx shadcn@latest add ...` 가 생성한 **벤더링(vendored) 코드**다.

## 이름 규칙 예외

이 저장소는 컴포넌트 파일을 PascalCase 로 쓰지만(`Layout.tsx`, `BoxScoreTable.tsx`),
**이 폴더만 kebab-case 예외**다(`badge.tsx`, `alert-dialog.tsx` …). 손으로 이름을 바꾸지 마라 —
`npx shadcn@latest add <name> --diff` 같은 명령이 파일 이름으로 컴포넌트를 찾는다.

## 우리가 손댄 파일 (생성된 코드를 원칙과 다르게 고친 곳)

생성된 코드는 원칙적으로 손대지 않지만, 아래 두 파일은 이 앱 특유의 요구 때문에
의도적으로 고쳤다. 실제로 손댈 때마다 이 문서와 파일 안 주석([변경: ...])을 함께 갱신한다.

1. **`badge.tsx`** ([변경: 2026-09-02, Phase 3a] 완료) — cva variant 에 `win`/`loss`/`draw`/
   `team`/`overtime` 을 추가했다. 승/패/무 같은 이 앱만의 의미색은 shadcn 기본 variant
   (default/secondary/destructive/outline)로 표현이 안 돼서다.

2. **`table.tsx`** ([변경: 2026-09-02, Phase 3b] 완료) — 바깥 스크롤 컨테이너 div
   (`data-slot="table-container"`)를 제거했다. 이 프로젝트는 표를 전부 `TableScroller` 로
   감싼다. shadcn 원본처럼 `<table>` 이 자기 안에 또 `overflow-x-auto` 컨테이너를 가지면,
   스크롤 상자가 둘이 되어 안쪽이 스크롤을 먹는다. 그러면 `TableScroller` 의 스크롤 힌트
   (페이드)와 키보드 스크롤(`tabIndex`)이 죽는다. 스크롤 주인은 언제나 `TableScroller`
   하나여야 한다(계획서 §D9).

   ⚠ `npx shadcn@latest add table -o`(강제 덮어쓰기)나 CLI 업그레이드가 이 수정을 조용히
   되살릴 수 있다. 표는 그래도 스크롤은 되기 때문에 화면으로는 안 보인다.
   `scripts/checkVendored.mjs` 가 `prebuild` 에서 이 컨테이너 부활을 감시한다.

   [변경: 2026-09-03, 시각 정체성 개편 Phase 2] 표 전면 재스타일도 여기 얹었다 —
   `TableHeader` 배경(`bg-muted/40`)+굵은 밑줄, `TableHead` 를 작고 굵고 자간 넓은 "라벨"
   톤으로, `TableRow` hover 강화(`/50`→`/70`), `TableCell` 행간 확대(`p-2`→`px-3 py-2.5`).
   ⚠ `checkVendored.mjs` 가 지키는 건 여전히 "컨테이너 제거" 하나뿐이다 — 이 재스타일은
   자동 감시 대상이 아니라서, CLI 로 덮어쓴 뒤엔 이 문서를 보고 눈으로 비교해서 복구해야 한다.

## 새 부품을 추가하려면

`npx shadcn@latest add <name>` 을 쓰고, 위 두 파일처럼 손을 대야 하면 사유를 이 문서와
파일 안 주석에 함께 남겨라.
