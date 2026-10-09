const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export async function onRequestDelete({request,params,env}){
  if(!env.DB||!env.AUDIO) return json({error:"Bindings DB/AUDIO are not connected"},503);
  const body=await request.json().catch(()=>null);
  const participant=(body?.participantId||"").toString();
  if(!participant) return json({error:"Participant required"},400);

  const row=await env.DB.prepare(
    "SELECT id,participant_id,object_key FROM recordings WHERE id=?"
  ).bind(params.id).first();

  if(!row) return json({error:"Recording not found"},404);
  if(row.participant_id!==participant) return json({error:"내가 올린 녹음만 지울 수 있습니다."},403);

  await env.AUDIO.delete(row.object_key);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM votes WHERE recording_id=?").bind(params.id),
    env.DB.prepare("DELETE FROM recordings WHERE id=? AND participant_id=?").bind(params.id,participant)
  ]);

  return json({ok:true});
}