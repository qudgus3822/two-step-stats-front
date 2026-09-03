// scripts/checkPalette.mjs
// [신설: 2026-09-02 13:30, 김병현 작성] palette.ts(차트용 JS) ↔ index.css(CSS용) 색 대조기.
//
// 왜 필요한가: Tailwind v4 는 CSS-first 라 TS 를 못 읽는다. 그래서 같은 색이 두 파일에 적힌다.
// 이 스크립트가 "이름-값 쌍을, 정해진 순서대로" 맞춰본다.
// 집합(sort -u) 비교로는 --chart-3 과 --chart-4 가 뒤바뀌어도 통과해 버려서 못 쓴다.
import { readFileSync } from 'node:fs';

const CSS = process.argv[2] ?? 'src/index.css';
const TS = process.argv[3] ?? 'src/theme/palette.ts';

// palette.ts 의 어떤 필드가 index.css 의 어떤 변수와 짝인지. 이 표가 계약이다.
const PAIRS = [
  ['page', '--background'],
  ['surface', '--card'],
  ['textPrimary', '--foreground'],
  ['textSecondary', '--secondary-foreground'],
  ['muted', '--muted-foreground'],
  ['grid', '--muted'],
  ['baseline', '--baseline'],
  ['sequential', '--primary'],
  ['good', '--win'],
  ['critical', '--loss'],
  ['warning', '--draw'],
  ...Array.from({ length: 8 }, (_, i) => [`series[${i}]`, `--chart-${i + 1}`]),
];

const ts = readFileSync(TS, 'utf8');
const css = readFileSync(CSS, 'utf8');

function tsBlock(name) {
  const m = ts.match(new RegExp(`export const ${name}: ThemeTokens = \\{([\\s\\S]*?)\\n\\};`));
  if (!m) throw new Error(`palette.ts 에서 ${name} 을(를) 못 찾음`);
  return m[1];
}
function tsValue(block, key) {
  const arr = key.match(/^series\[(\d+)\]$/);
  if (arr) {
    const s = block.match(/series:\s*\[([\s\S]*?)\]/);
    if (!s) return null;
    const hexes = s[1].match(/#[0-9a-fA-F]{6}/g) ?? [];
    return hexes[Number(arr[1])] ?? null;
  }
  const m = block.match(new RegExp(`\\b${key}:\\s*'(#[0-9a-fA-F]{6})'`));
  return m ? m[1] : null;
}
function cssBlock(selector) {
  const m = css.match(new RegExp(`(^|\\n)${selector.replace('.', '\\.')}\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!m) throw new Error(`index.css 에서 ${selector} 블록을 못 찾음`);
  return m[2];
}
function cssValue(block, name) {
  const m = block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  return m ? m[1] : null;
}

let bad = 0;
for (const [mode, tsName, sel] of [['light', 'lightTokens', ':root'], ['dark', 'darkTokens', '.dark']]) {
  const tb = tsBlock(tsName);
  const cb = cssBlock(sel);
  const light = mode === 'light' ? null : cssBlock(':root'); // 다크가 안 덮으면 라이트 값 상속
  for (const [tsKey, cssVar] of PAIRS) {
    const a = (tsValue(tb, tsKey) ?? '').toLowerCase();
    let b = (cssValue(cb, cssVar) ?? '').toLowerCase();
    if (!b && light) b = (cssValue(light, cssVar) ?? '').toLowerCase();
    if (a !== b) {
      console.error(`✗ ${mode}  ${tsKey} = ${a || '(없음)'}  ≠  ${cssVar} = ${b || '(없음)'}`);
      bad++;
    }
  }
}
if (bad) {
  console.error(`\n실패 ${bad}건 — palette.ts 와 index.css 의 색이 어긋났다.`);
  process.exit(1);
}
console.log(`✓ 팔레트 일치 (${PAIRS.length * 2}쌍)`);
