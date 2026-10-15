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
| `background` | `image/jpeg` | 2 MB 이하. JPEG 구조(마커·프레임 헤더·끝 표시)를 검사하고 **정확히 1080×1350**이어야 함 |

요청 전체는 **4 MB 상한**. `Content-Length`가 없는(청크) 요청도 본문을 읽는 도중 4 MB를 넘으면 바로 `413`.

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

## 5. 보관·제한·삭제

| 항목 | 값 |
|---|---|
| 보관 기간 | **업로드 완료 시점부터 10일** (2026-10-13 변경, 이전 30일). 10일이 지나면 **즉시 열람 차단**(410 expired, "보관 기간이 종료된 엽서입니다"). 30일 기준으로 이미 발급된 링크도 업로드 후 10일에 만료 |
| 만들기 속도 | IP(해시)당 1시간 20개 |
| 전체 한도 | 살아 있는 엽서 기준 저장 2 GB, 20,000개 (만료·삭제된 엽서는 세지 않음) |
| 저장 위치 | D1 `nangman_postcards` 테이블(메타), R2 `nangman-postcard/<해시>/` (내용) — 기존 사투링고 DB·버킷과 이름이 겹치지 않는 별도 테이블·폴더 |

**동시 요청**: 속도 제한과 전체 한도 검사·예약을 **한 개의 `INSERT … SELECT … WHERE` 문**으로 처리한다. D1은 한 문장을 원자적으로 실행하므로 동시에 수십 건이 들어와도 제한을 넘겨 만들어지지 않는다. 내용 저장(R2)에 실패하면 이미 쓴 객체와 예약 행을 모두 지운다(고아 객체 없음).

**실제 삭제 (3단계)**
1. **취소**: 즉시 R2 내용 삭제, D1에는 "취소됨" 표시만 남김.
   - 아이폰 사진 앱에 직접 저장한 이미지는 서버와 무관하므로 이 기간·삭제의 영향을 받지 않는다.
2. **만료 정리**: 만들기·조회 요청이 올 때마다 만료된 엽서를 최대 25개씩 찾아 R2 내용을 삭제한다(아무도 다시 열지 않은 엽서 포함).
3. **최종 보장 — R2 수명 주기 규칙 (Cloudflare 대시보드 설정 필요)**: 요청이 전혀 없어도 지워지도록, `AUDIO` 바인딩 버킷에 다음 규칙을 둔다.
   - 대상 접두사 `nangman-postcard/`, **업로드 후 11일이 지나면 객체 삭제** (만료 10일 + 하루 여유. 기존 31일 규칙이 있으면 11일로 수정)
   - 대상 접두사 `nangman-postcard-sealed/`(특별 우표, §8), **업로드 후 377일이 지나면 객체 삭제** (최대 1년 잠금 + 개봉 후 10일 + 하루 여유)
   - 설정 위치: Cloudflare 대시보드 → R2 → (AUDIO에 연결된 버킷) → 설정 → 객체 수명 주기 규칙 → 규칙 추가
   - 이 규칙이 있어야 "10일 뒤 자동 삭제" 안내가 사실이 된다. **배포 전 필수.**

D1의 메타 행(토큰 해시·시각·크기만, 편지 내용 없음)은 "만료/취소" 안내를 위해 남는다.

## 6. 웹 재생 페이지

- 주소 `/nangman/postcard/?p=<공유 토큰>`
- 링크 미리보기(카카오톡·OG)는 **모든 엽서가 같은 봉투 그림과 중립 문구**. 이름·본문·사진·손글씨를 절대 넣지 않는다(페이지가 정적이라 구조적으로 불가능).
- `noindex, nofollow`, `Referrer-Policy: no-referrer`, 외부 스크립트·폰트·분석 도구 없음(토큰이 제3자에게 가지 않게).
- 재생 규칙은 stroke-format v1의 규칙 S·P·F와 같다. 골든 테스트로 앱과 같은 숫자를 낸다.
- 취소·만료는 **링크를 새로 열 때** 적용된다. 이미 열어 둔 화면에 내려받은 엽서는 그 화면을 닫을 때까지 보인다.

## 7. 우표 (무료·유료·테스트) 원장과 구매 검증

계정: 앱이 키체인에 보관한 UUIDv4를 `x-nangman-stamp-account` 헤더로 보냄. 서버에는 SHA-256 해시만 저장.
앱은 애플이 서명한 `AppTransaction`(StoreKit 2 `AppTransaction.shared`의 JWS)을 `x-nangman-app-transaction` 헤더로 보냄.

| pool | 들어오는 경로 | 만료 | 쓰는 곳 |
| --- | --- | --- | --- |
| `free` | 매월 `STAMPS_MONTHLY_FREE_COUNT`(기본 20), 잔액 0이면 보너스(`STAMPS_FREE_BONUS_ENABLED`) | 그 달(UTC) | 모든 앱, 가장 먼저 |
| `paid` | **Production(실결제)** 구매 검증 즉시 | 없음 | 모든 앱, 무료 다음 |
| `test` | **Sandbox(TestFlight·App Review, 무료 결제)** 구매 검증 | 없음 | **테스트 서버에서만**: `STAMPS_TEST_SPEND_ENABLED=true` **그리고** 애플 서명 AppTransaction이 Sandbox(`receiptType`)일 때 (무료 다음, 유료 전). 실서비스(Production 배포)에서는 어떤 요청으로도 못 씀 |

`balance` = free + paid (실제 우표). `testBalance`는 따로 표시.

### `GET /api/nangman/stamps`
`{month, freeBalance, paidBalance, testBalance, balance, sent, bonus, monthlyAllowance, price, canGetBonus, purchaseEnabled}`
`purchaseEnabled`: App Store 앱에 "우표 사기" 버튼을 보일지(`STAMPS_PAID_ENABLED`). **지급 여부와는 무관**.

### `POST /api/nangman/postcard` (우표 관련)
- 계정 헤더가 있으면 원장에서 1장 차감(무료 → [테스트 서버 + 서명 확인된 Sandbox 앱이면 test] → 유료), 업로드 실패 시 원래 pool로 1회 환불
- 계정 헤더가 없는 구버전 앱: 무료 출시 동안은 그대로 허용. `STAMPS_REQUIRE_ACCOUNT=true`면 **426 `update_required`** "낭만엽서를 최신 버전으로 업데이트한 뒤 다시 보내 주세요." — **유료 판매 전에 반드시 켬**
- 우표가 없으면 409 `out_of_stamps` (보너스 가능 여부에 맞춘 안내문)

### `POST /api/nangman/stamps/purchase`
본문 `{"signedTransaction": "<StoreKit 2 Transaction.jwsRepresentation>"}`.

1. `lib/apple-jws.js`: ES256, x5c 3장, 마지막 인증서 = Apple Root CA - G3(SHA-256 고정), 발급자·서명 체인, 리프 `1.2.840.113635.100.6.11.1`·중간 `1.2.840.113635.100.6.2.1` 표식, JWS 서명, 유효기간은 서명 시각(signedDate) 기준(애플 라이브러리와 같음)
2. `lib/nangman-iap.js`: bundleId, 상품 3종, `Consumable`, **`appAccountToken` 필수(UUIDv4)**, 환불 안 됨, 수량 1–10, 환경 Production/Sandbox(Xcode 로컬 테스트 거래는 거부)
3. 우표는 **애플이 서명한 `appAccountToken` 계정**에 들어감(요청 헤더와 무관). 토큰 없는 거래(프로모션 구매·오퍼 코드 — 설정하지 않음)는 400 `no_account`, 고객지원 처리
4. Production → `paid` **즉시 지급**(판매 버튼이 닫혀 있어도 돈을 낸 고객은 기다리지 않음). Sandbox → `test`
5. 원장 `iap:<환경>:<transactionId>` 고유 키로 **1회만**

응답 `{granted, credits, test, transactionId, wallet?}` — `wallet`은 요청 계정이 구매 계정일 때만. 앱은 200 후에만 `transaction.finish()`.
오류: 400 `unverified` / `wrong_app` / `unknown_product` / `no_account` / `invalid` / `revoked` / `unsupported_environment`.

### `POST /api/nangman/stamps/apple-notifications`
App Store Server Notifications **V2**. App Store Connect → 앱 정보 → App Store 서버 알림에 Production·Sandbox 모두:
`https://myclubmakers.com/api/nangman/stamps/apple-notifications`
- `REFUND`: 그 거래가 준 만큼 같은 pool에서 1회 회수. 이미 써 버렸으면 잔액이 음수(화면엔 0)가 되고 양수가 될 때까지 그 pool로는 못 보냄. 지급 **전에** 환불이 오면 0장 기록으로 이후 지급 차단
- `REFUND_REVERSED`: 환불분 1회 복원
- 나머지는 200으로 확인만

### 설정값 (Cloudflare Pages 환경변수)
| 이름 | 기본 | 의미 |
| --- | --- | --- |
| `STAMPS_MONTHLY_FREE_COUNT` | 20 | 매월 무료 |
| `STAMPS_FREE_BONUS_ENABLED` | (켜짐) | `false`면 잔액 0 보너스 중단 |
| `STAMPS_FREE_BONUS_COUNT` | 20 | 보너스 장수 |
| `STAMPS_PAID_ENABLED` | (꺼짐) | `true`면 App Store 앱에 "우표 사기" 버튼 표시 |
| `STAMPS_REQUIRE_ACCOUNT` | (꺼짐) | `true`면 계정 없는 구버전 앱 발송 차단(426) |
| `STAMPS_TEST_SPEND_ENABLED` | (꺼짐) | **Preview(테스트) 배포에만** `true`, 그리고 Preview가 **별도 D1**을 쓸 때만. Production 배포에는 절대 설정하지 않음(이 값 하나가 테스트 우표 차단의 근거) |

### 유료 판매 전 남은 위험 (기록)
- 익명 계정이라 앱을 지우고 키체인까지 지우면(또는 위조 요청으로) 새 UUID = 새 무료 20장. 지금은 IP당 시간 20건 제한만 있음. 유료 전환 시 Apple **DeviceCheck/App Attest**로 기기당 무료 지급 제한 검토
- 키체인을 잃으면 산 우표가 새 계정에 보이지 않음 → 고객지원 절차(iOS `docs/appstore/stamp-iap-review.md` §8)

테스트: `node --test scripts/nangman-postcard/*.test.mjs` (Node 22+). `fixtures/real-apple-chain.json`은 애플 공개 인증서, `test-apple-chain/`·`forged-*`는 테스트 전용.

## 8. 특별 우표 — 예약 개봉 "시간을 담아 보내는 편지"

- 만들기: `meta.opensAt`(ms 또는 ISO 8601)를 넣으면 예약 엽서. **보낸 시각 + 1시간 ~ + 366일**(앱 시계 차이 5분 허용), 범위 밖이면 400 `invalid_open_time` "도착 시간은 1시간 뒤부터 1년 안으로 정해 주세요."
  - `opensAt`은 D1 `nangman_postcards.opens_at`에만 저장(meta.json에 넣지 않음). 응답에 `opensAt` 추가
  - 우표는 일반과 같이 1장(무료 출시 기간). 여러 장 차감은 결정 후
  - R2 경로 `nangman-postcard-sealed/<id>/…` — 11일 수명 규칙의 영향을 받지 않음
- 보관: **개봉 시각부터 10일**. 만료·정리·전역 상한 모두 `COALESCE(opens_at, created_at)` 기준. 기존 행은 `opens_at` NULL = 일반
- 개봉 전 (서버가 강제):
  - `GET /api/nangman/postcard/<token>` → `{format, version, sealed: true, from, opensAt, calendar, createdAt, expiresAt}` — **손글씨·배경 주소 없음**
  - `GET …/background` → 423 `sealed`
  - `GET …/calendar` → `text/calendar`(.ics) 개봉 시각 일정 + 알림(VALARM). **받는 사람 연락처는 받지 않음**. 예약 엽서에만 있음(일반은 404)
- 개봉 후: 일반 엽서와 같은 응답 + `opensAt`. 웹 재생·영상 저장 그대로
- 보낸 사람 취소(DELETE): 개봉 전에도 가능, 즉시 삭제
- 웹(`player-20261015-fixed3x-a.js`, `postcard-sealed-20261014-a.css`): 잠긴 봉투, "시간을 담아 보내는 편지", 도착 예정(보는 기기 현지 시각), 남은 시간, "📅 도착일 알림 받기". 도착 시각이 되면 자동으로 다시 불러와 봉투가 열림
- 수신자의 손글씨 재생은 항상 **전체 3배속**이며 재생 속도 선택창은 표시하지 않음(기존에 발송한 공유 링크에도 동일 적용). 영상 저장도 같은 3배속 타임라인 사용
- 테스트: `scripts/nangman-postcard/sealed.test.mjs`, `scripts/nangman-postcard/fixed-3x-player.test.mjs`

