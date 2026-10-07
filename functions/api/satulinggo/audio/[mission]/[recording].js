export async function onRequestGet({params,env}){
  if(!env.DB||!env.AUDIO) return new Response("Bindings missing",{status:503});
  const row=await env.DB.prepare("SELECT object_key,mime FROM recordings WHERE id=? AND mission_id=?").bind(params.recording,params.mission).first();
  if(!row) return new Response("Not found",{status:404});
  const obj=await env.AUDIO.get(row.object_key);
  if(!obj) return new Response("Not found",{status:404});
  return new Response(obj.body,{headers:{"content-type":row.mime||"audio/webm","cache-control":"private, max-age=60"}});
}