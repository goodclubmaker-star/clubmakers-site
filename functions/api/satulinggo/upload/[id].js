const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export async function onRequestPost({request,params,env}){
  if(!env.DB||!env.AUDIO) return json({error:"Bindings DB/AUDIO are not connected"},503);
  const missionId=params.id;
  const mission=await env.DB.prepare("SELECT id FROM missions WHERE id=?").bind(missionId).first();
  if(!mission) return json({error:"Mission not found"},404);
  const form=await request.formData();
  const audio=form.get("audio"), participant=(form.get("participantId")||"").toString();
  if(!audio||typeof audio==="string"||!participant) return json({error:"Audio required"},400);
  if(audio.size>2_000_000) return json({error:"녹음 파일은 2MB 이하만 가능합니다."},413);
  const existing=await env.DB.prepare("SELECT id FROM recordings WHERE mission_id=? AND participant_id=?").bind(missionId,participant).first();
  if(existing) return json({error:"이 기기에서는 이미 녹음했습니다."},409);
  const count=await env.DB.prepare("SELECT COUNT(*) c FROM recordings WHERE mission_id=?").bind(missionId).first();
  if((count?.c||0)>=3) return json({error:"고마! 이미 3명 했데이 😂"},409);
  const usage=await env.DB.prepare("SELECT COALESCE(SUM(size_bytes),0) bytes, COUNT(*) c FROM recordings").first();
  if((usage?.bytes||0)+audio.size>5_000_000_000 || (usage?.c||0)>=3000) return json({error:"테스트 저장 한도에 도달했습니다."},507);
  const rid=crypto.randomUUID().replaceAll("-","").slice(0,12);
  const key=`satulinggo/${missionId}/${rid}`;
  const mime=audio.type||"audio/webm";
  await env.AUDIO.put(key,audio.stream(),{httpMetadata:{contentType:mime}});
  try{
    await env.DB.prepare("INSERT INTO recordings(id,mission_id,participant_id,object_key,mime,size_bytes,created_at) VALUES(?,?,?,?,?,?,?)")
      .bind(rid,missionId,participant,key,mime,audio.size,Date.now()).run();
  }catch(e){
    await env.AUDIO.delete(key);
    throw e;
  }
  return json({ok:true,id:rid});
}