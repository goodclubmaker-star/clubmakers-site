# 로컬 API 통합 테스트: wrangler pages dev public --d1=DB --r2=AUDIO --port 8788 실행 후
# python3 scripts/nangman-postcard/api-test.py  (Pillow 필요)
import json, io, sys, urllib.request, urllib.error, uuid
from PIL import Image
B="http://localhost:8788/api/nangman/postcard"
def jpeg():
    b=io.BytesIO(); Image.new("RGB",(1080,1350),(255,240,212)).save(b,"JPEG",quality=80); return b.getvalue()
def req(method,url,body=None,headers={}):
    r=urllib.request.Request(url,data=body,method=method,headers=headers)
    try:
        with urllib.request.urlopen(r) as resp: return resp.status, resp.headers, resp.read()
    except urllib.error.HTTPError as e: return e.code, e.headers, e.read()
def multipart(meta, bg):
    bd=uuid.uuid4().hex; parts=[]
    if meta is not None: parts.append(f'--{bd}\r\nContent-Disposition: form-data; name="meta"\r\n\r\n'.encode()+meta.encode()+b"\r\n")
    if bg is not None: parts.append(f'--{bd}\r\nContent-Disposition: form-data; name="background"; filename="bg.jpg"\r\nContent-Type: image/jpeg\r\n\r\n'.encode()+bg+b"\r\n")
    return b"".join(parts)+f"--{bd}--\r\n".encode(), {"Content-Type":f"multipart/form-data; boundary={bd}"}
stroke={"mode":"direct","group":None,"tool":"pen","color":"#000000ff","start":0,"points":[[100,100,0,6],[120,110,0.1,6]],"extra":"<script>"}
meta={"format":"nangman-postcard","version":1,"from":"  웅  ","strokes":{"version":1,"canvas":{"width":1080,"height":1350},"strokes":[stroke]},"junk":1}
ok=0; fails=[]
def check(name,cond,info=""):
    global ok
    if cond: ok+=1; print("PASS",name)
    else: fails.append(name); print("FAIL",name,info)
# create
body,h=multipart(json.dumps(meta),jpeg()); st,hd,raw=req("POST",B,body,h); c=json.loads(raw)
check("create 201",st==201,raw[:200]); tok=c["token"]; mg=c["manageToken"]
check("token format",len(tok)==22 and len(mg)==43)
check("url",c["url"].endswith("/nangman/postcard/?p="+tok),c["url"])
# read
st,hd,raw=req("GET",f"{B}/{tok}"); d=json.loads(raw)
check("get 200",st==200,raw[:200])
check("no-store",hd.get("cache-control")=="no-store")
check("from trimmed",d["from"]=="웅",d.get("from"))
check("unknown fields dropped","extra" not in d["strokes"]["strokes"][0] and "junk" not in d)
check("color normalized",d["strokes"]["strokes"][0]["color"]=="#000000FF")
st,hd,raw=req("GET",f"{B}/{tok}/background")
check("background jpeg",st==200 and raw[:3]==b"\xff\xd8\xff" and hd.get("content-type")=="image/jpeg")
# revoke wrong / right
st,_,_=req("DELETE",f"{B}/{tok}",headers={"Authorization":"Bearer "+"A"*43}); check("revoke wrong 401",st==401)
st,_,raw=req("DELETE",f"{B}/{tok}",headers={"Authorization":"Bearer "+mg}); check("revoke 200",st==200,raw)
st,_,raw=req("GET",f"{B}/{tok}"); check("after revoke 410 revoked",st==410 and json.loads(raw)["code"]=="revoked",raw)
st,_,raw=req("GET",f"{B}/{tok}/background"); check("bg after revoke 410",st==410)
st,_,raw=req("DELETE",f"{B}/{tok}",headers={"Authorization":"Bearer "+mg}); check("revoke idempotent",st==200)
# errors
st,_,raw=req("GET",f"{B}/short"); check("bad token 404",st==404)
st,_,raw=req("GET",f"{B}/{'Z'*22}"); check("unknown token 404",st==404)
m2=json.loads(json.dumps(meta)); m2["strokes"]["strokes"]=[]
body,h=multipart(json.dumps(m2),jpeg()); st,_,raw=req("POST",B,body,h); check("empty 400",st==400 and json.loads(raw)["code"]=="empty",raw)
m3=json.loads(json.dumps(meta)); m3["strokes"]["strokes"][0]["points"][0][2]=-1
body,h=multipart(json.dumps(m3),jpeg()); st,_,raw=req("POST",B,body,h); check("negative t 400",st==400)
body,h=multipart(json.dumps(meta),b"\x89PNG....."); st,_,raw=req("POST",B,body,h); check("non-jpeg 400",st==400)
body,h=multipart(json.dumps(meta),b"\xff\xd8\xff"+b"0"*2_100_000); st,_,raw=req("POST",B,body,h); check("bg too large 413",st==413,st)
body,h=multipart("{nope",jpeg()); st,_,raw=req("POST",B,body,h); check("bad json 400",st==400)
body,h=multipart(None,jpeg()); st,_,raw=req("POST",B,body,h); check("missing meta 400",st==400)
m4=json.loads(json.dumps(meta)); m4["from"]="가"*41
body,h=multipart(json.dumps(m4),jpeg()); st,_,raw=req("POST",B,body,h); check("from too long 400",st==400)
# rate limit (1 already created + 19 more ok, 21st -> 429)
codes=[]
for i in range(20):
    body,h=multipart(json.dumps(meta),jpeg()); st,_,_=req("POST",B,body,h); codes.append(st)
check("rate limit 429 at 21st",codes[:19]==[201]*19 and codes[19]==429,codes)
print(f"\n{ok} passed, {len(fails)} failed", fails)
sys.exit(1 if fails else 0)
