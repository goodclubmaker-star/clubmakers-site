/*
 * CLUBMAKERS Christmas — on-device neural greeting engine (Supertonic 3).
 * Model: Supertone/supertonic-3 (OpenRAIL-M, https://huggingface.co/Supertone/supertonic-3/blob/main/LICENSE)
 * Inference helper: Supertone MIT; notices in ./supertonic-code-LICENSE.txt
 * Loads only after explicit visitor action (the ONNX weights are ~380 MB).
 * No Azure, no API keys, no uploaded visitor names; only model files fetched by the browser.
 */
import {loadTextToSpeech,loadVoiceStyle} from './supertonic-helper.js';

const HF='https://huggingface.co/Supertone/supertonic-3/resolve/main';
const VOICES={F1:'미나',F2:'소라',F3:'유나'};
const ORT_MODEL=HF+'/onnx';
let tts=null;
let preparePromise=null;
let activeStyle=null;
let activeStyleId='';
let audioCtx=null;
let currentSource=null;
let cache=new Map();
const CACHE_LIMIT=10;
let backend='unknown';

function notify(state,message){
  window.dispatchEvent(new CustomEvent('clubmakers:local-tts',{detail:{state,message,backend}}));
}
function browserSupport(){
  return typeof WebAssembly!=='undefined' && !!(window.AudioContext||window.webkitAudioContext);
}
function prime(){
  if(!browserSupport())return false;
  try{
    if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
    return true;
  }catch(e){return false}
}
async function prepare(){
  if(tts)return true;
  if(preparePromise)return preparePromise;
  if(!browserSupport())throw Error('이 기기에서 AI 음성 처리를 지원하지 않습니다');
  notify('loading','AI 음성 모델 준비 중 · 최초 약 380MB 다운로드');
  preparePromise=(async()=>{
    const onProgress=(name,n,total)=>notify('loading','모델 불러오는 중 '+(Number.isFinite(n)?n:0)+'/'+(total||4)+' · '+name);
    const onMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const providers=onMobile?['wasm']:['webgpu','wasm'];
    let lastError=null;
    for(const provider of providers){
      try{
        notify('loading',provider==='webgpu'?'그래픽 가속 AI 음성 준비 중':'기본 AI 음성 준비 중');
        const result=await loadTextToSpeech(ORT_MODEL,{executionProviders:[provider],graphOptimizationLevel:'all'},onProgress);
        tts=result.textToSpeech;backend=provider;
        notify('ready','무료 AI 음성 준비 완료 · 이름을 달아보세요');
        return true;
      }catch(e){
        lastError=e;
        console.warn('Supertonic model setup failed on',provider,e);
      }
    }
    throw lastError||Error('AI 모델을 불러오지 못했습니다');
  })().catch(err=>{
    tts=null;
    preparePromise=null;
    notify('error','AI 음성 준비 실패 · 네트워크/메모리를 확인해 주세요');
    throw err;
  });
  return preparePromise;
}
async function loadStyle(voiceId){
  const id=Object.hasOwn(VOICES,voiceId)?voiceId:'F3';
  if(activeStyleId===id&&activeStyle)return activeStyle;
  const style=await loadVoiceStyle([HF+'/voice_styles/'+id+'.json']);
  activeStyle=style;activeStyleId=id;
  return style;
}
function stop(){
  if(currentSource){try{currentSource.stop()}catch(e){}currentSource=null}
}
async function playAudio(floatData,sampleRate,opts={}){
  if(!prime())throw Error('AudioContext not supported');
  await audioCtx.resume();
  const len=floatData.length;
  const buffer=audioCtx.createBuffer(1,len,sampleRate);
  buffer.copyToChannel(floatData,0);
  stop();
  const source=audioCtx.createBufferSource(),gain=audioCtx.createGain();
  source.buffer=buffer;
  // Slight pitch rise gives a playful character tone; it is not a genuine child voice.
  source.playbackRate.value=opts.pitchRate||1.10;
  gain.gain.value=.86;
  source.connect(gain);gain.connect(audioCtx.destination);
  currentSource=source;
  window.dispatchEvent(new CustomEvent('clubmakers:voiceplay',{detail:{playing:true}}));
  source.onended=()=>{
    if(currentSource===source){currentSource=null;window.dispatchEvent(new CustomEvent('clubmakers:voiceplay',{detail:{playing:false}}))}
  };
  source.start();
}
async function speak(text,voiceId='F3'){
  if(!tts)throw Error('AI 모델이 아직 준비되지 않았습니다');
  const raw=String(text||'').replace(/[<>]/g,'').trim().slice(0,40);
  if(!raw)return;
  const normalized=raw.endsWith('님')?raw:raw+'님';
  const sentence=normalized+'! 메리 크리스마스!';
  const voice=Object.hasOwn(VOICES,voiceId)?voiceId:'F3';
  const key=voice+'|'+sentence;
  let output=cache.get(key);
  if(!output){
    notify('speaking','AI가 인사를 만들고 있어요 ✨');
    const style=await loadStyle(voice);
    const result=await tts.call(sentence,'ko',style,6,.98,.16);
    const audioLength=Math.floor(tts.sampleRate*result.duration[0]);
    output={wave:Float32Array.from(result.wav.slice(0,audioLength)),sampleRate:tts.sampleRate};
    cache.set(key,output);
    if(cache.size>CACHE_LIMIT)cache.delete(cache.keys().next().value);
  }
  await playAudio(output.wave,output.sampleRate,{pitchRate:1.13});
  notify('ready','🎄 '+normalized+'의 AI 음성 인사');
}
window.ClubmakersLocalTTS={prepare,prime,speak,stop,isReady:()=>!!tts,isSupported:browserSupport,voices:VOICES};
notify('available','무료 AI 목소리 · 버튼을 누르면 최초 380MB 다운로드');
