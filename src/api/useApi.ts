import { useEffect, useState, type DependencyList } from 'react';

// 데이터 하나 불러오는 흔한 3상태(로딩/에러/데이터)를 한 번에 처리하는 훅.
// 화면마다 useState 3개 + useEffect + 취소처리를 반복하지 않게 묶었다.
//
// 쓰는 법:
//   const { data, loading, error, reload } = useApi(() => api.games(season), [season]);
//
// deps 가 바뀌면 자동으로 다시 부른다. reload() 로 수동 새로고침도 된다.

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

export function useApi<T>(fetcher: () => Promise<T>, deps: DependencyList): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0); // reload() 트리거용

  useEffect(() => {
    let alive = true; // 언마운트/의존성 변경 시 늦게 온 응답 무시
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (alive) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (alive) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
    // fetcher 는 매 렌더 새로 만들어지므로 deps 로만 재실행을 통제한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, error, loading, reload: () => setNonce((n) => n + 1) };
}
