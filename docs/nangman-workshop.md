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
- **프로젝트:** 메모텔라, 시날로아, 기분풍선, 벽돌깨기, 사투링고, 아버지 이야기 노트, 낭만페이지, 인생4초, 웅토, CineCam 등. 공개 여부는 개별 앱별로 분명히 구분한다.
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
