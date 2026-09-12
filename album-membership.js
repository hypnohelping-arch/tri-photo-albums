(()=>{
"use strict";
const $=s=>document.querySelector(s);
const DEMO_ALBUMS_KEY="tri.demoAlbums";
const DEMO_SHARE_KEY="tri.demoShareLinks.v1";
let membership=new Map();
let loading=false;
let lastLoaded=0;
let timer=null;
let lastMode="";

function isDemo(){const b=$("#modeBadge");return !!b&&!b.classList.contains("hidden")}
function mode(){return isDemo()?"demo":"real"}
function readDemoAlbums(){try{const a=JSON.parse(localStorage.getItem(DEMO_ALBUMS_KEY)||"[]");return Array.isArray(a)?a:[]}catch{return []}}
function readObject(key){try{return JSON.parse(localStorage.getItem(key)||"{}")||{}}catch{return {}}}
function toast(msg,ms=3200){const t=$("#toast");if(!t)return;t.textContent=msg;t.classList.remove("hidden");clearTimeout(toast._x);toast._x=setTimeout(()=>t.classList.add("hidden"),ms)}
function add(map,fileid,album){const id=String(fileid||"");if(!id||!album?.name)return;if(!map.has(id))map.set(id,[]);const a=map.get(id);const key=String(album.id??album.name);if(!a.some(x=>String(x.id??x.name)===key))a.push(album)}

function demoMap(){const map=new Map();for(const a of readDemoAlbums()){for(const f of a.items||[])add(map,f.fileid,{id:a.id,name:a.name})}return map}

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
  const out=[];const push=x=>{if(x!==undefined&&x!==null&&String(x)!=="")out.push(String(x))};
  const walk=x=>{if(!x)return;if(Array.isArray(x)){for(const y of x)walk(y);return}if(typeof x!=="object")return;if(x.fileid!==undefined)push(x.fileid);for(const k of ["contents","files","items"]){if(Array.isArray(x[k]))for(const y of x[k])walk(y)}if(Array.isArray(x.fileids))for(const id of x.fileids)push(id);else if(typeof x.fileids==="string")for(const id of x.fileids.split(","))push(id.trim())};
  walk(v);return [...new Set(out)];
}
async function realMap(){
  const map=new Map();const d=await api("collection_list",{showfiles:1,pagesize:1000});const list=d.collections||d.collection||[];
  for(const a of list){
    if(a?.system)continue;const id=a?.id??a?.collectionid;const name=a?.name||"Album";let ids=idsFrom(a);
    if(!ids.length&&id!==undefined){try{const det=await api("collection_details",{collectionid:id});ids=idsFrom(det.collection||det)}catch(e){console.warn("Tri Photo Albums: collection_details",name,e)}}
    for(const fid of ids)add(map,fid,{id,name});
  }
  return map;
}
function injectStyle(){if($("#albumMembershipStyle"))return;const s=document.createElement("style");s.id="albumMembershipStyle";s.textContent=`
.album-memberships{padding:0 8px 9px;display:flex;gap:4px;flex-wrap:wrap;align-items:center;min-height:24px}.album-chip{display:inline-flex;align-items:center;max-width:100%;border-radius:999px;padding:2px 3px 2px 7px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;font-size:10px;font-weight:750;line-height:1.2}.album-chip-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}.album-chip-remove{margin-left:4px;width:19px;height:19px;border:0;border-radius:50%;padding:0;display:grid;place-items:center;background:transparent;color:#047857;font-size:14px;font-weight:900;line-height:1}.album-chip-remove:hover,.album-chip-remove:focus{background:#d1fae5;color:#b91c1c;outline:none}.album-none{font-size:10px;color:#9ca3af;padding:3px 2px}.album-loading{font-size:10px;color:#6b7280;padding:3px 2px}@media(max-width:700px){.album-memberships{padding:0 6px 7px;gap:3px}.album-chip{font-size:9px;padding-left:6px}.album-chip-name{max-width:105px}.album-chip-remove{width:20px;height:20px;font-size:14px}}
`;document.head.appendChild(s)}
function textSpan(cls,text){const s=document.createElement("span");s.className=cls;s.textContent=text;return s}
function decorate(status="ready"){
  const grid=$("#photoGrid");if(!grid)return;
  for(const tile of grid.querySelectorAll('.tile[data-fileid]')){
    const fileid=String(tile.dataset.fileid||"");let box=tile.querySelector(".album-memberships");if(!box){box=document.createElement("div");box.className="album-memberships";tile.appendChild(box)}box.replaceChildren();
    if(status==="loading"){box.appendChild(textSpan("album-loading","Albums…"));continue}
    if(status==="error"){box.appendChild(textSpan("album-none","Albums indisponibles"));continue}
    const albums=membership.get(fileid)||[];
    if(!albums.length){box.appendChild(textSpan("album-none","Hors album"));continue}
    for(const a of albums){
      const chip=document.createElement("span");chip.className="album-chip";chip.title=`Album : ${a.name}`;
      const label=textSpan("album-chip-name",`📚 ${a.name}`);chip.appendChild(label);
      const x=document.createElement("button");x.type="button";x.className="album-chip-remove";x.textContent="×";x.title=`Retirer de l'album « ${a.name} »`;x.setAttribute("aria-label",`Retirer de l'album ${a.name}`);x.dataset.fileid=fileid;x.dataset.albumName=a.name;x.dataset.albumId=a.id??"";chip.appendChild(x);box.appendChild(chip);
    }
  }
}
function removeLocalMembership(fileid,albumId,albumName){const a=membership.get(String(fileid))||[];membership.set(String(fileid),a.filter(x=>String(x.id??"")!==String(albumId??"")||(albumId===""&&x.name!==albumName)));if(!(membership.get(String(fileid))||[]).length)membership.delete(String(fileid));decorate()}
function invalidateDemoShare(albumName){const shares=readObject(DEMO_SHARE_KEY);if(shares[albumName]){delete shares[albumName];localStorage.setItem(DEMO_SHARE_KEY,JSON.stringify(shares));return true}return false}
async function removeFromAlbum(fileid,albumId,albumName){
  if(!fileid||!albumName)return;
  if(!confirm(`Retirer cette photo/vidéo de l'album « ${albumName} » ?\n\nLe fichier original ne sera ni supprimé, ni déplacé, ni renommé, ni modifié.`))return;
  if(isDemo()){
    const albums=readDemoAlbums();const a=albums.find(x=>String(x.id)===String(albumId))||albums.find(x=>x.name===albumName);if(!a)return toast("Album de démonstration introuvable.");
    a.items=(a.items||[]).filter(x=>String(x.fileid)!==String(fileid));localStorage.setItem(DEMO_ALBUMS_KEY,JSON.stringify(albums));const stale=invalidateDemoShare(albumName);removeLocalMembership(fileid,albumId,albumName);lastLoaded=Date.now();toast(stale?`Retiré de « ${albumName} ». Original inchangé. Le lien démo a été retiré car il représentait l'ancienne version.`:`Retiré de « ${albumName} ». Le fichier original est inchangé.`,5200);return;
  }
  if(albumId==="")return toast("Impossible d'identifier cet album pCloud.",4500);
  try{await api("collection_unlinkfiles",{collectionid:albumId,fileids:fileid});removeLocalMembership(fileid,albumId,albumName);lastLoaded=Date.now();toast(`Retiré de « ${albumName} ». Le fichier original pCloud est inchangé.`,4200)}catch(e){toast(`Retrait impossible : ${e.message}`,5500)}
}
async function refresh(force=false){
  const m=mode();if(m!==lastMode){force=true;lastMode=m;lastLoaded=0}if(loading)return;if(!force&&Date.now()-lastLoaded<15000){decorate();return}
  loading=true;decorate("loading");try{membership=m==="demo"?demoMap():await realMap();lastLoaded=Date.now();decorate()}catch(e){console.warn("Tri Photo Albums: appartenance albums",e);decorate("error")}finally{loading=false}
}
function schedule(force=false){clearTimeout(timer);timer=setTimeout(()=>refresh(force),120)}
function boot(){
  injectStyle();const v=$(".version");if(v)v.textContent="V1.7";
  const grid=$("#photoGrid");if(grid)new MutationObserver(muts=>{if(muts.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&!n.classList?.contains("album-memberships"))))schedule(false)}).observe(grid,{childList:true});
  document.addEventListener("click",e=>{
    const remove=e.target?.closest?.(".album-chip-remove");if(remove){e.preventDefault();e.stopPropagation();removeFromAlbum(remove.dataset.fileid,remove.dataset.albumId,remove.dataset.albumName);return}
    const id=e.target?.id||"";if(["btnConfirmCreateAlbum","btnConfirmAdd","btnRemoveAlbumItems","btnRefreshAlbums"].includes(id))setTimeout(()=>schedule(true),500);if(id==="btnRefresh")setTimeout(()=>schedule(true),300);if(e.target?.closest?.('.tab[data-view="photos"]'))setTimeout(()=>schedule(true),200);
  });
  window.addEventListener("storage",e=>{if(e.key===DEMO_ALBUMS_KEY)schedule(true)});schedule(true);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();