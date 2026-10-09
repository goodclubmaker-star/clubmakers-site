export async function onRequestGet({request,params,env}){
  if(!env.DB||!env.AUDIO) return new Response("Bindings missing",{status:503});

  const row=await env.DB.prepare(
    "SELECT object_key,mime,size_bytes FROM recordings WHERE id=? AND mission_id=?"
  ).bind(params.recording,params.mission).first();

  if(!row) return new Response("Not found",{status:404});

  const size=Number(row.size_bytes||0);
  const rangeHeader=request.headers.get("range");
  const baseHeaders={
    "content-type":row.mime||"audio/webm",
    "cache-control":"private, max-age=60",
    "accept-ranges":"bytes",
    "content-disposition":"inline"
  };

  if(rangeHeader && size>0){
    const match=/bytes=(\d*)-(\d*)/.exec(rangeHeader);
    if(!match) return new Response(null,{status:416,headers:{"content-range":`bytes */${size}`}});
    let start=match[1]?Number(match[1]):0;
    let end=match[2]?Number(match[2]):size-1;
    if(!match[1]&&match[2]){
      const suffix=Math.min(Number(match[2]),size);
      start=size-suffix;
      end=size-1;
    }
    start=Math.max(0,start);
    end=Math.min(size-1,end);
    if(start>end||start>=size) return new Response(null,{status:416,headers:{"content-range":`bytes */${size}`}});
    const length=end-start+1;
    const obj=await env.AUDIO.get(row.object_key,{range:{offset:start,length}});
    if(!obj) return new Response("Not found",{status:404});
    return new Response(obj.body,{
      status:206,
      headers:{
        ...baseHeaders,
        "content-range":`bytes ${start}-${end}/${size}`,
        "content-length":String(length)
      }
    });
  }

  const obj=await env.AUDIO.get(row.object_key);
  if(!obj) return new Response("Not found",{status:404});
  return new Response(obj.body,{headers:{...baseHeaders,...(size?{"content-length":String(size)}:{})}});
}