(()=>{
"use strict";
const $=s=>document.querySelector(s);
function safeBase(name){return String(name||"Album").normalize("NFC").replace(/[\\/:*?"<>|]+/g,"-").trim().replace(/\s+/g,"_").replace(/^\.+|\.+$/g,"")||"Album"}
function extension(name,type=""){const m=String(name||"").match(/(\.[A-Za-z0-9]{1,8})$/);if(m)return m[1].toLowerCase();if(type.startsWith("video/"))return ".mp4";return ".jpg"}
function virtualName(album,original,index,type=""){return `${safeBase(album)}_${index+1}${extension(original,type)}`}
function injectStyle(){if($("#virtualNameStyle"))return;const s=document.createElement("style");s.id="virtualNameStyle";s.textContent=`
.virtual-name-note{font-size:10px;color:#6b7280;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.download-choice{margin:16px 0;padding:12px;border:1px solid #d1d5db;border-radius:12px;background:#f8fafc}.download-choice-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.download-choice strong{font-size:13px}.download-choice select{width:auto;min-width:150px;margin:0}.download-choice .hint{margin:7px 0 0}@media(max-width:600px){.download-choice-row{align-items:stretch;flex-direction:column}.download-choice select{width:100%}}
`;document.head.appendChild(s)}
function ensureDownloadOption(){
  const hint=$("#shareHint");if(!hint||$("#shareDownloadAllowed"))return;
  const wrap=document.createElement("div");wrap.className="download-choice";wrap.innerHTML=`<div class="download-choice-row"><strong>Téléchargement</strong><select id="shareDownloadAllowed"><option value="yes">Autorisé</option><option value="no">Non autorisé</option></select></div><p class="hint">Les noms téléchargés suivront le modèle Nom_de_l_album_1, Nom_de_l_album_2…</p>`;hint.parentNode.insertBefore(wrap,hint);
}
function albumName(){return $("#albumViewTitle")?.textContent?.trim()||"Album"}
function decorateAlbum(){
  const grid=$("#albumViewGrid");if(!grid)return;const album=albumName();const tiles=[...grid.querySelectorAll(".tile")];
  tiles.forEach((tile,i)=>{const info=tile.querySelector(".tile-info"),img=tile.querySelector("img[data-thumb-fileid]");if(!info||!img)return;if(!info.dataset.originalName)info.dataset.originalName=info.textContent.trim();const original=info.dataset.originalName;const isVideo=!!tile.querySelector(".video-badge");const vn=virtualName(album,original,i,isVideo?"video/mp4":"image/jpeg");info.textContent=vn;info.title=`Nom virtuel : ${vn} — original pCloud : ${original}`;let note=tile.querySelector(".virtual-name-note");if(!note){note=document.createElement("div");note.className="virtual-name-note";info.insertAdjacentElement("afterend",note)}note.textContent=`original : ${original}`;note.title=original;img.dataset.virtualName=vn;img.dataset.originalName=original})
}
function decorateViewer(){
  const dlg=$("#albumViewDialog"),cap=$("#viewerCaption");if(!dlg?.open||!cap)return;const m=cap.textContent.match(/•\s*(\d+)\/(\d+)\s*$/);if(!m)return;const idx=Number(m[1])-1;const img=[...document.querySelectorAll("#albumViewGrid img[data-virtual-name]")][idx];if(!img)return;const wanted=`${img.dataset.virtualName} • ${m[1]}/${m[2]}`;if(cap.textContent!==wanted)cap.textContent=wanted
}
function syncHint(){const hint=$("#shareHint");if(!hint)return;const b=$("#modeBadge"),demo=!!b&&!b.classList.contains("hidden");if(demo)hint.textContent="Mode démonstration : l’option de téléchargement est appliquée au lien partagé.";else hint.textContent="Mode pCloud : les noms restent virtuels. Le téléchargement renommé exact devra être validé avec l’API pCloud avant activation réelle."}
function boot(){
  injectStyle();ensureDownloadOption();const v=$(".version");if(v)v.textContent="V1.8";
  const grid=$("#albumViewGrid");if(grid)new MutationObserver(()=>setTimeout(decorateAlbum,0)).observe(grid,{childList:true,subtree:true});
  const title=$("#albumViewTitle");if(title)new MutationObserver(()=>setTimeout(decorateAlbum,0)).observe(title,{childList:true,subtree:true,characterData:true});
  const cap=$("#viewerCaption");if(cap)new MutationObserver(decorateViewer).observe(cap,{childList:true,subtree:true,characterData:true});
  document.addEventListener("click",e=>{if(e.target?.id==="btnShareAlbum")setTimeout(()=>{ensureDownloadOption();syncHint()},20)});
  setInterval(()=>{ensureDownloadOption();decorateAlbum();syncHint()},800);decorateAlbum();syncHint();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();