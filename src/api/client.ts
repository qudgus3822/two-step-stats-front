// [신설: 2026-08-25 16:40, 김병현 작성] 응답 헤더에서 파일 이름 꺼내기(저장은 화면 쪽에서).
import { fileNameFromHeader } from '../lib/download';
import type {
  Competition,
  GameBox,
  GameConflict,
  GameSummary,
  // [변경: 2026-07-28 15:00, 김병현 수정] 기량 발전 리포트 타입 추가.
  GrowthMetric,
  GrowthReport,
  LeaderboardMetric,
  LeaderboardRow,
  // [신설: 2026-07-29 15:32, 김병현 작성] 처음 보는 선수 이름 타입.
  NewPlayer,
  PlayerDetail,
  PlayerListItem,
  // [신설: 2026-08-25 16:40, 김병현 작성] 원본 데이터 내려받기 결과.
  RawDataDownload,
  Summary,
  // [변경: 2026-07-27 16:14, 김병현 수정] 시너지 리포트 타입 추가.
  SynergyMetric,
  SynergyReport,
  UploadConflictBody,
  UploadResult,
} from './types';

// 백엔드 호출을 한 곳에 모은 얇은 API 클라이언트.
// 화면 코드는 fetch/URL 조립을 몰라도 되고, api.games(competitionId) 처럼만 부른다.

// [변경: 2026-07-15 14:10, 김병현 수정] 409(중복 경기)는 문자열 메시지로 뭉개지 말고,
// 충돌 목록을 살려 던진다 → 화면이 "덮어쓸까요?" 모달에 경기 목록을 보여줄 수 있게.
// [변경: 2026-07-29 15:32, 김병현 수정] 409 본문 전체를 그대로 받는 생성자로 바꿨다.
// 이제 이 에러는 "409 본문을 Error 로 입은 것"이다 — 필드 기본값(undefined → [])을 여기서 흡수해
// 호출부가 방어 코드를 쓰지 않아도 되게 한다.
// [변경: 2026-07-29 15:32, 김병현 수정] 필드명 conflicts → games (서버 본문 필드명과 통일).
//   이제 '충돌'이 경기 말고 이름도 있어서, conflicts 라는 이름이 경기만 가리키면 헷갈린다.
export class UploadConflictError extends Error {
  readonly games: GameConflict[];
  readonly newPlayers: NewPlayer[];
  readonly competition: string;

  constructor(body: UploadConflictBody) {
    super(body.message);
    this.name = 'UploadConflictError';
    // 서버가 옛 버전이면 newPlayers 가 없을 수 있다 → 빈 배열로 흡수(화면은 그냥 그 칸이 안 뜬다).
    this.games = body.games ?? [];
    this.newPlayers = body.newPlayers ?? [];
    this.competition = body.competition;
  }
}

// [변경: 2026-07-27 15:20, 김병현 수정] 상태코드를 살려 던진다.
// 404("그 조건으론 기록이 없다")를 네트워크 오류와 구분하려면 status 가 필요하다.
export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// API 주소: 환경변수 우선, 없으면 로컬 3000. 끝의 슬래시는 떼서 이중 슬래시 방지.
// [변경: 2026-07-27 11:02, 김병현 수정] 백엔드가 setGlobalPrefix('api')로 바뀌어 기본값에 /api 추가. VITE_API_BASE_URL 을 쓸 때도 /api 까지 포함해야 함.
const BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(
  /\/$/,
  '',
);

// 서버가 4xx/5xx를 줄 때 본문 메시지를 뽑아 에러로 던진다(화면에서 보여주기 좋게).
async function request<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`);
  } catch {
    // 네트워크 자체가 안 되는 경우(서버 꺼짐/CORS 등)
    throw new Error(
      `API 서버에 연결하지 못했습니다 (${BASE}). NestJS 서버가 켜져 있는지 확인하세요.`,
    );
  }
  if (!res.ok) {
    // 본문 메시지 추출 로직은 그대로 — 상태코드만 ApiError 에 실어 던진다.
    const detail = await res.text().catch(() => '');
    let message = detail;
    try {
      // Nest 예외는 { message } 형태가 많음
      const parsed = JSON.parse(detail);
      message = parsed.message ?? detail;
    } catch {
      /* JSON 아니면 원문 그대로 */
    }
    throw new ApiError(res.status, message || `요청 실패 (HTTP ${res.status})`);
  }
  return res.json() as Promise<T>;
}

// [변경: 2026-07-14 17:32, 김병현 수정] 대회 모델 대개편 — 필터 키가 문자열(season)에서
// 숫자 id(competitionId)로 바뀌었다. null/undefined(=전체)면 쿼리를 안 붙인다.
function competitionQuery(competitionId?: number | null): string {
  return competitionId != null ? `?competitionId=${competitionId}` : '';
}

// [변경: 2026-07-14 14:21, 김병현 수정] 실패 응답(4xx/5xx) 본문에서 사람이 읽을 메시지를 뽑아 던진다.
// GET 전용 request() 와 새로 추가한 POST/DELETE 가 같은 방식으로 에러를 보여주도록 공용화.
async function failure(res: Response, fallback: string): Promise<never> {
  const detail = await res.text().catch(() => '');
  let message = detail;
  try {
    // Nest 예외는 { message } 형태가 많음
    const parsed = JSON.parse(detail);
    message = parsed.message ?? detail;
  } catch {
    /* JSON 아니면 원문 그대로 */
  }
  throw new Error(message || fallback);
}

// DELETE 요청 (대회 등록 해제 등)
async function del<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  } catch {
    throw new Error(
      `API 서버에 연결하지 못했습니다 (${BASE}). NestJS 서버가 켜져 있는지 확인하세요.`,
    );
  }
  if (!res.ok) await failure(res, `요청 실패 (HTTP ${res.status})`);
  return res.json() as Promise<T>;
}

// 엑셀 업로드(multipart POST). GET 전용 request() 와 달리 파일을 FormData 로 보내야 해서
// 별도 함수로 둔다. 파싱/DB 적재는 전부 서버(POST /upload)가 하고, 여기선 파일+대회 정보만 넘긴다.
// [변경: 2026-07-14 17:32, 김병현 수정] 대회는 이제 "연도+시즌번호(선택)+대회명" 3값으로 넘긴다
// (옛 season 문자열 1개 대신). 서버가 이 3값으로 Competition 을 upsert 한다.
// [변경: 2026-07-15 14:10, 김병현 수정] mode 단일값 대신 옵션 객체로 — force(강행 재전송) 추가.
async function uploadWorkbook(
  file: File,
  c: { year: number; seasonNo: number | null; name: string },
  opts: { mode: 'replace' | 'append'; force: boolean },
): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file); // 서버는 'file' 필드로 받는다(FileInterceptor)

  const q = new URLSearchParams({ mode: opts.mode });
  q.set('year', String(c.year));
  if (c.seasonNo != null) q.set('seasonNo', String(c.seasonNo));
  q.set('name', c.name.trim());
  if (opts.force) q.set('force', 'true'); // [변경: 2026-07-15 14:10, 김병현 수정] 덮어쓰기 강행

  let res: Response;
  try {
    res = await fetch(`${BASE}/upload?${q.toString()}`, {
      method: 'POST',
      body: form, // Content-Type 은 브라우저가 boundary 와 함께 자동 지정
    });
  } catch {
    // 네트워크 자체가 안 되는 경우(서버 꺼짐/CORS 등)
    throw new Error(
      `API 서버에 연결하지 못했습니다 (${BASE}). NestJS 서버가 켜져 있는지 확인하세요.`,
    );
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    let parsed: unknown = null;
    try {
      // Nest 예외는 { message } 형태가 많음
      parsed = JSON.parse(detail);
    } catch {
      /* JSON 아니면 원문 그대로 */
    }
    // [변경: 2026-07-15 14:10, 김병현 수정] 409 + conflict:true 면 충돌 목록을 살려 전용 에러로.
    if (res.status === 409 && (parsed as UploadConflictBody | null)?.conflict === true) {
      throw new UploadConflictError(parsed as UploadConflictBody);
    }
    const message = (parsed as { message?: string } | null)?.message ?? detail;
    throw new Error(message || `업로드 실패 (HTTP ${res.status})`);
  }
  return res.json() as Promise<UploadResult>;
}

// [신설: 2026-08-25 16:40, 김병현 작성] 원본(rawdata) 데이터 내려받기. 업로드의 반대 방향이다.
//
// 왜 <a href> 링크 한 줄로 안 하나: 링크로 받으면 실패가 안 보인다. 서버가 꺼져 있거나
// 404 여도 브라우저는 조용히 아무 일도 안 하거나 에러 페이지를 파일로 저장해 버린다.
// fetch 로 받으면 다른 호출들과 똑같이 실패를 잡아 화면에 문구로 띄울 수 있다.
//
// 파일 이름과 행 수는 본문이 아니라 헤더에 있다. 이 헤더들이 브라우저 JS 에 보이려면
// 서버 CORS 에 exposedHeaders 가 켜져 있어야 한다(api/src/main.ts). 꺼져 있으면
// 에러 없이 이름만 조용히 예비값으로 떨어지므로, 여기 예비값은 "그래도 뭔가는 저장된다"용이다.
async function downloadRawData(competitionId?: number | null): Promise<RawDataDownload> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/export${competitionQuery(competitionId)}`);
  } catch {
    throw new Error(
      `API 서버에 연결하지 못했습니다 (${BASE}). NestJS 서버가 켜져 있는지 확인하세요.`,
    );
  }
  // 실패 응답의 본문은 엑셀이 아니라 JSON 에러다 → 다른 호출과 같은 방식으로 메시지를 뽑는다.
  if (!res.ok) await failure(res, `내려받기 실패 (HTTP ${res.status})`);

  const blob = await res.blob();
  const fileName =
    fileNameFromHeader(res.headers.get('Content-Disposition')) ?? 'rawdata.xlsx';
  // 헤더가 없으면 null 이다 — 0 으로 뭉개면 화면이 "0행 받았어요"라는 거짓말을 한다.
  const rawCount = res.headers.get('X-Rawdata-Rows');
  const parsedCount = rawCount != null ? Number(rawCount) : NaN;
  const rowCount = Number.isFinite(parsedCount) ? parsedCount : null;

  return { blob, fileName, rowCount };
}

export const api = {
  health: () => request<{ ok: boolean }>('/health'),

  summary: (competitionId?: number | null) =>
    request<Summary>(`/summary${competitionQuery(competitionId)}`),

  games: (competitionId?: number | null) =>
    request<GameSummary[]>(`/games${competitionQuery(competitionId)}`),

  game: (id: string) => request<GameBox>(`/games/${encodeURIComponent(id)}`),

  players: (competitionId?: number | null) =>
    request<PlayerListItem[]>(`/players${competitionQuery(competitionId)}`),

  // 선수 상세. competitionId 를 주면 그 대회만, 없으면 통산.
  // 404 는 "이 조건으로는 기록 없음"이라 에러 대신 null 로 돌려준다
  // (화면은 '못 찾음'과 '서버 문제'를 다르게 보여줘야 해서).
  player: async (name: string, competitionId?: number | null): Promise<PlayerDetail | null> => {
    try {
      return await request<PlayerDetail>(
        `/players/${encodeURIComponent(name)}${competitionQuery(competitionId)}`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  // [변경: 2026-07-14 17:49, 김병현 수정] limit 선택적 — 양수일 때만 쿼리에 붙이고, 생략/0이하면 서버가 전체 반환.
  leaderboard: (metric: LeaderboardMetric, limit?: number, competitionId?: number | null) => {
    const q = new URLSearchParams({ metric });
    if (limit && limit > 0) q.set('limit', String(limit));
    if (competitionId != null) q.set('competitionId', String(competitionId));
    return request<LeaderboardRow[]>(`/leaderboard?${q.toString()}`);
  },

  // 엑셀 기록지 업로드 → 서버가 파싱 후 DB 적재. mode 기본값은 '교체'(replace).
  // [변경: 2026-07-15 14:10, 김병현 수정] force(강행 재전송) 옵션 추가 — 덮어쓰기 확인 후 재전송에 씀.
  upload: (
    file: File,
    c: { year: number; seasonNo: number | null; name: string },
    opts?: { mode?: 'replace' | 'append'; force?: boolean },
  ) => uploadWorkbook(file, c, { mode: opts?.mode ?? 'replace', force: opts?.force ?? false }),

  // [변경: 2026-07-27 16:14, 김병현 수정] 시너지 리포트 조회. 이름은 URLSearchParams 가 알아서 인코딩한다.
  // 기록이 없는 선수도 200(빈 리포트)이라 404 흡수 로직이 필요 없다(선수 상세 api.player 와 다른 점).
  synergy: (player: string, metric: SynergyMetric, competitionId?: number | null) => {
    const q = new URLSearchParams({ player, metric });
    if (competitionId != null) q.set('competitionId', String(competitionId));
    return request<SynergyReport>(`/synergy?${q.toString()}`);
  },

  // [변경: 2026-07-28 15:00, 김병현 수정] 기량 발전 리포트 조회.
  // competitionId 는 필수다(서버가 없으면 400). 없는 대회면 404 = 진짜 에러라 흡수하지 않는다.
  growth: (competitionId: number, metric: GrowthMetric) => {
    const q = new URLSearchParams({ competitionId: String(competitionId), metric });
    return request<GrowthReport>(`/growth?${q.toString()}`);
  },

  // [신설: 2026-08-25 16:40, 김병현 작성] 원본(rawdata) 양식 그대로 내려받기.
  // competitionId 를 주면 그 대회만, 생략(또는 null)하면 전체 대회를 한 파일에 담는다.
  // 받은 blob 을 실제로 저장시키는 건 화면 몫이다(lib/download.ts 의 saveBlob).
  exportRawData: (competitionId?: number | null) => downloadRawData(competitionId),

  // 대회 등록부: 등록된 대회 목록 (등록은 upload 가 자동으로 upsert 해서 별도 호출 없음) / 등록 해제
  competitions: () => request<Competition[]>('/competitions'),

  deleteCompetition: (id: number) =>
    del<{ ok: boolean; id: number }>(`/competitions/${id}`),
};

export { BASE as API_BASE };
