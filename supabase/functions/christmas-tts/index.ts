// CLUBMAKERS Christmas greetings: Azure neural TTS, server-side key only.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const AZURE_KEY = Deno.env.get("AZURE_SPEECH_KEY") || "";
const AZURE_REGION = Deno.env.get("AZURE_SPEECH_REGION") || "";
const PUBLIC_KEY = "sb_publishable_C9IEZO8H-CCSVeiD-TocCw_rnCgEzTO";
const ALLOWED_ORIGINS = new Set(["https://myclubmakers.com","https://www.myclubmakers.com","http://localhost:4321","http://127.0.0.1:4321"]);
const VOICES = {
  cute: {azure:"ko-KR-YuJinNeural",pitch:"+11%",rate:"+3%",label:"귀염 유진"},
  bright: {azure:"ko-KR-JiMinNeural",pitch:"+7%",rate:"+8%",label:"발랄 지민"},
  story: {azure:"ko-KR-SeoHyeonNeural",pitch:"+4%",rate:"-3%",label:"동화 서현"}
} as const;
type Profile = keyof typeof VOICES;
const BUCKET="clubmakers-christmas-tts";
const cors=(origin:string|null)=>({
 "Access-Control-Allow-Origin":origin&&ALLOWED_ORIGINS.has(origin)?origin:"https://myclubmakers.com",
 "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
 "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
 "Vary":"Origin"
});
const respond=(status:number,data:unknown,origin:string|null)=>new Response(JSON.stringify(data),{status,headers:{...cors(origin),"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const xml=(str:string)=>str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const serviceHeaders=()=>({"apikey":SERVICE,"Authorization":"Bearer "+SERVICE,"Content-Type":"application/json"});
const b64hex=async(str:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(str)))).map(b=>b.toString(16).padStart(2,"0")).join("");
const publicAudio=(path:string)=>SUPABASE_URL+"/storage/v1/object/public/"+BUCKET+"/"+path;
const db=async(path:string,opts:RequestInit={})=>fetch(SUPABASE_URL+"/rest/v1/"+path,{...opts,headers:{...serviceHeaders(),...(opts.headers||{})}});
Deno.serve(async (req:Request)=>{
 const origin=req.headers.get("origin");
 if(origin && !ALLOWED_ORIGINS.has(origin))return respond(403,{error:"origin_forbidden"},origin);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
 if(req.headers.get("apikey")!==PUBLIC_KEY)return respond(401,{error:"invalid_public_key"},origin);
 const ready=!!(AZURE_KEY && /^[a-z0-9-]{3,30}$/.test(AZURE_REGION) && SUPABASE_URL && SERVICE);
 if(req.method==="GET")return respond(200,{ready,profiles:Object.keys(VOICES)},origin);
 if(req.method!=="POST")return respond(405,{error:"method_not_allowed"},origin);
 if(!ready)return respond(503,{error:"azure_not_configured"},origin);
 try{
  const raw=await req.text();
  if(raw.length>256)return respond(413,{error:"too_large"},origin);
  const payload=JSON.parse(raw);
  const voice:Profile=payload.voice;
  if(!Object.prototype.hasOwnProperty.call(VOICES,voice))return respond(400,{error:"invalid_voice"},origin);
  let person="";
  if(payload.sample===true){person="골프채공작소 친구들";}
  else{
   const id=Number(payload.id);
   if(!Number.isSafeInteger(id)||id<=0)return respond(400,{error:"invalid_id"},origin);
   const rowResp=await db("christmas_tree_names?select=name&id=eq."+id+"&limit=1");
   if(!rowResp.ok)return respond(502,{error:"name_lookup_failed"},origin);
   const rows=await rowResp.json();
   if(!rows?.length)return respond(404,{error:"name_not_found"},origin);
   person=String(rows[0].name);
  }
  person=person.replace(/[\u0000-\u001f\u007f]/g," ").trim();
  if(!person||[...person].length>24)return respond(400,{error:"invalid_name"},origin);
  const message=payload.sample===true?"골프채공작소 친구들, 메리 크리스마스!":person+(person.endsWith("님")?"":"님")+", 메리 크리스마스!";
  const hash=await b64hex("v1|"+voice+"|"+message);
  const prior=await db("christmas_tts_cache?select=object_path&cache_key=eq."+hash+"&limit=1");
  if(prior.ok){const entries=await prior.json();if(entries?.length)return respond(200,{ok:true,cached:true,url:publicAudio(entries[0].object_path)},origin);}
  // Prevent unexpected spend, even if many anonymous visitors call the endpoint.
  const utcStart=new Date();utcStart.setUTCHours(0,0,0,0);
  const counted=await db("christmas_tts_cache?select=cache_key&created_at=gte."+encodeURIComponent(utcStart.toISOString())+"&limit=100");
  if(!counted.ok)return respond(502,{error:"quota_check_failed"},origin);
  const today=await counted.json();
  if(today.length>=100)return respond(429,{error:"daily_free_limit"},origin);
  const config=VOICES[voice];
  const ssml='<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ko-KR"><voice name="'+config.azure+'"><prosody rate="'+config.rate+'" pitch="'+config.pitch+'">'+xml(message)+'</prosody></voice></speak>';
  const upstream=await fetch("https://"+AZURE_REGION+".tts.speech.microsoft.com/cognitiveservices/v1",{
   method:"POST",headers:{"Ocp-Apim-Subscription-Key":AZURE_KEY,"X-Microsoft-OutputFormat":"audio-16khz-32kbitrate-mono-mp3","Content-Type":"application/ssml+xml; charset=utf-8","User-Agent":"clubmakers-christmas"},
   body:ssml,signal:AbortSignal.timeout(12000)
  });
  if(!upstream.ok){console.error("Azure TTS status",upstream.status);return respond(502,{error:"speech_generation_failed"},origin);}
  const audio=await upstream.arrayBuffer();
  if(audio.byteLength<100||audio.byteLength>524288)return respond(502,{error:"unexpected_audio_size"},origin);
  const file=hash+".mp3";
  const saved=await fetch(SUPABASE_URL+"/storage/v1/object/"+BUCKET+"/"+file,{
   method:"POST",headers:{...serviceHeaders(),"Content-Type":"audio/mpeg","cache-control":"max-age=31536000","x-upsert":"false"},
   body:audio
  });
  if(!saved.ok&&saved.status!==409){console.error("Speech storage error",saved.status);return respond(502,{error:"storage_failed"},origin);}
  const persisted=await db("christmas_tts_cache",{method:"POST",headers:{"Prefer":"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify({cache_key:hash,entry_name:person,voice_profile:voice,object_path:file})});
  if(!persisted.ok)console.error("Speech cache insert failed",persisted.status);
  return respond(200,{ok:true,cached:false,url:publicAudio(file)},origin);
 }catch(err){console.error("Christmas TTS",String(err));return respond(500,{error:"tts_unavailable"},origin)}
});