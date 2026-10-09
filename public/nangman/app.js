'use strict';
const projects = [
 {id:'woongto',name:'WOONGTO',sub:'걷고, 기록하고, 다시 보는 나의 길.',category:'mobile',type:'아웃도어 · iOS',status:'App Store 출시',palette:['#ccff00','#182420'],symbol:'⌁',featured:true,url:'https://apps.apple.com/kr/app/woongto/id6811301799',slides:[
  ['COVER','길 위의 시간을\n다시 재생하다.','달리고 걷고 오르고. 발자국은 이야기가 됩니다.','⌁'],
  ['THE MEMORY','어디까지 갔는지보다\n어떻게 갔는지.','내가 걸은 길을 기록하고 다시 살펴보는 아웃도어 경험.','↝'],
  ['THE TOOL','기록하고, 경로를 보고,\n3D로 돌려봅니다.','GPS 기록, 고도 정보, 코스 탐색과 3D 리플레이, 영상 스토리를 한 앱에서 만나보세요.','△'],
  ['THE SHARE','지나온 길을\n한 편의 영상으로.','이동 경로가 움직이는 리플레이를 공유 가능한 결과물로 만드는 것이 핵심 경험입니다.','▷'],
  ['APP STORE','당신의 발자국을\n3D로 다시 보세요.','WOONGTO는 App Store에서 다운로드할 수 있습니다. 걷기·러닝·하이킹의 기록과 코스, 리플레이를 아이폰에서 만나보세요.','↗']]},
 {id:'life4sec',name:'인생4초',sub:'사진 전후 4초를 함께 기록.',category:'mobile',type:'카메라 · iOS',status:'App Store 출시',palette:['#84d4ca','#193936'],symbol:'◎',featured:true,url:'https://apps.apple.com/kr/app/id6817789548',slides:[
  ['COVER','사진 뒤엔\n4초의 이야기가.','셔터를 누르기 전 2초, 그 후 2초까지 기억하면 어떨까요?','◎'],
  ['THE MOMENT','찰칵, 그 순간만으론\n아쉬울 때.','사진 한 장에서는 들리지 않던 웃음과 촬영자의 표정까지.','◯'],
  ['THE CAMERA','앞뒤 두 시선을\n함께 담습니다.','후면 메인 사진, 셔터 전후의 순간, 전면 비하인드와 소리를 함께 담는 방식의 iPhone 앱.','◉'],
  ['THE MEMORY','누가 찍었는지도\n추억이 되도록.','프레임 밖 촬영자의 표정까지 남길 수 있는 새로운 기록 방식을 실험합니다.','▣'],
  ['APP STORE','사진 전후의 순간을\n다시 만나세요.','인생4초는 App Store에서 무료로 시작할 수 있습니다. 사진과 영상, 특별한 필터와 액자로 소중한 순간을 간직하세요.','♡']]},
 {id:'cinecam',name:'채CINE',sub:'일상의 순간을 한 편의 영화처럼.',category:'mobile',type:'필름 · iOS',status:'App Store 출시',palette:['#17191c','#f2a15e'],symbol:'◉',featured:true,url:'https://apps.apple.com/kr/app/id6816676310',slides:[
  ['COVER','오늘을\n영화처럼 찍다.','렌즈 너머로 평범한 풍경이 새로워지는 순간.','◉'],
  ['THE IDEA','필름의 느낌은\n색 하나가 아니니까.','움직임, 입자, 빛 번짐, 프레임과 리듬을 함께 디자인하는 카메라 앱.','✳'],
  ['THE LOOK','따뜻하게, 거칠게,\n때로는 몽환적으로.','CINEMA, DREAM, 빈티지 필름 계열의 룩과 세밀한 촬영 후 편집 기능을 제공합니다.','◌'],
  ['THE CAMERA','찍을 때부터\n분위기를 결정합니다.','24fps 촬영, 필름 룩 프리뷰, 렌즈와 프레임 연출을 담았습니다.','▣'],
  ['APP STORE','영화 같은 하루는\n지금부터 시작됩니다.','채CINE은 App Store에서 다운로드할 수 있습니다. 필름 룩과 24fps 촬영으로 매일의 풍경을 영화처럼 기록하세요.','✶']]},
 {id:'sinaloa',name:'시날로아',sub:'당신의 선택에는 대가가 있다.',category:'play',type:'인터랙티브 · 이야기',status:'웹 체험 가능',palette:['#232b21','#e9c685'],symbol:'♠',url:'https://sinaloa-the-ladder.vercel.app',slides:[
  ['COVER','무더운 여름,\n이곳은 멕시코.','단 한 번의 선택이 모든 것을 바꿉니다. 당신이라면 살아남을 수 있을까요?','☀'],
  ['THE WORLD','아무것도\n되돌릴 수 없다.','그곳에서 믿음은 사치이고, 선택은 기록됩니다. 위험한 거래와 돌이킬 수 없는 결과 사이를 걷습니다.','✕'],
  ['THE MECHANIC','읽는 이야기에서\n결정하는 이야기로.','장면을 읽고 선택하세요. 다음 장면과 관계가 달라집니다. 어떤 비극은 되돌릴 수 없습니다.','↗'],
  ['THE EXPERIENCE','영화의 한 장면처럼\n몰입하는 게임.','크고 작은 글자, 긴장감 있는 전개, 화면을 가득 채우는 연출로 체험하는 인터랙티브 드라마.','◈'],
  ['PLAY','당신은 어디까지\n올라갈 수 있습니까?','웹 브라우저에서 바로 시작할 수 있습니다. 선택의 결과는 플레이어의 몫입니다.','♠']]},
 {id:'satulingo',name:'사투링고',sub:'친구에게 던지는 말투 미션.',category:'play',type:'목소리 · 챌린지',status:'기획·구현 중',palette:['#e9ee8a','#344c34'],symbol:'♪',slides:[
  ['COVER','이마트\n에브리데이.','이 한마디, 당신은 어떻게 발음하나요?','♫'],
  ['THE HOOK','지역마다 달라지는\n그 미묘한 억양.','블루베리 스무디, 어디까지 올라가는 거예요? 듣기만 해도 웃음이 나는 말투 미션.','?'],
  ['THE GAME','친구에게\n도전장을 던지세요.','한마디를 정해 링크로 보내고, 친구는 녹음으로 답하는 방식의 소셜 게임을 구상하고 있습니다.','↗'],
  ['THE REACTION','말투가 달라지면\n대화가 시작됩니다.','예시를 듣고 따라 말하고 서로의 발음에 반응하는 가벼운 놀이.','☺'],
  ['COMING SOON','세상에 똑같은\n말투는 없으니까.','마이크 권한과 모바일 브라우저 녹음 호환성을 검증하면서 개발하고 있습니다.','♪']]},
 {id:'memotella',name:'메모텔라',sub:'말하면, 한 권의 인생이 됩니다.',category:'web',type:'기록 · 웹앱',status:'웹 프로토타입',palette:['#e8b99a','#54392d'],symbol:'✺',featured:true,slides:[
  ['COVER','사라지는 이야기에\n한 권의 자리를.','누구에게나 한 편의 인생이 있습니다. 아직 글이 되지 않았을 뿐.','✳'],
  ['THE QUESTION','부모님의 젊은 날,\n얼마나 알고 있나요?','늘 곁에 있었지만 제대로 묻지 못한 이야기. 기억은 시간이 지나면 조금씩 흐려집니다.','?'],
  ['THE IDEA','말을 하면,\n기억이 문장이 됩니다.','AI의 질문에 말하거나 직접 입력하면 이야기를 모으고 다듬습니다. 사진과 함께 장별로 엮을 수 있도록 설계했습니다.','✎'],
  ['HOW IT WORKS','묻고. 듣고.\n그리고 남깁니다.','01 이야기를 시작해요\n02 질문에 답하거나 입력해요\n03 내용을 살피고 고쳐요\n04 한 권의 책을 준비해요','▤'],
  ['FOR SOMEONE','언젠가가 아니라,\n오늘의 목소리로.','메모텔라는 소중한 사람의 시간을 오래 보관하기 위한 기록 도구입니다. 현재 웹 프로토타입을 다듬고 있습니다.','♥']]},
 {id:'nangmanpage',name:'낭만페이지',sub:'사진과 글을, 장면처럼.',category:'mobile',type:'에디터 · iOS',status:'iOS 개발 중',palette:['#fbd9ba','#4b383d'],symbol:'Aa',slides:[
  ['COVER','한 장의 사진에\n한 줄의 마음.','지나쳐 버릴 문장을 근사한 페이지로 만드는 앱.','Aa'],
  ['THE PROBLEM','좋은 문장도\n모양이 필요합니다.','사진과 글을 올리는 일은 쉬워도, 마음에 드는 배치를 찾는 건 의외로 어렵습니다.','✎'],
  ['THE IDEA','템플릿부터 고르고\n글과 장면을 담아요.','사진·영상 위에 글을 올리고 페이지마다 다른 여백, 프레임, 글자 배치를 선택하도록 발전시키고 있습니다.','▥'],
  ['THE RESULT','카드뉴스도,\n짧은 영화 같은 글도.','여러 페이지로 이어지는 글과 영상 카드 디자인을 목표로 한 iOS 편집 앱입니다.','▧'],
  ['NEXT','누구나 쉽게\n자기 이야기를.','iOS 개발 및 사용성 개선 중. Android 버전은 공통 편집 구조를 정리한 뒤 검토합니다.','♥']]},
 {id:'iyagi',name:'아버지 이야기 노트',sub:'잊히기 전에, 목소리를 남깁니다.',category:'web',type:'가족 · 웹앱',status:'웹 프로토타입',palette:['#ecd1a4','#2d5139'],symbol:'☷',slides:[
  ['COVER','아버지는\n어떤 아이였을까.','가족이 되기 전, 한 사람의 이야기.','✻'],
  ['THE QUESTION','우리는 부모님의\n인생을 얼마나 알까요?','질문 한 번이 평생 듣지 못했던 장면을 꺼내기도 합니다.','?'],
  ['THE DESIGN','큰 버튼 하나로\n이야기를 시작해요.','복잡한 기능보다 말하기와 듣기에 집중합니다. 음성 기록과 질문 듣기를 큰 버튼으로 배치했습니다.','◉'],
  ['THE ARCHIVE','흩어진 기억을\n시간순으로.','가족용 보기에서 기록을 관리하고, 시기별로 엮거나 글 파일로 내려받는 기능을 담았습니다.','▤'],
  ['CLOSING','더 많은 이야기를\n듣고 싶은 마음.','메모텔라로 이어진 초기 웹 실험작입니다. 현재 프로토타입으로 관리합니다.','♥']]}
];
const $=(s)=>document.querySelector(s);
const grid=$('#projectGrid'),detail=$('#detail');let current=null,slideIndex=0,lastFocus=null,filter='all',installPrompt=null,toastTimer;
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function visibleFor(p){return filter==='all'||p.category===filter||(filter==='web'&&p.category==='web');}
function renderGrid(){let shown=projects.filter(visibleFor);grid.innerHTML=shown.map((p,i)=>'<article class="project-card" role="button" tabindex="0" aria-label="'+escapeHtml(p.name)+' 자세히 보기" data-id="'+p.id+'"><div class="card-art" style="background:'+p.palette[0]+';color:'+p.palette[1]+'"><div class="card-mini"><span>낭만공작소 · '+String(i+1).padStart(2,'0')+'</span><span>✳ 2026</span></div><div class="card-main"><div class="card-symbol">'+escapeHtml(p.symbol)+'</div><div class="card-name">'+escapeHtml(p.name)+'</div><div class="card-sub">'+escapeHtml(p.sub)+'</div></div><div class="card-bottom"><span>SWIPE INTO THE STORY</span><span class="card-arrow">↗</span></div></div><div class="card-tag"><span>'+escapeHtml(p.type)+'</span><span><i class="status-dot"></i>'+escapeHtml(p.status)+'</span></div></article>').join('');grid.querySelectorAll('.project-card').forEach(el=>{el.addEventListener('click',()=>openProject(el.dataset.id));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openProject(el.dataset.id)}})});$('#countAll').textContent=projects.length;}
$('#filters').addEventListener('click',e=>{const btn=e.target.closest('button[data-filter]');if(!btn)return;filter=btn.dataset.filter;$('#filters').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===btn));renderGrid();});
function openProject(id,fromHash=false){const p=projects.find(x=>x.id===id);if(!p)return;current=p;slideIndex=0;lastFocus=document.activeElement;detail.hidden=false;document.body.classList.add('locked');$('#detailIndex').textContent='COLLECTION / '+String(projects.indexOf(p)+1).padStart(2,'0');$('#detailCategory').textContent=p.type+' · '+p.status;$('#detailName').textContent=p.name;$('#detailTagline').textContent=p.sub;$('#launchProject').hidden=!p.url;$('#launchPending').hidden=!!p.url;if(p.url)$('#launchProject').href=p.url;$('#launchProject').textContent=p.url?.includes('apps.apple.com')?'App Store 다운로드 ↗':'웹앱 체험 ↗';renderSlide();$('#detailClose').focus();if(!fromHash)history.replaceState(null,'','#/project/'+p.id);}
function closeDetail(fromHash=false){if(detail.hidden)return;detail.hidden=true;document.body.classList.remove('locked');current=null;if(!fromHash)history.replaceState(null,'','#works');if(lastFocus&&typeof lastFocus.focus==='function')lastFocus.focus();}
function renderSlide(){if(!current)return;const s=current.slides[slideIndex],total=current.slides.length;$('#progressCounter').textContent=String(slideIndex+1).padStart(2,'0')+' / '+String(total).padStart(2,'0');$('#progressDots').innerHTML=current.slides.map((_,i)=>'<button aria-label="'+(i+1)+'번째 카드" data-slide="'+i+'" class="'+(i===slideIndex?'active':'')+'"></button>').join('');$('#progressDots').querySelectorAll('button').forEach(b=>b.onclick=()=>{slideIndex=Number(b.dataset.slide);renderSlide()});let el=$('#storySlide');el.style.background=current.palette[0];el.style.color=current.palette[1];el.innerHTML='<div class="slide-eyebrow"><span>'+escapeHtml(s[0])+'</span><span>낭만공작소 / '+String(slideIndex+1).padStart(2,'0')+'</span></div><div class="slide-big">'+escapeHtml(s[1]).replace(/\n/g,'<br>')+'</div><div class="slide-art" aria-hidden="true">'+escapeHtml(s[3])+'</div><div class="slide-body">'+escapeHtml(s[2]).replace(/\n/g,'<br>')+'</div><div class="slide-footer"><span>'+escapeHtml(current.name.toUpperCase())+'</span><span>© NANGMAN WORKSHOP</span></div>';$('#prevSlide').disabled=slideIndex===0;$('#nextSlide').textContent=slideIndex===total-1?'처음으로 ↺':'다음 →';}
function goSlide(by){if(!current)return;let next=slideIndex+by;if(next>=current.slides.length)next=0;if(next<0)next=0;slideIndex=next;renderSlide();}
$('#prevSlide').onclick=()=>goSlide(-1);$('#nextSlide').onclick=()=>goSlide(1);$('#detailClose').onclick=()=>closeDetail();$('#closeVeil').onclick=()=>closeDetail();document.addEventListener('keydown',e=>{if(detail.hidden)return;if(e.key==='Escape')closeDetail();if(e.key==='ArrowRight')goSlide(1);if(e.key==='ArrowLeft')goSlide(-1);if(e.key==='Tab'){const els=[...detail.querySelectorAll('button:not(:disabled),a[href]:not([hidden])')].filter(x=>x.getClientRects().length);const a=els[0],b=els[els.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();b.focus()}else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a.focus()}}});let startX=null;$('#storySlide').addEventListener('touchstart',e=>startX=e.changedTouches[0].clientX,{passive:true});$('#storySlide').addEventListener('touchend',e=>{if(startX===null)return;const diff=e.changedTouches[0].clientX-startX;if(Math.abs(diff)>55)goSlide(diff<0?1:-1);startX=null},{passive:true});
function toast(s){const el=$('#toast');el.textContent=s;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3000)}
function projectLink(){return location.origin+location.pathname+'#/project/'+current.id;}
$('#shareProject').onclick=async()=>{if(!current)return;const data={title:current.name+' · 낭만공작소',text:current.sub,url:projectLink()};try{if(navigator.share){await navigator.share(data)}else if(navigator.clipboard){await navigator.clipboard.writeText(data.url);toast('소개 링크를 복사했어요.')}else{toast('링크: '+data.url)}}catch(e){if(e.name!=='AbortError')toast('공유할 수 없어요.')}};
// Each editorial slide can be exported as a self-contained, square-ish Instagram feed image.
function roundedText(ctx,text,maxWidth,baseSize,minSize){let size=baseSize;ctx.font='900 '+size+'px system-ui, sans-serif';while(ctx.measureText(text.split('\n').sort((a,b)=>b.length-a.length)[0]).width>maxWidth&&size>minSize){size-=2;ctx.font='900 '+size+'px system-ui, sans-serif'}return size;}
function hexToRgb(hex){const s=hex.replace('#','');return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16));}
$('#saveSlide').onclick=()=>{if(!current)return;const p=current,s=p.slides[slideIndex];const c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d');x.fillStyle=p.palette[0];x.fillRect(0,0,1080,1350);x.fillStyle=p.palette[1];x.textBaseline='top';x.font='bold 28px system-ui,sans-serif';x.fillText('NANGMAN WORKSHOP  ✳',82,88);x.font='bold 28px system-ui,sans-serif';x.textAlign='right';x.fillText(String(slideIndex+1).padStart(2,'0')+' / '+String(p.slides.length).padStart(2,'0'),1000,88);x.textAlign='left';x.globalAlpha=.14;x.font='600 420px Georgia,serif';x.fillText(s[3],610,430);x.globalAlpha=1;let sz=roundedText(x,s[1],910,99,50);x.font='900 '+sz+'px system-ui,-apple-system,sans-serif';s[1].split('\n').forEach((line,i)=>x.fillText(line,79,325+i*sz*1.25));x.font='500 37px system-ui,sans-serif';let y=930;const lines=s[2].split('\n');for(const line of lines){let words=line.split(' '),row='';for(const w of words){if(x.measureText(row+' '+w).width>900&&row){x.fillText(row,82,y);y+=54;row=w}else row+=(row?' ':'')+w}if(row){x.fillText(row,82,y);y+=54}}x.fillRect(80,1195,920,2);x.font='bold 27px system-ui,sans-serif';x.fillText(p.name,82,1240);x.textAlign='right';x.fillText('© NANGMAN WORKSHOP',997,1240);const a=document.createElement('a');a.download='nangman-'+p.id+'-'+String(slideIndex+1).padStart(2,'0')+'.png';a.href=c.toDataURL('image/png');a.click();toast('카드 이미지를 저장했어요.');};
function readHash(){const m=location.hash.match(/^#\/project\/([a-z0-9-]+)$/);if(m)openProject(m[1],true);else closeDetail(true);}
window.addEventListener('hashchange',readHash);renderGrid();if(location.hash.startsWith('#/project/'))readHash();
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});async function install(){if(installPrompt){installPrompt.prompt();const result=await installPrompt.userChoice;if(result.outcome==='accepted')toast('홈 화면에 추가했어요.');installPrompt=null;return}if(/iphone|ipad|ipod/i.test(navigator.userAgent)){toast('Safari 공유 버튼 → 홈 화면에 추가를 선택하세요.')}else{toast('Chrome 메뉴(⋮) → 앱 설치 또는 홈 화면에 추가를 선택하세요.')}}$('#installBtn').onclick=install;$('#installBtn2').onclick=install;
if('serviceWorker'in navigator&&location.protocol==='https:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));