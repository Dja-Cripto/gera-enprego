// Publicações: entrevista, check-in semanal, pauta automática, imagens e publicação assistida.
const PS={loaded:false,items:[],voice:{},interview:{},stories:[],diary:[],questions:{interview:[],checkin:[]},pillars:[],dayNames:[],ai:{},pexels:false,email:{},signals:{},
  tab:"review",selectedId:null,busy:"",photos:{},error:null};
const POST_TABS=[
  {key:"review",label:"Para aprovar",test:p=>p.status==="draft"},
  {key:"scheduled",label:"Agendados",test:p=>p.status==="approved"},
  {key:"published",label:"Publicados",test:p=>p.status==="published"},
  {key:"stories",label:"Banco de histórias"},
  {key:"interview",label:"Entrevista"},
  {key:"checkin",label:"Check-in da semana"}];
const POST_STATUS={draft:"Para aprovar",approved:"Agendado",published:"Publicado",skipped:"Descartado"};
const pillarLabel=k=>PS.pillars.find(p=>p.key===k)?.label||k;
window.postsPendingCount=()=>PS.items.filter(p=>p.status==="draft").length;
window.postsUpcoming=()=>PS.items.filter(p=>["draft","approved"].includes(p.status)&&Date.parse(p.scheduledFor)>Date.now()-6*3600000).sort((a,b)=>a.scheduledFor.localeCompare(b.scheduledFor));

async function papi(path,opts={}){
  const r=await fetch(path,{...opts,headers:{"Content-Type":"application/json"},body:opts.body&&typeof opts.body!=="string"?JSON.stringify(opts.body):opts.body});
  let d={};try{d=await r.json()}catch{}
  if(!r.ok)throw Error(d.error||`Erro ${r.status}`);return d;
}
async function loadPosts(){
  try{const d=await papi("/api/posts");Object.assign(PS,d,{items:d.items||[],loaded:true,error:null})}
  catch{PS.loaded=true;PS.error="O servidor do Radar não respondeu. Abra pelo iniciar-radar.bat para usar Publicações."}
  renderPosts();renderAiPanel();renderVoicePanel();if(typeof render==="function")render();
}
function currentProfile(){try{return typeof profile!=="undefined"?profile:null}catch{return null}}
function whenText(iso){if(!iso)return "";const d=new Date(iso);return d.toLocaleString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).replace(/\./g,"")}
function localInput(iso){if(!iso)return "";const d=new Date(iso);const off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,16)}
function answeredCount(){return PS.questions.interview.filter(q=>(PS.interview[q.key]||"").trim()).length}

// ---------- Tela ----------
function renderPosts(){
  const root=document.querySelector("#posts-app");if(!root)return;
  if(!PS.loaded){root.innerHTML='<p class="muted">Carregando…</p>';return}
  if(PS.error){root.innerHTML=`<p class="notice">${escapeHtml(PS.error)}</p>`;return}
  const planBtn=document.querySelector("#plan-posts");if(planBtn){planBtn.disabled=!!PS.busy;planBtn.querySelector("span").textContent=PS.busy==="plan"?"Escrevendo os posts…":"Gerar posts da semana"}
  const counts=Object.fromEntries(POST_TABS.map(t=>[t.key,t.test?PS.items.filter(t.test).length:t.key==="stories"?PS.stories.filter(s=>!s.archived).length:t.key==="interview"?`${answeredCount()}/${PS.questions.interview.length}`:""]));
  let body="";
  if(PS.tab==="interview")body=interviewHtml();
  else if(PS.tab==="checkin")body=checkinHtml();
  else if(PS.tab==="stories")body=storiesHtml();
  else{
    const t=POST_TABS.find(x=>x.key===PS.tab);
    const list=PS.items.filter(t.test).sort((a,b)=>PS.tab==="published"?String(b.publishedAt).localeCompare(String(a.publishedAt)):a.scheduledFor.localeCompare(b.scheduledFor));
    if(!list.some(p=>p.id===PS.selectedId))PS.selectedId=list[0]?.id||null;
    const post=PS.items.find(p=>p.id===PS.selectedId);
    body=`<div class="split">
      <div class="list-col"><p class="list-count">${list.length} ${list.length===1?"post":"posts"}</p><div class="job-list">${list.length?list.map(postItemHtml).join(""):empty(PS.tab==="review"?"Nada para aprovar":"Nada por aqui",PS.tab==="review"?(PS.ai.configured?"Clique em Gerar posts da semana ou espere o robô preparar a próxima.":"Conecte a IA em Meu perfil para o robô escrever os posts."):"Os posts aparecem aqui conforme você aprova e publica.")}</div></div>
      <article class="detail-col" id="post-detail" aria-live="polite">${post?postDetailHtml(post):'<div class="empty"><strong>Selecione um post</strong><span>O texto e a imagem aparecem aqui.</span></div>'}</article>
    </div>`;
  }
  root.innerHTML=`${setupHtml()}
    <p id="posts-status" class="notice" role="status" aria-live="polite" hidden></p>
    <div class="filters"><div class="chips" role="tablist">${POST_TABS.map(t=>`<button class="chip${PS.tab===t.key?" active":""}" role="tab" aria-selected="${PS.tab===t.key}" data-post-tab="${t.key}">${t.label}${counts[t.key]!==""?`<span>${counts[t.key]}</span>`:""}</button>`).join("")}</div></div>
    ${body}`;
  drawCardPreview();
}
function setupHtml(){
  const steps=[
    {done:PS.ai.configured,label:"Conectar a IA",detail:"Cole a chave do OpenCode Go em Meu perfil.",action:'<button class="link" data-view="settings">Abrir Meu perfil</button>'},
    {done:answeredCount()>=5,label:"Responder a entrevista inicial",detail:`${answeredCount()} de ${PS.questions.interview.length} respondidas. Uma vez só; pode ser por áudio.`,action:'<button class="link" data-post-tab="interview">Responder</button>'},
    {done:PS.stories.length>0,label:"Montar o banco de histórias",detail:"A IA transforma o currículo e a entrevista em pautas.",action:'<button class="link" data-post-tab="interview">Montar</button>'},
    {done:!!PS.voice.updatedAt||!!PS.voice.audience&&PS.voice.audience!=="Recrutadores de tecnologia e dados; donos de pequenas empresas em Feira de Santana"||!!PS.voice.examples,label:"Ajustar a sua voz",detail:"Público, tom, dias e horários.",action:'<button class="link" data-view="settings" data-scroll="voice-panel-title">Ajustar</button>'},
    {done:PS.email.configured,label:"Receber os posts por e-mail (opcional)",detail:"Na hora de publicar, o post chega no seu e-mail pronto para copiar.",action:'<button class="link" data-view="settings" data-scroll="email-panel-title">Configurar</button>'}];
  if(steps.slice(0,3).every(s=>s.done))return autoSummaryHtml();
  return `<div class="setup-card"><h2>Deixe o robô cuidar do seu LinkedIn</h2><p class="muted">Depois destes passos, o Radar escreve os posts da semana sozinho e te avisa na hora de publicar. Você só aprova.</p>
    <ol class="setup-steps">${steps.map(s=>`<li class="${s.done?"done":""}"><span class="setup-dot">${s.done?icon("check"):""}</span><div><strong>${s.label}</strong><span class="muted small">${s.detail}</span></div>${s.done?"":s.action}</li>`).join("")}</ol></div>`;
}
function autoSummaryHtml(){
  const v=PS.voice;const next=window.postsUpcoming()[0];
  const days=(v.days||[]).map(d=>PS.dayNames[d]?.slice(0,3).toLowerCase()).join(", ");
  return `<div class="camp-summary">
    <div><span class="kicker">Ritmo</span><strong>${v.postsPerWeek||3} por semana</strong><span class="muted small">${escapeHtml(days)} às ${escapeHtml(v.time||"08:30")}</span></div>
    <div><span class="kicker">Próximo post</span><strong>${next?escapeHtml(whenText(next.scheduledFor)):"—"}</strong><span class="muted small">${next?escapeHtml(POST_STATUS[next.status]):"Nenhum planejado"}</span></div>
    <div><span class="kicker">Piloto automático</span><strong>${v.autoPlan?"Ligado":"Desligado"}</strong><span class="muted small">${v.autoPlan?(v.autoApprove?"escreve e aprova sozinho":"escreve; você aprova"):"você gera quando quiser"}</span></div>
    <div><span class="kicker">Banco de histórias</span><strong>${PS.stories.filter(s=>!s.archived).length} pautas</strong><span class="muted small">${PS.stories.filter(s=>!s.archived&&!s.used).length} ainda não usadas</span></div>
  </div>`;
}
function postItemHtml(p){
  const sel=p.id===PS.selectedId;
  return `<article class="job-item${sel?" selected":""}" data-post-select="${p.id}" tabindex="0" aria-selected="${sel}">
    <div class="job-item-top"><h3>${escapeHtml(p.hook||p.text.split("\n")[0])}</h3></div>
    <p class="job-co">${escapeHtml(pillarLabel(p.pillar))}${p.language==="en"?" · inglês":""}</p>
    <p class="job-foot"><span class="state post-${p.status}">${POST_STATUS[p.status]}</span><span>${escapeHtml(whenText(p.status==="published"?p.publishedAt:p.scheduledFor))}</span>${p.fromCheckin?'<span class="flag soft">Da sua semana</span>':""}</p>
  </article>`;
}
function postDetailHtml(p){
  const id=p.id;const img=p.image||{};
  const share=`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(p.text)}`;
  let h=`<header class="d-head">
    <p class="d-co">${escapeHtml(pillarLabel(p.pillar))}${p.language==="en"?" · em inglês":""}</p>
    <h2 id="modal-title">${escapeHtml(p.hook||"Post")}</h2>
    <p class="d-fit"><span class="state post-${p.status}">${POST_STATUS[p.status]}</span> <label class="inline-date">para <input type="datetime-local" id="post-when" value="${localInput(p.scheduledFor)}"></label></p>
    <div class="d-actions">
      ${p.status==="draft"?`<button class="button" data-post-action="approve" data-id="${id}">${icon("check")} Aprovar</button>`:""}
      ${p.status!=="published"?`<a class="button ${p.status==="draft"?"button-secondary":""}" href="${escapeHtml(share)}" target="_blank" rel="noopener noreferrer" data-post-share="${id}">${icon("linkedin")} Publicar no LinkedIn</a>`:""}
      <button class="button button-secondary" data-post-action="copy" data-id="${id}">${icon("copy")} Copiar texto</button>
      ${p.status==="approved"?`<button class="button button-ghost" data-post-action="published" data-id="${id}">Já publiquei</button><button class="button button-ghost" data-post-action="unapprove" data-id="${id}">Voltar para rascunho</button>`:""}
      ${p.status!=="published"?`<button class="button button-ghost danger" data-post-action="skip" data-id="${id}">Descartar</button>`:""}
    </div>
    <p class="d-hint" id="share-hint" hidden>O LinkedIn abre com o texto pronto. Anexe a imagem, publique e depois clique em <strong>Já publiquei</strong>. <button class="button button-secondary" data-post-action="published" data-id="${id}">${icon("check")} Já publiquei</button></p>
  </header>`;
  h+=section("Texto",`<textarea class="msg-box" id="post-text" rows="16">${escapeHtml(p.text)}</textarea>
    <div class="row-actions"><span class="muted small" id="post-count">${p.text.length} caracteres</span><button class="button button-ghost" data-post-action="save" data-id="${id}">Salvar texto</button></div>
    <div class="rewrite"><input id="rewrite-note" placeholder="Peça um ajuste: mais curto, mais pessoal, cite o projeto X…"><button class="button button-secondary" data-post-action="rewrite" data-id="${id}">${PS.busy===`rewrite:${id}`?"Reescrevendo…":"Reescrever com IA"}</button></div>
    <div class="quick-asks">${["Mais curto","Mais pessoal","Primeira linha mais forte","Menos formal","Em inglês"].map(t=>`<button class="chip small" data-rewrite-quick="${t}" data-id="${id}">${t}</button>`).join("")}</div>`);
  h+=section("Imagem",`<div class="segmented img-kinds" role="group">${[["print","Seu print ou foto"],["card","Card com texto"],["photo","Foto de banco"]].map(([k,l])=>`<button class="seg${img.kind===k?" active":""}" data-img-kind="${k}" data-id="${id}">${l}</button>`).join("")}</div>${imageBodyHtml(p)}`);
  if(p.factsUsed?.length)h+=`<details class="disclosure"><summary>Fatos usados pela IA ${icon("chevron","i chev")}</summary><div class="disclosure-body"><ul class="plain">${p.factsUsed.map(f=>`<li>${escapeHtml(f)}</li>`).join("")}</ul><p class="muted small">Escrito por ${escapeHtml(p.model||"IA")}. Se algo não for verdade, corrija o texto antes de aprovar.</p></div></details>`;
  return h;
}
function imageBodyHtml(p){
  const img=p.image||{};const id=p.id;
  if(img.kind==="print")return `<div class="img-box"><p><strong>Sugestão:</strong> ${escapeHtml(img.printIdea||"Um print ou foto real do trabalho descrito no post.")}</p><p class="muted small">Prints e fotos reais do seu trabalho são o que mais passa confiança no LinkedIn. Tire o print, anexe ao publicar e pronto.</p></div>`;
  if(img.kind==="photo"){
    const photos=PS.photos[id];
    return `<div class="img-box"><div class="rewrite"><input id="photo-query" value="${escapeHtml(img.photoQuery||"")}" placeholder="Palavras em inglês, ex.: office spreadsheet"><button class="button button-secondary" data-post-action="photos" data-id="${id}">Buscar fotos</button></div>
      ${!PS.pexels?`<p class="muted small">Cadastre a chave gratuita do Pixabay ou do Pexels em <button class="link" data-view="settings" data-scroll="ai-panel-title">Meu perfil</button> para buscar fotos reais.</p>`:""}
      ${img.chosen?`<figure class="chosen-photo"><img src="${escapeHtml(img.chosen.thumb||img.chosen.large)}" alt=""><figcaption>Foto de ${escapeHtml(img.chosen.author)} no ${escapeHtml(img.chosen.provider||"banco de imagens")} · <a href="${escapeHtml(img.chosen.large)}" target="_blank" rel="noopener noreferrer">abrir para baixar</a></figcaption></figure>`:""}
      ${photos?.length?`<div class="photo-grid">${photos.map(ph=>`<button class="photo${img.chosen?.id===ph.id?" active":""}" data-pick-photo="${ph.id}" data-id="${id}" title="${escapeHtml(ph.alt)}"><img src="${escapeHtml(ph.thumb)}" alt="${escapeHtml(ph.alt)}" loading="lazy"></button>`).join("")}</div>`:""}</div>`;
  }
  return `<div class="img-box card-editor"><div class="form-grid"><label class="full">Título do card<input id="card-title" maxlength="90" value="${escapeHtml(img.cardTitle||"")}"></label>${[0,1,2].map(i=>`<label class="full">Tópico ${i+1}<input class="card-line" data-i="${i}" maxlength="80" value="${escapeHtml(img.cardLines?.[i]||"")}"></label>`).join("")}</div>
    <canvas id="card-canvas" width="1200" height="1200" aria-label="Prévia do card"></canvas>
    <div class="row-actions"><button class="button button-secondary" data-post-action="download-card" data-id="${id}">Baixar card (PNG)</button><button class="button button-ghost" data-post-action="save-card" data-id="${id}">Salvar card</button></div></div>`;
}
function interviewHtml(){
  const qs=PS.questions.interview;
  return `<form id="interview-form" class="campaign-form">
    <div class="panel-heading"><div><h2>Entrevista inicial</h2><p>Responda com calma, uma vez só. Pode escrever ou falar (botão do microfone). Quanto mais detalhes reais, melhores os posts. Nada disso é publicado sem você aprovar.</p></div></div>
    ${qs.map((q,i)=>`<section class="camp-step"><h3><span>${i+1}</span> ${escapeHtml(q.q)}</h3><div class="mic-field"><textarea name="${q.key}" id="iv-${q.key}" rows="3" placeholder="${escapeHtml(q.hint||"")}">${escapeHtml(PS.interview[q.key]||"")}</textarea>${micButton(`iv-${q.key}`)}</div></section>`).join("")}
    <div class="form-actions"><button class="button" type="submit" data-build="1">${PS.busy==="stories"?"Montando o banco de histórias…":"Salvar e montar banco de histórias"}</button><button class="button button-ghost" type="submit" data-build="0">Só salvar</button><span class="save-note" id="interview-saved"></span></div>
  </form>`;
}
function checkinHtml(){
  const last=PS.diary.at(-1);
  return `<form id="checkin-form" class="campaign-form">
    <div class="panel-heading"><div><h2>Check-in da semana</h2><p>Dois minutos, quando quiser (o ideal é sexta ou sábado). O próximo post usa o que você contar aqui. Se pular a semana, o robô usa o banco de histórias.</p></div></div>
    ${PS.questions.checkin.map((q,i)=>`<section class="camp-step"><h3><span>${i+1}</span> ${escapeHtml(q.q)}</h3><div class="mic-field"><textarea name="${q.key}" id="ck-${q.key}" rows="3"></textarea>${micButton(`ck-${q.key}`)}</div></section>`).join("")}
    <div class="form-actions"><button class="button" type="submit">Salvar check-in</button><span class="muted small">${last?`Último check-in: ${escapeHtml(last.weekOf)}`:"Nenhum check-in ainda"}</span></div>
    ${PS.diary.length?`<details class="disclosure"><summary>Check-ins anteriores ${icon("chevron","i chev")}</summary><div class="disclosure-body">${PS.diary.slice().reverse().map(d=>`<p><strong>${escapeHtml(d.weekOf)}</strong>${d.usedAt?' <span class="flag soft">virou post</span>':""}<br>${PS.questions.checkin.map(q=>d.answers[q.key]?`<span class="muted small">${escapeHtml(q.q)}</span> ${escapeHtml(d.answers[q.key])}`:"").filter(Boolean).join("<br>")}</p>`).join("")}</div></details>`:""}
  </form>`;
}
function storiesHtml(){
  const list=PS.stories.filter(s=>!s.archived);
  if(!list.length)return empty("Banco de histórias vazio","Responda a entrevista e clique em Salvar e montar banco de histórias.");
  return `<p class="muted">Cada história vira um post. O robô usa primeiro as que ainda não viraram post. Arquive o que você não quer ver publicado.</p><div class="story-grid">${list.map(s=>`<article class="story"><div class="story-top"><span class="flag soft">${escapeHtml(pillarLabel(s.pillar))}</span>${s.used?`<span class="muted small">usada ${s.used}×</span>`:'<span class="muted small">nova</span>'}</div><h3>${escapeHtml(s.title)}</h3><p class="muted small">${escapeHtml(s.angle)}</p><ul class="plain small">${s.facts.map(f=>`<li>${escapeHtml(f)}</li>`).join("")}</ul><button class="button button-ghost" data-story-archive="${s.id}">Não usar</button></article>`).join("")}</div>`;
}
function micButton(target){return `<button type="button" class="mic" data-mic-for="${target}" title="Falar em vez de digitar" aria-label="Falar em vez de digitar"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>`}

// ---------- Card (imagem gerada no navegador, sem custo) ----------
function wrapLines(ctx,text,maxW){const words=String(text||"").split(/\s+/);const out=[];let line="";for(const w of words){const t=line?`${line} ${w}`:w;if(ctx.measureText(t).width>maxW&&line){out.push(line);line=w}else line=t}if(line)out.push(line);return out}
function drawCardPreview(){
  const c=document.querySelector("#card-canvas");if(!c)return;const ctx=c.getContext("2d");
  const title=document.querySelector("#card-title")?.value||"";const lines=[...document.querySelectorAll(".card-line")].map(i=>i.value.trim()).filter(Boolean);
  const p=currentProfile()||{};const name=p.name||"";const sub=(PS.email?.senderTitle)||"";
  ctx.fillStyle="#112926";ctx.fillRect(0,0,1200,1200);
  ctx.fillStyle="#1b3833";ctx.beginPath();ctx.arc(1080,120,260,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#d7f35a";ctx.fillRect(90,110,120,14);
  ctx.fillStyle="#ffffff";ctx.font='700 76px "Space Grotesk", "DM Sans", Arial, sans-serif';
  let y=230;for(const l of wrapLines(ctx,title,1000).slice(0,5)){ctx.fillText(l,90,y);y+=90}
  y+=40;ctx.font='500 42px "DM Sans", Arial, sans-serif';
  for(const l of lines){ctx.fillStyle="#d7f35a";ctx.fillRect(90,y-26,18,18);ctx.fillStyle="#e6efe9";for(const [i,part] of wrapLines(ctx,l,960).slice(0,2).entries()){ctx.fillText(part,136,y+i*54)}y+=Math.min(2,wrapLines(ctx,l,960).length)*54+34}
  ctx.fillStyle="#24443d";ctx.fillRect(90,1040,1020,2);
  ctx.fillStyle="#ffffff";ctx.font='600 36px "DM Sans", Arial, sans-serif';ctx.fillText(name,90,1105);
  if(sub){ctx.fillStyle="#9fb6ad";ctx.font='400 30px "DM Sans", Arial, sans-serif';ctx.fillText(sub,90,1148)}
}

// ---------- Ações ----------
function setPostsStatus(msg,kind=""){const el=document.querySelector("#posts-status");if(!el)return;el.hidden=!msg;el.textContent=msg||"";el.className=`notice ${kind}`}
function replacePost(p){const i=PS.items.findIndex(x=>x.id===p.id);if(i>=0)PS.items[i]=p;else PS.items.push(p)}
async function savePost(id,body,msg){try{const r=await papi(`/api/posts/${id}`,{method:"POST",body});replacePost(r.post);if(msg)showToast(msg);return r.post}catch(e){showToast(e.message)}}
function afterChange(){renderPosts();if(typeof render==="function")render()}
function selectPost(id){
  PS.selectedId=id;
  if(narrow()){const p=PS.items.find(x=>x.id===id);if(!p)return;$("#modal-content").innerHTML=postDetailHtml(p);$("#modal-backdrop").classList.remove("hidden");document.body.classList.add("modal-open");drawCardPreview();return}
  renderPosts();
}
function postRoot(){return document.querySelector("#modal-backdrop:not(.hidden) #modal-content")||document.querySelector("#post-detail")}
function refreshDetail(){const p=PS.items.find(x=>x.id===PS.selectedId);const modal=document.querySelector("#modal-backdrop:not(.hidden) #modal-content #post-text");if(modal&&p){$("#modal-content").innerHTML=postDetailHtml(p);drawCardPreview()}afterChange()}
async function planPosts(){
  if(!PS.ai.configured){showToast("Conecte a IA em Meu perfil primeiro.");return}
  PS.busy="plan";renderPosts();setPostsStatus("A IA está escrevendo os posts da semana. Leva de 30 segundos a 2 minutos…");
  try{const r=await papi("/api/posts/plan",{method:"POST",body:{profile:currentProfile()}});PS.items=r.items||PS.items;PS.busy="";PS.tab="review";PS.selectedId=r.created?.[0]?.id||null;afterChange();
    setPostsStatus(r.note||`${r.created.length} ${r.created.length===1?"post escrito":"posts escritos"}.${r.errors?.length?` Problemas: ${r.errors.join(" · ")}`:""}`,r.errors?.length?"warn":"")}
  catch(e){PS.busy="";renderPosts();setPostsStatus(e.message,"warn")}
}
document.addEventListener("click",async e=>{
  const tab=e.target.closest("[data-post-tab]");if(tab){if(activeView!=="content")setView("content");PS.tab=tab.dataset.postTab;PS.selectedId=null;renderPosts();return}
  const sel=e.target.closest("[data-post-select]");if(sel){selectPost(sel.dataset.postSelect);return}
  const shareLink=e.target.closest("[data-post-share]");if(shareLink){const h=postRoot()?.querySelector("#share-hint");if(h)h.hidden=false;const t=postRoot()?.querySelector("#post-text")?.value;if(t)navigator.clipboard?.writeText(t).catch(()=>{});return}
  const mic=e.target.closest("[data-mic-for]");if(mic){toggleMic(mic);return}
  const arch=e.target.closest("[data-story-archive]");if(arch){try{await papi(`/api/posts/stories/${arch.dataset.storyArchive}`,{method:"POST",body:{archived:true}});const s=PS.stories.find(x=>x.id===arch.dataset.storyArchive);if(s)s.archived=true;renderPosts();showToast("História arquivada.")}catch(err){showToast(err.message)}return}
  const kind=e.target.closest("[data-img-kind]");if(kind){const p=await savePost(kind.dataset.id,{image:{kind:kind.dataset.imgKind}});if(p)refreshDetail();return}
  const pick=e.target.closest("[data-pick-photo]");if(pick){const id=pick.dataset.id;const ph=(PS.photos[id]||[]).find(x=>String(x.id)===pick.dataset.pickPhoto);if(ph){const p=await savePost(id,{image:{chosen:ph}},"Foto escolhida.");if(p)refreshDetail()}return}
  const quick=e.target.closest("[data-rewrite-quick]");if(quick){const inp=postRoot()?.querySelector("#rewrite-note");if(inp)inp.value=quick.dataset.rewriteQuick;return rewrite(quick.dataset.id)}
  const scroll=e.target.closest("[data-scroll]");if(scroll)setTimeout(()=>document.getElementById(scroll.dataset.scroll)?.scrollIntoView({behavior:"smooth",block:"start"}),60);
  const b=e.target.closest("[data-post-action]");if(!b)return;
  const a=b.dataset.postAction,id=b.dataset.id;const root=postRoot();
  if(a==="approve"){const when=root.querySelector("#post-when")?.value;await savePost(id,{text:root.querySelector("#post-text").value,status:"approved",...(when?{scheduledFor:new Date(when).toISOString()}:{})},PS.email.configured?"Aprovado. Na hora marcada o post chega no seu e-mail.":"Aprovado e agendado.");refreshDetail()}
  if(a==="unapprove"){await savePost(id,{status:"draft"});refreshDetail()}
  if(a==="published"){await savePost(id,{status:"published"},"Marcado como publicado.");closeModal();afterChange()}
  if(a==="skip"){if(!confirm("Descartar este post?"))return;await savePost(id,{status:"skipped"},"Post descartado.");closeModal();afterChange()}
  if(a==="save"){await savePost(id,{text:root.querySelector("#post-text").value},"Texto salvo.")}
  if(a==="copy"){navigator.clipboard?.writeText(root.querySelector("#post-text").value).then(()=>showToast("Texto copiado."),()=>showToast("Selecione e copie manualmente."))}
  if(a==="rewrite")rewrite(id);
  if(a==="photos"){const q=root.querySelector("#photo-query").value.trim();b.textContent="Buscando…";try{const r=await papi(`/api/posts/${id}/photos?q=${encodeURIComponent(q)}`);PS.photos[id]=r.photos;await savePost(id,{image:{photoQuery:q}});refreshDetail();if(!r.photos.length)showToast("Nenhuma foto encontrada. Tente outras palavras em inglês.")}catch(err){b.textContent="Buscar fotos";showToast(err.message)}}
  if(a==="save-card"){await savePost(id,{image:{cardTitle:root.querySelector("#card-title").value,cardLines:[...root.querySelectorAll(".card-line")].map(i=>i.value)}},"Card salvo.")}
  if(a==="download-card"){drawCardPreview();const c=root.querySelector("#card-canvas");const link=document.createElement("a");link.download=`card-${id}.png`;link.href=c.toDataURL("image/png");link.click()}
});
async function rewrite(id){
  const root=postRoot();const note=root?.querySelector("#rewrite-note")?.value.trim()||"";
  const text=root?.querySelector("#post-text")?.value;
  if(text){await savePost(id,{text})}
  PS.busy=`rewrite:${id}`;const btn=root?.querySelector('[data-post-action="rewrite"]');if(btn){btn.disabled=true;btn.textContent="Reescrevendo…"}
  try{const r=await papi(`/api/posts/${id}/rewrite`,{method:"POST",body:{instruction:note}});replacePost(r.post);PS.busy="";refreshDetail();showToast("Post reescrito.")}
  catch(e){PS.busy="";if(btn){btn.disabled=false;btn.textContent="Reescrever com IA"}showToast(e.message)}
}
document.addEventListener("input",e=>{
  if(e.target.id==="post-text"){const c=postRoot()?.querySelector("#post-count");if(c)c.textContent=`${e.target.value.length} caracteres`}
  if(e.target.id==="card-title"||e.target.classList?.contains("card-line"))drawCardPreview();
});
document.addEventListener("change",async e=>{if(e.target.id==="post-when"&&e.target.value&&PS.selectedId){await savePost(PS.selectedId,{scheduledFor:new Date(e.target.value).toISOString()},"Data atualizada.");afterChange()}});
document.addEventListener("submit",async e=>{
  if(e.target.id==="interview-form"){
    e.preventDefault();const build=e.submitter?.dataset.build==="1";const answers=Object.fromEntries(PS.questions.interview.map(q=>[q.key,e.target.elements[q.key].value]));
    Object.assign(PS.interview,answers);
    if(build&&!PS.ai.configured){showToast("Respostas salvas. Conecte a IA em Meu perfil para montar o banco de histórias.")}
    if(build&&PS.ai.configured){PS.busy="stories";const btn=e.submitter;btn.disabled=true;btn.textContent="Montando o banco de histórias…"}
    try{const r=await papi("/api/posts/interview",{method:"POST",body:{answers,profile:currentProfile(),build:build&&PS.ai.configured}});PS.busy="";
      if(r.stories){PS.stories=r.stories;PS.tab="stories";showToast(`${r.stories.length} histórias no banco.`)}else if(!build||PS.ai.configured)showToast("Respostas salvas.");afterChange()}
    catch(err){PS.busy="";afterChange();showToast(err.message)}
  }
  if(e.target.id==="checkin-form"){
    e.preventDefault();const answers=Object.fromEntries(PS.questions.checkin.map(q=>[q.key,e.target.elements[q.key].value]));
    try{const r=await papi("/api/posts/checkin",{method:"POST",body:{answers}});PS.diary.push(r.entry);showToast("Check-in salvo. O próximo post vai usar isso.");afterChange()}catch(err){showToast(err.message)}
  }
});
document.querySelector("#plan-posts")?.addEventListener("click",planPosts);
document.querySelector("#open-checkin")?.addEventListener("click",()=>{PS.tab="checkin";renderPosts()});

// ---------- Ditado por voz (grátis, no próprio navegador) ----------
let recog=null,recogBtn=null;
function toggleMic(btn){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){showToast("Seu navegador não tem ditado por voz. Use o Chrome ou o Edge, ou o ditado do Windows (tecla Windows + H).");return}
  if(recog){recog.stop();return}
  const target=document.getElementById(btn.dataset.micFor);if(!target)return;
  recog=new SR();recog.lang="pt-BR";recog.continuous=true;recog.interimResults=false;recogBtn=btn;btn.classList.add("on");
  const base=target.value.trim();let said="";
  recog.onresult=ev=>{for(let i=ev.resultIndex;i<ev.results.length;i++)if(ev.results[i].isFinal)said+=(said?" ":"")+ev.results[i][0].transcript.trim();target.value=[base,said].filter(Boolean).join(base&&said?" ":"")};
  recog.onerror=ev=>{if(ev.error==="not-allowed")showToast("Permita o uso do microfone para ditar.")};
  recog.onend=()=>{recogBtn?.classList.remove("on");recog=null;recogBtn=null};
  recog.start();showToast("Pode falar. Clique no microfone de novo para parar.");
}

// ---------- Meu perfil › IA e imagens ----------
const KNOWN_MODELS=["kimi-k3","deepseek-v4-pro","deepseek-v4.1-flash","deepseek-v4-flash","glm-5.3","glm-5.3-flash","minimax-m3","mimo-v2.6-pro","qwen3.8-max","qwen3.8-flash","qwen3.7-plus"];
function renderAiPanel(){
  const f=document.querySelector("#ai-form");if(!f)return;const ai=PS.ai||{};
  const st=document.querySelector("#int-ai");if(st){st.textContent=ai.configured?"Ativo":"Não configurado";st.className=`state ${ai.configured?"approved":""}`}
  const sp=document.querySelector("#int-pexels");if(sp){sp.textContent=PS.pexels?`Ativo · ${PS.photoProvider||""}`:"Não configurado";sp.className=`state ${PS.pexels?"approved":""}`}
  for(const [k,v] of [["aiBaseUrl",ai.baseUrl],["aiModel",ai.model],["aiFastModel",ai.fastModel]])if(f.elements[k]&&document.activeElement!==f.elements[k])f.elements[k].value=v||"";
  f.elements.aiKey.placeholder=ai.configured?"Chave salva (deixe em branco para manter)":"Cole aqui a chave do OpenCode Go";
  f.elements.pexelsKey.placeholder=PS.pexels?"Chave salva (deixe em branco para manter)":"Cole aqui a chave do Pixabay ou do Pexels";
  const dl=document.querySelector("#ai-model-list");if(dl&&!dl.children.length)dl.innerHTML=KNOWN_MODELS.map(m=>`<option value="${m}">`).join("");
}
document.querySelector("#ai-form")?.addEventListener("submit",async e=>{
  e.preventDefault();const f=e.target.elements;
  const body={aiKey:f.aiKey.value.trim(),aiBaseUrl:f.aiBaseUrl.value.trim(),aiModel:f.aiModel.value.trim(),aiFastModel:f.aiFastModel.value.trim(),pexelsKey:f.pexelsKey.value.trim()};
  try{const r=await papi("/api/integrations",{method:"POST",body});f.aiKey.value="";f.pexelsKey.value="";PS.ai=r.ai||PS.ai;PS.pexels=!!r.pexels;PS.photoProvider=r.photoProvider;renderAiPanel();renderPosts();document.querySelector("#ai-saved").textContent="Salvo.";showToast("Configuração da IA salva.");if(body.aiKey)testAi()}
  catch(err){showToast(err.message)}
});
async function testAi(model){
  const out=document.querySelector("#ai-test-result");if(out){out.hidden=false;out.className="notice";out.textContent="Testando a conexão com a IA…"}
  try{const r=await papi("/api/ai/test",{method:"POST",body:{model}});if(out){out.className=`notice ${r.ok?"":"warn"}`;out.textContent=r.ok?`Funcionando: ${r.model} respondeu em ${(r.ms/1000).toFixed(1)} s ("${r.text}").`:`Não funcionou com ${r.model}: ${r.error}`}}
  catch(e){if(out){out.className="notice warn";out.textContent=e.message}}
}
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-ai-action]");if(!b)return;const a=b.dataset.aiAction;
  if(a==="test")testAi();
  if(a==="remove-ai"||a==="remove-pexels"){const r=await papi("/api/integrations",{method:"POST",body:{remove:a==="remove-ai"?"ai":"pexels"}});PS.ai=r.ai||PS.ai;PS.pexels=!!r.pexels;renderAiPanel();renderPosts();showToast("Chave removida.")}
  if(a==="models"){const out=document.querySelector("#ai-test-result");try{const r=await papi("/api/ai/models");out.hidden=false;out.className=`notice ${r.models.length?"":"warn"}`;out.textContent=r.models.length?`Modelos disponíveis na sua conta: ${r.models.join(", ")}`:`Não consegui listar os modelos: ${r.error||"lista vazia"}`;if(r.models.length)document.querySelector("#ai-model-list").innerHTML=r.models.map(m=>`<option value="${escapeHtml(m)}">`).join("")}catch(err){showToast(err.message)}}
  if(a==="compare"){
    const box=document.querySelector("#ai-compare");const models=[...document.querySelectorAll("[name=compareModel]:checked")].map(i=>i.value);
    if(!PS.ai.configured){showToast("Salve a chave da IA primeiro.");return}
    if(!PS.stories.length){showToast("Monte o banco de histórias antes (Publicações › Entrevista).");return}
    if(models.length<2){showToast("Marque pelo menos 2 modelos.");return}
    box.innerHTML=`<p class="muted">Escrevendo o mesmo post com ${models.length} modelos…</p>`;
    try{const r=await papi("/api/posts/compare",{method:"POST",body:{models}});box.innerHTML=`<p class="muted small">História usada: <strong>${escapeHtml(r.story?.title||"—")}</strong>. Leia e escolha o que soa mais como você.</p><div class="compare-grid">${r.results.map(x=>`<article class="compare-col"><div class="compare-head"><strong>${escapeHtml(x.model)}</strong>${x.ms?`<span class="muted small">${(x.ms/1000).toFixed(0)} s</span>`:""}</div>${x.error?`<p class="notice warn">${escapeHtml(x.error)}</p>`:`<div class="desc">${escapeHtml(x.text)}</div><button class="button button-secondary" data-use-model="${escapeHtml(x.model)}">Usar este modelo</button>`}</article>`).join("")}</div>`}
    catch(err){box.innerHTML=`<p class="notice warn">${escapeHtml(err.message)}</p>`}
  }
});
document.addEventListener("click",async e=>{const u=e.target.closest("[data-use-model]");if(!u)return;try{const r=await papi("/api/integrations",{method:"POST",body:{aiModel:u.dataset.useModel}});PS.ai=r.ai||PS.ai;renderAiPanel();showToast(`Os posts agora serão escritos com ${u.dataset.useModel}.`)}catch(err){showToast(err.message)}});

// ---------- Meu perfil › Voz e publicações ----------
// "length" colide com form.elements.length; no formulário o campo se chama postLength.
const VOICE_FIELDS=["goal","language","audience","postsPerWeek","time","tone","depth","length","emojis","hashtags","callEvery","cta","avoid","examples"];
const fieldName=k=>k==="length"?"postLength":k;
function renderVoicePanel(){
  const f=document.querySelector("#voice-form");if(!f||!PS.loaded)return;const v=PS.voice||{};
  for(const k of VOICE_FIELDS)if(f.elements[fieldName(k)]&&document.activeElement!==f.elements[fieldName(k)])f.elements[fieldName(k)].value=v[k]??"";
  f.querySelectorAll("[name=days]").forEach(i=>i.checked=(v.days||[]).includes(i.value));
  f.querySelectorAll("[name=pillars]").forEach(i=>i.checked=(v.pillars||[]).includes(i.value));
  for(const k of ["autoPlan","autoApprove","remindEmail"])if(f.elements[k])f.elements[k].checked=!!v[k];
}
document.querySelector("#voice-form")?.addEventListener("submit",async e=>{
  e.preventDefault();const f=e.target;const d={};
  for(const k of VOICE_FIELDS)d[k]=f.elements[fieldName(k)].value;
  d.days=[...f.querySelectorAll("[name=days]:checked")].map(i=>i.value);d.pillars=[...f.querySelectorAll("[name=pillars]:checked")].map(i=>i.value);
  for(const k of ["autoPlan","autoApprove","remindEmail"])d[k]=f.elements[k].checked;
  if(!d.days.length){showToast("Escolha pelo menos um dia.");return}
  d.updatedAt=new Date().toISOString();
  try{const r=await papi("/api/posts/voice",{method:"POST",body:d});PS.voice={...r.voice,updatedAt:d.updatedAt};renderPosts();document.querySelector("#voice-saved").textContent="Salvo. Vale para os próximos posts.";showToast("Voz e publicações salvas.")}
  catch(err){showToast(err.message)}
});
function routeHash(){const h=location.hash.replace("#","");if(h==="content"||h==="checkin"){setView("content");if(h==="checkin")PS.tab="checkin";renderPosts()}}
window.addEventListener("hashchange",routeHash);
loadPosts().then(routeHash);
