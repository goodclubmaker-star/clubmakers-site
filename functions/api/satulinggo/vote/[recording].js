const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export async function onRequestPost({request,params,env}){
  if(!env.DB) return json({error:"DB binding missing"},503);
  const b=await request.json().catch(()=>null), voter=(b?.voterId||"").trim(), reaction=b?.reaction;
  if(!voter||!["😂","🔥","👍"].includes(reaction)) return json({error:"Invalid vote"},400);
  const rec=await env.DB.prepare("SELECT participant_id FROM recordings WHERE id=?").bind(params.recording).first();
  if(!rec) return json({error:"Recording not found"},404);
  if(rec.participant_id===voter) return json({error:"내 녹음에는 투표할 수 없습니다."},403);
  try{
    await env.DB.prepare("INSERT INTO votes(recording_id,voter_id,reaction,created_at) VALUES(?,?,?,?)").bind(params.recording,voter,reaction,Date.now()).run();
  }catch(e){
    return json({error:"이 녹음에는 이미 투표했습니다."},409);
  }
  return json({ok:true});
}