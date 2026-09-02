// scripts/checkVendored.mjs
// [신설: 2026-09-02 13:30, 김병현 작성] shadcn 생성 코드에 우리가 손댄 부분이 되살아났는지 감시한다.
//
// 지금 지키는 것: ui/table.tsx 의 스크롤 컨테이너 제거(§D9).
// shadcn add -o 나 CLI 업그레이드가 이 수정을 덮으면 표의 키보드 스크롤·페이드가 죽는데,
// 표는 여전히 스크롤돼서 화면으로는 안 보인다. 그래서 빌드를 세운다.
//
// ⚠ [Phase 1 시점 주의] 이 스크립트는 아직 package.json 의 prebuild 에 연결하지 않았다.
// ui/table.tsx 의 컨테이너 제거는 Phase 3b 에서 이뤄진다 — 그 전(Phase 1~2)에는 컨테이너가
// 아직 그대로 있어서, 지금 이 스크립트를 prebuild 에 걸면 원본 상태를 "깨졌다"고
// 오판해 빌드가 항상 막힌다. Phase 3b 담당자가 table.tsx 를 고친 뒤 이 스크립트를
// prebuild 에 연결한다("node scripts/checkPalette.mjs && node scripts/checkVendored.mjs").
import { readFileSync } from 'node:fs';

const TABLE = 'src/components/ui/table.tsx';
const src = readFileSync(TABLE, 'utf8');

const fail = [];

// 1) 컨테이너가 부활했는가
if (src.includes('data-slot="table-container"')) {
  fail.push(
    `${TABLE}: 스크롤 컨테이너가 되살아났다 (data-slot="table-container").\n` +
      `   → shadcn add 로 덮인 것 같다. 계획서 §D9 대로 그 div 를 다시 제거해라.\n` +
      `   그대로 두면 TableScroller 와 이중 스크롤이 되어 페이드·키보드 스크롤이 죽는다.`,
  );
}

// 2) overflow 를 다시 들고 왔는가 (data-slot 이름만 바뀐 경우까지 잡는다)
if (/overflow-x-auto|overflow-auto/.test(src)) {
  fail.push(
    `${TABLE}: overflow 클래스가 다시 들어왔다. 스크롤 주인은 TableScroller 하나여야 한다(§D9).`,
  );
}

if (fail.length) {
  console.error('✗ 벤더링 수정이 덮어써졌다:\n\n' + fail.join('\n\n'));
  process.exit(1);
}
console.log('✓ 벤더링 수정 유지됨 (ui/table.tsx)');
