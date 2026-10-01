// Módulo Clientes: campanhas, empresas encontradas, mensagens e acompanhamento.
// O robô encontra, pesquisa e escreve; quem envia o primeiro contato é você (WhatsApp com um clique ou e-mail aprovado um a um).
const LS={campaigns:[],niches:[],offers:[],metrics:[],summary:{},serpapi:false,leads:[],email:{},loaded:false,
  campaignId:null,filter:"new",query:"",selectedId:null,editing:null,busy:false};
try{LS.campaignId=localStorage.getItem("radar-campaign")||null}catch{}
const LEAD_STATUS={new:"Para contatar",contacted:"Contatada",replied:"Respondeu",meeting:"Reunião marcada",proposal:"Proposta enviada",won:"Fechou",lost:"Não fechou",blocked:"Não quer contato"};
const LEAD_FILTERS=[
  {key:"new",label:"Para contatar",test:l=>l.status==="new"},
  {key:"follow",label:"Retornos para hoje",test:l=>followDue(l)},
  {key:"talking",label:"Em conversa",test:l=>["contacted","replied","meeting","proposal"].includes(l.status)},
  {key:"won",label:"Fechadas",test:l=>l.status==="won"},
  {key:"closed",label:"Encerradas",test:l=>l.status==="lost"||l.status==="blocked"},
  {key:"all",label:"Todas",test:()=>true}];
function followDue(l){return !!l.followUpAt&&["contacted","proposal","replied","meeting"].includes(l.status)&&new Date(l.followUpAt)<=endOfToday()}
function endOfToday(){const d=new Date();d.setHours(23,59,59,999);return d}
window.leadsNewCount=()=>LS.leads.filter(l=>l.status==="new").length;
window.leadsFollowCount=()=>LS.leads.filter(followDue).length;

async function api(path,opts={}){
  const r=await fetch(path,{...opts,headers:{"Content-Type":"application/json",...(opts.headers||{})},body:opts.body&&typeof opts.body!=="string"?JSON.stringify(opts.body):opts.body});
  let d={};try{d=await r.json()}catch{}
  if(!r.ok)throw Error(d.error||`Erro ${r.status}`);
  return d;
}
async function loadLeads(){
  try{
    const [c,l]=await Promise.all([api("/api/campaigns"),api("/api/leads")]);
    Object.assign(LS,{campaigns:c.campaigns||[],niches:c.niches||[],offers:c.offers||[],metrics:c.metrics||[],summary:c.summary||{},serpapi:!!c.serpapi,leads:l.leads||[],email:l.email||{},loaded:true});
    if(!LS.campaigns.some(x=>x.id===LS.campaignId))LS.campaignId=LS.campaigns[0]?.id||null;
  }catch(e){LS.loaded=true;LS.error="O servidor do Radar não respondeu. Abra pelo iniciar-radar.bat para usar Clientes."}
  renderLeads();renderEmailPanel();if(typeof render==="function")render();
}
const currentCampaign=()=>LS.campaigns.find(c=>c.id===LS.campaignId)||null;
const nicheLabel=k=>LS.niches.find(n=>n.key===k)?.label||String(k||"").replace(/^custom:/,"").replace(/-/g," ");
function campaignLeads(){return LS.leads.filter(l=>!LS.campaignId||LS.campaignId==="all"||l.campaignId===LS.campaignId)}
function filteredLeads(){
  const f=LEAD_FILTERS.find(x=>x.key===LS.filter)||LEAD_FILTERS[0];
  const q=normTxt(LS.query);
  const list=campaignLeads().filter(f.test).filter(l=>!q||normTxt(`${l.name} ${l.category} ${l.address} ${nicheLabel(l.niche)}`).includes(q));
  if(LS.filter==="new")list.sort((a,b)=>(b.score||0)-(a.score||0));
  else if(LS.filter==="follow")list.sort((a,b)=>String(a.followUpAt).localeCompare(String(b.followUpAt)));
  else list.sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
  return list;
}
function normTxt(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")}
function fmtDate(iso){return iso?new Date(iso).toLocaleDateString("pt-BR"):""}
function scoreClass(s){return s>=70?"boa":s>=50?"possivel":"baixa"}

// ---------- Tela ----------
function renderLeads(){
  const root=document.querySelector("#leads-app");if(!root)return;
  if(!LS.loaded){root.innerHTML=`<p class="muted">Carregando…</p>`;return}
  if(LS.error){root.innerHTML=`<p class="notice">${escapeHtml(LS.error)}</p>`;return}
  const sel=document.querySelector("#campaign-select");
  sel.innerHTML=LS.campaigns.length?LS.campaigns.map(c=>`<option value="${escapeHtml(c.id)}"${c.id===LS.campaignId?" selected":""}>${escapeHtml(c.name)}</option>`).join("")+(LS.campaigns.length>1?`<option value="all"${LS.campaignId==="all"?" selected":""}>Todas as campanhas</option>`:""):`<option value="">Nenhuma campanha</option>`;
  sel.disabled=!LS.campaigns.length;
  document.querySelector("#edit-campaign").hidden=!currentCampaign();
  const searchBtn=document.querySelector("#search-leads");searchBtn.hidden=!currentCampaign();searchBtn.disabled=LS.busy;
  searchBtn.querySelector("span").textContent=LS.busy?"Buscando empresas…":"Buscar empresas";
  if(LS.editing){root.innerHTML=campaignFormHtml(LS.editing);bindCampaignForm();return}
  if(!LS.campaigns.length){root.innerHTML=onboardingHtml();return}
  const c=currentCampaign();
  const all=campaignLeads();
  const counts=Object.fromEntries(LEAD_FILTERS.map(f=>[f.key,all.filter(f.test).length]));
  const list=filteredLeads();
  if(!list.some(l=>l.id===LS.selectedId))LS.selectedId=list[0]?.id||null;
  const lead=LS.leads.find(l=>l.id===LS.selectedId);
  root.innerHTML=`
    ${!LS.serpapi?`<p class="notice">Para buscar empresas no Google Maps, cadastre a chave do SerpApi em <button class="link" data-view="settings">Meu perfil › Fontes extras</button>. É a mesma chave do Google Vagas.</p>`:""}
    ${c?campaignSummaryHtml(c):""}
    <p id="leads-status" class="notice" role="status" aria-live="polite" hidden></p>
    <div class="filters leads-filters">
      <div class="chips" role="tablist" aria-label="Situação">${LEAD_FILTERS.map(f=>`<button class="chip${LS.filter===f.key?" active":""}" role="tab" aria-selected="${LS.filter===f.key}" data-lead-filter="${f.key}">${f.label}<span>${counts[f.key]}</span></button>`).join("")}</div>
      <label class="search-field"><svg class="i" aria-hidden="true"><use href="#i-search"/></svg><input id="lead-query" type="search" placeholder="Nome, ramo ou bairro" value="${escapeHtml(LS.query)}" aria-label="Filtrar empresas"></label>
    </div>
    <div class="split">
      <div class="list-col"><p class="list-count">${list.length} ${list.length===1?"empresa":"empresas"}</p><div class="job-list" id="leads-list">${list.length?list.map(leadItemHtml).join(""):empty(all.length?"Nada nesta situação":"Nenhuma empresa ainda",all.length?"Escolha outra situação acima.":"Clique em Buscar empresas para o Radar procurar no Google Maps.")}</div></div>
      <article class="detail-col" id="leads-detail" aria-live="polite">${lead?leadDetailHtml(lead):`<div class="empty"><strong>Selecione uma empresa</strong><span>Os detalhes e as mensagens aparecem aqui.</span></div>`}</article>
    </div>
    ${metricsHtml()}`;
}
function onboardingHtml(){
  return `<div class="leads-onboard">
    <h2>Comece por uma campanha</h2>
    <p class="muted">Uma campanha é uma oferta sua (por exemplo, "transformar fotos de notas em planilha") direcionada a alguns tipos de empresa numa região. O Radar procura essas empresas no Google Maps, confere se estão contratando para funções que a sua automação resolve, dá uma nota e escreve a primeira mensagem para você revisar.</p>
    <ol class="steps"><li>Descreva o que você vende, com suas palavras.</li><li>Confira a ficha da oferta que o Radar monta.</li><li>Escolha os nichos, a cidade e o raio.</li><li>Clique em Buscar empresas e revise as sugestões.</li></ol>
    <button class="button" data-lead-action="new-campaign">+ Criar primeira campanha</button>
  </div>`;
}
function campaignSummaryHtml(c){
  const o=c.offer||{};const st=c.lastStats;
  return `<div class="camp-summary">
    <div><span class="kicker">Oferta</span><strong>${escapeHtml(o.name||"—")}</strong><span class="muted small">${escapeHtml(o.short||"")}</span></div>
    <div><span class="kicker">Nichos</span><strong>${(c.niches||[]).length}</strong><span class="muted small">${escapeHtml((c.niches||[]).slice(0,3).map(nicheLabel).join(", "))}${(c.niches||[]).length>3?"…":""}</span></div>
    <div><span class="kicker">Região</span><strong>${escapeHtml(String(c.city||"—").split(",")[0])}</strong><span class="muted small">raio de ${c.radiusKm||15} km</span></div>
    <div><span class="kicker">Última busca</span><strong>${c.lastSearchAt?fmtDate(c.lastSearchAt):"Ainda não"}</strong><span class="muted small">${st?`${st.added} novas, ${st.updated} atualizadas`:"Clique em Buscar empresas"}</span></div>
  </div>`;
}
function leadItemHtml(l){
  const sel=l.id===LS.selectedId;
  const flags=[l.signals?.some(s=>s.type==="hiring-relevant")?'<span class="flag">Contratando</span>':l.signals?.length?'<span class="flag soft">Tem vagas</span>':"",followDue(l)?'<span class="flag warn">Retornar</span>':""].join("");
  const contact=[l.wa&&l.mobile?"WhatsApp":l.phone?"Telefone":"",l.email?"E-mail":""].filter(Boolean).join(" · ");
  return `<article class="job-item lead-item${sel?" selected":""}" data-lead-select="${escapeHtml(l.id)}" tabindex="0" aria-selected="${sel}">
    <div class="job-item-top"><h3>${escapeHtml(l.name)}</h3><span class="score ${scoreClass(l.score)}" title="Nota da empresa">${l.score??"–"}</span></div>
    <p class="job-co">${escapeHtml(l.category||nicheLabel(l.niche))}</p>
    <p class="job-loc">${escapeHtml(shortAddress(l.address))}</p>
    <p class="job-foot">${l.status!=="new"?`<span class="state lead-${l.status}">${LEAD_STATUS[l.status]}</span>`:""}${flags}${contact?`<span>${contact}</span>`:"<span>Sem contato</span>"}</p>
  </article>`;
}
function shortAddress(a){return String(a||"").replace(/,?\s*\d{5}-?\d{3}\s*$/,"").replace(/,?\s*Brasil$/i,"").trim()}
function leadDetailHtml(l){
  const id=escapeHtml(l.id);const m=l.messages||{};const em=LS.email||{};
  const site=safeUrl(l.website),maps=safeUrl(l.mapsUrl),insta=safeUrl(l.instagram);
  const waUrl=l.wa?`https://wa.me/${l.wa}?text=${encodeURIComponent(m.whatsapp||"")}`:null;
  const blocked=l.status==="blocked";
  const facts=[["Endereço",escapeHtml(l.address||"—")],["Telefone",l.phone?`${escapeHtml(l.phone)}${l.mobile?' <span class="muted">(celular)</span>':""}`:"—"],["E-mail",l.email?escapeHtml(l.email):'<span class="muted">não encontrado</span>'],["Site",site?`<a href="${escapeHtml(site)}" target="_blank" rel="noopener noreferrer">${escapeHtml(site.replace(/^https?:\/\/(www\.)?/,"").replace(/\/$/,""))}</a>`:'<span class="muted">sem site</span>'],...(insta?[["Instagram",`<a href="${escapeHtml(insta)}" target="_blank" rel="noopener noreferrer">${escapeHtml(insta.replace(/^https?:\/\/(www\.)?instagram\.com\//,"@").replace(/\/$/,""))}</a>`]]:[]),["Google",`${l.rating?`${String(l.rating).replace(".",",")} ★ · `:""}${l.reviews||0} avaliações${maps?` · <a href="${escapeHtml(maps)}" target="_blank" rel="noopener noreferrer">ver no Maps</a>`:""}`],["Nicho",escapeHtml(nicheLabel(l.niche))],["Encontrada em",fmtDate(l.foundAt)]];
  let h=`<header class="d-head">
    <p class="d-co">${escapeHtml(l.category||nicheLabel(l.niche))}</p>
    <h2 id="modal-title">${escapeHtml(l.name)}</h2>
    <p class="d-meta">${escapeHtml(shortAddress(l.address))}</p>
    <p class="d-fit"><span class="score ${scoreClass(l.score)}">${l.score??"–"}</span> <span class="state lead-${l.status}">${LEAD_STATUS[l.status]||l.status}</span>${l.contactedAt?` <span class="muted">· contatada em ${fmtDate(l.contactedAt)}</span>`:""}${l.followUpAt&&!blocked?` <span class="muted">· retorno ${fmtDate(l.followUpAt)}</span>`:""}</p>
    ${blocked?`<p class="notice">Esta empresa pediu para não ser contatada. O Radar não vai sugeri-la de novo.</p>`:""}
  </header>`;
  h+=section("Por que esta empresa",`<ul class="checks">${(l.reasons||[]).map(r=>`<li>${icon(/^Sem /.test(r)?"alert":"check")}<span>${escapeHtml(r)}</span></li>`).join("")}</ul>${(l.signals||[]).filter(s=>s.url).map(s=>`<p class="small"><a href="${escapeHtml(safeUrl(s.url)||"#")}" target="_blank" rel="noopener noreferrer">Ver a vaga: ${escapeHtml(s.text.replace(/^Está contratando: /,""))}</a></p>`).join("")}`);
  h+=`<dl class="facts">${facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
  if(!blocked){
    h+=section("Mensagem para WhatsApp",`<textarea class="msg-box" id="lead-wa" rows="9">${escapeHtml(m.whatsapp||"")}</textarea>
      <div class="row-actions">
        ${waUrl?`<a class="button" href="${escapeHtml(waUrl)}" target="_blank" rel="noopener noreferrer" data-lead-wa="${id}">${icon("message")} Abrir no WhatsApp</a>`:`<span class="muted small">${l.phone?"O número parece ser fixo; confira se atende WhatsApp antes de enviar.":"Sem telefone na ficha do Google."}</span>`}
        ${!l.mobile&&l.wa?`<span class="muted small">Número fixo: pode não ter WhatsApp.</span>`:""}
        <button class="button button-secondary" data-lead-action="copy-wa">${icon("copy")} Copiar</button>
        <button class="button button-ghost" data-lead-action="save-messages" data-id="${id}">Salvar texto</button>
      </div>
      <p class="d-hint" id="wa-hint" hidden>Mandou a mensagem? Clique em <strong>Enviei</strong> para o Radar marcar como contatada e lembrar de você retornar em 4 dias. <button class="button button-secondary" data-lead-status="contacted" data-id="${id}">${icon("check")} Enviei</button></p>`);
    const canSend=em.configured&&l.email;
    const mailto=l.email?`mailto:${encodeURIComponent(l.email)}?subject=${encodeURIComponent(m.emailSubject||"")}&body=${encodeURIComponent(m.emailBody||"")}`:null;
    h+=section("E-mail",`<div class="form-grid">
        <label class="full">Para<input id="lead-email" type="email" value="${escapeHtml(l.email||"")}" placeholder="E-mail da empresa (confira no site ou no Instagram)"></label>
        <label class="full">Assunto<input id="lead-subject" value="${escapeHtml(m.emailSubject||"")}"></label>
        <label class="full">Mensagem<textarea class="msg-box" id="lead-body" rows="14">${escapeHtml(m.emailBody||"")}</textarea></label>
      </div>
      <div class="row-actions">
        ${canSend?`<button class="button" data-lead-action="send-email" data-id="${id}">Enviar e-mail</button><span class="muted small">${em.sentToday||0} de ${em.dailyLimit||20} enviados hoje</span>`:mailto?`<a class="button button-secondary" href="${escapeHtml(mailto)}">Abrir no meu e-mail</a>`:""}
        <button class="button button-ghost" data-lead-action="save-messages" data-id="${id}">Salvar texto</button>
      </div>
      ${!em.configured?`<p class="muted small">Para enviar direto daqui, configure o seu Gmail em <button class="link" data-view="settings">Meu perfil › E-mail para prospecção</button>.</p>`:""}`);
  }
  h+=section("Acompanhamento",`<div class="form-grid">
      <label>Situação<select id="lead-status">${Object.entries(LEAD_STATUS).map(([k,v])=>`<option value="${k}"${k===l.status?" selected":""}>${v}</option>`).join("")}</select></label>
      <label>Lembrar de retornar em<input id="lead-follow" type="date" value="${l.followUpAt?new Date(l.followUpAt).toISOString().slice(0,10):""}"></label>
      <label class="full">Anotações<textarea id="lead-notes" rows="3" placeholder="Com quem falou, o que respondeu, próximo passo">${escapeHtml(l.notes||"")}</textarea></label>
    </div>
    <div class="row-actions"><button class="button button-secondary" data-lead-action="save-tracking" data-id="${id}">Salvar acompanhamento</button>${!blocked?`<button class="button button-ghost danger" data-lead-status="blocked" data-id="${id}">Não quer contato</button>`:""}</div>`);
  if(l.history?.length)h+=`<details class="disclosure"><summary>Histórico ${icon("chevron","i chev")}</summary><div class="disclosure-body"><ul class="plain">${l.history.slice().reverse().map(e=>`<li><span class="muted">${new Date(e.at).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</span> · ${escapeHtml(historyText(e.event))}</li>`).join("")}</ul></div></details>`;
  return h;
}
function historyText(t){return String(t).replace(/^Situação: (\w+)$/,(_,s)=>`Situação: ${LEAD_STATUS[s]||s}`)}
function metricsHtml(){
  const rows=LS.metrics.filter(m=>!LS.campaignId||LS.campaignId==="all"||m.campaignId===LS.campaignId);
  if(!rows.length)return "";
  const pct=(a,b)=>b?`${Math.round(a/b*100)}%`:"—";
  return `<div class="diagnostics"><h2>Resultados por nicho</h2><p class="muted">Mostra quais ramos respondem mais, para você concentrar a energia onde funciona.</p>
    <div class="table-wrap"><table class="metrics"><thead><tr><th>Nicho</th><th>Empresas</th><th>Contatadas</th><th>Responderam</th><th>Reuniões</th><th>Fechadas</th><th>Taxa de resposta</th></tr></thead><tbody>
    ${rows.sort((a,b)=>b.total-a.total).map(m=>`<tr><td>${escapeHtml(nicheLabel(m.niche))}</td><td>${m.total}</td><td>${m.contacted}</td><td>${m.replied}</td><td>${m.meeting}</td><td>${m.won}</td><td>${pct(m.replied,m.contacted)}</td></tr>`).join("")}
    </tbody></table></div></div>`;
}

// ---------- Editor de campanha ----------
function defaultCity(){try{return (typeof settings!=="undefined"&&settings.jobCity)||"Feira de Santana, BA"}catch{return "Feira de Santana, BA"}}
function defaultSummary(){try{return (typeof settings!=="undefined"&&settings.offer)||""}catch{return ""}}
function campaignFormHtml(c){
  const o=c.offer||{};const isNew=!c.id;
  const custom=(c.customNiches||[]).join(", ");
  const chosen=new Set(c.niches||[]);
  const opt=(v,l,cur)=>`<option value="${v}"${String(cur)===String(v)?" selected":""}>${l}</option>`;
  return `<form id="campaign-form" class="campaign-form" autocomplete="off">
    <div class="panel-heading"><div><h2>${isNew?"Nova campanha":"Editar campanha"}</h2><p>Uma campanha = uma oferta sua para alguns tipos de empresa numa região.</p></div></div>
    <section class="camp-step"><h3><span>1</span> O que você vende</h3>
      <div class="form-grid">
        <label class="full">Nome da campanha<input name="name" required maxlength="80" value="${escapeHtml(c.name||"")}" placeholder="Ex.: Notas para planilha — contabilidade"></label>
        <label class="full">Descreva com suas palavras<textarea name="offerSummary" rows="3" placeholder="Ex.: automação que pega fotos de notas, recibos e documentos e passa os dados para Excel ou Word, sem digitar">${escapeHtml(c.offerSummary??defaultSummary())}</textarea></label>
        <label>Modelo de oferta<select name="template"><option value="">Escolher pelo texto</option>${LS.offers.map(x=>opt(x.key,escapeHtml(x.name),o.template)).join("")}</select></label>
        <div class="field-action"><button type="button" class="button button-secondary" data-lead-action="build-sheet">Montar ficha da oferta</button></div>
      </div>
    </section>
    <section class="camp-step"><h3><span>2</span> Ficha da oferta <small class="muted">revise e ajuste; é daqui que saem as mensagens</small></h3>
      <div class="form-grid" id="offer-fields">${offerFieldsHtml(o)}</div>
    </section>
    <section class="camp-step"><h3><span>3</span> Nichos <small class="muted">tipos de empresa que mais sofrem com o problema</small></h3>
      <div class="niche-grid">${LS.niches.map(n=>`<label class="niche"><input type="checkbox" name="niche" value="${escapeHtml(n.key)}"${chosen.has(n.key)?" checked":""}><span><strong>${escapeHtml(n.label)}</strong>${n.cnae?`<small>CNAE ${escapeHtml(n.cnae)}</small>`:""}</span></label>`).join("")}</div>
      <label class="full">Outros nichos (separados por vírgula)<input name="customNiches" value="${escapeHtml(custom)}" placeholder="Ex.: gráficas, pet shops"></label>
    </section>
    <section class="camp-step"><h3><span>4</span> Onde e como</h3>
      <div class="form-grid">
        <label>Cidade<input name="city" value="${escapeHtml(c.city||defaultCity())}" placeholder="Cidade, UF"></label>
        <label>Raio<select name="radiusKm">${[5,10,15,25,50].map(v=>opt(v,`${v} km`,c.radiusKm||15)).join("")}</select></label>
        <label>Empresas por nicho<select name="pagesPerNiche">${opt(1,"até 20 (1 busca por nicho)",c.pagesPerNiche||1)}${opt(2,"até 40 (2 buscas)",c.pagesPerNiche||1)}${opt(3,"até 60 (3 buscas)",c.pagesPerNiche||1)}</select></label>
        <label>Tom da mensagem<select name="tone">${opt("informal","Próximo e simples",c.tone||"informal")}${opt("formal","Mais formal",c.tone||"informal")}</select></label>
        <label>Primeiro contato por<select name="channel">${opt("whatsapp","WhatsApp",c.channel||"email")}${opt("email","E-mail",c.channel||"email")}${opt("ambos","Os dois",c.channel||"email")}</select></label>
        <fieldset class="full porte" disabled><legend>Porte da empresa <span class="flag soft">em breve</span></legend><label><input type="checkbox"> MEI</label><label><input type="checkbox"> Micro</label><label><input type="checkbox"> Pequena</label><label><input type="checkbox"> Média</label><p class="muted small">Vai usar os dados públicos de CNPJ. Por enquanto a nota considera avaliações no Google, site e vagas abertas.</p></fieldset>
      </div>
      <p class="muted small" id="camp-cost"></p>
    </section>
    <div class="form-actions"><button class="button" type="submit">${isNew?"Criar campanha":"Salvar campanha"}</button><button class="button button-ghost" type="button" data-lead-action="cancel-campaign">Cancelar</button>${!isNew?`<button class="button button-ghost danger" type="button" data-lead-action="delete-campaign">Excluir campanha</button>`:""}<span class="save-note" id="campaign-saved"></span></div>
  </form>`;
}
function offerFieldsHtml(o){
  const f=(name,label,val,rows=2,full=true)=>`<label class="${full?"full":""}">${label}<textarea name="offer.${name}" rows="${rows}">${escapeHtml(val||"")}</textarea></label>`;
  return `<label>Nome da oferta<input name="offer.name" value="${escapeHtml(o.name||"")}"></label>
    <label>Em uma frase (vai na apresentação)<input name="offer.short" value="${escapeHtml(o.short||"")}" placeholder="automações que transformam fotos e PDFs em planilhas"></label>
    ${f("problem","Problema que resolve",o.problem)}${f("delivery","Como funciona",o.delivery)}${f("result","Resultado para o cliente",o.result)}${f("opening","Frase de abertura",o.opening)}
    ${f("questions","Perguntas para entender o cliente (uma por linha)",o.questions,3)}
    ${f("hiring","Vagas que indicam necessidade (separadas por vírgula)",o.hiring)}
    <input type="hidden" name="offer.template" value="${escapeHtml(o.template||"")}"><input type="hidden" name="offer.generatedBy" value="${escapeHtml(o.generatedBy||"")}">
    <p class="muted small full">Nos textos, {docs}, {flow} e {plural} são trocados automaticamente pelo que é típico de cada nicho (ex.: em contabilidade, {docs} vira “notas fiscais e recibos que os clientes mandam por foto”).</p>
    ${o.generatedBy==="modelo"?`<p class="muted small full">Ficha montada a partir de um modelo pronto. Quando a IA do Radar estiver conectada, ela vai escrever a ficha a partir do seu texto.</p>`:""}`;
}
function readCampaignForm(form){
  const fd=new FormData(form);const offer={};
  for(const [k,v] of fd.entries())if(k.startsWith("offer."))offer[k.slice(6)]=v;
  return {name:fd.get("name"),offerSummary:fd.get("offerSummary"),offer,niches:fd.getAll("niche"),customNiches:String(fd.get("customNiches")||"").split(",").map(s=>s.trim()).filter(Boolean),city:fd.get("city"),radiusKm:fd.get("radiusKm"),pagesPerNiche:fd.get("pagesPerNiche"),tone:fd.get("tone"),channel:fd.get("channel")};
}
function updateCost(){
  const form=document.querySelector("#campaign-form");if(!form)return;
  const d=readCampaignForm(form);const n=d.niches.length+d.customNiches.length;const p=Number(d.pagesPerNiche)||1;
  document.querySelector("#camp-cost").textContent=n?`Cada busca desta campanha usa até ${n*p} ${n*p===1?"consulta":"consultas"} do SerpApi (${n} ${n===1?"nicho":"nichos"} × ${p}). O resultado fica guardado por 7 dias, então repetir a busca na mesma semana não gasta de novo.`:"Escolha pelo menos um nicho.";
}
function bindCampaignForm(){
  const form=document.querySelector("#campaign-form");if(!form)return;
  form.addEventListener("input",updateCost);form.addEventListener("change",updateCost);updateCost();
  form.addEventListener("submit",async e=>{
    e.preventDefault();const d=readCampaignForm(form);
    if(!d.niches.length&&!d.customNiches.length){showToast("Escolha pelo menos um nicho.");return}
    if(!d.offer.name&&!d.offer.delivery){const r=await api("/api/campaigns/offer-sheet",{method:"POST",body:{summary:d.offerSummary,template:form.elements.template.value||null}});d.offer=r.offer}
    try{
      const isNew=!LS.editing.id;
      const r=await api(isNew?"/api/campaigns":`/api/campaigns/${encodeURIComponent(LS.editing.id)}`,{method:isNew?"POST":"PUT",body:d});
      LS.campaignId=r.campaign.id;try{localStorage.setItem("radar-campaign",LS.campaignId)}catch{}
      LS.editing=null;
      if(!isNew&&LS.leads.some(l=>l.campaignId===r.campaign.id)){try{await api(`/api/campaigns/${encodeURIComponent(r.campaign.id)}/regenerate`,{method:"POST"})}catch{}}
      await document.querySelector("#digest-test")?.addEventListener("click",async e=>{const b=e.target;b.disabled=true;b.textContent="Enviando…";try{const r=await api("/api/digest/test",{method:"POST",body:{}});showToast(`Resumo enviado para ${r.to}.`);LS.email.lastDigestAt=new Date().toISOString();renderEmailPanel()}catch(err){showToast(err.message)}finally{b.disabled=false;b.textContent="Enviar um resumo agora"}});
loadLeads();
      showToast(isNew?"Campanha criada. Agora clique em Buscar empresas.":"Campanha salva. Mensagens não editadas foram reescritas.");
    }catch(err){showToast(err.message)}
  });
}

// ---------- Ações ----------
function setLeadStatus(msg,kind=""){const el=document.querySelector("#leads-status");if(!el)return;el.hidden=!msg;el.textContent=msg||"";el.className=`notice ${kind}`}
async function saveLead(id,body,msg){
  try{const r=await api(`/api/leads/${encodeURIComponent(id)}`,{method:"POST",body});const i=LS.leads.findIndex(l=>l.id===id);if(i>=0)LS.leads[i]=r.lead;if(msg)showToast(msg);refreshMetrics();return r.lead}
  catch(e){showToast(e.message)}
}
async function refreshMetrics(){try{const c=await api("/api/campaigns");LS.metrics=c.metrics||[];LS.summary=c.summary||{}}catch{}renderLeads();if(typeof render==="function")render()}
function currentMessages(){const out={};const wa=document.querySelector("#lead-wa"),s=document.querySelector("#lead-subject"),b=document.querySelector("#lead-body");if(wa)out.whatsapp=wa.value;if(s)out.emailSubject=s.value;if(b)out.emailBody=b.value;return out}
function leadRoot(){return document.querySelector("#modal-backdrop:not(.hidden) #modal-content")||document.querySelector("#leads-detail")}
function selectLead(id){
  LS.selectedId=id;
  if(narrow()){const l=LS.leads.find(x=>x.id===id);if(!l)return;$("#modal-content").innerHTML=leadDetailHtml(l);$("#modal-backdrop").classList.remove("hidden");document.body.classList.add("modal-open");return}
  renderLeads();const d=document.querySelector("#leads-detail");if(d)d.scrollTop=0;
}
function rerenderDetail(){
  const l=LS.leads.find(x=>x.id===LS.selectedId);if(!l)return renderLeads();
  if(!$("#modal-backdrop").classList.contains("hidden")&&document.querySelector("#modal-content #lead-status"))$("#modal-content").innerHTML=leadDetailHtml(l);
  renderLeads();
}
async function runSearch(){
  const c=currentCampaign();if(!c||LS.busy)return;
  if(!LS.serpapi){showToast("Cadastre a chave do SerpApi em Meu perfil › Fontes extras.");return}
  LS.busy=true;renderLeads();
  const n=(c.niches||[]).length*(c.pagesPerNiche||1);
  setLeadStatus(`Procurando ${(c.niches||[]).length} ${(c.niches||[]).length===1?"nicho":"nichos"} no Google Maps e conferindo os sites das empresas. Pode levar até ${Math.max(1,Math.ceil(n*0.4))} minuto(s)…`);
  try{
    const r=await api(`/api/campaigns/${encodeURIComponent(c.id)}/search`,{method:"POST"});
    LS.busy=false;await loadLeads();LS.filter="new";renderLeads();
    const s=r.stats||{};
    setLeadStatus(`${s.added||0} empresas novas, ${s.updated||0} atualizadas${s.skippedBlocked?`, ${s.skippedBlocked} ignoradas por pedirem para não ser contatadas`:""}.${s.errors?.length?` Avisos: ${s.errors.join(" · ")}`:""}`,s.errors?.length?"warn":"");
  }catch(e){LS.busy=false;renderLeads();setLeadStatus(`A busca falhou: ${e.message}`,"warn")}
}
document.addEventListener("click",async e=>{
  const pick=e.target.closest("[data-lead-select]");if(pick&&!e.target.closest("a[href]")){selectLead(pick.dataset.leadSelect);return}
  const f=e.target.closest("[data-lead-filter]");if(f){LS.filter=f.dataset.leadFilter;LS.selectedId=null;renderLeads();return}
  const wa=e.target.closest("[data-lead-wa]");if(wa){const hint=leadRoot()?.querySelector("#wa-hint");if(hint)hint.hidden=false;return}
  const st=e.target.closest("[data-lead-status]");
  if(st){const id=st.dataset.id;const status=st.dataset.leadStatus;
    if(status==="blocked"&&!confirm("Marcar como “não quer contato”? O Radar não vai sugerir esta empresa de novo."))return;
    await saveLead(id,{status,messages:status==="contacted"?currentMessages():undefined},status==="contacted"?"Marcada como contatada. Lembrete de retorno em 4 dias.":"Empresa bloqueada para novos contatos.");
    rerenderDetail();return}
  const b=e.target.closest("[data-lead-action]");if(!b)return;
  const a=b.dataset.leadAction,id=b.dataset.id;
  if(a==="new-campaign"){LS.editing={offerSummary:defaultSummary(),city:defaultCity(),radiusKm:15,pagesPerNiche:1,niches:[]};renderLeads();document.querySelector("#campaign-form input[name=name]")?.focus()}
  if(a==="cancel-campaign"){LS.editing=null;renderLeads()}
  if(a==="delete-campaign"){const c=LS.editing;if(!c?.id)return;if(!confirm(`Excluir a campanha “${c.name}”? As empresas encontradas continuam na lista.`))return;try{await api(`/api/campaigns/${encodeURIComponent(c.id)}`,{method:"DELETE"});LS.editing=null;LS.campaignId=null;await loadLeads();showToast("Campanha excluída.")}catch(err){showToast(err.message)}}
  if(a==="build-sheet"){const form=document.querySelector("#campaign-form");const summary=form.elements.offerSummary.value.trim();if(!summary&&!form.elements.template.value){showToast("Descreva o que você vende ou escolha um modelo.");return}
    try{const r=await api("/api/campaigns/offer-sheet",{method:"POST",body:{summary,template:form.elements.template.value||null}});document.querySelector("#offer-fields").innerHTML=offerFieldsHtml(r.offer);form.elements.template.value=r.offer.template||"";if(!form.elements.name.value)form.elements.name.value=r.offer.name;showToast("Ficha montada. Revise os textos.")}catch(err){showToast(err.message)}}
  if(a==="copy-wa"){const t=leadRoot()?.querySelector("#lead-wa")?.value||"";navigator.clipboard?.writeText(t).then(()=>{showToast("Mensagem copiada.");const hint=leadRoot()?.querySelector("#wa-hint");if(hint)hint.hidden=false},()=>showToast("Selecione o texto e copie manualmente."))}
  if(a==="save-messages"){const root=leadRoot();const email=root?.querySelector("#lead-email")?.value.trim();await saveLead(id,{messages:currentMessages(),...(email!==undefined?{email}:{})},"Texto salvo.")}
  if(a==="save-tracking"){const root=leadRoot();const status=root.querySelector("#lead-status").value;const follow=root.querySelector("#lead-follow").value;const notes=root.querySelector("#lead-notes").value;
    const lead=LS.leads.find(x=>x.id===id);const prev=lead?.followUpAt?new Date(lead.followUpAt).toISOString().slice(0,10):"";const body={status,notes};if(follow!==prev)body.followUpAt=follow?new Date(`${follow}T09:00:00`).toISOString():null;
    await saveLead(id,body,"Acompanhamento salvo.");rerenderDetail()}
  if(a==="send-email"){const root=leadRoot();const email=root.querySelector("#lead-email").value.trim();const subject=root.querySelector("#lead-subject").value.trim();const body=root.querySelector("#lead-body").value;
    if(!email){showToast("Informe o e-mail da empresa.");return}
    if(!confirm(`Enviar este e-mail para ${email} agora?`))return;
    b.disabled=true;b.textContent="Enviando…";
    const l=LS.leads.find(x=>x.id===id);if(l&&l.email!==email)await saveLead(id,{email});
    try{const r=await api(`/api/leads/${encodeURIComponent(id)}/send-email`,{method:"POST",body:{subject,body}});const i=LS.leads.findIndex(x=>x.id===id);if(i>=0)LS.leads[i]=r.lead;LS.email=r.email||LS.email;showToast("E-mail enviado. Lembrete de retorno em 4 dias.");refreshMetrics();rerenderDetail()}
    catch(err){b.disabled=false;b.textContent="Enviar e-mail";showToast(err.message)}}
  if(a==="remove-gmail"){try{const r=await api("/api/integrations",{method:"POST",body:{remove:"gmail"}});LS.email=r.email||LS.email;renderEmailPanel();showToast("Senha de app removida.")}catch(err){showToast(err.message)}}
});
document.addEventListener("keydown",e=>{const it=e.target.closest?.("[data-lead-select]");if(it&&(e.key==="Enter"||e.key===" ")){e.preventDefault();selectLead(it.dataset.leadSelect)}});
document.addEventListener("input",e=>{if(e.target.id==="lead-query"){clearTimeout(window._lq);window._lq=setTimeout(()=>{LS.query=e.target.value;renderLeads();const q=document.querySelector("#lead-query");if(q){q.focus();q.setSelectionRange(q.value.length,q.value.length)}},200)}});
document.querySelector("#campaign-select")?.addEventListener("change",e=>{LS.campaignId=e.target.value||null;LS.selectedId=null;try{localStorage.setItem("radar-campaign",LS.campaignId||"")}catch{}renderLeads()});
document.querySelector("#new-campaign")?.addEventListener("click",()=>{LS.editing={offerSummary:defaultSummary(),city:defaultCity(),radiusKm:15,pagesPerNiche:1,niches:[]};renderLeads()});
document.querySelector("#edit-campaign")?.addEventListener("click",()=>{const c=currentCampaign();if(c){LS.editing=structuredClone(c);renderLeads()}});
document.querySelector("#search-leads")?.addEventListener("click",runSearch);

// ---------- Meu perfil › E-mail para prospecção ----------
function renderEmailPanel(){
  const form=document.querySelector("#email-form");if(!form)return;const em=LS.email||{};
  const st=document.querySelector("#int-email");if(st){st.textContent=em.configured?"Ativo":"Não configurado";st.className=`state ${em.configured?"approved":""}`}
  for(const [k,v] of [["gmailUser",em.user],["senderName",em.senderName],["senderTitle",em.senderTitle],["senderPhone",em.senderPhone],["senderSite",em.senderSite],["alertEmail",em.alertEmail]])if(form.elements[k]&&document.activeElement!==form.elements[k])form.elements[k].value=v||"";
  if(form.elements.dailyLimit)form.elements.dailyLimit.value=String(em.dailyLimit||20);
  if(form.elements.digestEnabled)form.elements.digestEnabled.checked=em.digestEnabled!==false;
  if(form.elements.digestHour)form.elements.digestHour.value=String(em.digestHour??5);
  const dl=document.querySelector("#digest-last");if(dl)dl.textContent=em.lastDigestAt?`Último: ${new Date(em.lastDigestAt).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}`:"";
  form.elements.gmailPass.placeholder=em.configured?"Senha de app salva (deixe em branco para manter)":"16 letras, sem espaços";
  const n=document.querySelector("#email-sent-today");if(n)n.textContent=em.configured?`${em.sentToday||0} de ${em.dailyLimit||20} e-mails enviados hoje.`:"";
}
document.querySelector("#email-form")?.addEventListener("submit",async e=>{
  e.preventDefault();const f=e.target.elements;
  const body={gmailUser:f.gmailUser.value.trim(),gmailPass:f.gmailPass.value.replace(/\s+/g,""),senderName:f.senderName.value,senderTitle:f.senderTitle.value,senderPhone:f.senderPhone.value,senderSite:f.senderSite.value,alertEmail:f.alertEmail.value.trim(),digestEnabled:f.digestEnabled.checked,digestHour:f.digestHour.value,dailyLimit:f.dailyLimit.value};
  if(body.gmailUser&&!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(body.gmailUser)){showToast("Confira o endereço de e-mail.");return}
  try{const r=await api("/api/integrations",{method:"POST",body});f.gmailPass.value="";LS.email=r.email||LS.email;renderEmailPanel();document.querySelector("#email-saved").textContent="Salvo. As mensagens que você não editou já usam a nova assinatura.";showToast("E-mail de prospecção salvo.")}
  catch(err){showToast(err.message)}
});
loadLeads();
