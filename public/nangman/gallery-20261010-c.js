'use strict';
const works = [{"id":"woongto","name":"WOONGTO · 웅토","eyebrow":"TRAIL RUNNING / iOS","short":"트레일러닝 GPS 기록과 코스 리플레이","image":"./icons/woongto.png","chips":["GPS 활동 기록","코스 리플레이"],"status":"App Store 출시","group":"released","mark":"01","appStoreUrl":"https://apps.apple.com/kr/app/id6811301799"},{"id":"swing","name":"스윙공작소","eyebrow":"GOLF SWING / iOS","short":"AI로 분석하는 골프 스윙","monogram":"SW.","chips":["AI 스윙 분석","골프"],"status":"App Store 출시","group":"released","mark":"02","appStoreUrl":"https://apps.apple.com/kr/app/id6795053627"},{"id":"life4sec","name":"인생4초","eyebrow":"DUAL CAMERA / iOS","short":"전후면 카메라 동시 촬영","image":"./icons/life4sec.png","chips":["전·후면 동시 촬영","순간 기록"],"status":"App Store 출시","group":"released","mark":"03","appStoreUrl":"https://apps.apple.com/kr/app/id6817789548"},{"id":"nangmanpostcard","name":"낭만엽서","eyebrow":"POSTCARD / iOS","short":"손글씨와 사진으로 마음을 전하는 엽서","monogram":"✉","chips":["손글씨 엽서","사진·답장"],"status":"App Store 출시","group":"released","mark":"04","appStoreUrl":"https://apps.apple.com/kr/app/id6821494515"},{"id":"cinecam","name":"채CINE","eyebrow":"FILM CAMERA / iOS","short":"일상의 영상을 영화처럼","image":"./icons/chaecine.png","chips":["영상 촬영","필름 룩"],"status":"App Store 출시","group":"released","mark":"05","appStoreUrl":"https://apps.apple.com/kr/app/id6816676310"},{"id":"videosketch","name":"영상스케치","eyebrow":"CARTOON FILTER / iOS","short":"영상을 만화 스타일로 표현하는 필터","monogram":"VS.","chips":["만화 필터","영상 효과"],"status":"App Store 출시","group":"released","mark":"06","appStoreUrl":"https://apps.apple.com/kr/app/id6821547723"},{"id":"nangmanpage","name":"낭만페이지","eyebrow":"CREATIVE EDITOR / iOS","short":"인스타 콘텐츠를 만드는 디자인 도구","image":"./icons/nangmanpage.png","chips":["콘텐츠 제작","디자인 템플릿"],"status":"App Store 출시","group":"released","mark":"07","appStoreUrl":"https://apps.apple.com/kr/app/id6819656151"},{"id":"sinaloa","name":"시날로아","eyebrow":"INTERACTIVE STORY / WEB","short":"당신의 선택으로 완성되는 스릴러","status":"웹에서 체험","group":"web","mark":"08","image":"./icons/sinaloa-scene.webp","kind":"scene","chips":["분기형 선택","시네마틱 연출"]},{"id":"satulingo","name":"사투링고","eyebrow":"VOICE CHALLENGE / WEB","short":"친구의 말투를 듣는 새로운 놀이","status":"테스트 버전","group":"web","mark":"09","image":"./icons/satulingo.svg","chips":["말투 미션","링크로 도전"]},{"id":"blue-christmas","name":"우울폭주성탄절","eyebrow":"ANIMATION / IN PRODUCTION","short":"장면과 감정으로 완성해 가는 애니메이션","status":"애니메이션 제작 중","group":"film","mark":"10","image":"/blue-christmas/images/S14-C01_street_establishing_v001.webp","kind":"scene","chips":["스토리보드","애니메이션"]},{"id":"essaytella","name":"에세이텔라","eyebrow":"WRITING / WEB","short":"오늘의 생각을 한 편의 글로","status":"웹에서 사용","group":"web","mark":"11","monogram":"Et.","chips":["글쓰기 주제","문장 다듬기"]}];
const grid=document.getElementById('projectGrid'),secondary=document.getElementById('secondaryGrid'),more=document.getElementById('secondaryWorks');
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let filter='all';
function card(p){
 const quick=p.id==='sinaloa'||p.id==='satulingo',movie=p.id==='blue-christmas';
 const href=p.appStoreUrl||(p.id==='nangmanworld'?'#about':p.id==='sinaloa'?'/sinaloa/':p.id==='satulingo'?'/satulinggo/':movie?'/nangman/blue-christmas/':'./products/'+encodeURIComponent(p.id)+'/');
 const action=p.appStoreUrl?'App Store에서 보기':p.id==='sinaloa'?'▶ 바로 보기':p.id==='satulingo'?'▶ 테스트 버전 바로 해보기':movie?'시놉시스 보기 · 콘티북':'카드뉴스 5장으로 먼저 보기';
 const media=p.image?'<img src="'+esc(p.image)+'" alt="'+esc(p.name)+' '+(p.kind==='scene'?'작품 장면':'앱 아이콘')+'" loading="lazy" decoding="async">':'<span class="monogram" aria-hidden="true">'+esc(p.monogram)+'</span>';
 return '<a class="work-card" href="'+esc(href)+'" data-work="'+esc(p.id)+'" aria-label="'+esc(p.name)+' '+esc(action)+'"><div class="work-art '+(p.kind==='scene'?'is-scene':'')+'"><div class="card-top"><span>'+p.mark+' / NANGMAN</span><span>↗</span></div>'+(p.id==='satulingo'?'<span class="test-version-badge">테스트 버전</span>':'')+'<div class="art-center">'+media+'</div><strong class="poster-label">'+esc(p.name)+'</strong><div class="art-foot">'+esc(p.eyebrow)+'</div></div><div class="work-info"><div class="name-row"><h4>'+esc(p.name)+'</h4><span class="right-arrow">↗</span></div><p>'+esc(p.short)+'</p><div class="chips">'+p.chips.map(c=>'<span>'+esc(c)+'</span>').join('')+'</div><div class="availability">'+esc(p.status)+'</div><div class="story-hint '+(quick||movie?'story-hint-direct':'')+'">'+esc(action)+' <span aria-hidden="true">↗</span></div></div></a>';
}
function show(){
 const visible=p=>filter==='all'||p.group===filter||(filter==='mobile'&&p.group==='released');
 const filtered=works.filter(visible),first=filtered.slice(0,7),rest=filtered.slice(7);
 grid.innerHTML=first.map(card).join('');
 secondary.innerHTML=rest.map(card).join('');
 more.hidden=rest.length===0;
 document.getElementById('emptyResults').hidden=first.length+rest.length>0;
 document.getElementById('countAll').textContent=works.length;
}
document.getElementById('filters').addEventListener('click',e=>{
 const b=e.target.closest('button[data-filter]');if(!b)return;
 filter=b.dataset.filter;
 document.querySelectorAll('#filters button').forEach(el=>{
   const active=el===b;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));
 });
 show();
});
show();
