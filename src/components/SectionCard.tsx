// [신설: 2026-09-02 16:00, 김병현 작성] 제목+메모가 달린 카드 한 장.
// 감추는 것: Card 5조각(Header/Title/Description/Action/Content) 조립, 제목 레벨(h2),
// 메모 줄바꿈. 24곳이 반복하는 모양이라 뽑았다 — 얇은 편이지만(조립만 감춤) 그 반복 제거와
// "제목은 항상 h2"라는 강제 하나로 채택한다(계획서 §3 "얕다고 판정한 것과 그 처리").
//
// props 5개 상한: title/note/action/children/className — 옵션 폭발 방지.
import type { ReactNode } from 'react';
import { Card, CardAction, CardContent, CardDescription, CardHeader } from './ui/card';

interface SectionCardProps {
  title: ReactNode;
  note?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, note, action, children, className }: SectionCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        {/* CardTitle(ui/card.tsx)은 <div> 라 대신 <h2> 를 직접 쓴다 — 페이지 제목(h1) 아래
            섹션이라는 걸 스크린리더 헤딩 탐색에서도 알 수 있어야 한다. 클래스는 CardTitle 과 동일. */}
        <h2 data-slot="card-title" className="font-heading text-base leading-snug font-medium">
          {title}
        </h2>
        {note && <CardDescription>{note}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
