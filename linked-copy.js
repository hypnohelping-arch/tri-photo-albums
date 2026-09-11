(()=>{
"use strict";
const $=s=>document.querySelector(s);
function toast(msg){const t=$("#toast");if(!t)return;t.textContent=msg;t.classList.remove("hidden");clearTimeout(toast._x);toast._x=setTimeout(()=>t.classList.add("hidden"),2300)}
function currentName(){return $("#albumViewTitle")?.textContent?.trim()||"Album"}
function currentSavedLink(){return $("#savedShareLink")?.value?.trim()||""}
async function copyRich(name,link){
  const plain=`${name} - ${link}`;
  const html=`<a href="${link.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">${name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</a>`;
  if(navigator.clipboard?.write && window.ClipboardItem){
    try{
      const item=new ClipboardItem({"text/plain":new Blob([plain],{type:"text/plain"}),"text/html":new Blob([html],{type:"text/html"})});
      await navigator.clipboard.write([item]);
      return true;
    }catch(e){console.warn("Clipboard enrichi indisponible",e)}
  }
  try{await navigator.clipboard.writeText(plain);return false}catch{}
  const ta=document.createElement("textarea");ta.value=plain;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();return false;
}
function syncRows(){
  const name=currentName();
  const saved=currentSavedLink();
  const sr=$("#savedLinkedRow"),sa=$("#savedLinkedName");
  if(sr&&sa){sr.classList.toggle("hidden",!saved);if(saved){sa.textContent=name;sa.href=saved}}
  const out=$("#shareLinkOutput")?.value?.trim()||"";
  const rr=$("#shareLinkedRow"),ra=$("#shareLinkedName");
  if(rr&&ra){rr.classList.toggle("hidden",!out);if(out){ra.textContent=name;ra.href=out}}
}
function boot(){
  const title=$("#albumViewTitle");if(title)new MutationObserver(syncRows).observe(title,{childList:true,subtree:true,characterData:true});
  const saved=$("#savedShareLink");if(saved)new MutationObserver(syncRows).observe(saved,{attributes:true,attributeFilter:["value"]});
  const output=$("#shareLinkOutput");if(output){output.addEventListener("input",syncRows);new MutationObserver(syncRows).observe(output,{attributes:true,attributeFilter:["value"]})}
  $("#btnSavedCopyLinked")?.addEventListener("click",async()=>{const name=currentName(),link=currentSavedLink();if(!link)return;const rich=await copyRich(name,link);toast(rich?"Nom de l'album copié avec lien intégré.":"Copié. Le lien apparaîtra en clair si l'application ne conserve pas les hyperliens.")});
  $("#btnCopyLinkedName")?.addEventListener("click",async()=>{const name=currentName(),link=$("#shareLinkOutput")?.value?.trim()||"";if(!link)return;const rich=await copyRich(name,link);toast(rich?"Nom de l'album copié avec lien intégré.":"Copié. Le lien apparaîtra en clair si l'application ne conserve pas les hyperliens.")});
  document.addEventListener("click",e=>{if(e.target?.id==="btnConfirmShare"||e.target?.id==="btnShareAlbum")setTimeout(syncRows,100)});
  setInterval(syncRows,600);
  syncRows();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();