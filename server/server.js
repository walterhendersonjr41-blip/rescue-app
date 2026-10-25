// Last Chance Rescue — tiny shared backend (no dependencies). Run: node server/server.js [port]
// Serves the static app + a JSON API so listings, deals, reports, strikes, bans and members are shared by every device.
// Storage: one JSON file (data/state.json), written atomically. Swap for Postgres/Supabase later (see server/schema.sql).
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..'),DATA=process.env.LCR_DATA||path.join(ROOT,'data','state.json'),PORT=+process.argv[2]||+process.env.PORT||8790;
const SHARED={lcr_listings:'arr:id',lcr_fake:'arr:id|at',lcr_refunds:'arr:id|at|why',lcr_members:'set',lcr_removed:'set',lcr_deals:'obj',lcr_strikes:'obj',lcr_bans:'obj',lcr_power:'obj'};
// PRIVACY: buyer phone numbers must never be stored or returned. Strip any "bphone" field anywhere,
// keep Power Play keys only for anonymous device ids, keep members only if device id or a posted seller phone.
const DEVRE=/^d[0-9a-z]{6,}$/;
function strip(x){if(Array.isArray(x))return x.map(strip);if(x&&typeof x==='object'){const o={};for(const k in x)if(k!=='bphone')o[k]=strip(x[k]);return o}return x}
function scrub(S){const o={};for(const k in S)o[k]=strip(S[k]);
 if(o.lcr_power&&typeof o.lcr_power==='object'){const P={};for(const k in o.lcr_power)if(DEVRE.test(k))P[k]=o.lcr_power[k];o.lcr_power=P}
 if(Array.isArray(o.lcr_members)){const sp=new Set((o.lcr_listings||[]).map(l=>String(l&&l.phone||'').replace(/\D/g,'')));o.lcr_members=o.lcr_members.filter(m=>DEVRE.test(String(m))||sp.has(String(m)))}
 return o}
let S={};try{S=JSON.parse(fs.readFileSync(DATA,'utf8'))}catch(e){S={}}
for(const k in SHARED)if(!S[k])S[k]=SHARED[k]==='obj'?{}:[];
S=Object.assign(S,scrub(S));
let ver=+S._v||0;
const save=()=>{S._v=ver;fs.mkdirSync(path.dirname(DATA),{recursive:true});const t=DATA+'.tmp';fs.writeFileSync(t,JSON.stringify(S));fs.renameSync(t,DATA)};
const keyOf=(spec,x)=>spec.slice(4).split('|').map(f=>x&&x[f]).join('|');
function apply(k,up,del){const spec=SHARED[k];if(!spec)throw new Error('bad key');up=strip(up||{});del=Array.isArray(del)?del:[];
 if(spec==='obj'){for(const id in up)S[k][id]=up[id];for(const id of del)delete S[k][id]}
 else if(spec==='set'){const s=new Set(S[k]);for(const id in up)s.add(up[id]);for(const id of del)s.delete(id);S[k]=[...s]}
 else{const m=new Map(S[k].map(x=>[keyOf(spec,x),x]));for(const id in up)m.set(id,up[id]);for(const id of del)m.delete(id);S[k]=[...m.values()]}}
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.md':'text/plain; charset=utf-8','.png':'image/png','.json':'application/json'};
const PUBLIC=new Set(['/index.html','/app.js','/sync.js','/TERMS.md','/LAUNCH.md','/screenshot.png']);
const send=(res,code,body,type='application/json')=>{res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'});res.end(body)};
http.createServer((req,res)=>{const u=new URL(req.url,'http://x');
 if(req.method==='OPTIONS')return send(res,204,'');
 if(u.pathname==='/api/state'&&req.method==='GET'){const o0={};for(const k in SHARED)o0[k]=S[k];const o=scrub(o0);o._v=ver;return send(res,200,JSON.stringify(o))}
 if(u.pathname==='/api/ops'&&req.method==='POST'){let b='',n=0;req.on('data',c=>{n+=c.length;if(n>2e6){req.destroy();return}b+=c});req.on('end',()=>{try{const ops=JSON.parse(b);if(!Array.isArray(ops)||ops.length>50)throw new Error('ops');for(const o of ops)apply(o.k,o.up,o.del);Object.assign(S,scrub(S));ver++;save();send(res,200,JSON.stringify({ok:1,_v:ver}))}catch(e){send(res,400,JSON.stringify({error:String(e.message)}))}});return}
 if(u.pathname==='/api/health')return send(res,200,JSON.stringify({ok:1,_v:ver}));
 let p=u.pathname==='/'?'/index.html':u.pathname;if(!PUBLIC.has(p))return send(res,404,'not found','text/plain');
 fs.readFile(path.join(ROOT,p),(e,d)=>e?send(res,404,'not found','text/plain'):send(res,200,d,TYPES[path.extname(p)]||'application/octet-stream'))
}).listen(PORT,()=>console.log('LCR backend on :'+PORT+' data='+DATA));
