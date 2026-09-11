(()=>{
"use strict";
const $=s=>document.querySelector(s);
const DEMO_SHARE_KEY="tri.demoShareLinks.v1";
const REAL_SHARE_KEY="tri.realShareLinks.v1";
function toast(msg,ms=2800){const t=$("#toast");if(!t)return;t.textContent=msg;t.classList.remove("hidden");clearTimeout(toast._x);toast._x=setTimeout(()=>t.classList.add("hidden"),ms)}
function currentName(){return $("#albumViewTitle")?.textContent?.trim()||"Album"}
function currentSavedLink(){return $("#savedShareLink")?.value?.trim()||""}
function isDemo(){const b=$("#modeBadge");return !!b&&!b.classList.contains("hidden")}
function readStore(key){try{return JSON.parse(localStorage.getItem(key)||"{}")||{}}catch{return {}}}
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
function ensureDeleteButton(){
  const actions=$("#savedSharePanel .share-panel-actions");if(!actions||$("#btnDeleteShare"))return;
  const b=document.createElement("button");b.id="btnDeleteShare";b.type="button";b.className="secondary";b.textContent="Supprimer le lien";b.style.borderColor="#fecaca";b.style.color="#b91c1c";b.style.background="#fff7f7";actions.appendChild(b);b.addEventListener("click",deleteCurrentShare);
}
function syncRealPanel(){
  if(isDemo())return;
  const name=currentName(),rec=readStore(REAL_SHARE_KEY)[name];const panel=$("#savedSharePanel"),input=$("#savedShareLink"),meta=$("#savedShareMeta");if(!panel||!input||!meta)return;
  if(!rec?.link){return}
  input.value=rec.link;const when=rec.created?new Date(rec.created).toLocaleString("fr-FR"):"";meta.textContent=when?`créé le ${when}`:"lien pCloud actif";panel.classList.remove("hidden");
}
function syncRows(){
  syncRealPanel();ensureDeleteButton();
  const name=currentName(),saved=currentSavedLink();const sr=$("#savedLinkedRow"),sa=$("#savedLinkedName");if(sr&&sa){sr.classList.toggle("hidden",!saved);if(saved){sa.textContent=name;sa.href=saved}}
  const out=$("#shareLinkOutput")?.value?.trim()||"";const rr=$("#shareLinkedRow"),ra=$("#shareLinkedName");if(rr&&ra){rr.classList.toggle("hidden",!out);if(out){ra.textContent=name;ra.href=out}}
}
function clearShareUI(){
  const panel=$("#savedSharePanel"),input=$("#savedShareLink"),meta=$("#savedShareMeta");if(input)input.value="";if(meta)meta.textContent="";panel?.classList.add("hidden");$("#savedLinkedRow")?.classList.add("hidden");
  const output=$("#shareLinkOutput");if(output)output.value="";$("#shareResult")?.classList.add("hidden");$("#shareLinkedRow")?.classList.add("hidden");
}
async function deleteCurrentShare(){
  const name=currentName(),link=currentSavedLink();if(!link)return toast("Aucun lien à supprimer.");
  if(isDemo()){
    if(!confirm(`Supprimer le lien de partage « ${name} » de la démonstration ?\n\nAttention : un ancien lien démo déjà copié restera ouvrable, car le mode démo fonctionne sans serveur.`))return;
    removeStoredShare(DEMO_SHARE_KEY,name);clearShareUI();toast("Lien retiré de l'application de démonstration.",4000);return;
  }
  const rec=readStore(REAL_SHARE_KEY)[name];if(!rec?.linkid){toast("Impossible d'identifier ce lien pCloud. Recrée-le une fois depuis cette version avant de le supprimer.",5500);return}
  if(!confirm(`Supprimer le lien public pCloud de « ${name} » ?\n\nLes personnes qui possèdent ce lien ne pourront plus accéder à l'album.`))return;
  const host=localStorage.getItem("tri.host"),token=localStorage.getItem("tri.token");if(!host||!token){toast("Session pCloud absente.");return}
  try{
    const q=new URLSearchParams({linkid:String(rec.linkid)});const r=await fetch(`https://${host}/deletepublink?${q}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});const d=await r.json();if(!r.ok||Number(d.result||0)!==0)throw new Error(d.error||`Erreur pCloud ${d.result||r.status}`);
    removeStoredShare(REAL_SHARE_KEY,name);clearShareUI();toast("Lien pCloud supprimé. Il n'est plus accessible.",4000);
  }catch(e){toast(`Suppression impossible : ${e.message}`,5500)}
}
function installPcloudCapture(){
  if(window.__triShareFetchPatched)return;window.__triShareFetchPatched=true;const nativeFetch=window.fetch.bind(window);
  window.fetch=async(...args)=>{const res=await nativeFetch(...args);try{const u=typeof args[0]==="string"?args[0]:args[0]?.url||"";if(u.includes("/getcollectionpublink")){res.clone().json().then(d=>{if(Number(d.result||0)===0&&d.linkid&&d.link){saveRealShare(currentName(),{link:d.link,linkid:d.linkid,created:Date.now()});setTimeout(syncRows,100)}}).catch(()=>{})}}catch{}return res};
}
function boot(){
  installPcloudCapture();ensureDeleteButton();const v=$(".version");if(v)v.textContent="V1.4";
  const title=$("#albumViewTitle");if(title)new MutationObserver(syncRows).observe(title,{childList:true,subtree:true,characterData:true});
  const saved=$("#savedShareLink");if(saved)new MutationObserver(syncRows).observe(saved,{attributes:true,attributeFilter:["value"]});
  const output=$("#shareLinkOutput");if(output){output.addEventListener("input",syncRows);new MutationObserver(syncRows).observe(output,{attributes:true,attributeFilter:["value"]})}
  $("#btnSavedCopyLinked")?.addEventListener("click",async()=>{const name=currentName(),link=currentSavedLink();if(!link)return;const rich=await copyRich(name,link);toast(rich?"Nom de l'album copié avec lien intégré.":"Copié. Le lien apparaîtra en clair si l'application ne conserve pas les hyperliens.")});
  $("#btnCopyLinkedName")?.addEventListener("click",async()=>{const name=currentName(),link=$("#shareLinkOutput")?.value?.trim()||"";if(!link)return;const rich=await copyRich(name,link);toast(rich?"Nom de l'album copié avec lien intégré.":"Copié. Le lien apparaîtra en clair si l'application ne conserve pas les hyperliens.")});
  document.addEventListener("click",e=>{if(e.target?.id==="btnConfirmShare"||e.target?.id==="btnShareAlbum")setTimeout(syncRows,150)});setInterval(syncRows,600);syncRows();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();