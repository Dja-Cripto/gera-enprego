const JOB_SEARCH_META_KEY='radar-job-search-meta-v1';
const searchButton=document.querySelector('#search-jobs');
const periodSelect=document.querySelector('#search-period');
// O período desta tela começa igual ao do perfil, mas pode ser trocado só para a busca atual.
function syncPeriodDefault(){const v=String(settings?.jobMaxAgeDays||'7');if(periodSelect&&[...periodSelect.options].some(o=>o.value===v))periodSelect.value=v}
syncPeriodDefault();
document.querySelector('#settings-form')?.addEventListener('submit',()=>setTimeout(syncPeriodDefault,0));
const searchStatus=document.querySelector('#job-search-status');
let searchMeta=null;
try{searchMeta=JSON.parse(localStorage.getItem(JOB_SEARCH_META_KEY))}catch{}

const periodLabel=days=>(Number(days)===0?'em qualquer data (ainda abertas)':({1:'nas últimas 24 horas',3:'nos últimos 3 dias',7:'nos últimos 7 dias',14:'nos últimos 14 dias',30:'nos últimos 30 dias'}[days]||`nos últimos ${days} dias`));
function timeAgo(iso){if(!iso)return '';const min=Math.round((Date.now()-Date.parse(iso))/60000);if(min<1)return 'agora mesmo';if(min<60)return `há ${min} min`;const h=Math.round(min/60);if(h<24)return `há ${h} h`;const d=Math.round(h/24);return d===1?'ontem':`há ${d} dias`}
function setStatus(html,kind=''){searchStatus.innerHTML=html;searchStatus.className=`notice${kind?` ${kind}`:''}`;searchStatus.hidden=!html||kind==='ok'}

function renderKpis(data){
  const box=document.querySelector('#job-kpis');
  if(!data?.searchedAt){box.innerHTML='';return}
  const x=data.excluded||{};
  const ok=(data.sourceStats||[]).filter(s=>!(s.errors?.length>=(s.queries||1))).length,total=(data.sourceStats||[]).length;
  box.innerHTML=`<dl class="rows rows-inline"><div><dt>Anúncios lidos</dt><dd>${data.scanned||0}</dd></div><div><dt>Publicados ${periodLabel(data.maxAgeDays??7)}</dt><dd>${data.recentCount??'—'}</dd></div><div><dt>Para revisar</dt><dd>${data.jobs?.length??data.found??0}</dd></div><div><dt>Fontes que responderam</dt><dd>${total?`${ok} de ${total}`:'—'}</dd></div></dl><p class="muted small">Descartadas: ${x.senioridade||0} por nível, ${x.local||0} por região ou modalidade, ${x.area||0} por área, ${x.restrita||0} exclusivas para outro perfil, ${x.compatibilidade||0} com poucos requisitos do seu currículo, ${x.duplicada||0} repetidas e ${x.jaDecidida||0} em que você já se candidatou ou descartou.</p>`;
}
function renderLastRun(data){
  const el=document.querySelector('#job-summary');const home=document.querySelector('#last-run-home');
  if(!data?.searchedAt){el.textContent='Nenhuma busca feita ainda. Clique em Buscar vagas agora.';if(home)home.textContent='Nenhuma busca feita ainda.';return}
  const c=data.counts||{};const n=data.jobs?.length??data.found??0;
  const failed=(data.sourceStats||[]).filter(s=>s.errors?.length>=(s.queries||1)).map(s=>s.source);
  el.innerHTML=`${n} vagas publicadas ${periodLabel(data.maxAgeDays??7)}${c.boa!=null?`, ${c.boa} com boa correspondência`:''}. Última busca ${timeAgo(data.searchedAt)}.${failed.length?` <a href="#diagnostics" class="warn-link">${failed.join(', ')} não respondeu</a>`:''}`;
  if(home)home.textContent=`Última busca ${timeAgo(data.searchedAt)}. A próxima busca automática é à meia-noite.`;
}
function renderSourceStats(data){
  const box=document.querySelector('#job-source-stats');if(!box)return;
  const stats=data?.sourceStats||[];
  if(!stats.length){box.innerHTML='<p class="helper">A tabela aparece depois da primeira busca. Clique em “Buscar vagas agora”.</p>';return}
  box.innerHTML=`<div class="table-wrap"><table class="data-table"><thead><tr><th>Fonte</th><th class="num">Anúncios lidos</th><th class="num">Para revisar</th><th>Situação</th></tr></thead><tbody>${stats.map(s=>{const failed=s.errors?.length>=(s.queries||1);return `<tr><td><strong>${escapeHtml(s.source)}</strong></td><td class="num">${s.received}</td><td class="num">${s.recommended??0}</td><td>${s.errors?.length?`<span class="state ${failed?'rejected':'adjustments'}">${failed?'Falhou':'Falhas parciais'}</span> <small>${escapeHtml(s.errors.slice(0,2).join('; '))}</small>`:'<span class="state approved">OK</span>'}</td></tr>`}).join('')}</tbody></table></div>`;
}
function renderRun(data){renderKpis(data);renderLastRun(data);renderSourceStats(data);if(typeof checkServer==='function'&&document.querySelector('#robot-dot')?.classList.contains('ok'))checkServer()}
if(searchMeta?.searchedAt)renderRun(searchMeta);else{renderLastRun(null);setStatus('Clique em <strong>Buscar vagas agora</strong> para o robô procurar vagas reais.','info')}

function realJobToItem(job){
  const mode=job.workplace==='hybrid'?'Híbrido':job.remote?'Remoto':'Presencial';
  const location=job.remote?(job.location||'Remoto'):(job.location||'Local a confirmar');
  const published=job.publishedAt?new Date(job.publishedAt).toLocaleDateString('pt-BR'):null;
  const dateTag=published?(job.dateKind==='bulletin'?`Boletim de ${published}`:job.dateKind==='firstSeen'?`Sem data na fonte · visto em ${published}`:`Publicada em ${published}`):null;
  const also=[...new Set((job.alsoOn||[]).map(a=>a.source).filter(s=>s!==job.source))];
  const sourceLabel=job.sourceDetail?`${job.source} · via ${job.sourceDetail}`:job.source;
  return {id:job.externalId,type:'jobs',title:job.titlePt||job.title,originalTitle:job.titlePt&&job.titlePt!==job.title?job.title:null,subtitle:`${job.company} • ${location}`,description:job.overviewPt||'Confira a descrição completa na fonte.',fullDescription:job.description,source:sourceLabel,sourceUrl:job.sourceUrl,applyUrl:job.applyUrl||null,alsoOn:job.alsoOn||[],questions:job.questions||[],deadline:job.deadline||null,publishedAt:job.publishedAt,foundAt:job.firstSeenAt||new Date().toISOString(),fitLabel:job.fitLabel||null,fit:job.fit||null,matchSummary:job.matchSummary||null,gaps:job.gaps||[],tags:[...(job.isNew?['Nova']:[]),sourceLabel,...(also.length?[`Também em ${also.join(', ')}`]:[]),mode,...(dateTag?[dateTag]:[])],score:job.score,evidence:job.evidence,gap:job.gap,resume:job.resume,status:'pending'};
}
function importSearchResults(data){
  const oldById=new Map(items.filter(x=>x.type==='jobs'&&!/^job-\d$/.test(x.id)).map(x=>[x.id,x]));
  const incoming=data.jobs.map(realJobToItem).map(job=>{const previous=oldById.get(job.id);return previous?{...job,status:previous.status,note:previous.note,updatedAt:previous.updatedAt,foundAt:previous.foundAt}:job});
  const incomingIds=new Set(incoming.map(n=>n.id));
  const missingOld=[...oldById.values()].filter(x=>x.status!=='pending'&&!incomingIds.has(x.id)).map(x=>({...x,tags:[...x.tags.filter(t=>t!=='Nova'&&t!=='Não apareceu na última busca'),'Não apareceu na última busca']}));
  items=items.filter(x=>x.type!=='jobs').concat(incoming,missingOld);
  save();render();
  searchMeta={searchedAt:data.searchedAt,scanned:data.scanned,recentCount:data.recentCount,found:data.jobs.length,jobs:{length:data.jobs.length},sources:data.sources,excluded:data.excluded,maxAgeDays:data.maxAgeDays,counts:data.counts,sourceStats:data.sourceStats,notConnected:data.notConnected,failures:data.failures};
  try{localStorage.setItem(JOB_SEARCH_META_KEY,JSON.stringify(searchMeta))}catch{}
  renderRun(searchMeta);
}
function failureNote(data){return data.failures?.length?` <span class="muted">Algumas fontes falharam; veja o diagnóstico no fim da página.</span>`:''}

// Envia preferências e currículo ao servidor, para a busca diária usar os dados atuais.
function currentProfile(){try{return JSON.parse(localStorage.getItem('radar-profile-v1'))||(typeof profile!=='undefined'?profile:null)}catch{return typeof profile!=='undefined'?profile:null}}
async function syncServer(){try{await fetch('/api/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings,profile:currentProfile()})})}catch{}}
document.querySelector('#settings-form')?.addEventListener('submit',()=>setTimeout(syncServer,0));

document.addEventListener('submit',e=>{if(e.target.closest('#profile'))setTimeout(syncServer,50)});

fetch('/api/jobs/latest').then(r=>r.ok?r.json():null).then(data=>{
  if(data?.searchedAt&&Array.isArray(data.jobs)&&(!searchMeta?.searchedAt||data.searchedAt>searchMeta.searchedAt)){
    importSearchResults(data);
    setStatus(`O robô fez uma busca automática ${timeAgo(data.searchedAt)} e encontrou <strong>${data.jobs.length}</strong> vagas para você revisar.${failureNote(data)}`,'ok');
  }
}).catch(()=>{});

searchButton.addEventListener('click',async()=>{
  const label=searchButton.querySelector('span');
  searchButton.disabled=true;searchButton.classList.add('loading');label.textContent='Buscando…';
  setStatus('Consultando Gupy, Sólides, Empregos.com.br, Pandapé, Casa do Trabalhador, SineBahia e fontes remotas, com uma busca para cada cargo configurado. Pode levar até um minuto.','info');
  try{
    settings={...settings,...readForm(document.querySelector('#settings-form'),settingsFields)};
    persistSettings();
    const periodDays=periodSelect&&periodSelect.value!==''?Number(periodSelect.value):Number(settings.jobMaxAgeDays??7);
    const decisions=items.filter(i=>i.type==='jobs'&&(i.status==='applied'||i.status==='rejected')).map(i=>({id:i.id,status:i.status,at:i.updatedAt,title:i.originalTitle||i.title,company:(i.subtitle||'').split(' • ')[0]}));
    const response=await fetch('/api/jobs/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings,profile:currentProfile(),periodDays,decisions})});
    if(!response.ok)throw Error(`servidor respondeu ${response.status}`);
    const data=await response.json();
    if(!Array.isArray(data.jobs))throw Error('resposta inesperada do servidor');
    if(!data.sources.length&&data.failures.length)throw Error(`fontes indisponíveis: ${data.failures.join('; ')}`);
    importSearchResults(data);
    setStatus(`Busca concluída: <strong>${data.jobs.length}</strong> vagas para revisar, publicadas ${periodLabel(data.maxAgeDays)}.${failureNote(data)}`,'ok');
    showToast(`${data.jobs.length} ${data.jobs.length===1?'vaga encontrada':'vagas encontradas'}.`);
  }catch(error){setStatus(`<strong>A busca não foi concluída:</strong> ${escapeHtml(error.message)}. Verifique se a janela do Radar (iniciar-radar.bat) está aberta e tente de novo.`,'bad');showToast('Não foi possível concluir a busca.')}
  finally{searchButton.disabled=false;searchButton.classList.remove('loading');label.textContent='Buscar vagas agora'}
});

const coverageForm=document.querySelector('#coverage-form');
if(coverageForm)coverageForm.addEventListener('submit',async event=>{
  event.preventDefault();
  const out=document.querySelector('#coverage-result');
  const text=coverageForm.elements.coverage.value;
  if(!text.trim()){out.innerHTML='<p class="helper">Cole ao menos uma vaga.</p>';return}
  out.innerHTML='<p class="helper">Comparando com o que o robô encontrou na última busca…</p>';
  try{
    const response=await fetch('/api/jobs/coverage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
    if(!response.ok)throw Error(`servidor respondeu ${response.status}`);
    const data=await response.json();
    if(!data.searchedAt){out.innerHTML='<p class="helper">Faça uma busca primeiro; a comparação usa o resultado da última busca do robô.</p>';return}
    const label={recomendada:'Encontrada',descartada:'Descartada','nao-encontrada':'Não encontrada'};
    const cls={recomendada:'approved',descartada:'adjustments','nao-encontrada':'rejected'};
    const x=data.summary;
    out.innerHTML=`<p class="coverage-summary"><strong>${x.recomendadas+x.descartadas} de ${x.total} vagas encontradas pelo robô.</strong> ${x.recomendadas} estão na sua lista, ${x.descartadas} foram descartadas pela triagem e ${x.naoEncontradas} não foram encontradas. Base: busca de ${new Date(data.searchedAt).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Vaga informada</th><th>Resultado</th><th>Motivo</th></tr></thead><tbody>${data.rows.map(r=>`<tr><td>${escapeHtml(r.line.length>90?r.line.slice(0,90)+'…':r.line)}${r.title?`<br><small>Corresponde a: ${escapeHtml(r.title)} — ${escapeHtml(r.company)} (${escapeHtml(r.source)})</small>`:''}</td><td><span class="state ${cls[r.status]}">${label[r.status]}</span></td><td>${escapeHtml(r.reason)}</td></tr>`).join('')}</tbody></table></div>`;
    try{localStorage.setItem('radar-coverage-input',text)}catch{}
  }catch(error){out.innerHTML=`<p class="helper">Não foi possível comparar: ${escapeHtml(error.message)}. Verifique se o servidor do Radar está ligado.</p>`}
});
try{const saved=localStorage.getItem('radar-coverage-input');if(saved&&coverageForm)coverageForm.elements.coverage.value=saved}catch{}

// Estado do robô na barra lateral e aviso de servidor antigo.
const robotDot=document.querySelector('#robot-dot'),robotStatus=document.querySelector('#robot-status');
function checkServer(){
  fetch('/api/health').then(r=>r.ok?r.json():null).then(h=>{
    if(!h){throw Error()}
    if(!h.version){robotDot.className='robot-dot bad';robotStatus.textContent='Versão antiga ligada';setStatus('<strong>O servidor antigo do Radar ainda está ligado.</strong> Feche a janela preta do Radar (ou reinicie o computador) e abra de novo pelo <code>iniciar-radar.bat</code>.','bad');return}
    robotDot.className='robot-dot ok';robotStatus.textContent=searchMeta?.searchedAt?`Busca automática ativa`:'Busca automática ativa';robotStatus.parentElement.title=searchMeta?.searchedAt?`Última busca ${timeAgo(searchMeta.searchedAt)}. Próxima à meia-noite.`:'Aguardando a primeira busca';
  }).catch(()=>{robotDot.className='robot-dot bad';robotStatus.textContent='Robô desligado'});
}
checkServer();setInterval(checkServer,60000);
syncServer();
// Nome do usuário no painel e cartão do perfil (vêm do currículo mestre).
function renderIdentity(){const p=currentProfile();const name=String(p?.name||'').trim();if(!name)return;const parts=name.split(/\s+/).filter(w=>w.length>2&&!/^(de|da|do|dos|das)$/i.test(w));const first=parts[0]||name;const last=parts.length>1?parts[parts.length-1]:'';const ini=(first[0]+(last[0]||'')).toUpperCase();const set=(sel,v)=>{const el=document.querySelector(sel);if(el)el.textContent=v};set('#greeting-name',first);set('#sidebar-name',`${first} ${last}`.trim());set('#sidebar-avatar',ini);set('#profile-card-avatar',ini);set('#profile-card-name',name);const role=(p.experiences||[])[0];set('#profile-card-line',[p.city,(p.academic||[])[0]?.title].filter(Boolean).join(' · '));const contact=document.querySelector('#profile-card-contact');if(contact){const bits=[p.email&&`<span>${escapeHtml(p.email)}</span>`,p.phone&&`<span>${escapeHtml(p.phone)}</span>`,p.portfolio&&safeUrl(p.portfolio)&&`<a href="${escapeHtml(safeUrl(p.portfolio))}" target="_blank" rel="noopener noreferrer">Portfólio</a>`].filter(Boolean);contact.innerHTML=bits.join('<span class="sep">·</span>')}const ps=document.querySelector('#profile-summary');if(ps)ps.textContent=`${(p.experiences||[]).length} experiências, ${(p.courses||[]).length} cursos e ${(p.projects||[]).length} projetos cadastrados. O Radar compara cada vaga com estas informações.`}
renderIdentity();document.addEventListener('submit',e=>{if(e.target.closest('#profile'))setTimeout(renderIdentity,60)});
render();

// ---------- Adicionar vaga por link ----------
const manualPanel=document.querySelector('#manual-panel'),manualToggle=document.querySelector('#toggle-manual');
function showManual(show){manualPanel.hidden=!show;manualToggle.setAttribute('aria-expanded',String(show));if(show)manualPanel.elements.url.focus()}
manualToggle?.addEventListener('click',()=>showManual(manualPanel.hidden));
document.querySelector('#close-manual')?.addEventListener('click',()=>showManual(false));
manualPanel?.addEventListener('submit',async e=>{
  e.preventDefault();const f=manualPanel.elements;const status=document.querySelector('#manual-status');
  status.textContent='Lendo a vaga…';
  try{
    const r=await fetch('/api/jobs/manual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:f.url.value,title:f.title.value,company:f.company.value,city:f.city.value,remote:f.remote.checked,description:f.description.value})});
    const data=await r.json();
    if(!r.ok)throw Error(data.error||`erro ${r.status}`);
    const item=realJobToItem(data.job);
    items=items.filter(x=>x.id!==item.id).concat(item);save();
    selectedJobId=item.id;document.querySelector('#job-filter').value='pending';render();
    manualPanel.reset();showManual(false);status.textContent='';
    showToast('Vaga adicionada à sua lista.');
  }catch(err){status.textContent=err.message}
});

// ---------- Fontes extras (chaves de API) ----------
const intForm=document.querySelector('#integrations-form');
function renderIntegrations(d){
  const set=(id,on)=>{const el=document.querySelector(id);if(!el)return;el.textContent=on?'Ativo':'Não configurado';el.className=`state ${on?'approved':''}`};
  set('#int-serpapi',d.serpapi);set('#int-adzuna',d.adzuna);set('#int-jooble',d.jooble);
  if(intForm&&d.serpapiBudget)intForm.elements.serpapiBudget.value=String(d.serpapiBudget);
}
function loadIntegrations(){fetch('/api/integrations').then(r=>r.ok?r.json():null).then(d=>{if(d)renderIntegrations(d)}).catch(()=>{})}
loadIntegrations();
intForm?.addEventListener('submit',async e=>{
  e.preventDefault();const f=intForm.elements;
  const body={serpapiKey:f.serpapiKey.value,serpapiBudget:f.serpapiBudget.value,adzunaId:f.adzunaId.value,adzunaKey:f.adzunaKey.value,joobleKey:f.joobleKey.value};
  try{const r=await fetch('/api/integrations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();renderIntegrations(d);for(const n of ['serpapiKey','adzunaId','adzunaKey','joobleKey'])f[n].value='';document.querySelector('#integrations-saved').textContent='Chaves salvas. Elas entram na próxima busca.';showToast('Fontes extras atualizadas.')}catch{showToast('Não foi possível salvar. O servidor do Radar está ligado?')}
});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-remove-key]');if(!b)return;const r=await fetch('/api/integrations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({remove:b.dataset.removeKey})});renderIntegrations(await r.json());showToast('Chave removida.')});
