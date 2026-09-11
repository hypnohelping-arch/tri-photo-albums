(()=>{
"use strict";
const SHARE_KEY="tri.demoShareLinks.v1";
function getShares(){try{return JSON.parse(localStorage.getItem(SHARE_KEY)||"{}")||{}}catch{return {}}}
function decorate(){const grid=document.querySelector("#albumGrid");if(!grid)return;const shares=getShares();for(const title of grid.querySelectorAll(".album-title")){
  const name=(title.textContent||"").trim();
  const share=shares[name];
  if(!share?.link){
    if(title.dataset.linkified==="1"){title.textContent=name;delete title.dataset.linkified}
    continue;
  }
  if(title.dataset.linkified==="1")continue;
  const a=document.createElement("a");
  a.href=share.link;
  a.target="_blank";
  a.rel="noopener";
  a.textContent=name;
  a.title="Ouvrir l'album partagé";
  a.style.color="inherit";
  a.style.textDecoration="none";
  a.style.cursor="pointer";
  a.addEventListener("mouseenter",()=>a.style.textDecoration="underline");
  a.addEventListener("mouseleave",()=>a.style.textDecoration="none");
  title.textContent="";
  title.appendChild(a);
  title.dataset.linkified="1";
 }
}
function boot(){const grid=document.querySelector("#albumGrid");if(!grid)return;new MutationObserver(decorate).observe(grid,{childList:true,subtree:true});window.addEventListener("storage",decorate);document.querySelectorAll('.tab[data-view="albums"]').forEach(b=>b.addEventListener("click",()=>setTimeout(decorate,50)));decorate()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();