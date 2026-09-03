// [신설: 2026-09-03 09:00, 김병현 작성] 시각 정체성 개편(visual-identity) Phase 2 — 선수 아바타.
//
// 감추는 것: 이니셜을 뽑는 규칙(이름 첫 글자), 이름 → 색을 고르는 해시.
// 서버가 선수마다 색을 정해 주지 않는다 — 화면에서 이름만 보고 매번 "같은 색"을
// 뽑아내야 한다(새로고침해도, 어느 표에서 봐도 그 선수는 항상 같은 색이어야 한다).
// 그래서 암호학적으로 안전할 필요는 없고, 이름 문자열 → 8색 팔레트 인덱스로만
// 결정적으로 흩어주면 충분하다.

// 이름의 첫 글자. 빈 문자열(이론상)이면 물음표로 대신한다.
export function playerInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed[0] : '?';
}

// 이름 문자열 → [0, colorCount) 범위의 인덱스. 같은 이름은 항상 같은 인덱스를 받는다.
// (단순 다항 해시 — 이름이 몇 글자 안 되고 색이 8개뿐이라 이 정도로 충분히 고르게 퍼진다.)
export function playerColorIndex(name: string, colorCount: number): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash % colorCount;
}
