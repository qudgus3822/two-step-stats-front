import type {
  GameBox,
  GameSummary,
  LeaderboardMetric,
  LeaderboardRow,
  PlayerDetail,
  PlayerListItem,
  Season,
  Summary,
  UploadResult,
} from './types';

// 백엔드 호출을 한 곳에 모은 얇은 API 클라이언트.
// 화면 코드는 fetch/URL 조립을 몰라도 되고, api.games(season) 처럼만 부른다.

// API 주소: 환경변수 우선, 없으면 로컬 3000. 끝의 슬래시는 떼서 이중 슬래시 방지.
const BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(
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
    const detail = await res.text().catch(() => '');
    let message = detail;
    try {
      // Nest 예외는 { message } 형태가 많음
      const parsed = JSON.parse(detail);
      message = parsed.message ?? detail;
    } catch {
      /* JSON 아니면 원문 그대로 */
    }
    throw new Error(message || `요청 실패 (HTTP ${res.status})`);
  }
  return res.json() as Promise<T>;
}

// 시즌 쿼리는 값이 있을 때만 붙인다(빈 문자열=전체).
function seasonQuery(season?: string): string {
  return season ? `?season=${encodeURIComponent(season)}` : '';
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

// JSON 본문 POST (시즌 등록 등). 연결 실패/에러는 request() 와 같은 문구로 처리.
async function postJson<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      `API 서버에 연결하지 못했습니다 (${BASE}). NestJS 서버가 켜져 있는지 확인하세요.`,
    );
  }
  if (!res.ok) await failure(res, `요청 실패 (HTTP ${res.status})`);
  return res.json() as Promise<T>;
}

// DELETE 요청 (시즌 등록 해제 등)
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

// [변경: 2026-07-14 14:21, 김병현 수정] 엑셀 업로드(multipart POST) 추가.
// GET 전용 request() 와 달리 파일을 FormData 로 보내야 해서 별도 함수로 둔다.
// 파싱/DB 적재는 전부 서버(POST /upload)가 하고, 여기선 파일+시즌만 넘긴다.
async function uploadWorkbook(
  file: File,
  season: string,
  mode: 'replace' | 'append',
): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file); // 서버는 'file' 필드로 받는다(FileInterceptor)

  // mode 는 항상, season 은 값이 있을 때만 쿼리로 붙인다.
  const q = new URLSearchParams({ mode });
  if (season.trim()) q.set('season', season.trim());

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
    let message = detail;
    try {
      // Nest 예외는 { message } 형태가 많음
      const parsed = JSON.parse(detail);
      message = parsed.message ?? detail;
    } catch {
      /* JSON 아니면 원문 그대로 */
    }
    throw new Error(message || `업로드 실패 (HTTP ${res.status})`);
  }
  return res.json() as Promise<UploadResult>;
}

export const api = {
  health: () => request<{ ok: boolean }>('/health'),

  seasons: () => request<string[]>('/seasons'),

  summary: (season?: string) => request<Summary>(`/summary${seasonQuery(season)}`),

  games: (season?: string) => request<GameSummary[]>(`/games${seasonQuery(season)}`),

  game: (id: string) => request<GameBox>(`/games/${encodeURIComponent(id)}`),

  players: (season?: string) =>
    request<PlayerListItem[]>(`/players${seasonQuery(season)}`),

  player: (name: string) =>
    request<PlayerDetail>(`/players/${encodeURIComponent(name)}`),

  leaderboard: (metric: LeaderboardMetric, limit: number, season?: string) => {
    const q = new URLSearchParams({ metric, limit: String(limit) });
    if (season) q.set('season', season);
    return request<LeaderboardRow[]>(`/leaderboard?${q.toString()}`);
  },

  // 엑셀 기록지 업로드 → 서버가 파싱 후 DB 적재. mode 기본값은 '교체'(replace).
  upload: (file: File, season: string, mode: 'replace' | 'append' = 'replace') =>
    uploadWorkbook(file, season, mode),

  // 시즌 등록부: 등록된 시즌 목록 / 등록 / 등록 해제
  seasonRegistry: () => request<Season[]>('/seasons/registry'),

  createSeason: (name: string) => postJson<Season>('/seasons', { name }),

  deleteSeason: (id: number) =>
    del<{ ok: boolean; id: number }>(`/seasons/${id}`),
};

export { BASE as API_BASE };
