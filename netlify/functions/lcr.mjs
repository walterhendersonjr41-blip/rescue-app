// Last Chance Rescue — shared backend on Netlify Functions + Netlify Blobs (free). Same API as api/ (Vercel) and server/server.js.
// Routes: GET /api/state, POST /api/ops, GET /api/health. Blobs works automatically once the site belongs to a Netlify account.
import { getStore } from "@netlify/blobs";
const SHARED={lcr_listings:'arr:id',lcr_fake:'arr:id|at',lcr_refunds:'arr:id|at|why',lcr_members:'set',lcr_removed:'set',lcr_deals:'obj',lcr_strikes:'obj',lcr_bans:'obj',lcr_power:'obj'};
const KEY='state';
// PRIVACY: buyer phone numbers must never be stored or returned. Strip any "bphone" field anywhere,
// keep Power Play keys only for anonymous device ids, keep members only if device id or a posted seller phone.
const DEVRE=/^d[0-9a-z]{6,}$/;
function strip(x){if(Array.isArray(x))return x.map(strip);if(x&&typeof x==='object'){const o={};for(const k in x)if(k!=='bphone')o[k]=strip(x[k]);return o}return x}
function scrub(S){const o={};for(const k in S)o[k]=strip(S[k]);
 if(o.lcr_power&&typeof o.lcr_power==='object'){const P={};for(const k in o.lcr_power)if(DEVRE.test(k))P[k]=o.lcr_power[k];o.lcr_power=P}
 if(Array.isArray(o.lcr_members)){const sp=new Set((o.lcr_listings||[]).map(l=>String(l&&l.phone||'').replace(/\D/g,'')));o.lcr_members=o.lcr_members.filter(m=>DEVRE.test(String(m))||sp.has(String(m)))}
 return o}
const keyOf=(spec,x)=>spec.slice(4).split('|').map(f=>x&&x[f]).join('|');
function norm(S){S=S||{};for(const k in SHARED)if(!S[k])S[k]=SHARED[k]==='obj'?{}:[];const v=+S._v||0;S=scrub(S);S._v=v;return S}
function apply(S,k,up,del){const spec=SHARED[k];if(!spec)throw new Error('bad key');up=strip(up||{});del=Array.isArray(del)?del:[];
 if(spec==='obj'){for(const id in up)S[k][id]=up[id];for(const id of del)delete S[k][id]}
 else if(spec==='set'){const s=new Set(S[k]);for(const id in up)s.add(up[id]);for(const id of del)s.delete(id);S[k]=[...s]}
 else{const m=new Map(S[k].map(x=>[keyOf(spec,x),x]));for(const id in up)m.set(id,up[id]);for(const id of del)m.delete(id);S[k]=[...m.values()]}}
const json=(code,o)=>new Response(JSON.stringify(o),{status:code,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export default async (req)=>{
 const route=new URL(req.url).pathname.replace(/\/+$/,'').split('/').pop();
 let store;try{store=getStore({name:'lcr',consistency:'strong'})}catch(e){return json(503,{error:'backend not configured (claim the Netlify site to enable Blobs)'})}
 try{
  if(route==='health'){await store.get(KEY);return json(200,{ok:1})}
  if(route==='state'&&req.method==='GET'){const r=await store.get(KEY,{type:'json'});return json(200,norm(r))}
  if(route==='ops'&&req.method==='POST'){let ops=await req.json();if(!Array.isArray(ops)||ops.length>50)return json(400,{error:'ops'});
   for(let i=0;i<6;i++){const cur=await store.getWithMetadata(KEY,{type:'json'});const S=norm(cur&&cur.data);for(const o of ops)apply(S,o.k,o.up,o.del);Object.assign(S,scrub(S));S._v=(+S._v||0)+1;
    const res=cur?await store.setJSON(KEY,S,{onlyIfMatch:cur.etag}):await store.setJSON(KEY,S,{onlyIfNew:true});
    if(!res||res.modified!==false)return json(200,{ok:1,_v:S._v})}
   return json(409,{error:'busy, retry'})}
  return json(405,{error:'method'})
 }catch(e){return json(e&&/bad key|ops/.test(e.message)?400:503,{error:String(e&&e.message||e)})}
};
export const config={path:['/api/state','/api/ops','/api/health']};
