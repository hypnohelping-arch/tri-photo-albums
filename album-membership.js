(()=>{
"use strict";
const $=s=>document.querySelector(s);
const DEMO_ALBUMS_KEY="tri.demoAlbums";
let membership=new Map();
let loading=false;
let lastLoaded=0;
let timer=null;
let lastMode="";

function isDemo(){const b=$("#modeBadge");return !!b&&!b.classList.contains("hidden")}
function mode(){return isDemo()?"demo":"real"}
function readDemoAlbums(){try{const a=JSON.parse(localStorage.getItem(DEMO_ALBUMS_KEY)||"[]");return Array.isArray(a)?a:[]}catch{return []}}
function add(map,id,name){id=String(id||"");name=String(name||"").trim();if(!id||!name)return;if(!map.has(id))map.set(id,[]);const a=map.get(id);if(!a.includes(name))a.push(name)}

function demoMap(){const map=new Map();for(const a of readDemoAlbums()){for(const f of a.items||[])add(map,f.fileid,a.name)}return map}

async function api(method,params={}){
  const host=localStorage.getItem("tri.host"),token=localStorage.getItem("tri.token");
  if(!host||!token)throw new Error("Session pCloud absente");
  const q=new URLSearchParams(params);
  const r=await fetch(`https://${host}/${method}?${q}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
  let d={};try{d=await r.json()}catch{}
  if(!r.ok||Number(d.result||0)!==0)throw new Error(d.error||`Erreur pCloud ${d.result||r.status}`);
  return d;
}
function idsFrom(v){
  const out=[];
  const push=x=>{if(x!==undefined&&x!==null&&String(x)!=="")out.push(String(x))};
  const walk=x=>{
    if(!x)return;
    if(Array.isArray(x)){for(const y of x)walk(y);return}
    if(typeof x!=="object")return;
    if(x.fileid!==undefined)push(x.fileid);
    for(const k of ["contents","files","items"]){if(Array.isArray(x[k]))for(const y of x[k])walk(y)}
    if(Array.isArray(x.fileids))for(const id of x.fileids)push(id);
    else if(typeof x.fileids==="string")for(const id of x.fileids.split(","))push(id.trim());
  };
  walk(v);return [...new Set(out)];
}
async function realMap(){
  const map=new Map();
  const d=await api("collection_list",{showfiles:1,pagesize:1000});
  const list=d.collections||d.collection||[];
  for(const a of list){
    if(a?.system)continue;
    const id=a?.id??a?.collectionid;
    const name=a?.name||"Album";
    let ids=idsFrom(a);
    if(!ids.length&&id!==undefined){
      try{const det=await api("collection_details",{collectionid:id});ids=idsFrom(det.collection||det)}catch(e){console.warn("Tri Photo Albums: collection_details",name,e)}
    }
    for(const fid of ids)add(map,fid,name);
  }
  return map;
}
function injectStyle(){if($("#albumMembershipStyle"))return;const s=document.createElement("style");s.id="albumMembershipStyle";s.textContent=`
.album-memberships{padding:0 8px 9px;display:flex;gap:4px;flex-wrap:wrap;align-items:center;min-height:24px}.album-chip{display:inline-flex;align-items:center;max-width:100%;border-radius:999px;padding:3px 7px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;font-size:10px;font-weight:750;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.album-none{font-size:10px;color:#9ca3af;padding:3px 2px}.album-loading{font-size:10px;color:#6b7280;padding:3px 2px}@media(max-width:700px){.album-memberships{padding:0 6px 7px;gap:3px}.album-chip{font-size:9px;padding:3px 6px}}
`;document.head.appendChild(s)}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function decorate(status="ready"){
  const grid=$("#photoGrid");if(!grid)return;
  for(const tile of grid.querySelectorAll('.tile[data-fileid]')){
    const id=String(tile.dataset.fileid||"");
    let box=tile.querySelector(".album-memberships");if(!box){box=document.createElement("div");box.className="album-memberships";tile.appendChild(box)}
    if(status==="loading"){box.innerHTML='<span class="album-loading">Albums…</span>';continue}
    if(status==="error"){box.innerHTML='<span class="album-none">Albums indisponibles</span>';continue}
    const names=membership.get(id)||[];
    if(!names.length){box.innerHTML='<span class="album-none">Hors album</span>';continue}
    box.innerHTML=names.map(n=>`<span class="album-chip" title="Album : ${esc(n)}">📚 ${esc(n)}</span>`).join("");
  }
}
async function refresh(force=false){
  const m=mode();
  if(m!==lastMode){force=true;lastMode=m;lastLoaded=0}
  if(loading)return;
  if(!force&&Date.now()-lastLoaded<15000){decorate();return}
  loading=true;decorate("loading");
  try{membership=m==="demo"?demoMap():await realMap();lastLoaded=Date.now();decorate()}catch(e){console.warn("Tri Photo Albums: appartenance albums",e);decorate("error")}finally{loading=false}
}
function schedule(force=false){clearTimeout(timer);timer=setTimeout(()=>refresh(force),120)}
function boot(){
  injectStyle();const v=$(".version");if(v)v.textContent="V1.6";
  const grid=$("#photoGrid");if(grid)new MutationObserver(muts=>{if(muts.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&!n.classList?.contains("album-memberships"))))schedule(false)}).observe(grid,{childList:true});
  document.addEventListener("click",e=>{
    const id=e.target?.id||"";
    if(["btnConfirmCreateAlbum","btnConfirmAdd","btnRemoveAlbumItems","btnRefreshAlbums"].includes(id))setTimeout(()=>schedule(true),500);
    if(id==="btnRefresh")setTimeout(()=>schedule(true),300);
    if(e.target?.closest?.('.tab[data-view="photos"]'))setTimeout(()=>schedule(true),200);
  });
  window.addEventListener("storage",e=>{if(e.key===DEMO_ALBUMS_KEY)schedule(true)});
  schedule(true);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();