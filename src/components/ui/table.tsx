"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// [변경: 2026-09-02 15:50, 김병현 수정] 바깥 스크롤 컨테이너 div 제거.
// 왜: 이 프로젝트는 표를 전부 TableScroller 로 감싼다. 컨테이너가 둘이면 안쪽이 스크롤을
//     먹어 바깥의 스크롤 힌트(scroll-fade-x)와 키보드 스크롤(tabIndex)이 죽는다.
//     스크롤 주인은 언제나 TableScroller 하나다(계획서 §D9).
// ⚠ 이 파일은 shadcn 생성 코드다 — `add table --diff` 를 돌리면 이 줄이 차이로 뜬다(정상).
//   scripts/checkVendored.mjs 가 이 수정이 되살아나는지 상시 감시한다(Phase 3b 부터 prebuild 연결).
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <table
      data-slot="table"
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  )
}

// [변경: 2026-09-03 09:00, 김병현 수정] 시각 정체성 개편(visual-identity) Phase 2 — 표 전면 재스타일.
// 헤더 배경(muted/40) + 밑줄을 border-b(1px)에서 baseline 2px로 굵혀 "표 머리"가 눈에
// 확 들어오게 한다. 이 파일을 고치면 이 앱의 표 7종 전부(TableScroller 로 감싼 곳 전부)에
// 한 번에 퍼진다 — 그게 이 벤더 파일을 손대는 이유다(§D9 와 같은 논리, ui/README.md 갱신).
function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-muted/40 [&_tr]:border-b-2 [&_tr]:border-b-baseline", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

// [변경: 2026-09-03 09:00, 김병현 수정] hover 를 /50→/70 으로 또렷하게(계획서 "행 hover 를 또렷하게").
function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/70 has-aria-expanded:bg-muted/70 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

// [변경: 2026-09-03 09:00, 김병현 수정] 헤더 글자를 "라벨"처럼(작게+굵게+자간 넓힘+보조색)
// 낮춰서 본문 데이터가 더 강해 보이게 한다(Linear/Notion 류 표가 쓰는 흔한 패턴).
// 높이도 h-10→h-11 로 살짝 키워 숨 쉴 공간을 준다.
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-11 px-3 text-left align-middle text-xs font-semibold tracking-wide text-muted-foreground whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

// [변경: 2026-09-03 09:00, 김병현 수정] 행 높이/여백을 p-2(8px)→px-3 py-2.5 로 키워 표가
// 빽빽해 보이지 않게 한다(계획서 "행 높이·여백을 키워 숨 쉬게").
function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-2.5 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
