import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

// [변경: 2026-07-27 12:15, 김병현 수정] 업로드 화면 프론트 전용 비밀번호 잠금 신설.
// 무엇을 하나: /upload 앞에 세우는 "커튼". 오늘 비밀번호가 맞아야 children(UploadPage)을 렌더한다.
// 왜 별도 컴포넌트인가: 비밀번호 규칙 / 날짜 계산 / sessionStorage 저장·복원 / 잠금화면 UI /
// 한글 IME 진단 / 해제 후 포커스 이동을 여기 한 곳에만 숨겨두려고. 라우트(App.tsx)는
// <UploadPasswordGate><UploadPage/></UploadPasswordGate> 한 줄만 알면 되고,
// UploadPage 는 잠금이 있다는 사실조차 모른다.
// 한계(중요): 규칙이 번들에 그대로 들어간다 = 진짜 보안이 아니라 실수 방지용 커튼이다.
// API 는 여전히 열려 있다. 진짜 보안이 필요하면 서버 인증이 필요하다(이번 범위 밖, 사용자와 합의됨).
interface UploadPasswordGateProps {
  children: ReactNode; // 잠금이 풀렸을 때 보여줄 화면
}

// 잠금 해제를 기억하는 곳. sessionStorage 라서 그 탭이 살아 있는 동안만 유지된다
// (새 탭·브라우저 재시작이면 다시 묻는다 = 요구사항).
// 키 이름은 기존 관례를 따른다 — theme/ThemeContext.tsx 의 'tss-theme' 와 같은 tss- 접두 + 케밥.
const UNLOCK_STORAGE_KEY = 'tss-upload-unlocked';

// 비밀번호 앞부분. 한글 자판에서 "투스텝"을 영문 모드로 친 글자다(ㅌㅜ=xn, ㅅㅡ=tm, ㅌㅔㅂ=xpq) — 오타 아님.
// env 로 빼지 않는 이유: 어차피 번들에 그대로 노출돼서 숨겨지지도 않고, env 로 빼면 파일 3개
// (.env/.env.example/vite-env.d.ts)와 "미설정이면?" 정책이 딸려온다. 얻는 것 없이 복잡해질 뿐.
const UPLOAD_PASSWORD_PREFIX = 'xntmxpq';

// 입력에 한글이 섞였는지 판별(자모 + 완성형). 비번이 한글자판 유래라 한/영을 안 끄고 치면
// 칸에는 "투스텝0727" 이 들어가는데 type=password 라 눈으로 안 보인다 → 그때 원인을 콕 집어주려고.
const HANGUL_PATTERN = /[ㄱ-ㅎㅏ-ㅣ가-힣]/;

const ERROR_ID = 'upload-gate-error';
// [변경: 2026-07-27 12:15, 김병현 수정] 상시 힌트도 고유 id 를 가져서 입력칸의 aria-describedby 로
// 연결한다(리뷰 N1) — 안 그러면 autoFocus 로 입력칸에 포커스가 가도 스크린리더가 예방 힌트를 안 읽는다.
const HINT_ID = 'upload-gate-hint';

// 오늘의 비밀번호 = 접두어 + 월(2자리) + 일(2자리). 예: 7월 27일 → xntmxpq0727.
// 주의 1: getMonth() 는 0부터 세므로 +1 (7월이 6으로 나온다).
// 주의 2: getDay() 는 "요일"이다. 날짜는 getDate().
// 주의 3: toISOString() 은 UTC 라 한국 새벽(0~9시)엔 전날이 나온다 → 반드시 로컬 게터로 뽑는다.
function todaysUploadPassword(): string {
  const now = new Date(); // 사용자 기기의 로컬 시각 기준
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${UPLOAD_PASSWORD_PREFIX}${month}${day}`;
}

// sessionStorage 는 사파리 시크릿/저장소 차단 환경에서 예외를 던질 수 있다.
// 게이트가 통째로 죽는 것보다 "이번엔 그냥 다시 묻기"가 낫다 → 예외는 여기서 삼킨다(밖으로 안 알림).
function readUnlockedFromSession(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

// 날짜를 같이 저장하지 않는 이유: 자정을 넘겨도 "이미 통과한 탭"은 그대로 열어둘 생각이라서.
// 날짜 규칙은 새로 들어오는 사람에게 매일 다른 값을 요구하려는 것이지, 열린 탭을 쫓아내려는 게 아니다.
function rememberUnlockedInSession(): void {
  try {
    sessionStorage.setItem(UNLOCK_STORAGE_KEY, 'true');
  } catch {
    /* 저장을 못 해도 지금 화면은 state 로 열려 있다 — 새로고침하면 다시 물을 뿐 */
  }
}

export function UploadPasswordGate({ children }: UploadPasswordGateProps) {
  // 초기값을 "함수로" 준다(lazy init). 이미 푼 탭이면 첫 렌더부터 children 이라 잠금화면이 깜빡이지 않는다.
  const [unlocked, setUnlocked] = useState<boolean>(readUnlockedFromSession);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // 해제된 화면을 감싸는 상자. 방금 풀린 순간 여기로 포커스를 옮긴다(아래 이펙트).
  const unlockedRegionRef = useRef<HTMLDivElement>(null);
  // "방금 풀었다" 표시. 세션에서 복원돼 처음부터 열린 경우와 구분하려고 둔다 —
  // 재진입 때마다 포커스를 본문으로 끌어오면 헤더 링크를 누른 사용자가 성가시다.
  const justUnlockedRef = useRef(false);

  // 잠금이 풀린 순간, 폼이 사라지면서 포커스가 <body> 로 떨어진다(다음 Tab 이 문서 맨 위로 돌아감).
  // 새로 나타난 영역으로 포커스를 옮겨 키보드/스크린리더 흐름을 이어준다.
  // children 안의 제목을 잡지 않는 이유: 자식 내부 구조를 알면 결합이 생긴다. 내 래퍼만 잡으면 된다.
  useEffect(() => {
    if (unlocked && justUnlockedRef.current) {
      justUnlockedRef.current = false;
      unlockedRegionRef.current?.focus();
    }
  }, [unlocked]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // 비밀번호는 "지금" 계산한다. 모듈 상수로 굳히면 하루 넘게 켜둔 탭이 어제 값으로 비교하게 된다.
    // 입력만 소문자로 내리는 이유: 칸이 가려져 있어(type=password) Caps Lock 실수를 눈으로 못 잡는다.
    if (password.trim().toLowerCase() === todaysUploadPassword()) {
      rememberUnlockedInSession();
      justUnlockedRef.current = true; // 이펙트가 포커스를 옮기도록 표시
      setUnlocked(true);
      return;
    }
    // 실패 진단: 한글이 섞였으면 원인을 콕 집어준다(입력을 비우기 "전"에 검사).
    // 그 외에는 날짜만 흘리는 일반 문구 — 접두어나 조합 규칙은 절대 말하지 않는다.
    setError(
      HANGUL_PATTERN.test(password)
        ? '한글이 섞여 있어요. 한/영 키를 눌러 영문 상태에서 다시 입력해 주세요.'
        : '비밀번호가 달라요. 오늘 날짜 기준으로 다시 확인해 주세요.',
    );
    setPassword('');
    inputRef.current?.focus(); // 마우스로 버튼을 눌렀어도 바로 다시 칠 수 있게
  }

  // tabIndex={-1} = Tab 으로는 못 가고 코드로만 포커스 가능한 상자(포커스 착지점).
  if (unlocked) {
    return (
      <div ref={unlockedRegionRef} tabIndex={-1}>
        {children}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">업로드는 잠겨 있어요</h1>
        <p className="page-sub">운영자용 비밀번호를 입력하면 기록지 업로드 화면이 열려요.</p>
      </div>

      <form className="card upload-card" onSubmit={handleSubmit}>
        {/* [변경: 2026-07-27 12:27, 김병현 수정] 3차 구현 리뷰 감점 1 반영 — 힌트/오류 span 을
            label 밖으로 빼고 <div className="field"> 로 다시 감쌌다(N2 는 유지하되 위치만 수정).
            이유: label 이 컨트롤을 감싸면 서브트리의 모든 텍스트가 그 컨트롤의 접근성 이름이 된다.
            힌트·오류까지 label 안에 있으면 이름이 "비밀번호 영문 입력 상태(한/영)에서…" 처럼
            오염되고, 오류가 뜨면 이름이 실시간으로 또 바뀐다(ARIA 는 이름이 안정적이길 요구).
            label 은 예전처럼 field-label 텍스트 + input 만 감싼다 → 이름은 다시 "비밀번호" 로 고정.
            바깥 div 에 .field 를 다시 씀으로써(같은 클래스 재사용, 새 CSS 0줄) label·힌트·오류
            세 덩어리가 세로 flex(gap 6px)로 줄 분리되는 건 그대로 유지된다. */}
        <div className="field">
          {/* label 이 input 을 감싸서 자동 연결된다(기존 .field 패턴 그대로, UploadPage.tsx 와 동일). */}
          <label className="field">
            <span className="field-label">비밀번호</span>
            <input
              ref={inputRef}
              className="search"
              type="password"
              name="uploadCode"
              // 매일 바뀌는 공용 코드라 "저장할 자격증명"이 아니다. current-password 로 두면 브라우저가
              // 저장을 권하고 다음 날 어제 값을 자동완성해 버린다(칸이 가려져 원인도 안 보임).
              autoComplete="one-time-code"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null); // 다시 치기 시작하면 빨간 문구는 치운다
              }}
              aria-invalid={error != null}
              // [변경: 2026-07-27 12:15, 김병현 수정] 상시 힌트를 항상 연결하고, 오류가 있을 때는
              // 오류 문구까지 같이 읽히도록 두 id 를 이어붙인다(리뷰 N1). label 밖으로 옮긴 뒤에도
              // id 참조라 연결에는 영향 없다.
              aria-describedby={error ? `${HINT_ID} ${ERROR_ID}` : HINT_ID}
            />
          </label>

          {/* 한/영 예방 힌트(항상 보임). 규칙은 안 흘린다 — "영문 상태"라고만 말한다. */}
          <span id={HINT_ID} className="field-hint">
            영문 입력 상태(한/영)에서 입력해 주세요.
          </span>

          {error && (
            <span id={ERROR_ID} className="field-hint field-hint--warn" role="alert">
              {error}
            </span>
          )}
        </div>

        <div className="upload-actions">
          <button type="submit" className="btn btn--primary" disabled={!password.trim()}>
            잠금 해제
          </button>
          <span className="field-hint">이 브라우저 탭을 닫기 전까지는 다시 묻지 않아요.</span>
        </div>
      </form>
    </div>
  );
}
