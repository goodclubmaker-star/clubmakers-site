# 골프채공작소 크리스마스트리: 무료 AI 한국어 음성

2026-11-20 변경: Azure 등록/인증키 없이 실행하는 **Supertonic 3 로컬 음성 합성**으로 사이트 코드를 교체했습니다.

## 적용 구성

- 웹 공개 경로: `https://myclubmakers.com/christmas/`
- 상위 페이지: `src/components/ChristmasPopup.astro` (홈페이지 팝업)
- 트리: `public/christmas/index.html`, 기존 이름 DB 및 캐롤 그대로
- 음성 모듈: `public/christmas/supertonic-local.js`
- Supertone MIT inference helper: `public/christmas/supertonic-helper.js` (저작권 고지와 라이선스 파일 동봉)
- AI 음성 모델: `Supertone/supertonic-3` (Hugging Face OpenRAIL-M, 원격 모델 파일 CDN)
- JS ONNX 런타임: `onnxruntime-web@1.22.0` jsDelivr CDN 고정
- 여성 캐릭터 보이스: F3 유나(기본), F1 미나, F2 소라; 출력 음색 피치를 소폭 높입니다.

## 방문객 UX
1. QR 또는 메인 팝업에서 트리 오픈. **AI 모델을 자동 다운로드하지 않습니다.**
2. `무료 AI 준비`를 누르면 기기 내에서 약 380 MB 모델 다운로드 + 로딩 시작. Wi-Fi 권장.
3. 준비 완료 시 `미리듣기` 버튼과 3종 이름 선택으로 귀여운 AI 인사 확인.
4. 이후 이름을 달거나 트리에 달린 이름을 터치하면 `OOO님! 메리 크리스마스!`를 합성합니다.
5. 이름 자체는 기존 Supabase DB에 저장되며, TTS 합성은 기기 내에서 처리합니다.
6. 음성 생성 결과는 페이지에 있는 동안 최대 10개 임시 캐시합니다. 별도 AI 서버 호출과 키/카드 불필요.

## 주의 및 검증 범위
- 모델 크기가 커서 구형 아이폰은 네트워크·메모리·속도 문제로 AI 합성 불가능할 수 있습니다.
- iOS는 WebAssembly 단일 스레드, 데스크톱은 WebGPU 우선→WASM fallback.
- **진짜 어린이 녹음은 아닙니다.** 성인 여성 음색을 높게 조정한 '귀여운' AI 캐릭터 톤입니다.
- 기기 기본 기계음 합성은 제거했습니다. AI 모델 준비 전에는 트리/캐롤/이름 저장만 동작합니다.
- 자동 음원은 브라우저의 오디오 재생 제약에 따라 막힐 수 있습니다. 사용자 제스처 후 재생합니다.
- JavaScript 문법, 연결 경로 정합성을 검사했습니다. 실제 iPhone Safari 모델 다운로드 및 음성 합성 결과는 아직 실기기 검증 필요.
- `christmas-tts` Azure Edge Function은 이전 시험용 코드로 남아 있으나 사이트에서 호출하지 않습니다.

## 라이선스
- Supertonic example code MIT © 2025 Supertone Inc. `public/christmas/supertonic-code-LICENSE.txt` 참조.
- Supertonic 3 weights OpenRAIL-M: https://huggingface.co/Supertone/supertonic-3/blob/main/LICENSE
- 사용 제한 및 AI 합성 음성 표기 조건을 지켜야 합니다. 공개 UI에서 AI 합성임을 표시합니다.

