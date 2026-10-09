'use strict';
(() => {
const STORIES=new Map([{"id":"woongto","bg":"#ccff00","ink":"#182420","slides":[["COVER","길 위의 시간을\n다시 재생하다.","달리고 걷고 오르고. 발자국은 이야기가 됩니다.","⌁"],["THE MEMORY","어디까지 갔는지보다\n어떻게 갔는지.","내가 걸은 길을 기록하고 다시 살펴보는 아웃도어 경험.","↝"],["THE TOOL","기록하고, 경로를 보고,\n3D로 돌려봅니다.","GPS 기록, 고도 정보, 코스 탐색과 3D 리플레이, 영상 스토리를 한 앱에서 만나보세요.","△"],["THE SHARE","지나온 길을\n한 편의 영상으로.","이동 경로가 움직이는 리플레이를 공유 가능한 결과물로 만드는 것이 핵심 경험입니다.","▷"],["APP STORE","당신의 발자국을\n3D로 다시 보세요.","WOONGTO는 App Store에서 다운로드할 수 있습니다. 걷기·러닝·하이킹의 기록과 코스, 리플레이를 아이폰에서 만나보세요.","↗"]]},{"id":"life4sec","bg":"#84d4ca","ink":"#193936","slides":[["COVER","사진 뒤엔\n4초의 이야기가.","셔터를 누르기 전 2초, 그 후 2초까지 기억하면 어떨까요?","◎"],["THE MOMENT","찰칵, 그 순간만으론\n아쉬울 때.","사진 한 장에서는 들리지 않던 웃음과 촬영자의 표정까지.","◯"],["THE CAMERA","앞뒤 두 시선을\n함께 담습니다.","후면 메인 사진, 셔터 전후의 순간, 전면 비하인드와 소리를 함께 담는 방식의 iPhone 앱.","◉"],["THE MEMORY","누가 찍었는지도\n추억이 되도록.","프레임 밖 촬영자의 표정까지 남길 수 있는 새로운 기록 방식을 실험합니다.","▣"],["APP STORE","사진 전후의 순간을\n다시 만나세요.","인생4초는 App Store에서 무료로 시작할 수 있습니다. 사진과 영상, 특별한 필터와 액자로 소중한 순간을 간직하세요.","♡"]]},{"id":"cinecam","bg":"#17191c","ink":"#f2a15e","slides":[["COVER","오늘을\n영화처럼 찍다.","렌즈 너머로 평범한 풍경이 새로워지는 순간.","◉"],["THE IDEA","필름의 느낌은\n색 하나가 아니니까.","움직임, 입자, 빛 번짐, 프레임과 리듬을 함께 디자인하는 카메라 앱.","✳"],["THE LOOK","따뜻하게, 거칠게,\n때로는 몽환적으로.","CINEMA, DREAM, 빈티지 필름 계열의 룩과 세밀한 촬영 후 편집 기능을 제공합니다.","◌"],["THE CAMERA","찍을 때부터\n분위기를 결정합니다.","24fps 촬영, 필름 룩 프리뷰, 렌즈와 프레임 연출을 담았습니다.","▣"],["APP STORE","영화 같은 하루는\n지금부터 시작됩니다.","채CINE은 App Store에서 다운로드할 수 있습니다. 필름 룩과 24fps 촬영으로 매일의 풍경을 영화처럼 기록하세요.","✶"]]},{"id":"nangmanpage","bg":"#fbd9ba","ink":"#4b383d","slides":[["COVER","한 장의 사진에\n한 줄의 마음.","지나쳐 버릴 문장을 근사한 페이지로 만드는 앱.","Aa"],["THE PROBLEM","좋은 문장도\n모양이 필요합니다.","사진과 글을 올리는 일은 쉬워도, 마음에 드는 배치를 찾는 건 의외로 어렵습니다.","✎"],["THE IDEA","템플릿부터 고르고\n글과 장면을 담아요.","사진·영상 위에 문장을 얹고, 템플릿부터 액자·프레임·글자 배치를 고르는 편집 기능을 마무리하고 있습니다.","▥"],["THE RESULT","카드뉴스도,\n짧은 영화 같은 글도.","글과 사진, 영상을 여러 페이지로 편집하고 카드뉴스 형태로 저장하는 iOS 앱입니다.","▧"],["COMING SOON","거의 다 만들었습니다.\n곧 선보입니다.","낭만페이지는 iOS 출시 직전 마무리 단계입니다. 정식 App Store 다운로드 링크는 실제 공개가 확인된 뒤 연결합니다.","♥"]]},{"id":"essaytella","bg":"#e7d6bb","ink":"#624a38","slides":[["COVER","생각 한 줄에서\n한 편의 에세이로.","떠오른 마음을 보다 자연스러운 문장으로 정리하는 글쓰기 도구.","Et."],["THE QUESTION","첫 문장을\n어떻게 시작할까요?","글의 주제와 전하고 싶은 마음을 정하면 시작이 쉬워집니다.","?"],["THE EDITOR","주제와 톤을 고르고\n글을 구성합니다.","글의 유형과 표현 방식을 선택해 초안을 만들고 다듬어 보세요.","✎"],["THE RESULT","내 이야기를\n내 문장처럼.","작성한 글을 살피고 표현을 조정해 전하고 싶은 뜻을 완성합니다.","▤"],["WRITE NOW","오늘의 생각을\n글로 남기세요.","상세페이지에서 기능을 살펴보고 웹에서 에세이텔라를 사용해 보세요.","✦"]]}].map(x=>[x.id,x]));
const CATALOG=typeof works!=='undefined'?works:[];
const modal=document.createElement('div');
modal.id='nangmanStory';modal.className='story-overlay';modal.hidden=true;
modal.innerHTML="<div class=\"story-veil\" data-story-close></div>\n<section class=\"story-modal\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"storyName\" aria-describedby=\"storySubtitle\" tabindex=\"-1\">\n <header class=\"story-top\">\n  <span class=\"story-brand\">✳ 낭만공작소 <small>STORY PREVIEW</small></span>\n  <span class=\"story-issue\" id=\"storyIssue\">01 / 09</span>\n  <button class=\"story-close\" type=\"button\" data-story-close aria-label=\"카드뉴스 닫기\">✕</button>\n </header>\n <div class=\"story-content\">\n  <div class=\"story-left\">\n   <div class=\"story-stage\" id=\"storyStage\" aria-live=\"polite\" aria-atomic=\"true\"></div>\n   <div class=\"story-controls\"><button type=\"button\" id=\"storyPrev\" aria-label=\"이전 카드\">← 이전</button>\n     <div class=\"story-dots\" id=\"storyDots\" role=\"group\" aria-label=\"슬라이드 선택\"></div>\n     <button type=\"button\" id=\"storyNext\" aria-label=\"다음 카드\">다음 →</button></div>\n  </div>\n  <aside class=\"story-aside\"><span class=\"story-tag\" id=\"storyTag\"></span>\n   <h2 id=\"storyName\"></h2><p id=\"storySubtitle\"></p>\n   <div class=\"story-aside-meta\"><span id=\"storyStatus\"></span><strong id=\"storyCount\">01 / 05</strong></div>\n   <p class=\"story-usage\">좌우로 넘기며 작품을 먼저 만나보세요. 마지막 장에서 상세 기능을 살펴보거나 다운로드할 수 있습니다.</p>\n   <a class=\"story-side-link\" id=\"storyDetailAside\" href=\"#\">제품 상세페이지 <span>↗</span></a>\n  </aside>\n </div>\n <footer class=\"story-footer\">\n  <span class=\"story-gesture\">← → 넘기기 · 좌우 스와이프</span>\n  <div class=\"story-footer-actions\">\n   <button type=\"button\" id=\"storySave\">↓ 카드 저장</button>\n   <button type=\"button\" id=\"storyShare\">↗ 공유</button>\n   <a href=\"#\" id=\"storyDetailFooter\">제품 상세 보기 ↗</a>\n  </div>\n </footer>\n</section><div class=\"story-toast\" id=\"storyToast\" hidden role=\"status\" aria-live=\"polite\"></div>";
document.body.append(modal);
const $=s=>modal.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stage=$('#storyStage'),dots=$('#storyDots');
const destinations={
woongto:['https://apps.apple.com/kr/app/woongto/id6811301799','App Store 다운로드'],
life4sec:['https://apps.apple.com/kr/app/id6817789548','App Store 다운로드'],
cinecam:['https://apps.apple.com/kr/app/id6816676310','App Store 다운로드'],
sinaloa:['https://myclubmakers.com/sinaloa/','웹에서 시작하기'],
satulingo:['https://myclubmakers.com/satulinggo/','웹 버전 열기'],
'blue-christmas':['https://myclubmakers.com/blue-christmas/','제작 과정 보기'],
essaytella:['https://myclubmakers.com/essaytella.html','웹에서 글쓰기']
};
const details=id=>'./products/'+encodeURIComponent(id)+'/';
let current=null,page=0,previousFocus=null,down=null,toastTimer;
function toast(message){
 const box=$('#storyToast');box.hidden=false;box.textContent=message;
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.hidden=true,2900);
}
function storyMarkup(){
 const st=current.story,w=current.work,s=st.slides[page],last=page===st.slides.length-1;
 const image=w.image?'<img src="'+esc(w.image)+'" alt="" loading="eager" decoding="async">':'<span class="story-monogram">'+esc(w.monogram||s[3])+'</span>';
 const art=(page===0||last)?'<div class="story-art '+(w.kind==='scene'?'story-art-scene':'')+'" aria-hidden="true">'+image+'</div>':'<div class="story-watermark" aria-hidden="true">'+esc(s[3])+'</div>';
 const action=destinations[w.id];
 const buttons=last?'<div class="story-last-actions"><a class="story-primary-link" href="'+details(w.id)+'">자세한 기능 보기 ↗</a>'+
 (action?'<a class="story-secondary-link" href="'+esc(action[0])+'" target="_blank" rel="noopener noreferrer">'+esc(action[1])+' ↗</a>':'<span class="story-coming">공개 준비 중</span>')+'</div>':'';
 return '<div class="story-slide"><div class="story-slide-top"><span>'+esc(s[0])+'</span><span>낭만공작소 / '+String(page+1).padStart(2,'0')+'</span></div>'+
 '<h3 class="story-headline">'+esc(s[1]).replace(/\n/g,'<br>')+'</h3>'+art+
 '<p class="story-description">'+esc(s[2])+'</p>'+buttons+
 '<div class="story-slide-bottom"><span>'+esc(w.name)+'</span><span>© NANGMAN WORKSHOP</span></div></div>';
}
function render(){
 if(!current)return;
 const st=current.story,w=current.work;
 stage.style.setProperty('--story-bg',st.bg);stage.style.setProperty('--story-ink',st.ink);
 stage.innerHTML=storyMarkup();stage.classList.toggle('last-card',page===st.slides.length-1);
 dots.innerHTML=st.slides.map((_,i)=>'<button type="button" data-slide="'+i+'" aria-label="'+String(i+1)+'번째 카드" aria-current="'+(page===i?'step':'false')+'" class="'+(page===i?'active':'')+'"></button>').join('');
 $('#storyCount').textContent=String(page+1).padStart(2,'0')+' / '+String(st.slides.length).padStart(2,'0');
 $('#storyPrev').disabled=page===0;$('#storyNext').disabled=page===st.slides.length-1;
 $('#storyNext').textContent=page===st.slides.length-1?'마지막 장':'다음 →';
 const h='#/story/'+w.id+'/'+String(page+1);
 if(location.hash!==h)history.replaceState(null,'',h);
}
function go(delta){if(current){page=Math.min(current.story.slides.length-1,Math.max(0,page+delta));render();}}
function open(id,slideIndex=0,fromUrl=false){
 const work=CATALOG.find(w=>w.id===id),story=STORIES.get(id);
 if(!work||!story)return;
 if(!current)previousFocus=document.activeElement;
 current={work,story};page=Math.max(0,Math.min(4,slideIndex));
 modal.hidden=false;document.body.classList.add('story-open');
 if(!fromUrl)history.pushState(null,'','#/story/'+id+'/'+String(page+1));
 $('#storyIssue').textContent=work.mark+' / '+String(CATALOG.length).padStart(2,'0');
 $('#storyTag').textContent=work.eyebrow;
 $('#storyName').textContent=work.name;
 $('#storySubtitle').textContent=work.short;
 $('#storyStatus').textContent=work.status;
 $('#storyDetailAside').href=details(id);
 $('#storyDetailFooter').href=details(id);
 render();$('.story-close').focus({preventScroll:true});
}
function close(fromUrl=false){
 if(!current)return;
 current=null;modal.hidden=true;document.body.classList.remove('story-open');
 if(!fromUrl)history.replaceState(null,'','#portfolio');
 if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 previousFocus=null;
}
document.addEventListener('click',event=>{
 const anchor=event.target.closest('a.work-card');
 if(!anchor||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 const id=new URL(anchor.href,location.href).pathname.match(/\/nangman\/products\/([^/]+)\/?$/)?.[1];
 if(id&&STORIES.has(id)){event.preventDefault();open(id);}
});
modal.addEventListener('click',event=>{
 if(event.target.closest('[data-story-close]')){close();return;}
 const point=event.target.closest('[data-slide]');
 if(point){page=Number(point.dataset.slide);render();}
});
$('#storyPrev').addEventListener('click',()=>go(-1));
$('#storyNext').addEventListener('click',()=>go(1));
document.addEventListener('keydown',event=>{
 if(!current)return;
 if(event.key==='Escape'){event.preventDefault();close();return;}
 if(event.key==='ArrowRight'){event.preventDefault();go(1);return;}
 if(event.key==='ArrowLeft'){event.preventDefault();go(-1);return;}
 if(event.key==='Tab'){
  const controls=[...modal.querySelectorAll('button:not(:disabled),a[href]')].filter(x=>x.getClientRects().length);
  if(!controls.length)return;
  if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1).focus();}
  else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0].focus();}
 }
});
stage.addEventListener('pointerdown',event=>{if(current&&!event.target.closest('a,button'))down={x:event.clientX,y:event.clientY};},{passive:true});
stage.addEventListener('pointerup',event=>{
 if(!current||!down)return;
 const dx=event.clientX-down.x,dy=event.clientY-down.y;down=null;
 if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.3)go(dx<0?1:-1);
},{passive:true});
stage.addEventListener('pointercancel',()=>down=null,{passive:true});
function route(){
 const m=location.hash.match(/^#\/story\/([a-z0-9-]+)(?:\/([1-5]))?$/);
 if(!m){if(current)close(true);return;}
 const id=m[1],index=Math.max(0,Number(m[2]||1)-1);
 if(!STORIES.has(id))return;
 if(!current||current.work.id!==id)open(id,index,true);
 else if(page!==index){page=index;render();}
}
window.addEventListener('popstate',route);window.addEventListener('hashchange',route);
$('#storyShare').addEventListener('click',async()=>{
 if(!current)return;
 const w=current.work,url=location.origin+location.pathname+'#/story/'+w.id;
 try{
  if(navigator.share)await navigator.share({title:w.name+' · 낭만공작소',text:w.short,url});
  else if(navigator.clipboard){await navigator.clipboard.writeText(url);toast('카드뉴스 링크를 복사했습니다.');}
  else window.prompt('카드뉴스 링크',url);
 }catch(e){if(e.name!=='AbortError')toast('공유에 실패했습니다.');}
});
function wrap(ctx,text,max){
 const rows=[];
 for(const paragraph of String(text).split('\n')){
  let line='';
  for(const ch of paragraph){if(line&&ctx.measureText(line+ch).width>max){rows.push(line);line=ch;}else line+=ch;}
  rows.push(line);
 }
 return rows;
}
$('#storySave').addEventListener('click',async()=>{
 if(!current)return;
 const st=current.story,w=current.work,index=page,s=st.slides[index],canvas=document.createElement('canvas');
 canvas.width=1080;canvas.height=1350;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle=st.bg;ctx.fillRect(0,0,1080,1350);ctx.fillStyle=st.ink;ctx.textBaseline='top';
 ctx.font='bold 27px system-ui,sans-serif';ctx.fillText('NANGMAN WORKSHOP',70,74);
 ctx.textAlign='right';ctx.fillText(String(index+1).padStart(2,'0')+' / 05',1005,74);ctx.textAlign='left';
 ctx.font='bold 25px system-ui,sans-serif';ctx.fillText(s[0],72,190);
 let size=92;
 while(size>57){ctx.font='900 '+size+'px system-ui,sans-serif';if(wrap(ctx,s[1],928).length<=3)break;size-=4;}
 wrap(ctx,s[1],928).slice(0,4).forEach((line,i)=>ctx.fillText(line,72,275+i*size*1.13));
 let drawn=false;
 if(w.image){
  try{
   const img=new Image();img.src=new URL(w.image,location.href).href;await img.decode();
   const dim=Math.min(img.naturalWidth,img.naturalHeight),a=(img.naturalWidth-dim)/2,b=(img.naturalHeight-dim)/2;
   const area=(index===0||index===4)?340:230;
   ctx.save();ctx.globalAlpha=(index===0||index===4)?0.9:0.3;
   ctx.drawImage(img,a,b,dim,dim,1080-area-75,575,area,area);
   ctx.restore();drawn=true;
  }catch(e){console.warn('Card image unavailable for export',e);}
 }
 if(!drawn){ctx.save();ctx.globalAlpha=.25;ctx.font='bold 300px Georgia,serif';ctx.fillText(s[3],650,580);ctx.restore();}
 ctx.fillStyle=st.ink;ctx.font='500 39px system-ui,sans-serif';
 wrap(ctx,s[2],890).slice(0,5).forEach((line,i)=>ctx.fillText(line,73,965+i*57));
 ctx.fillRect(72,1224,936,2);ctx.font='bold 28px system-ui,sans-serif';ctx.fillText(w.name,74,1256);
 ctx.textAlign='right';ctx.font='bold 21px system-ui,sans-serif';ctx.fillText('© NANGMAN WORKSHOP',1006,1258);
 const a=document.createElement('a');a.download='nangman-'+w.id+'-'+String(index+1).padStart(2,'0')+'.png';
 a.href=canvas.toDataURL('image/png');document.body.append(a);a.click();a.remove();
 toast('카드 PNG를 내보냈습니다.');
});
if(location.hash.startsWith('#/story/'))route();
})();