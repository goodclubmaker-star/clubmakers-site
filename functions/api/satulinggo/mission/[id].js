const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export async function onRequestGet({params,env}){
  if(!env.DB) return json({error:"DB binding missing"},503);
  const id=params.id;
  const m=await env.DB.prepare("SELECT id,phrase,created_at FROM missions WHERE id=?").bind(id).first();
  if(!m) return json({error:"Mission not found"},404);
  const r=await env.DB.prepare(`SELECT r.id,r.participant_id,r.created_at,
    COALESCE(SUM(CASE WHEN v.reaction='😂' THEN 1 ELSE 0 END),0) laugh,
    COALESCE(SUM(CASE WHEN v.reaction='🔥' THEN 1 ELSE 0 END),0) fire,
    COALESCE(SUM(CASE WHEN v.reaction='👍' THEN 1 ELSE 0 END),0) good
    FROM recordings r LEFT JOIN votes v ON v.recording_id=r.id
    WHERE r.mission_id=? GROUP BY r.id ORDER BY r.created_at ASC`).bind(id).all();
  return json({
    mission:m,
    recordings:(r.results||[]).map((x,i)=>({
      id:x.id,
      participantId:x.participant_id,
      index:i+1,
      createdAt:x.created_at,
      audioUrl:`/api/satulinggo/audio/${id}/${x.id}`,
      votes:{laugh:x.laugh,fire:x.fire,good:x.good}
    }))
  });
}