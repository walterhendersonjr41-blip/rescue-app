// Vercel serverless backend (activates once Walt connects a free Upstash Redis / Vercel KV store in his Vercel project).
// Env vars set automatically by the Vercel Marketplace Upstash integration: KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL/TOKEN).
const URL_=process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL,TOK=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN;
const SHARED={lcr_listings:'arr:id',lcr_fake:'arr:id|at',lcr_refunds:'arr:id|at|why',lcr_members:'set',lcr_removed:'set',lcr_deals:'obj',lcr_strikes:'obj',lcr_bans:'obj',lcr_power:'obj'};
// PRIVACY: buyer phone numbers must never be stored or returned. Strip any "bphone" field anywhere,
// keep Power Play keys only for anonymous device ids, keep members only if device id or a posted seller phone.
const DEVRE=/^d[0-9a-z]{6,}$/;
function strip(x){if(Array.isArray(x))return x.map(strip);if(x&&typeof x==='object'){const o={};for(const k in x)if(k!=='bphone')o[k]=strip(x[k]);return o}return x}
function scrub(S){const o={};for(const k in S)o[k]=strip(S[k]);
 if(o.lcr_power&&typeof o.lcr_power==='object'){const P={};for(const k in o.lcr_power)if(DEVRE.test(k))P[k]=o.lcr_power[k];o.lcr_power=P}
 if(Array.isArray(o.lcr_members)){const sp=new Set((o.lcr_listings||[]).map(l=>String(l&&l.phone||'').replace(/\D/g,'')));o.lcr_members=o.lcr_members.filter(m=>DEVRE.test(String(m))||sp.has(String(m)))}
 return o}
const KEY='lcr:state';
async function redis(cmd){const r=await fetch(URL_,{method:'POST',headers:{Authorization:'Bearer '+TOK,'Content-Type':'application/json'},body:JSON.stringify(cmd)});const j=await r.json();if(j.error)throw new Error(j.error);return j.result}
async function load(){const s=await redis(['GET',KEY]);const S=s?JSON.parse(s):{};for(const k in SHARED)if(!S[k])S[k]=SHARED[k]==='obj'?{}:[];S._v=+S._v||0;return scrub(S)}
const keyOf=(spec,x)=>spec.slice(4).split('|').map(f=>x&&x[f]).join('|');
function apply(S,k,up,del){const spec=SHARED[k];if(!spec)throw new Error('bad key');up=strip(up||{});del=Array.isArray(del)?del:[];
 if(spec==='obj'){for(const id in up)S[k][id]=up[id];for(const id of del)delete S[k][id]}
 else if(spec==='set'){const s=new Set(S[k]);for(const id in up)s.add(up[id]);for(const id of del)s.delete(id);S[k]=[...s]}
 else{const m=new Map(S[k].map(x=>[keyOf(spec,x),x]));for(const id in up)m.set(id,up[id]);for(const id of del)m.delete(id);S[k]=[...m.values()]}}
async function applyOps(ops){for(let i=0;i<5;i++){const S=await load();const v=S._v;for(const o of ops)apply(S,o.k,o.up,o.del);Object.assign(S,scrub(S));S._v=v+1;
 // optimistic concurrency: only write if version unchanged
 const ok=await redis(['EVAL',"local c=redis.call('GET',KEYS[1]);local v=0;if c then v=tonumber(cjson.decode(c)['_v']) or 0 end;if v==tonumber(ARGV[2]) then redis.call('SET',KEYS[1],ARGV[1]);return 1 end;return 0",'1',KEY,JSON.stringify(S),String(v)]);if(ok==1)return S._v}throw new Error('busy, retry')}
module.exports={configured:!!(URL_&&TOK),load,applyOps,SHARED,scrub,strip};
