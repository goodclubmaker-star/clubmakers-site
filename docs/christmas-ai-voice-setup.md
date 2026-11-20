# 크리스마스트리 AI 한국어 음성 설정

현재 웹앱은 설정되지 않은 경우 기존 브라우저 음성으로 인사하며, AI 음성 선택 UI는 표시하지 않습니다.

## 배포 현황
- Supabase Edge Function: `christmas-tts` (서버 측 Azure 연동, 함수 소스는 `supabase/functions/christmas-tts/index.ts`)
- 호출 페이지: `public/christmas/index.html`
- 세 가지 후보: `cute` = `ko-KR-YuJinNeural`, `bright` = `ko-KR-JiMinNeural`, `story` = `ko-KR-SeoHyeonNeural`
- 아기와 비슷한 높은 톤을 낼 뿐, 실제 유아 성우의 음성은 아닙니다.
- 보안: Azure 구독 키는 브라우저나 GitHub에 보관하지 않으며 Supabase Secrets를 사용합니다.
- 이름은 저장된 Christmas tree name ID로만 합성합니다. 미리듣기는 고정 문구입니다.
- 반복 요청은 저장된 MP3 재생, 신규 합성은 하루 최대 100개 캐시 엔트리 제한입니다.

## 활성화
1. https://portal.azure.com 에서 Azure AI Speech 리소스를 생성합니다. **F0는 테스트용**입니다.
2. 실제 myclubmakers.com 방문객에게 공개해 사용하는 경우 Microsoft의 TTS 출력물 사용권 조건에 따라 **유료 S0**를 검토해야 합니다.
3. https://supabase.com/dashboard/project/xnxthuwnqipkaylwisfu/functions/secrets 에 다음 두 항목을 등록합니다.
   - `AZURE_SPEECH_KEY`: Azure Speech 리소스의 Key
   - `AZURE_SPEECH_REGION`: 해당 리소스 지역 ID (예: `koreacentral`)
4. `https://xnxthuwnqipkaylwisfu.supabase.co/functions/v1/christmas-tts` 로 브라우저가 준비 상태를 조회하고, 준비되면 목소리 선택과 미리듣기가 나타납니다.

## 검증
- 캐시 테이블 `public.christmas_tts_cache`은 RLS가 켜져 있고 공용 읽기/쓰기 권한이 없습니다.
- 음원 버킷 `clubmakers-christmas-tts`는 재생 전용 공개 링크를 제공합니다.
- AI API 오류 시 브라우저 기본 음성으로 복귀합니다.
- Azure 자격증명 없이 앱을 배포해도 AI 합성은 시작되지 않습니다.
- 키 설정 후 실제 음성과 iOS Safari 오디오 재생을 실기기에서 확인해야 합니다.

## 참고
- https://azure.microsoft.com/en-us/pricing/details/speech/
- https://www.microsoft.com/licensing/terms/en-US/product/MicrosoftAzure/MCA
