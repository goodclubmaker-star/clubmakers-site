# 낭만엽서 재생형 공유 — API·데이터 계약 (v1)

iOS 앱(`nangman-postcard-ios`), 서버(이 저장소 `functions/api/nangman/postcard`),
웹 재생기(이 저장소 `public/nangman/postcard/`)가 함께 지키는 계약입니다.
관련: nangman-postcard-ios#7, clubmakers-site#17. 손글씨 형식은 nangman-postcard-ios `docs/stroke-format.md` (stroke-format v1).

## 1. 전체 흐름

1. 앱이 엽서를 두 부분으로 나눠 올린다.
   - **배경 이미지**: 손글씨를 뺀 엽서(편지지·사진·To/From·본문) 1080×1350 JPEG
   - **손글씨**: stroke-format v1 JSON (쓴 순서·시간·굵기)
2. 서버가 **공유 토큰**(링크용)과 **관리 토큰**(취소용)을 만들어 돌려준다.
3. 앱이 링크 `https://myclubmakers.com/nangman/postcard/?p=<공유 토큰>`을 카카오톡 등으로 보낸다.
4. 받은 사람은 로그인·설치 없이 링크를 열고, 배경 위에 손글씨가 쓴 순서대로 재생된다.
5. 보낸 사람은 관리 토큰으로 언제든 링크를 취소할 수 있다(내용 즉시 삭제).

배경을 이미지로 받는 이유: 편지지 장식·사진·글꼴을 웹에서 다시 그리면 앱과 달라진다.
앱이 그린 그대로를 쓰면 앱과 웹이 **완전히 같은 엽서**가 된다.

## 2. 토큰

| 토큰 | 만드는 법 | 쓰는 곳 | 서버 저장 |
|---|---|---|---|
| 공유 토큰 `p` | 무작위 16바이트(128비트) → base64url 22자 | 링크, 조회 | SHA-256 해시만 |
| 관리 토큰 | 무작위 32바이트 → base64url 43자 | 취소 (`Authorization: Bearer`) | SHA-256 해시만 |

- 토큰 원문은 서버에 남지 않는다. DB가 유출돼도 링크를 만들 수 없다.
- 토큰 형식: `^[A-Za-z0-9_-]{22}$` (공유), `^[A-Za-z0-9_-]{43}$` (관리). 형식이 다르면 바로 404/401.
- 앱은 관리 토큰을 **키체인**에 보관한다.

## 3. API

기본 주소: `https://myclubmakers.com/api/nangman/postcard`
모든 JSON 응답은 `Cache-Control: no-store`. 오류 본문은 `{ "code": "...", "error": "한국어 안내" }`.

### 3.1 만들기 — `POST /api/nangman/postcard`

`multipart/form-data`

| 필드 | 형식 | 제한 |
|---|---|---|
| `meta` | JSON 문자열 (아래) | 1.5 MB 이하 |
| `background` | `image/jpeg` | 2 MB 이하, JPEG 시그니처 검사 |

```json
{
  "format": "nangman-postcard",
  "version": 1,
  "from": "보내는 사람 (선택, 40자 이하)",
  "strokes": { "version": 1, "canvas": { "width": 1080, "height": 1350 }, "strokes": [ ... ] }
}
```

성공 `201`:
```json
{
  "token": "공유 토큰 22자",
  "manageToken": "관리 토큰 43자",
  "url": "https://myclubmakers.com/nangman/postcard/?p=공유토큰",
  "expiresAt": "2026-11-11T09:00:00.000Z"
}
```

오류: `400 invalid` (형식), `413 too_large`, `429 rate_limited`, `503 unavailable` (저장소 연결 없음), `507 storage_full`.

### 3.2 조회 — `GET /api/nangman/postcard/<token>`

성공 `200`:
```json
{
  "format": "nangman-postcard",
  "version": 1,
  "from": "보내는 사람 또는 null",
  "strokes": { ...stroke-format v1... },
  "background": "/api/nangman/postcard/<token>/background",
  "createdAt": "ISO",
  "expiresAt": "ISO"
}
```

| 상태 | code | 웹 화면 |
|---|---|---|
| 404 | `not_found` | "엽서를 찾을 수 없어요" (형식 오류 포함) |
| 410 | `expired` | "보관 기간이 지난 엽서예요" |
| 410 | `revoked` | "보낸 분이 공유를 취소한 엽서예요" |
| 503 | `unavailable` | 잠시 후 다시 |

### 3.3 배경 — `GET /api/nangman/postcard/<token>/background`

조회와 같은 검사 후 `image/jpeg`. `Cache-Control: private, no-store`.

### 3.4 취소 — `DELETE /api/nangman/postcard/<token>`

헤더 `Authorization: Bearer <관리 토큰>`.
성공 `200 { "revoked": true }`. 손글씨·배경을 저장소에서 **즉시 삭제**하고, 기록은 "취소됨" 표시만 남긴다.
`401 unauthorized` (관리 토큰 불일치), `404 not_found`. 이미 취소된 링크는 `200` (멱등).

## 4. 서버 검증 (손글씨 JSON)

- `format == "nangman-postcard"`, `version == 1`, `strokes.version == 1`, canvas 1080×1350
- 획 3,000개 이하, 점 합계 60,000개 이하, 획당 점 1개 이상
- 점은 유한한 숫자 4개 `[x, y, t, w]`, `t ≥ 0`, `w ≥ 0`
- `tool ∈ {pen, pencil, marker}`, `mode ∈ {direct, pad}`, `group`은 정수 또는 null, `color`는 `#RRGGBBAA`
- `start`는 유한한 숫자 ≥ 0
- 검증한 값만 다시 직렬화해서 저장한다(모르는 필드·HTML 등은 버림).
- 획이 0개면 `400` (`empty`) — 앱은 손글씨 없이 재생 공유를 막고 이미지 공유를 안내한다.

## 5. 보관·제한

| 항목 | 값 |
|---|---|
| 보관 기간 | 30일 후 만료 (만료 조회 시 내용 삭제) |
| 만들기 속도 | IP(해시)당 1시간 20개 |
| 전체 한도 | 저장 2 GB, 활성 엽서 20,000개 |
| 저장 위치 | D1 `nangman_postcards` 테이블(메타), R2 `nangman-postcard/<해시>/` (내용) — 기존 사투링고 DB·버킷과 이름이 겹치지 않는 별도 테이블·폴더 |

## 6. 웹 재생 페이지

- 주소 `/nangman/postcard/?p=<공유 토큰>`
- 링크 미리보기(카카오톡·OG)는 **모든 엽서가 같은 봉투 그림과 중립 문구**. 이름·본문·사진·손글씨를 절대 넣지 않는다(페이지가 정적이라 구조적으로 불가능).
- `noindex, nofollow`, `Referrer-Policy: no-referrer`, 외부 스크립트·폰트·분석 도구 없음(토큰이 제3자에게 가지 않게).
- 재생 규칙은 stroke-format v1의 규칙 S·P·F와 같다. 골든 테스트로 앱과 같은 숫자를 낸다.
