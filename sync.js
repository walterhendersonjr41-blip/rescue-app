// Shared-backend sync. Mirrors shared localStorage keys to the server (/api) so every device sees the same data.
// Falls back to device-only localStorage if no backend is reachable (e.g. opened as a file).
(function(){
const SHARED={lcr_listings:'arr:id',lcr_fake:'arr:id|at',lcr_refunds:'arr:id|at|why',lcr_members:'set',lcr_removed:'set',lcr_deals:'obj',lcr_strikes:'obj',lcr_bans:'obj',lcr_power:'obj'};
const API=window.LCR_OFFLINE?null:(window.LCR_API!=null?window.LCR_API:(location.protocol.startsWith('http')?'':null));
window.LCR_SYNC={on:false,api:API};
if(API==null||/^#demo/.test(location.hash))return;
const LS=window.localStorage,rawSet=Storage.prototype.setItem,rawRem=Storage.prototype.removeItem;
const parse=(s,d)=>{try{const v=JSON.parse(s);return v==null?d:v}catch(e){return d}};
const keyOf=(spec,x)=>spec.slice(4).split('|').map(f=>x&&x[f]).join('|');
const toMap=(k,v)=>{const spec=SHARED[k],m={};if(spec==='obj'){if(v&&typeof v==='object'&&!Array.isArray(v))for(const i in v)m[i]=v[i]}else if(Array.isArray(v))for(const x of v){m[spec==='set'?String(x):keyOf(spec,x)]=x}return m};
let base={};
// Works with either backend: Vercel functions (api/) or Netlify Functions + Blobs (netlify/functions/lcr.mjs) — both serve /api/state + /api/ops.
function pull(){const x=new XMLHttpRequest();x.open('GET',API+'/api/state',false);x.send();if(x.status!==200)throw new Error('pull');const j=JSON.parse(x.responseText);if(!j||typeof j!=='object'||!Array.isArray(j.lcr_listings))throw new Error('not a backend');return j}
// PRIVACY: never send buyer phone numbers to the server.
const strip=x=>{if(Array.isArray(x))return x.map(strip);if(x&&typeof x==='object'){const o={};for(const k in x)if(k!=='bphone')o[k]=strip(x[k]);return o}return x};
function adopt(st){for(const k in SHARED){const v=st[k]!=null?st[k]:(SHARED[k]==='obj'?{}:[]);rawSet.call(LS,k,JSON.stringify(v));base[k]=toMap(k,v)}}
try{adopt(pull());window.LCR_SYNC.on=true}catch(e){console.warn('LCR backend unreachable — device-only mode');return}
let q=[],t=null;
function push(){t=null;if(!q.length)return;const ops=q;q=[];fetch(API+'/api/ops',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(strip(ops))}).catch(()=>{q=ops.concat(q);setTimeout(push,3000)})}
function diff(k,val){const now=toMap(k,parse(val,null)),old=base[k]||{},up={},del=[];for(const i in now)if(JSON.stringify(now[i])!==JSON.stringify(old[i]))up[i]=now[i];for(const i in old)if(!(i in now))del.push(i);base[k]=now;if(Object.keys(up).length||del.length){q.push({k,up,del});if(!t)t=setTimeout(push,50)}}
Storage.prototype.setItem=function(k,v){rawSet.call(this,k,v);if(this===LS&&SHARED[k])diff(k,v)};
Storage.prototype.removeItem=function(k){rawRem.call(this,k);if(this===LS&&SHARED[k])diff(k,SHARED[k]==='obj'?'{}':'[]')};
// Note: localStorage.clear() stays local-only (never wipes the server).
window.LCR_SYNC.refresh=function(){fetch(API+'/api/state',{cache:'no-store'}).then(r=>r.json()).then(st=>{if(q.length)return;const before=JSON.stringify(Object.keys(SHARED).map(k=>LS.getItem(k)));adopt(st);const after=JSON.stringify(Object.keys(SHARED).map(k=>LS.getItem(k)));const busy=document.activeElement&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);if(before!==after&&!busy&&typeof window.render==='function')window.render()}).catch(()=>{})};
setInterval(window.LCR_SYNC.refresh,8000);
})();
