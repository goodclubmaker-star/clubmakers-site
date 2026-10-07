const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
async function schema(DB){
  await DB.prepare("CREATE TABLE IF NOT EXISTS phrase_suggestions (id TEXT PRIMARY KEY, region TEXT NOT NULL, phrase TEXT NOT NULL, submitter_id TEXT NOT NULL, created_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending')").run();
}
export async function onRequestPost({request,env}){
  if(!env.DB) return json({error:"DB binding missing"},503);
  await schema(env.DB);
  const b=await request.json().catch(()=>null);
  const region=(b?.region||"").trim(), phrase=(b?.phrase||"").trim(), submitter=(b?.submitterId||"").trim();
  if(!region||region.length>30||!phrase||phrase.length>120||!submitter) return json({error:"지역과 문장을 확인해주세요."},400);
  const dayAgo=Date.now()-86400000;
  const cnt=await env.DB.prepare("SELECT COUNT(*) c FROM phrase_suggestions WHERE submitter_id=? AND created_at>?").bind(submitter,dayAgo).first();
  if((cnt?.c||0)>=10) return json({error:"오늘 제보 한도에 도달했습니다."},429);
  const id=crypto.randomUUID().replaceAll("-","").slice(0,12);
  await env.DB.prepare("INSERT INTO phrase_suggestions(id,region,phrase,submitter_id,created_at,status) VALUES(?,?,?,?,?,'pending')")
    .bind(id,region,phrase,submitter,Date.now()).run();
  return json({ok:true,id});
}