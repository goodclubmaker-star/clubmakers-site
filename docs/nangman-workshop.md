# 낭만공작소 — 웹앱 통합 소개 페이지

## 사용자 결정 · 2026-10-10
- **브랜드:** 낭만공작소 (NANGMAN WORKSHOP)
- **공식 주소:** https://myclubmakers.com/nangman/
- **공식 호스트:** 기존 골프채공작소 사이트 `myclubmakers.com` 재사용, 별도 유료 도메인 구매 금지
- **GitHub:** `goodclubmaker-star/clubmakers-site` (Astro 4 · Cloudflare Pages)
- **실제 배포:** 검수·PR 병합·Cloudflare Pages 성공 확인 후에만 공개 링크로 안내
- **구조:** `public/nangman/index.html`과 같은 정적 파일들 → `/nangman/`
- **진입점:** 상단 웹 메뉴 '낭만공작소'
- **이전 별도 Vercel 시연 주소가 있어도 공식 목적지는 위 단일 주소**
- **홍보:** 프로젝트별 카드뉴스 5장, 저장(PNG 1080×1350), 공유 딥링크, 웹앱 실행 연결(검증된 주소만)
- **대표 공개 앱(1순위):** WOONGTO(웅토), 인생4초(인생사초), 채CINE(채씨네). 2026-10-10 기준 Apple 공식 개발자 페이지에서 App Store 공개 확인.
- **앱스토어 링크:** WOONGTO https://apps.apple.com/kr/app/woongto/id6811301799 · 인생4초 https://apps.apple.com/kr/app/id6817789548 · 채CINE https://apps.apple.com/kr/app/id6816676310
- **2026-10-10 최신 확정(한꺼번에 1차 공개):** WOONGTO → 인생4초 → 채CINE → 낭만페이지 → 시날로아 → 사투링고. 첫 화면에 데스크톱 3열×2행, 모바일 2열×3행으로 여섯 작품을 동시에 배치. **출시/출시 준비/웹 체험 또는 녹음 개선**을 명확히 구분.
- **낭만페이지:** 사용자가 거의 완성 단계라고 확인함. 상태는 '출시 준비 · 최종 마무리'로 표시하고 App Store 링크를 공개 검증 전까지 표시하지 않는다.
- **나머지:** 메모텔라와 아버지 이야기 노트는 하단 '더 많은 실험'으로 배치. 추후 추가 작품도 하단에서 시작한다.
- **사투링고:** 기존 `src/pages/satulinggo.astro` 웹 구현이 있지만 모바일·카카오톡 녹음의 안정화가 필요하므로 iOS/Android 정식 출시로 표시하지 않는다.
- **제외 결정:** 기분풍선(기존 후보 5번), 벽돌깨기(6번), 에세이텔라(7번)는 홍보 후보에서 제외. 해당 프로젝트의 원래 저장소·파일은 삭제하지 않는다.
- **출시 검증:** 사이트 카드는 실제 App Store 링크로 연결하되 Android 정식 앱 출시로 오인하지 않도록 OS를 명시한다.
- **안드로이드:** 이 페이지는 `/nangman/` 범위의 설치형 PWA. 개별 iOS 앱이 Android 앱이 됐다는 뜻이 아니다. Play Store 출시는 별도 개발, 키/아이콘/링크 검증, 실기기 검수, 정책 심사 필요
- **주의:** root PWA scope / service worker를 침범하지 말고 반드시 `/nangman/` 범위만 등록할 것. 기존 골프채공작소 경로 변경 금지.

## 편집 방법
1. `public/nangman/app.js`의 `projects` 목록에서 스토리, 분류, 상태, 체험 URL을 수정한다.
2. 앱 공개 여부를 확인하기 전에는 '출시/다운로드' CTA를 만들지 않는다.
3. 레이아웃은 `public/nangman/style.css`; 홈페이지는 `public/nangman/index.html`.
4. Cloudflare Pages의 Astro 정적 빌드를 확인하고 모바일(특히 iPhone Safari/Android Chrome)에서 저장/공유/설치 기능을 확인한다.
5. Google Play APK / TWA 배포는 별도 트랙으로 진행한다.

## 안전한 공개 순서
PR 검토 → `npm run build` → Preview URL 수동 확인 → main 병합 → `https://myclubmakers.com/nangman/` 접근 확인.
