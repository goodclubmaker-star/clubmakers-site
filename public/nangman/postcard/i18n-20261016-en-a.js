// English presentation layer for received postcards. No API or stroke changes.
// Keep the existing envelope tap -> auto-play flow untouched.
(() => {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language || "ko"];
  if (!languages[0]?.toLowerCase().startsWith("en")) return;
  document.documentElement.lang = "en";
  const copy = {
    "엽서를 가져오고 있어요":"Loading your postcard…",
    "낭만엽서가 도착했어요":"A Nangman Postcard Has Arrived",
    "봉투 열기":"Open the Envelope",
    "봉투를 눌러 열어 보세요":"Tap the envelope to open it",
    "손글씨 엽서":"Handwritten postcard",
    "일시정지":"Pause",
    "처음부터":"From Start",
    "완성본 보기":"Show Finished Card",
    "🎬 손글씨 영상 저장":"🎬 Save Handwriting Video",
    "💌 답장하기":"💌 Reply",
    "App Store에서 무료로 설치하기":"Get It Free on the App Store",
    "낭만엽서가 출시되었어요. 앱을 무료로 설치한 뒤 직접 손글씨 엽서를 보내보세요.":"Nangman Postcard is now available. Download the free app to send your own handwritten postcard.",
    "낭만공작소 둘러보기":"Explore Nangman Studio",
    "특별 우표":"SPECIAL STAMP",
    "시간을 담아 보내는 편지":"A Letter Through Time",
    "엽서가 오고 있어요":"A postcard is on its way",
    "도착 예정":"Scheduled to Open",
    "📅 도착일 알림 받기":"📅 Add Opening Reminder",
    "캘린더에 도착 시간이 저장되고, 그때 알림이 와요. 연락처는 받지 않아요.":"A reminder will be added to your calendar. No contact information is collected.",
    "이 링크를 간직해 두세요. 도착하면 여기서 바로 열 수 있어요.":"Keep this link. You can open the postcard here when it arrives.",
    "다시 불러오기":"Reload",
    "엽서를 찾을 수 없어요":"Postcard Not Found",
    "링크 주소가 끝까지 복사됐는지 확인해 주세요.":"Make sure you copied the complete link.",
    "보관 기간이 종료된 엽서입니다":"This postcard has expired",
    "엽서는 보낸 날부터 10일 동안 볼 수 있어요. 보낸 분께 다시 보내 달라고 해 주세요.":"Postcards can be viewed for 10 days. Ask the sender to send it again.",
    "보낸 분이 공유를 취소한 엽서예요":"The sender revoked this postcard",
    "이 링크로는 더 이상 엽서를 볼 수 없어요.":"This link can no longer open the postcard.",
    "새 버전 앱으로 쓴 엽서예요":"This postcard uses a newer format",
    "이 페이지가 아직 이 엽서를 재생하지 못해요. 잠시 후 다시 열어 주세요.":"This page cannot play it yet. Please try again later.",
    "엽서를 불러오지 못했어요":"Couldn't Load the Postcard",
    "인터넷 연결을 확인하고 다시 불러와 주세요.":"Check your connection and reload.",
    "엽서 보관소가 잠시 응답하지 않아요. 잠시 후 다시 불러와 주세요.":"The postcard server is temporarily unavailable. Please try again.",
    "다시 보기":"Replay Again",
    "이어 보기":"Resume",
    "엽서가 도착했어요":"The postcard has arrived",
    "손글씨 없이 보낸 엽서예요.":"This postcard has no handwriting.",
    "영상 공유 메뉴를 열었어요. ‘파일에 저장’을 선택할 수 있어요.":"Sharing options opened. Choose Save to Files.",
    "영상 저장을 취소했어요.":"Video save canceled.",
    "영상 다운로드를 요청했어요. 파일 앱의 다운로드 항목을 확인해 주세요.":"Video download started. Check the Files app.",
    "영상 저장을 지원하지 않는 브라우저예요.":"Video saving is not supported in this browser.",
    "이 브라우저는 영상 인코딩을 지원하지 않아요.":"This browser does not support video encoding.",
    "녹화에 실패했어요.":"Recording failed.",
    "영상이 비어 있어요. 다시 시도해 주세요.":"The video is empty. Please try again.",
    "영상 저장에 실패했어요.":"Couldn't save the video.",
    "영상 녹화 중이에요. 화면을 유지해 주세요.":"Recording video. Keep this page open.",
    "영상 녹화를 시작하지 못했어요.":"Couldn't start the recording.",
    "이 브라우저는 영상 저장을 지원하지 않아요. 최신 Safari에서 열어 주세요.":"Your browser cannot save video. Open this link in the latest Safari."
  };
  const dynamic = [
    [/^(.+)님이 낭만엽서를 보냈어요$/, (_,name)=>name+" sent you a Nangman Postcard"],
    [/^(.+)님이 보낸 엽서가 오고 있어요$/, (_,name)=>"A postcard from "+name+" is on its way"],
    [/^(.+)님의 손글씨$/, (_,name)=>"Handwritten by "+name],
    [/^도착까지 (\d+)일(?: (\d+)시간)?$/, (_,days,hours)=>"Opens in "+days+" day(s)"+(hours?" "+hours+" hour(s)":"")],
    [/^도착까지 (\d+)시간(?: (\d+)분)?$/, (_,hours,mins)=>"Opens in "+hours+" hour(s)"+(mins?" "+mins+" min":"")],
    [/^도착까지 (\d+)분$/, (_,mins)=>"Opens in "+mins+" minute(s)"],
    [/^이 엽서는 (.+)까지 볼 수 있어요\.$/, (_,date)=>"Available until "+date+"." ]
  ];
  function translate(value) {
    const exact = copy[value];
    if (exact !== undefined) return exact;
    for (const [re,fn] of dynamic) {
      if (re.test(value)) return value.replace(re,fn);
    }
    return null;
  }
  function textNode(node) {
    const original = node.nodeValue || "";
    const value = original.trim();
    if (!value) return;
    const english = translate(value);
    if (english !== null && english !== value) node.nodeValue=original.replace(value,english);
  }
  function scan(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) { textNode(node); return; }
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_NODE) return;
    if (node.nodeType === Node.ELEMENT_NODE) {
      for(const attr of ["aria-label","title"]) {
        const original=node.getAttribute(attr);
        if(original) {const translated=translate(original);if(translated)node.setAttribute(attr,translated);}
      }
    }
    const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
    for(let t=walker.nextNode();t;t=walker.nextNode())textNode(t);
  }
  function ready() {
    scan(document.body);
    document.title = "Nangman Postcard";
    document.querySelector('meta[name="description"]')?.setAttribute("content","Open a handwritten postcard that comes to life.");
    const watch=new MutationObserver(entries => {
      for(const entry of entries) {
        if(entry.type==="characterData") textNode(entry.target);
        for(const n of entry.addedNodes) scan(n);
      }
    });
    watch.observe(document.body,{childList:true,characterData:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready,{once:true});
  else ready();
})();
