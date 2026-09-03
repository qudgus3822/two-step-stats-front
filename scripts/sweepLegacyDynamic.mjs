// scripts/sweepLegacyDynamic.mjs
// [신설: 2026-09-02 13:45, 김병현 작성] 동적 className={...} 안의 문자열 리터럴을
// 정확히(중첩 ${} 까지) 토큰화해서 legacyClasses.txt 에 있는 옛 클래스와
// 완전일치하는 것만 출력한다.
//
// 왜 bash/grep 대신 Node 로 다시 짰나:
// 계획서 초안의 grep -P 기반 2단계 스윕(className={...} 를 통째로 잡고
// ${...} 를 지운 뒤 문자열 리터럴을 토큰화)은 실제로 돌려보니 누락 시험을 통과 못 했다.
// `className={`card ${x ? 'is-stale' : ''} grid-2`}` 에서 ${...} 를 통째로 지워버리면
// 그 안에 있던 'is-stale' 도 같이 사라져서 못 잡는다 — 삼항연산자로 클래스를 고르는
// 흔한 패턴(옛 코드의 is-stale/is-active/metric-tab 등 13곳이 전부 이 모양이다)을
// 놓치는 셈이라 계획의 취지("동적 조립도 잡는다")와 어긋난다.
// 그래서 정규식 대신 문자열을 문자 단위로 훑는 작은 파서로 다시 짰다:
//  - '...' / "..." 는 안쪽 전체를 공백 기준 토큰으로 쪼갠다.
//  - `...`(백틱) 는 ${...} 를 중괄호 균형을 맞춰 건너뛰되, 그 안을 **재귀적으로
//    다시 훑어서** 삼항연산자 등에 숨은 문자열 리터럴('is-stale' 같은)도 잡는다.
//    백틱 밖의 순수 텍스트 조각(`card`, `grid-2`)은 그대로 공백 토큰화한다.
// 이렇게 하면 두 시험(§8-3 "구현자에게")을 실측으로 통과한다 —
//  ① 누락 시험: className={`card ${x ? 'is-stale' : ''} grid-2`} → card/is-stale/grid-2 3건 검출
//  ② 오탐 시험: className={cn('bg-card/85', 'text-muted-foreground', 'select-none')} → 0건
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const [, , srcDir, listPath] = process.argv;
if (!srcDir || !listPath) {
  console.error('사용법: node scripts/sweepLegacyDynamic.mjs <src디렉토리> <legacyClasses.txt>');
  process.exit(2);
}

const legacy = new Set(
  readFileSync(listPath, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean),
);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

// 문자열 s 안에서 'a' / "a" / `a${expr}b` 형태의 문자열 리터럴을 전부 찾아
// 공백 단위 토큰으로 쪼갠다. 백틱 안의 ${...} 는 중괄호 균형을 맞춰 건너뛰되,
// 그 안에 중첩된 문자열 리터럴은 재귀적으로 다시 훑는다(삼항연산자 케이스 대응).
function extractTokens(s) {
  const tokens = [];
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    if (c === "'" || c === '"') {
      const j = s.indexOf(c, i + 1);
      if (j === -1) break;
      tokens.push(...s.slice(i + 1, j).split(/\s+/).filter(Boolean));
      i = j + 1;
    } else if (c === '`') {
      let j = i + 1;
      let lit = '';
      while (j < n && s[j] !== '`') {
        if (s[j] === '$' && s[j + 1] === '{') {
          let depth = 1;
          let k = j + 2;
          while (k < n && depth > 0) {
            if (s[k] === '{') depth++;
            else if (s[k] === '}') depth--;
            k++;
          }
          tokens.push(...lit.split(/\s+/).filter(Boolean));
          lit = '';
          tokens.push(...extractTokens(s.slice(j + 2, k - 1))); // ${...} 안쪽 재귀
          j = k;
          continue;
        }
        lit += s[j];
        j++;
      }
      tokens.push(...lit.split(/\s+/).filter(Boolean));
      i = j + 1;
    } else {
      i++;
    }
  }
  return tokens;
}

// className={ ... } 안의 내용을 중괄호 균형을 맞춰 정확히 뽑는다.
function findClassNameAttrs(content) {
  const attrs = [];
  const marker = 'className={';
  let idx = 0;
  while ((idx = content.indexOf(marker, idx)) !== -1) {
    let depth = 1;
    let k = idx + marker.length;
    while (k < content.length && depth > 0) {
      if (content[k] === '{') depth++;
      else if (content[k] === '}') depth--;
      k++;
    }
    attrs.push(content.slice(idx + marker.length, k - 1));
    idx = k;
  }
  return attrs;
}

const hits = new Set();
for (const file of walk(srcDir)) {
  const content = readFileSync(file, 'utf8');
  for (const attr of findClassNameAttrs(content)) {
    for (const tok of extractTokens(attr)) {
      if (legacy.has(tok)) hits.add(tok);
    }
  }
}

for (const h of [...hits].sort()) console.log(h);
