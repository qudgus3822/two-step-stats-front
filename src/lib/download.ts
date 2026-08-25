// [신설: 2026-08-25 16:40, 김병현 작성] "받아온 파일을 사용자 컴퓨터에 저장시키기" 한 곳.
//
// 브라우저엔 "이 데이터를 파일로 저장해" 같은 함수가 없다. 그래서 다들 하는 편법을 쓴다:
// 안 보이는 <a download> 링크를 만들어 → 코드로 눌러 주고 → 치운다.
// 지저분한 순서라 화면 코드에 두면 눈에 거슬리고, 뒷정리(revokeObjectURL)를 빼먹기도 쉽다.
// 그래서 한 함수 안에 가둬 두고, 부르는 쪽은 saveBlob(파일내용, 이름) 만 알면 되게 했다.

// 받아온 내용(blob)을 fileName 으로 저장시킨다.
export function saveBlob(blob: Blob, fileName: string): void {
  // blob 을 가리키는 임시 주소를 만든다(brower 메모리 안에만 있는 가짜 URL).
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName; // 이 속성이 "열지 말고 저장해"라는 뜻이다
  // 파이어폭스는 문서에 붙어 있지 않은 링크의 click() 을 무시한다 → 붙였다가 뗀다.
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 임시 주소를 안 지우면 그 blob 이 탭을 닫을 때까지 메모리에 남는다(전체 내보내기는 10MB 쯤 된다).
  // 다운로드가 시작될 틈을 주고 지운다 — 곧바로 지우면 사파리에서 저장이 취소된다.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 응답 헤더 Content-Disposition 에서 파일 이름을 꺼낸다. 못 찾으면 null.
//
// 왜 서버 이름을 굳이 꺼내 쓰나: 이름 짓는 규칙(대회 라벨 + 날짜)이 이미 서버에 있다.
// 프론트가 제 이름을 또 만들면 규칙이 두 벌이 되고, 한쪽만 고쳐 어긋난다
// (이 저장소는 competitionLabel 복제로 이미 한 번 데였다 — UploadPage 주석 참고).
//
// 헤더는 두 가지 모양으로 온다. RFC 5987 쪽(filename*)이 한글을 제대로 담으므로 그쪽을 먼저 본다.
//   filename="rawdata.xlsx"                       ← 옛 브라우저용 ASCII 예비값
//   filename*=UTF-8''rawdata_2023%20...xlsx       ← 진짜 이름(퍼센트 인코딩)
export function fileNameFromHeader(header: string | null): string | null {
  if (!header) return null;

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      // 인코딩이 깨져 있으면 아래 ASCII 예비값으로 넘어간다(여기서 던지면 다운로드가 통째로 실패한다).
    }
  }

  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : null;
}
