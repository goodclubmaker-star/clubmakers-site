# 클럽메이커스 (myclubmakers.com)

24년 골프채 공작소 클럽메이커스의 공식 웹사이트.

## 기술 스택

- **프레임워크**: [Astro 4](https://astro.build/) (정적 사이트 생성기)
- **호스팅**: [Cloudflare Pages](https://pages.cloudflare.com/) (무료)
- **저장소**: GitHub
- **폰트**: Noto Serif KR (헤드라인) + Pretendard (본문)
- **언어**: 한국어

## 프로젝트 구조

```
clubmakers-site/
├── public/                    정적 자산 (이미지, favicon 등)
├── src/
│   ├── styles/global.css      디자인 토큰 + 공통 스타일
│   ├── layouts/               페이지 공통 레이아웃
│   ├── components/            재사용 컴포넌트 (Nav, Footer 등)
│   ├── pages/                 페이지별 라우팅 (.astro 파일이 곧 URL)
│   └── content/               콘텐츠 (사전·케이스·FAQ 마크다운)
├── astro.config.mjs           Astro 설정
└── package.json               의존성 + 스크립트
```

## 개발 실행

```bash
# 의존성 설치 (최초 1회)
npm install

# 로컬 개발 서버 실행 (http://localhost:4321)
npm run dev

# 프로덕션 빌드 (dist/ 폴더 생성)
npm run build

# 빌드 결과 미리보기
npm run preview
```

## 배포

코드를 GitHub에 push하면 Cloudflare Pages가 자동으로 빌드하고 배포합니다.
배포 시간: 약 30초 ~ 1분.

## 사이트 구조 (12페이지)

| URL | 내용 |
|---|---|
| `/` | 메인 (6섹션) |
| `/about` | 공작소장 채기웅 |
| `/why-fitting` | 우리가 일하는 방식 |
| `/system` | 19년의 회고 |
| `/book` | 책 『실제적인 클럽피팅』 |
| `/glossary` | 용어사전 (117개) |
| `/case-studies` | 케이스 스터디 5선 |
| `/workshop` | 공작소 |
| `/education` | 전문가 과정 |
| `/products` | 자체 제품 |
| `/faq` | 자주 묻는 질문 |
| `/contact` | 예약·문의 |

## 핵심 메시지 (사이트 전체)

> **친근한 골프채공작소를 지향합니다.**

- 인터뷰가 먼저입니다
- 사람마다 순위가 다릅니다
- 평균이 아니라 최악을 봅니다
- 거창한 이론도 만들어 봤습니다. 그러나 결국 골퍼님과 소통하기 위한 도구라는 것을, 20년이 지나고야 깨달았습니다.

## 채널

- 🌐 myclubmakers.com (이 사이트)
- 💬 [네이버 카페 「골프채공작소」](https://naver.me/GiyUpXkH) (회원 1만 명)
- 📝 [네이버 블로그 「clubmakers」](https://blog.naver.com/clubmakers)
- 📞 010-4363-5555
- ✉️ clubmakers@naver.com

---

*Copyright © 2026 Clubmakers Korea · SINCE 1985*
