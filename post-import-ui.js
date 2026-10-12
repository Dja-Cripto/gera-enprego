// Importação direta: selecionar pacote -> Para aprovar, sem revisão lateral.
let importedPackage=null,importedFiles=new Map(),importBusy=false;
function openPostImport(){
 if(importBusy||PS.busy){showToast('Aguarde a operação atual.');return}
 const box=document.querySelector('#import-tools');box.hidden=!box.hidden;if(!box.hidden){document.querySelector('#telegram-chat').value=PS.telegram?.chatId||'';document.querySelector('#telegram-auto').checked=!!PS.telegram?.autoPublish;}if(!box.hidden)box.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function importToolsHtml(){return `<div class="import-toolbar"><label>Publicar em<select id="import-channel"><option value="linkedin">LinkedIn</option><option value="telegram">Telegram</option></select></label><label class="button button-secondary">Selecionar pasta<input id="import-folder" type="file" webkitdirectory multiple hidden></label><label class="button button-secondary">Selecionar ZIP<input id="import-zip" type="file" accept=".zip,application/zip" hidden></label></div><p class="muted small">Posts 01 recebem mídias 01; posts 02 recebem todas as mídias 02. O LEIA-ME pode definir a ordem. Os conteúdos entram direto em Para aprovar.</p><details><summary>Configurar Telegram</summary><div class="form-grid"><label>Token do bot<input id="telegram-token" type="password" autocomplete="new-password"></label><label>Canal ou grupo<input id="telegram-chat" placeholder="@canal ou ID do grupo"></label><label class="full"><input id="telegram-auto" type="checkbox"> Publicar os posts aprovados no horário</label><button id="save-telegram" type="button" class="button button-secondary">Salvar conexão</button><p id="telegram-status" class="full"></p></div></details><p id="import-progress" class="muted small" role="status"></p>`}
async function importFetch(url,options){const res=await fetch(url,options);const d=await res.json();if(!res.ok)throw Error(d.error||'Falha na importação');return d}
async function readPostPackage(files,zip){
 if(importBusy||!files.length)return;importBusy=true;importedPackage=null;importedFiles=new Map();const status=document.querySelector('#import-progress');status.textContent='Associando textos e mídias…';document.querySelectorAll('#import-tools input[type=file]').forEach(i=>i.disabled=true);
 try{
  let d;
  if(zip){if(files[0].size>50*1024*1024)throw Error('O ZIP deve ter até 50 MB.');d=await importFetch('/api/posts/import',{method:'POST',headers:{'Content-Type':'application/zip'},body:files[0]});}
  else{
   if(files.length>250||files.reduce((n,f)=>n+f.size,0)>80*1024*1024)throw Error('Selecione até 250 arquivos e 80 MB.');
   const manifest=[];for(const f of files){const path=f.webkitRelativePath||f.name;if(!/\.(txt|md|jpg|jpeg|png|mp4)$/i.test(path))continue;importedFiles.set(path,f);manifest.push({path,...(/\.(txt|md)$/i.test(path)?{text:await f.text()}:{})})}
   d=await papi('/api/posts/import',{method:'POST',body:{files:manifest}});
  }
  importedPackage=d;const channel=document.querySelector('#import-channel').value;
  const items=d.items.filter(p=>!p.duplicate).map(p=>({channel,hash:p.hash,scheduledFor:p.scheduledFor,media:p.media}));
  if(!items.length){status.textContent='Essas publicações já foram importadas. Elas continuam na lista de posts.';return}
  const paths=[...new Set(items.flatMap(p=>p.media))];let n=0;
  for(const path of paths){const file=importedFiles.get(path);if(file){status.textContent=`Guardando mídias: ${++n} de ${paths.length}…`;await importFetch(`/api/posts/import/${d.batch}/file?path=${encodeURIComponent(path)}`,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:file})}}
  status.textContent='Colocando publicações em Para aprovar…';const result=await papi(`/api/posts/import/${d.batch}/commit`,{method:'POST',body:{items}});
  PS.items.push(...result.items);PS.tab='review';PS.selectedId=result.items[0]?.id;renderPosts();if(typeof render==='function')render();
  status.textContent=`${result.items.length} posts importados com textos e mídias. Edite a data no próprio post, se quiser, e clique em Aprovar.`;document.querySelector('#import-tools').hidden=true;showToast(`${result.items.length} posts prontos para revisar e aprovar.`);
 }catch(e){status.textContent=e.message;showToast(e.message)}finally{importBusy=false;document.querySelectorAll('#import-tools input[type=file]').forEach(i=>{i.disabled=false;i.value=''})}
}
const importTools=document.createElement('section');importTools.id='import-tools';importTools.className='import-tools';importTools.hidden=true;importTools.innerHTML=importToolsHtml();document.querySelector('#posts-app').before(importTools);
document.querySelector('#import-posts')?.addEventListener('click',openPostImport);
document.querySelector('#import-folder').addEventListener('change',e=>readPostPackage([...e.target.files],false));
document.querySelector('#import-zip').addEventListener('change',e=>readPostPackage([...e.target.files],true));
document.querySelector('#save-telegram').addEventListener('click',async()=>{try{const r=await papi('/api/posts/telegram',{method:'POST',body:{token:document.querySelector('#telegram-token').value,chatId:document.querySelector('#telegram-chat').value,autoPublish:document.querySelector('#telegram-auto').checked}});PS.telegram=r;document.querySelector('#telegram-token').value='';document.querySelector('#telegram-status').textContent='Conectado: '+(r.title||r.chatId);}catch(e){document.querySelector('#telegram-status').textContent=e.message}});
