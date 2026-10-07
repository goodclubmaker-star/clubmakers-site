const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
async function schema(DB){
  await DB.prepare("CREATE TABLE IF NOT EXISTS missions (id TEXT PRIMARY KEY, phrase TEXT NOT NULL, sender_id TEXT NOT NULL, created_at INTEGER NOT NULL)").run();
  await DB.prepare("CREATE TABLE IF NOT EXISTS recordings (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, participant_id TEXT NOT NULL, object_key TEXT NOT NULL, mime TEXT NOT NULL, size_bytes INTEGER NOT NULL, created_at INTEGER NOT NULL, UNIQUE(mission_id, participant_id))").run();
  await DB.prepare("CREATE TABLE IF NOT EXISTS votes (recording_id TEXT NOT NULL, voter_id TEXT NOT NULL, reaction TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(recording_id, voter_id))").run();
}
export async function onRequestPost({request,env}){
  if(!env.DB||!env.AUDIO) return json({error:"Bindings DB/AUDIO are not connected"},503);
  await schema(env.DB);
  const b=await request.json().catch(()=>null);
  const phrase=(b?.phrase||"").trim(), sender=(b?.senderId||"").trim();
  if(!phrase||phrase.length>120||!sender) return json({error:"Invalid mission"},400);
  const dayAgo=Date.now()-86400000;
  const cnt=await env.DB.prepare("SELECT COUNT(*) c FROM missions WHERE sender_id=? AND created_at>?").bind(sender,dayAgo).first();
  if((cnt?.c||0)>=30) return json({error:"오늘 만든 미션이 너무 많습니다."},429);
  const id=crypto.randomUUID().replaceAll("-","").slice(0,10);
  await env.DB.prepare("INSERT INTO missions(id,phrase,sender_id,created_at) VALUES(?,?,?,?)").bind(id,phrase,sender,Date.now()).run();
  return json({id,phrase});
}