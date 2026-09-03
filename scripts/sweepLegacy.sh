#!/usr/bin/env bash
# scripts/sweepLegacy.sh
# [신설: 2026-09-02 13:45, 김병현 작성] 옛 styles.css 클래스가 TSX 에 남았는지 훑는다.
#
# 목록을 손으로 안 적는 이유: 189개나 되고, 손으로 적으면 반드시 빠뜨린다.
# scripts/legacyClasses.txt 는 Phase 0 에서 styles.css 로부터 뽑아 고정해 둔 것이다
# (styles.css 는 Phase 5 에서 사라지므로 그때도 이 파일이 기준이 된다).
#
# ⚠ 반드시 완전일치(grep -xF)를 쓴다. 부분 일치로 하면
#    Tailwind 의 bg-card/85, text-muted-foreground, select-none 이 걸려서 영원히 통과 못 한다.
# ⚠⚠ 정적 className="..." 만 보면 사각지대가 생긴다.
#    className={`... ${x ? 'is-stale' : ''}`} 같은 동적 조립은 단순 grep 으로 못 잡는다.
#    (grep -P 로 ${...} 를 통째로 지우는 방식은 그 안의 'is-stale' 까지 같이 지워버려서
#     실제로 돌려보면 누락 시험을 통과하지 못한다 — scripts/sweepLegacyDynamic.mjs 상단 주석 참고.)
#    그래서 아래 2단계로 훑는다:
#      (1) 정적 className="..." — grep 으로 충분
#      (2) 동적 className={...} — 중괄호 균형/재귀가 필요해서 Node 스크립트에 위임
set -euo pipefail
SRC_DIR="src"
LIST="${1:-scripts/legacyClasses.txt}"

# (1) 정적 className="..." — 줄 전체 완전 일치
STATIC=$(
  grep -rho 'className="[^"]*"' "$SRC_DIR" --include='*.tsx' \
    | sed 's/className="//; s/"$//' | tr ' ' '\n' | sed '/^$/d' | sort -u \
    | grep -xF -f "$LIST" || true
)

# (2) 동적 className={...} — 중첩 ${} 안의 삼항연산자까지 정확히 훑는다.
DYNAMIC=$(node "$(dirname "$0")/sweepLegacyDynamic.mjs" "$SRC_DIR" "$LIST")

HITS=$(printf '%s\n%s\n' "$STATIC" "$DYNAMIC" | sed '/^$/d' | sort -u)
if [ -n "$HITS" ]; then
  echo "✗ 아직 옛 클래스가 남아 있다:"; echo "$HITS" | sed 's/^/   /'
  echo "$HITS" | wc -l | xargs printf '   총 %s개\n'
  exit 1
fi
echo "✓ 옛 클래스 잔재 0건 (정적 + 동적 className 모두 확인)"
