# 우울폭주 성탄절 · Runway 영상 파일럿 설정

제작 콘티의 `S16-C02` 카드에 있는 **AI 영상 파일럿** 버튼은 Cloudflare Pages Function을 통해 Runway API를 호출한다. 실제 API 키는 브라우저나 Git 저장소에 저장하지 않는다.

## 최초 1회 설정

1. Runway 개발자 계정에서 API secret을 만들고 필요한 크레딧을 충전한다.
2. Cloudflare Dashboard → Workers & Pages → `clubmakers-site` → Settings → Variables and Secrets로 이동한다.
3. Production 환경에 다음 두 값을 **Secret / Encrypt** 방식으로 추가한다.
   - `RUNWAYML_API_SECRET`: Runway에서 발급한 API secret
   - `BLUE_CHRISTMAS_STUDIO_TOKEN`: 제작 화면에서 입력할 별도의 긴 암호
4. Preview 환경에서도 시험하려면 같은 두 secret을 Preview에도 별도로 추가한다.
5. Cloudflare Pages를 한 번 다시 배포한다.

## 사용 순서

1. `https://myclubmakers.com/blue-christmas/production/`을 연다.
2. 검색창에서 `S16-C02`를 찾는다.
3. **AI 영상 파일럿**을 누른다.
4. 첫 시험은 `Gen-4 Turbo`와 5초를 유지한다.
5. `BLUE_CHRISTMAS_STUDIO_TOKEN`에 등록한 제작 암호를 입력하고 생성한다.
6. 완료된 결과는 공급자 URL이 만료되기 전에 즉시 다운로드한다.
7. 사용할 결과면 **KEEP로 표시**를 누른다.

현재 버전은 한 컷만 허용하고, 모델과 길이를 서버에서도 제한한다. 결과 파일은 아직 R2에 영구 저장하지 않으며 브라우저에는 작업 ID와 결과 URL만 임시 저장한다.
