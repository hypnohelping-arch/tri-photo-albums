(()=>{
"use strict";
const $=s=>document.querySelector(s);
const DEMO_SHARE_KEY="tri.demoShareLinks.v1";
const DEMO_ALBUMS_KEY="tri.demoAlbums";
const REAL_SHARE_KEY="tri.realShareLinks.v1";
const albumSelected=new Set();
function toast(msg,ms=2800){const t=$("#toast");if(!t)return;t.textContent=msg;t.classList.remove("hidden");clearTimeout(toast._x);toast._x=setTimeout(()=>t.classList.add("hidden"),ms)}
function currentName(){return $("#albumViewTitle")?.textContent?.trim()||"Album"}
function currentSavedLink(){return $("#savedShareLink")?.value?.trim()||""}
function isDemo(){const b=$("#modeBadge");return !!b&&!b.classList.contains("hidden")}
function readStore(key){try{return JSON.parse(localStorage.getItem(key)||"{}")||{}}catch{return {}}}
function readArray(key){try{const v=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(v)?v:[]}catch{return []}}
function writeStore(key,value){localStorage.setItem(key,JSON.stringify(value))}
function saveRealShare(name,rec){const all=readStore(REAL_SHARE_KEY);all[name]={...(all[name]||{}),...rec};writeStore(REAL_SHARE_KEY,all)}
function removeStoredShare(key,name){const all=readStore(key);delete all[name];writeStore(key,all)}
async function copyRich(name,link){
  const plain=`${name} - ${link}`;
  const html=`<a href="${link.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">${name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</a>`;
  if(navigator.clipboard?.write&&window.ClipboardItem){
    try{const item=new ClipboardItem({"text/plain":new Blob([plain],{type:"text/plain"}),"text/html":new Blob([html],{type:"text/html"})});await navigator.clipboard.write([item]);return true}catch(e){console.warn("Clipboard enrichi indisponible",e)}
  }
  try{await navigator.clipboard.writeText(plain);return false}catch{}
  const ta=document.createElement("textarea");ta.value=plain;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();return false;
}
function injectAlbumEditStyles(){if($("#triAlbumEditStyle"))return;const s=document.createElement("style");s.id="triAlbumEditStyle";s.textContent=`
#albumSelectionBar{margin:12px 0;position:sticky;top:0;z-index:4}.album-remove-check{position:absolute;top:8px;left:8px;z-index:5;width:30px;height:30px;border-radius:50%;border:2px solid #fff;background:rgba(17,24,39,.58);color:transparent;font-weight:900;display:grid;place-items:center;box-shadow:0 1px 5px #0003}.tile.album-picked .album-remove-check{background:#0f766e;color:#fff}.tile.album-picked{outline:3px solid rgba(15,118,110,.35);outline-offset:-3px}#btnRemoveAlbumItems{border-color:#fecaca;color:#b91c1c;background:#fff7f7}.album-safety{font-size:12px;color:#6b7280;margin-top:5px}`;document.head.appendChild(s)}
function ensureAlbumSelectionBar(){
  const grid=$("#albumViewGrid");if(!grid)return;if($("#albumSelectionBar"))return;
  const bar=document.createElement("div");bar.id="albumSelectionBar";bar.className="selection-bar hidden";bar.innerHTML=`<div><strong id="albumSelectionCount">0</strong> sélectionné(s)<div class="album-safety">Retirer de l'album ne supprime jamais les fichiers originaux.</div></div><div class="selection-actions"><button id="btnRemoveAlbumItems" class="secondary" type="button">Retirer de l'album</button><button id="btnClearAlbumSelection" class="ghost" type="button">Annuler</button></div>`;
  grid.parentNode.insertBefore(bar,grid);$("#btnClearAlbumSelection").onclick=clearAlbumSelection;$("#btnRemoveAlbumItems").onclick=removeSelectedFromAlbum;
}
function syncAlbumSelection(){ensureAlbumSelectionBar();const bar=$("#albumSelectionBar"),count=$("#albumSelectionCount");if(count)count.textContent=albumSelected.size;if(bar)bar.classList.toggle("hidden",albumSelected.size===0);document.querySelectorAll("#albumViewGrid .tile[data-album-fileid]").forEach(t=>t.classList.toggle("album-picked",albumSelected.has(t.dataset.albumFileid)))}
function clearAlbumSelection(){albumSelected.clear();syncAlbumSelection()}
function decorateAlbumTiles(){
  ensureAlbumSelectionBar();const grid=$("#albumViewGrid");if(!grid)return;
  grid.querySelectorAll(".tile").forEach(tile=>{const img=tile.querySelector("img[data-thumb-fileid]");if(!img)return;const id=String(img.dataset.thumbFileid||"");if(!id)return;tile.dataset.albumFileid=id;if(tile.querySelector(".album-remove-check"))return;const b=document.createElement("button");b.type="button";b.className="album-remove-check";b.textContent="✓";b.title="Sélectionner pour retirer de l'album";b.setAttribute("aria-label","Sélectionner pour retirer de l'album");b.onclick=e=>{e.preventDefault();e.stopPropagation();albumSelected.has(id)?albumSelected.delete(id):albumSelected.add(id);syncAlbumSelection()};tile.appendChild(b)});
  syncAlbumSelection();
}
async function pcloudApi(method,params={}){const host=localStorage.getItem("tri.host"),token=localStorage.getItem("tri.token");if(!host||!token)throw new Error("Session pCloud absente");const q=new URLSearchParams(params);const r=await fetch(`https://${host}/${method}?${q}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});let d={};try{d=await r.json()}catch{}if(!r.ok||Number(d.result||0)!==0)throw new Error(d.error||`Erreur pCloud ${d.result||r.status}`);return d}
async function resolveCollectionId(name){const d=await pcloudApi("collection_list",{showfiles:0,pagesize:1000});const list=d.collections||d.collection||[];const a=list.find(x=>!x.system&&x.name===name);if(!a?.id)throw new Error("Album pCloud introuvable");return a.id}
function updateAlbumUIAfterRemoval(ids){
  for(const id of ids){document.querySelector(`#albumViewGrid .tile[data-album-fileid="${CSS.escape(id)}"]`)?.remove()}
  albumSelected.clear();const n=$("#albumViewGrid")?.querySelectorAll(".tile").length||0;const meta=$("#albumViewMeta");if(meta)meta.textContent=`${n} élément(s)`;syncAlbumSelection();
}
async function removeSelectedFromAlbum(){
  if(!albumSelected.size)return;const ids=[...albumSelected],name=currentName();const n=ids.length;
  if(!confirm(`Retirer ${n} photo(s)/vidéo(s) de l'album « ${name} » ?\n\nLes fichiers originaux ne seront ni supprimés, ni déplacés, ni renommés, ni modifiés.`))return;
  if(isDemo()){
    const albums=readArray(DEMO_ALBUMS_KEY);const a=albums.find(x=>x.name===name);if(!a)return toast("Album de démonstration introuvable.",4500);const set=new Set(ids.map(String));a.items=(a.items||[]).filter(x=>!set.has(String(x.fileid)));localStorage.setItem(DEMO_ALBUMS_KEY,JSON.stringify(albums));
    const hadShare=!!readStore(DEMO_SHARE_KEY)[name];if(hadShare){removeStoredShare(DEMO_SHARE_KEY,name);clearShareUI()}
    updateAlbumUIAfterRemoval(ids);toast(hadShare?`${n} élément(s) retiré(s). Originaux inchangés. Le lien démo a été retiré car il représentait l'ancienne version de l'album.`:`${n} élément(s) retiré(s) de l'album. Originaux inchangés.`,5200);return;
  }
  try{const id=await resolveCollectionId(name);await pcloudApi("collection_unlinkfiles",{collectionid:id,fileids:ids.join(",")});updateAlbumUIAfterRemoval(ids);toast(`${n} élément(s) retiré(s) de l'album pCloud. Les fichiers originaux sont inchangés.`,4500)}catch(e){toast(`Retrait impossible : ${e.message}`,5500)}
}
function ensureDeleteButton(){
  const actions=$("#savedSharePanel .share-panel-actions");if(!actions||$("#btnDeleteShare"))return;
  const b=document.createElement("button");b.id="btnDeleteShare";b.type="button";b.className="secondary";b.textContent="Supprimer le lien";b.style.borderColor="#fecaca";b.style.color="#b91c1c";b.style.background="#fff7f7";actions.appendChild(b);b.addEventListener("click",deleteCurrentShare);
}
function syncRealPanel(){
  if(isDemo())return;
  const name=currentName(),rec=readStore(REAL_SHARE_KEY)[name];const panel=$("#savedSharePanel"),input=$("#savedShareLink"),meta=$("#savedShareMeta");if(!panel||!input||!meta)return;if(!rec?.link)return;input.value=rec.link;const when=rec.created?new Date(rec.created).toLocaleString("fr-FR"):"";meta.textContent=when?`créé le ${when}`:"lien pCloud actif";panel.classList.remove("hidden");
}
function syncRows(){
  syncRealPanel();ensureDeleteButton();decorateAlbumTiles();
  const name=currentName(),saved=currentSavedLink();const sr=$("#savedLinkedRow"),sa=$("#savedLinkedName");if(sr&&sa){sr.classList.toggle("hidden",!saved);if(saved){sa.textContent=name;sa.href=saved}}
  const out=$("#shareLinkOutput")?.value?.trim()||"";const rr=$("#shareLinkedRow"),ra=$("#shareLinkedName");if(rr&&ra){rr.classList.toggle("hidden",!out);if(out){ra.textContent=name;ra.href=out}}
}
function clearShareUI(){
  const panel=$("#savedSharePanel"),input=$("#savedShareLink"),meta=$("#savedShareMeta");if(input)input.value="";if(meta)meta.textContent="";panel?.classList.add("hidden");$("#savedLinkedRow")?.classList.add("hidden");const output=$("#shareLinkOutput");if(output)output.value="";$("#shareResult")?.classList.add("hidden");$("#shareLinkedRow")?.classList.add("hidden");
}
async function deleteCurrentShare(){
  const name=currentName(),link=currentSavedLink();if(!link)return toast("Aucun lien à supprimer.");
  if(isDemo()){
    if(!confirm(`Supprimer le lien de partage « ${name} » de la démonstration ?\n\nAttention : un ancien lien démo déjà copié restera ouvrable, car le mode démo fonctionne sans serveur.`))return;removeStoredShare(DEMO_SHARE_KEY,name);clearShareUI();toast("Lien retiré de l'application de démonstration.",4000);return;
  }
  const rec=readStore(REAL_SHARE_KEY)[name];if(!rec?.linkid){toast("Impossible d'identifier ce lien pCloud. Recrée-le une fois depuis cette version avant de le supprimer.",5500);return}
  if(!confirm(`Supprimer le lien public pCloud de « ${name} » ?\n\nLes personnes qui possèdent ce lien ne pourront plus accéder à l'album.`))return;
  try{await pcloudApi("deletepublink",{linkid:String(rec.linkid)});removeStoredShare(REAL_SHARE_KEY,name);clearShareUI();toast("Lien pCloud supprimé. Il n'est plus accessible.",4000)}catch(e){toast(`Suppression impossible : ${e.message}`,5500)}
}
function installPcloudCapture(){
  if(window.__triShareFetchPatched)return;window.__triShareFetchPatched=true;const nativeFetch=window.fetch.bind(window);
  window.fetch=async(...args)=>{const res=await nativeFetch(...args);try{const u=typeof args[0]==="string"?args[0]:args[0]?.url||"";if(u.includes("/getcollectionpublink")){res.clone().json().then(d=>{if(Number(d.result||0)===0&&d.linkid&&d.link){saveRealShare(currentName(),{link:d.link,linkid:d.linkid,created:Date.now()});setTimeout(syncRows,100)}}).catch(()=>{})}}catch{}return res};
}
function boot(){
  injectAlbumEditStyles();installPcloudCapture();ensureDeleteButton();ensureAlbumSelectionBar();const v=$(".version");if(v)v.textContent="V1.5";
  const grid=$("#albumViewGrid");if(grid)new MutationObserver(()=>{clearAlbumSelection();setTimeout(decorateAlbumTiles,0)}).observe(grid,{childList:true});
  const dlg=$("#albumViewDialog");dlg?.addEventListener("close",clearAlbumSelection);
  const title=$("#albumViewTitle");if(title)new MutationObserver(syncRows).observe(title,{childList:true,subtree:true,characterData:true});
  const saved=$("#savedShareLink");if(saved)new MutationObserver(syncRows).observe(saved,{attributes:true,attributeFilter:["value"]});
  const output=$("#shareLinkOutput");if(output){output.addEventListener("input",syncRows);new MutationObserver(syncRows).observe(output,{attributes:true,attributeFilter:["value"]})}
  $("#btnSavedCopyLinked")?.addEventListener("click",async()=>{const name=currentName(),link=currentSavedLink();if(!link)return;const rich=await copyRich(name,link);toast(rich?"Nom de l'album copié avec lien intégré.":"Copié. Le lien apparaîtra en clair si l'application ne conserve pas les hyperliens.")});
  $("#btnCopyLinkedName")?.addEventListener("click",async()=>{const name=currentName(),link=$("#shareLinkOutput")?.value?.trim()||"";if(!link)return;const rich=await copyRich(name,link);toast(rich?"Nom de l'album copié avec lien intégré.":"Copié. Le lien apparaîtra en clair si l'application ne conserve pas les hyperliens.")});
  document.addEventListener("click",e=>{if(e.target?.id==="btnConfirmShare"||e.target?.id==="btnShareAlbum")setTimeout(syncRows,150)});setInterval(syncRows,700);syncRows();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();