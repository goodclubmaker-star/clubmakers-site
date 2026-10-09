'use strict';
const works = [{"id":"woongto","name":"WOONGTO · 웅토","eyebrow":"OUTDOOR / iOS","short":"걸었던 길을 다시 경험하는 방법","status":"App Store 출시","group":"mobile","mark":"01","image":"./icons/woongto.png","chips":["GPS 활동 기록","3D 리플레이"]},{"id":"life4sec","name":"인생4초","eyebrow":"MEMORY CAMERA / iOS","short":"셔터 앞뒤의 시간까지 추억으로","status":"App Store 출시","group":"mobile","mark":"02","image":"./icons/life4sec.png","chips":["전후 4초","전·후면 기록"]},{"id":"cinecam","name":"채CINE","eyebrow":"FILM CAMERA / iOS","short":"일상의 영상을 영화처럼","status":"App Store 출시","group":"mobile","mark":"03","image":"./icons/chaecine.png","chips":["24FPS 촬영","필름 룩"]},{"id":"nangmanpage","name":"낭만페이지","eyebrow":"CREATIVE EDITOR / iOS","short":"사진과 영상에 문장을 디자인하다","status":"출시 준비 · 최종 마무리","group":"mobile","mark":"04","image":"./icons/nangmanpage.png","chips":["디자인 템플릿","영상·사진 편집"]},{"id":"sinaloa","name":"시날로아","eyebrow":"INTERACTIVE STORY / WEB","short":"당신의 선택으로 완성되는 스릴러","status":"웹에서 체험","group":"web","mark":"05","image":"./icons/sinaloa-scene.webp","kind":"scene","chips":["분기형 선택","시네마틱 연출"]},{"id":"satulingo","name":"사투링고","eyebrow":"VOICE CHALLENGE / WEB","short":"친구의 말투를 듣는 새로운 놀이","status":"웹 버전 · 녹음 개선 중","group":"web","mark":"06","image":"./icons/satulingo.svg","chips":["말투 미션","링크로 도전"]},{"id":"blue-christmas","name":"우울폭주성탄절","eyebrow":"ANIMATION / IN PRODUCTION","short":"장면과 감정으로 완성해 가는 애니메이션","status":"애니메이션 제작 중","group":"film","mark":"07","image":"/blue-christmas/images/S14-C01_street_establishing_v001.webp","kind":"scene","chips":["스토리보드","애니메이션"]},{"id":"essaytella","name":"에세이텔라","eyebrow":"WRITING / WEB","short":"오늘의 생각을 한 편의 글로","status":"웹에서 사용","group":"web","mark":"08","monogram":"Et.","chips":["글쓰기 주제","문장 다듬기"]},{"id":"memotella","name":"메모텔라","eyebrow":"LIFE STORY / IN DEVELOPMENT","short":"살아온 시간을 한 권의 이야기로","status":"서비스 준비 중","group":"web","mark":"09","monogram":"M.","chips":["AI 인터뷰","자서전 구성"]}];
const grid=document.getElementById('projectGrid'),secondary=document.getElementById('secondaryGrid'),more=document.getElementById('secondaryWorks');
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let filter='all';
function card(p){
 const media=p.image?'<img src="'+esc(p.image)+'" alt="'+esc(p.name)+' '+(p.kind==='scene'?'작품의 실제 장면':'앱 아이콘')+'" loading="lazy" decoding="async">':'<span class="monogram" aria-hidden="true">'+esc(p.monogram)+'</span>';
 return '<a class="work-card" href="./products/'+encodeURIComponent(p.id)+'/" aria-label="'+esc(p.name)+' 카드뉴스 소개 보기"><div class="work-art '+(p.kind==='scene'?'is-scene':'')+'"><div class="card-top"><span>'+p.mark+' / NANGMAN</span><span>↗</span></div><div class="art-center">'+media+'</div><div class="art-foot">'+esc(p.eyebrow)+'</div></div><div class="work-info"><div class="name-row"><h4>'+esc(p.name)+'</h4><span class="right-arrow">↗</span></div><p>'+esc(p.short)+'</p><div class="chips">'+p.chips.map(c=>'<span>'+esc(c)+'</span>').join('')+'</div><div class="availability">'+esc(p.status)+'</div><div class="story-hint">카드뉴스 5장으로 먼저 보기 <span aria-hidden="true">↗</span></div></div></a>';
}
function show(){
 const visible=p=>filter==='all'||p.group===filter;
 const first=works.slice(0,6).filter(visible),rest=works.slice(6).filter(visible);
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
if('serviceWorker' in navigator&&location.protocol==='https:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));