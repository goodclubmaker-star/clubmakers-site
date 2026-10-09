const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const phrases=[
  "이마트 에브리데이","블루베리 스무디","어디까지 올라가는거에요","e의 2승 이마트",
  "거 우예됐노","니 여기 짤리나? 아 안 짤리나?","짜달시리 뭐","오늘 헐트라",
  "잘 쓰까무라","요 마 스근하네","확마 뿔라뿌라","하모예","마 니 와 이라노",
  "니 지금 뭐하노","밥 뭇나","어데 가노","퍼뜩 온나","가가 가가?","와 그라노",
  "쫌 단디 해라","고마 해라 마","쌔리 함 해뿌라","니 내 아나","맞제, 그자?",
  "이게 맞나 아이가","와 이리 늦었노"
];
async function schema(DB){
  await DB.prepare("CREATE TABLE IF NOT EXISTS missions (id TEXT PRIMARY KEY, phrase TEXT NOT NULL, sender_id TEXT NOT NULL, created_at INTEGER NOT NULL)").run();
  await DB.prepare("CREATE TABLE IF NOT EXISTS recordings (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, participant_id TEXT NOT NULL, object_key TEXT NOT NULL, mime TEXT NOT NULL, size_bytes INTEGER NOT NULL, created_at INTEGER NOT NULL, UNIQUE(mission_id, participant_id))").run();
  await DB.prepare("CREATE TABLE IF NOT EXISTS votes (recording_id TEXT NOT NULL, voter_id TEXT NOT NULL, reaction TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(recording_id, voter_id))").run();
}
function kstDay(){
  const kst=new Date(Date.now()+9*60*60*1000);
  const y=kst.getUTCFullYear(),m=String(kst.getUTCMonth()+1).padStart(2,"0"),d=String(kst.getUTCDate()).padStart(2,"0");
  return `${y}${m}${d}`;
}
function phraseFor(day){
  const y=Number(day.slice(0,4)),m=Number(day.slice(4,6)),d=Number(day.slice(6,8));
  const epoch=Math.floor(Date.UTC(y,m-1,d)/86400000);
  return phrases[epoch%phrases.length];
}
export async function onRequestGet({env}){
  if(!env.DB) return json({error:"DB binding missing"},503);
  await schema(env.DB);
  const day=kstDay(),id=`daily-${day}`,phrase=phraseFor(day);
  await env.DB.prepare("INSERT OR IGNORE INTO missions(id,phrase,sender_id,created_at) VALUES(?,?,?,?)")
    .bind(id,phrase,"public-room",Date.now()).run();
  const mission=await env.DB.prepare("SELECT id,phrase,created_at FROM missions WHERE id=?").bind(id).first();
  return json({mission,date:day});
}