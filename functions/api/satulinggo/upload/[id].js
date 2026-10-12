const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export async function onRequestPost({request,params,env}){
  if(!env.DB||!env.AUDIO) return json({error:"Bindings DB/AUDIO are not connected"},503);
  const missionId=params.id;
  const mission=await env.DB.prepare("SELECT id FROM missions WHERE id=?").bind(missionId).first();
  if(!mission) return json({error:"Mission not found"},404);
  // Upgrade the original D1 table to allow multiple recordings per participant.
  const idx=await env.DB.prepare("PRAGMA index_list(recordings)").all();
  let restricted=false;
  for(const entry of (idx.results||[])){
    if(!entry.unique)continue;
    const info=await env.DB.prepare('PRAGMA index_info("'+entry.name.replaceAll('"','""')+'")').all();
    const cols=(info.results||[]).map(x=>x.name);
    if(cols.length===2&&cols.includes("mission_id")&&cols.includes("participant_id"))restricted=true;
  }
  if(restricted){
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS recordings_unrestricted (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, participant_id TEXT NOT NULL, object_key TEXT NOT NULL, mime TEXT NOT NULL, size_bytes INTEGER NOT NULL, created_at INTEGER NOT NULL)").run();
    await env.DB.prepare("INSERT OR IGNORE INTO recordings_unrestricted SELECT id,mission_id,participant_id,object_key,mime,size_bytes,created_at FROM recordings").run();
    await env.DB.prepare("DROP TABLE recordings").run();
    await env.DB.prepare("ALTER TABLE recordings_unrestricted RENAME TO recordings").run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_recordings_mission ON recordings(mission_id,created_at)").run();
  }
  const form=await request.formData();
  const audio=form.get("audio"), participant=(form.get("participantId")||"").toString();
  if(!audio||typeof audio==="string"||!participant) return json({error:"Audio required"},400);
  if(audio.size>2_000_000) return json({error:"녹음 파일은 2MB 이하만 가능합니다."},413);
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