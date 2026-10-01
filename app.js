const STORAGE_KEY = "radar-daniel-prototype-v1";
const seed = [
  {id:"job-1",type:"jobs",title:"Analista de Suporte a Sistemas Jr.",subtitle:"Empresa exemplo • Remoto, Brasil",description:"Atendimento a usuários, investigação de incidentes e orientação sobre o sistema.",tags:["Suporte","Remoto","Júnior"],score:88,evidence:["Experiência em suporte técnico e atendimento na Atento.","Diagnóstico de incidentes de hardware e software.","Vivência com sistemas e orientação ao cliente."],gap:"Confirmar quais ferramentas de chamados você já utilizou.",resume:"Destacar atendimento técnico, diagnóstico de incidentes e comunicação com usuários. Manter os períodos e fatos do currículo original.",status:"pending"},
  {id:"job-2",type:"jobs",title:"Assistente de Dados e Indicadores",subtitle:"Empresa exemplo • Feira de Santana, BA",description:"Apoio na criação de relatórios, conferência de dados e acompanhamento de indicadores.",tags:["Dados","Presencial","Assistente"],score:81,evidence:["Cursos de SQL, Power BI e Excel avançado.","Projetos de dashboards analíticos no portfólio.","Experiência com registros de estoque e rotinas administrativas."],gap:"Detalhar o uso real de SQL e Power BI em cada projeto.",resume:"Abrir com cursos de dados, dashboards e experiência em registros e controles. Descrever apenas ferramentas confirmadas.",status:"pending"},
  {id:"job-3",type:"jobs",title:"Assistente de Implantação de Software",subtitle:"Empresa exemplo • Feira de Santana, BA",description:"Acompanhamento de clientes na adoção de um sistema e apoio à organização de processos.",tags:["Implantação","Híbrido","Assistente"],score:76,evidence:["Atendimento técnico a clientes.","Experiência administrativa e logística.","Projetos de automação e sistemas."],gap:"Verificar exigência de viagens e conhecimento de ERP.",resume:"Enfatizar suporte ao cliente, organização de processos e experiência com sistemas.",status:"pending"},
  {id:"content-1",type:"content",title:"O que aprendi criando um gerador de anúncios com IA",subtitle:"Pauta para LinkedIn • Projeto do portfólio",description:"Mostrar um problema real, a solução construída e por que você manteve preço e título sob controle humano.",tags:["Projeto","IA","Produto"],objective:"Mostrar como você resolve um problema real com IA e onde mantém o controle humano.",bestTime:"Terça ou quinta, entre 8h e 9h",source:"Seu projeto: gerador de anúncios com IA",draft:"Criei um gerador de descrições de anúncios a partir de imagens de produtos. Uma decisão importante foi manter preço e título como entradas manuais: a automação ajuda a produzir o texto, enquanto a pessoa preserva o controle sobre informações comerciais. Estou estudando como aplicar IA a tarefas práticas, com atenção ao que deve continuar sob revisão humana.",status:"pending"},
  {id:"content-2",type:"content",title:"Como dados de marketplace podem apoiar decisões",subtitle:"Pauta para LinkedIn • Dados e BI",description:"Explicar o raciocínio por trás dos seus dashboards, sem divulgar resultados que não foram medidos.",tags:["Power BI","Dados","Portfólio"],objective:"Mostrar raciocínio analítico para vagas de dados e BI, sem inventar resultados.",bestTime:"Quarta, entre 12h e 13h",source:"Seu projeto: dashboards analíticos",draft:"Tenho trabalhado em dashboards que cruzam taxas de marketplaces para facilitar comparações e decisões. O exercício tem reforçado uma lição: um painel útil começa pelas perguntas certas e pela qualidade dos dados, antes da escolha do gráfico. Quero seguir desenvolvendo projetos que conectem análise de dados a problemas concretos de negócio.",status:"pending"},
  {id:"lead-1",type:"leads",title:"Loja local com catálogo digital",subtitle:"Perfil ilustrativo • Feira de Santana, BA",description:"Uma loja que publica produtos com frequência pode se beneficiar de um fluxo assistido para preparar descrições de anúncios.",tags:["Comércio local","Catálogo","Automação"],offer:"Automação para gerar descrições de produtos",evidence:["Seu projeto de gerador de anúncios pode servir como demonstração.","A hipótese precisa ser validada antes de abordar uma empresa real."],draft:"Olá! Trabalho com soluções simples de automação para organizar a criação de descrições de produtos. Vi que sua loja divulga um catálogo com frequência e pensei em uma forma de reduzir o tempo dessa tarefa, mantendo preços e títulos sob seu controle. Se fizer sentido, posso mostrar um exemplo sem compromisso.",status:"pending"},
  {id:"content-3",type:"content",title:"Do suporte técnico aos dados: o que o atendimento me ensinou",subtitle:"Pauta para LinkedIn • Trajetória",description:"Ligar sua experiência em suporte e atendimento ao interesse por dados e automação.",tags:["Carreira","Suporte","Dados"],objective:"Apresentar sua trajetória para recrutadores de suporte e dados de forma honesta.",bestTime:"Segunda, entre 18h e 19h",source:"Seu currículo: experiência na Atento e estudos em ADS",draft:"Durante o tempo em que trabalhei com suporte técnico, aprendi que resolver um problema começa por entender bem o que a pessoa está vivendo. Hoje, estudando Análise e Desenvolvimento de Sistemas, vejo a mesma lógica nos dados: antes de montar qualquer painel, é preciso fazer as perguntas certas. Sigo aprendendo e buscando unir atendimento, tecnologia e análise de dados.",status:"pending"},
  {id:"lead-2",type:"leads",title:"Clínica com agendamento por mensagem",subtitle:"Perfil ilustrativo • Feira de Santana, BA",description:"Clínicas que confirmam consultas manualmente podem ganhar tempo com lembretes e confirmações automatizadas.",tags:["Saúde","Agendamento","Automação"],offer:"Lembretes e confirmações automatizados",evidence:["Sua experiência com n8n e automações se aplica a lembretes e confirmações.","A necessidade precisa ser confirmada com a própria clínica antes de qualquer proposta."],draft:"Olá! Trabalho com automações simples para pequenos negócios. Muitas clínicas gastam tempo confirmando consultas uma a uma; montei fluxos que ajudam nessa rotina, sempre com revisão da equipe. Se fizer sentido para vocês, posso explicar como funcionaria, sem compromisso.",status:"pending"}
];

function load(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(Array.isArray(saved))return saved}catch{}return structuredClone(seed)}
let items=load();
(function migrate(){for(const i of items)if(i.type==="jobs"&&(i.status==="approved"||i.status==="adjustments"))i.status="saved";const byId=new Map(items.map(i=>[i.id,i]));let changed=false;for(const sd of seed){if(sd.type==="jobs")continue;const cur=byId.get(sd.id);if(!cur){items.push(structuredClone(sd));changed=true}else{for(const k of Object.keys(sd))if(cur[k]===undefined){cur[k]=sd[k];changed=true}}}if(changed)try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items))}catch{}})();
items=items.filter(i=>i.type==="jobs");
const selected={content:null,leads:null};let activeView="overview";let selectedId=null;let selectedJobId=null;let toastTimer;
const jobFilters={fit:"all",mode:"all",source:"all",query:""};
const MODE_CHIPS=[["all","Todas"],["Remoto","Remoto no Brasil"],["Fora do Brasil","Fora do Brasil"],["Presencial","Na minha cidade"],["Híbrido","Híbrido"]];
const $=s=>document.querySelector(s);
const narrow=()=>window.matchMedia("(max-width: 960px)").matches;
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items))}catch{}}
const _decoder=document.createElement("textarea");
function decodeEntities(s){const t=String(s??"");if(!/&[#a-z0-9]+;/i.test(t))return t;_decoder.innerHTML=t;return _decoder.value}
function escapeHtml(s){s=decodeEntities(s);return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
function icon(name,cls="i"){return `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`}
function typeName(t){return {jobs:"Vaga",content:"Publicação",leads:"Cliente"}[t]}
function statusName(s,type){if(type==="jobs")return {pending:"Para analisar",saved:"Salva para depois",applied:"Candidatura feita",rejected:"Sem interesse",approved:"Salva para depois",adjustments:"Salva para depois"}[s]||s;const m=type==="leads";return {pending:"Para analisar",approved:m?"Aprovado":"Aprovada",adjustments:"Ajuste pedido",rejected:m?"Recusado":"Recusada"}[s]}
function statusClass(s){return {pending:"pending",applied:"approved",saved:"saved"}[s]||s}
function safeUrl(value){try{const url=new URL(value);return ["https:","http:"].includes(url.protocol)?url.href:null}catch{return null}}
function isRealJob(i){return i.type==="jobs"&&!/^job-\d$/.test(i.id)}
function getPending(t){return items.filter(i=>i.type===t&&i.status==="pending")}
function showToast(message){const t=$("#toast");t.textContent=message;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),3200)}
function setView(view){activeView=view;document.querySelectorAll(".view").forEach(el=>el.classList.toggle("active",el.id===view));document.querySelectorAll(".nav-item").forEach(el=>el.classList.toggle("active",el.dataset.view===view));document.querySelector(".profile-chip")?.classList.toggle("active",view==="settings");render();window.scrollTo({top:0,behavior:"instant"})}
function jobMode(item){return (item.tags||[]).find(t=>["Remoto","Fora do Brasil","Híbrido","Presencial","Local"].includes(t))||""}
function company(item){return (item.subtitle||"").split(" • ")[0]}
function place(item){return (item.subtitle||"").split(" • ").slice(1).join(" • ")}
function relDate(iso){if(!iso)return "";const days=Math.floor((Date.now()-new Date(iso))/86400000);if(days<=0)return "hoje";if(days===1)return "ontem";return `há ${days} dias`}
function dateText(item){const tag=(item.tags||[]).find(t=>/^(Publicada|Boletim|Sem data)/.test(t));if(!tag)return "";if(/^Publicada/.test(tag)&&item.publishedAt)return `Publicada ${relDate(item.publishedAt)}`;if(/^Sem data/.test(tag))return "Sem data na fonte";return tag}
function fitText(item){return item.fit==="boa"?"Boa correspondência":item.fit==="possivel"?"Possível correspondência":""}
function jobListItem(item,opts={}){
  const isNew=(item.tags||[]).includes("Nova");
  const sel=item.id===selectedJobId&&!opts.wide;
  const bits=[place(item),jobMode(item)].filter(Boolean).filter((v,i,a)=>!(i===1&&/remoto/i.test(a[0])&&v==="Remoto"));
  return `<article class="job-item${sel?" selected":""}${item.status!=="pending"?" decided":""}" data-action="select" data-id="${item.id}" tabindex="0" aria-selected="${sel}">
    <div class="job-item-top"><h3>${escapeHtml(item.title)}</h3>${isNew?'<span class="flag">Nova</span>':""}</div>
    <p class="job-co">${escapeHtml(company(item))}</p>
    <p class="job-loc">${escapeHtml(bits.join(" · "))}</p>
    <p class="job-foot">${item.status!=="pending"?`<span class="state ${statusClass(item.status)}">${statusName(item.status,"jobs")}${item.status==="applied"&&item.appliedAt?` em ${new Date(item.appliedAt).toLocaleDateString("pt-BR")}`:""}</span>`:item.fit?`<span class="fitdot ${item.fit}">${fitText(item)}</span>`:""}${item.matchSummary?`<span>${escapeHtml(item.matchSummary.replace(" citados constam no seu currículo"," do seu currículo"))}</span>`:""}<span>${escapeHtml(dateText(item))}${item.source?` · ${escapeHtml(item.source)}`:""}</span></p>
  </article>`;
}
function otherListItem(item,opts={}){
  const sel=!opts.wide&&selected[item.type]===item.id;
  const kind=item.type==="content"?"Publicação para o LinkedIn":"Cliente em potencial";
  return `<article class="job-item${sel?" selected":""}${item.status!=="pending"?" decided":""}" data-action="select" data-id="${item.id}" tabindex="0" aria-selected="${sel}">
    <div class="job-item-top"><h3>${escapeHtml(item.title)}</h3>${opts.wide?`<span class="kind">${kind}</span>`:""}</div>
    <p class="job-loc">${escapeHtml((item.subtitle||"").replace(/^Pauta para LinkedIn • /,"").replace(/ • /g," · "))}</p>
    <p class="job-snippet">${escapeHtml(item.description||"")}</p>
    <p class="job-foot">${item.status!=="pending"?`<span class="state ${statusClass(item.status)}">${statusName(item.status,item.type)}</span>`:""}${(item.tags||[]).slice(0,3).map(t=>`<span>${escapeHtml(t)}</span>`).join("")}</p>
  </article>`;
}
function card(item){
  if(item.type==="jobs"){const h=jobListItem(item,{wide:true});return h.replace('<div class="job-item-top"><h3>','<div class="job-item-top"><h3>').replace('</h3>','</h3><span class="kind">Vaga</span>')}
  return otherListItem(item,{wide:true});
}
function empty(title,label){return `<div class="empty"><strong>${title}</strong><span>${label}</span></div>`}
function filteredJobs(){
  const status=$("#job-filter").value;const q=jobFilters.query.trim().toLowerCase();
  const hasReal=items.some(isRealJob);
  return items.filter(i=>i.type==="jobs"&&(!hasReal||isRealJob(i))&&(status==="all"||i.status===status)&&(jobFilters.fit==="all"||i.fit===jobFilters.fit)&&(jobFilters.mode==="all"||jobMode(i)===jobFilters.mode||(jobFilters.mode==="Presencial"&&jobMode(i)==="Local"))&&(jobFilters.source==="all"||String(i.source||"").split(" · ")[0]===jobFilters.source)&&(!q||`${i.title} ${i.subtitle} ${i.originalTitle||""}`.toLowerCase().includes(q)))
    .sort((a,b)=>(a.fit===b.fit?0:a.fit==="boa"?-1:b.fit==="boa"?1:0)||((b.tags||[]).includes("Nova")-(a.tags||[]).includes("Nova"))||(b.score||0)-(a.score||0)||String(b.publishedAt||"").localeCompare(String(a.publishedAt||"")));
}
function refreshSourceOptions(){const sel=$("#source-filter");const current=sel.value;const sources=[...new Set(items.filter(isRealJob).map(i=>String(i.source||"").split(" · ")[0]).filter(Boolean))].sort();sel.innerHTML=`<option value="all">Todas as fontes</option>`+sources.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");sel.value=sources.includes(current)?current:"all";jobFilters.source=sel.value}
function section(label,content){return `<section class="d-section"><h3>${label}</h3>${content}</section>`}
function detailHtml(item,mode="details"){
  const id=item.id;
  if(item.type!=="jobs")return otherDetailHtml(item,mode);
  const url=safeUrl(item.sourceUrl);
  const gaps=item.gaps?.length?item.gaps:(item.gap?[item.gap]:[]);
  const meta=[place(item),/remoto/i.test(place(item))?"":jobMode(item),dateText(item)].filter(Boolean);
  let h=`<header class="d-head">
    <p class="d-co">${escapeHtml(company(item))}</p>
    <h2 id="modal-title">${escapeHtml(item.title)}</h2>
    <p class="d-meta">${meta.map(escapeHtml).join(" · ")}</p>
    ${item.fit&&item.status==="pending"?`<p class="d-fit"><span class="fitdot ${item.fit}">${fitText(item)}</span>${item.matchSummary?` <span class="muted">· ${escapeHtml(item.matchSummary)}</span>`:""}</p>`:item.status!=="pending"?`<p class="d-fit"><span class="state ${statusClass(item.status)}">${statusName(item.status,"jobs")}${item.status==="applied"&&item.appliedAt?` em ${new Date(item.appliedAt).toLocaleDateString("pt-BR")}`:""}</span></p>`:""}
    <div class="d-actions">
      ${url?`<a class="button" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" data-open-job="${id}">Ver vaga e me candidatar ${icon("external")}</a>`:""}
      ${item.status==="applied"?`<button class="button button-ghost" data-action="reopen" data-id="${id}">Desfazer: ainda não me candidatei</button>`:`<button class="button button-secondary" data-action="applied" data-id="${id}">${icon("check")} Já me candidatei</button>${item.status!=="saved"?`<button class="button button-secondary" data-action="save-later" data-id="${id}">Salvar para depois</button>`:""}${item.status!=="rejected"?`<button class="button button-ghost" data-action="reject" data-id="${id}">Não tenho interesse</button>`:""}${item.status!=="pending"?`<button class="button button-ghost" data-action="reopen" data-id="${id}">Voltar para análise</button>`:""}`}
    </div>
    ${item.status==="pending"||item.status==="saved"?`<p class="d-hint" id="apply-hint-${id.replace(/[^a-z0-9]/gi,"")}" hidden>Depois de enviar a candidatura no site, volte aqui e clique em <strong>Já me candidatei</strong>. Assim o Radar guarda no histórico e não mostra esta vaga de novo.</p>`:""}
  </header>`;
  if(mode==="adjust")h+=`<section class="d-section adjust-box"><h3><label for="adjust-note">O que você quer mudar nesta sugestão?</label></h3><textarea id="adjust-note" rows="3" placeholder="Ex.: dar mais destaque ao meu projeto de dashboards"></textarea><div class="row-actions"><button class="button" data-action="save-adjust" data-id="${id}">Salvar pedido</button><button class="button button-ghost" data-action="cancel-adjust" data-id="${id}">Cancelar</button></div></section>`;
  if(item.note)h+=section("Seu pedido de ajuste",`<p>${escapeHtml(item.note)}</p>`);
  if(jobMode(item)==="Fora do Brasil")h+=section("Vaga internacional",`<ul class="checks warn"><li>${icon("alert")}<span>O anúncio costuma estar em inglês, e a entrevista também.</span></li><li>${icon("alert")}<span>Confirme se a empresa contrata quem mora no Brasil (geralmente como PJ/contractor, com pagamento em dólar ou euro).</span></li><li>${icon("alert")}<span>Veja o fuso horário exigido para reuniões.</span></li></ul>`);
  h+=section("Por que combina com você",`<ul class="checks">${(item.evidence||[]).map(e=>`<li>${icon("check")}<span>${escapeHtml(e)}</span></li>`).join("")}</ul>`);
  if(gaps.length)h+=section("O que conferir antes de se candidatar",`<ul class="checks warn">${gaps.map(e=>`<li>${icon("alert")}<span>${escapeHtml(e)}</span></li>`).join("")}</ul>`);
  const facts=[];
  if(item.deadline)facts.push(["Inscrições até",new Date(String(item.deadline).length===10?item.deadline+"T12:00:00":item.deadline).toLocaleDateString("pt-BR")]);
  facts.push(["Fonte",item.source||"—"]);
  if((item.alsoOn||[]).length)facts.push(["Também em",[...new Set(item.alsoOn.map(a=>a.source))].join(", ")]);
  if(item.publishedAt)facts.push(["Data",(item.tags||[]).find(t=>/^(Publicada|Boletim|Sem data)/.test(t))||""]);
  h+=`<dl class="facts">${facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`).join("")}</dl>`;
  if(item.fullDescription)h+=section("Sobre a vaga",`<div class="desc">${escapeHtml(item.fullDescription)}</div>`);
  if(item.questions?.length)h+=section("Perguntas do formulário",`<ul class="plain">${item.questions.map(q=>`<li>${escapeHtml(q)}</li>`).join("")}</ul>`);
  h+=`<details class="disclosure"><summary>Ajuda para responder o formulário ${icon("chevron","i chev")}</summary><div class="disclosure-body">${typeof renderApplicationHelp==="function"?renderApplicationHelp(item):""}</div></details>`;
  return h;
}
function decisionButtons(item){
  const id=item.id;
  if(item.status!=="pending")return `<p class="d-fit"><span class="state ${statusClass(item.status)}">${statusName(item.status,item.type)}</span></p><div class="d-actions"><button class="button button-secondary" data-action="reopen" data-id="${id}">Voltar para análise</button></div>`;
  const approve=item.type==="content"?"Aprovar publicação":"Aprovar contato";
  const adjust=item.type==="content"?"Pedir outra versão":"Pedir ajuste";
  return `<div class="d-actions"><button class="button" data-action="approve" data-id="${id}">${approve}</button><button class="button button-secondary" data-action="adjust" data-id="${id}">${adjust}</button><button class="button button-ghost" data-action="reject" data-id="${id}">Recusar</button></div>`;
}
function adjustBox(item){return `<section class="d-section adjust-box"><h3><label for="adjust-note">${item.type==="content"?"O que você quer mudar nesta publicação?":"O que você quer mudar nesta sugestão?"}</label></h3><textarea id="adjust-note" rows="3" placeholder="${item.type==="content"?"Ex.: deixar mais curto e citar o curso de Power BI":"Ex.: mudar o tom da mensagem para algo mais direto"}"></textarea><div class="row-actions"><button class="button" data-action="save-adjust" data-id="${item.id}">Salvar pedido</button><button class="button button-ghost" data-action="cancel-adjust" data-id="${item.id}">Cancelar</button></div></section>`}
function otherDetailHtml(item,mode="details"){
  const id=item.id;
  const kicker=item.type==="content"?"Publicação para o LinkedIn":"Cliente em potencial · exemplo ilustrativo";
  let h=`<header class="d-head"><p class="d-co">${kicker}</p><h2 id="modal-title">${escapeHtml(item.title)}</h2><p class="d-meta">${escapeHtml((item.subtitle||"").replace(/^Pauta para LinkedIn • /,"").replace(/ • /g," · "))}</p>${decisionButtons(item)}</header>`;
  if(mode==="adjust")h+=adjustBox(item);
  if(item.note)h+=section("Seu pedido de ajuste",`<p>${escapeHtml(item.note)}</p>`);
  if(item.type==="content"){
    h+=section("Objetivo",`<p>${escapeHtml(item.objective||item.description)}</p>`);
    h+=section("Texto do post",`<textarea id="draft-text" class="draft" rows="9" aria-label="Texto do post">${escapeHtml(item.draft||"")}</textarea><div class="row-actions"><button class="button button-secondary" data-action="save-draft" data-id="${id}">Salvar texto</button><button class="button button-ghost" data-action="copy-draft" data-id="${id}">${icon("copy")} Copiar</button><span class="muted small" id="draft-count"></span></div>`);
    const brief=item.imageBrief||`Imagem editorial para um post profissional sobre: ${item.title}. Sem texto na imagem, composição limpa, adequada ao LinkedIn.`;
    h+=section("Imagem do post",`<p class="muted small">Descrição usada para gerar a imagem. A geração por IA ainda não está conectada.</p><textarea id="image-brief-text" rows="3" aria-label="Descrição da imagem">${escapeHtml(brief)}</textarea><div class="row-actions"><button class="button button-secondary" data-action="save-image-brief" data-id="${id}">Salvar descrição</button></div>`);
    const facts=[["Melhor horário",item.bestTime||"A definir"],["Origem da ideia",item.source||"Seu perfil"],["Publicação","Manual por enquanto · conexão com LinkedIn em Configurações"]];
    h+=`<dl class="facts">${facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`).join("")}</dl>`;
  }else{
    const maps=safeUrl(item.mapsUrl),website=safeUrl(item.websiteUrl);
    h+=section("Por que pode fazer sentido",`<ul class="checks">${(item.evidence||[]).map(e=>`<li>${icon("check")}<span>${escapeHtml(e)}</span></li>`).join("")}</ul>`);
    h+=section("O que você ofereceria",`<p>${escapeHtml(item.offer||item.description)}</p>`);
    h+=section("Primeira mensagem",`<textarea id="draft-text" class="draft" rows="7" aria-label="Mensagem sugerida">${escapeHtml(item.draft||"")}</textarea><div class="row-actions"><button class="button button-secondary" data-action="save-draft" data-id="${id}">Salvar mensagem</button><button class="button button-ghost" data-action="copy-draft" data-id="${id}">${icon("copy")} Copiar</button></div><p class="muted small">O Radar não envia mensagens automaticamente. Revise, personalize e envie você mesmo pelo canal adequado.</p>`);
    h+=`<dl class="facts"><div><dt>Fonte</dt><dd>${maps||website?`${maps?`<a href="${escapeHtml(maps)}" target="_blank" rel="noopener noreferrer">Google Maps</a>`:""}${maps&&website?" · ":""}${website?`<a href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">Site da empresa</a>`:""}`:"Exemplo ilustrativo, sem empresa real vinculada"}</dd></div><div><dt>Região</dt><dd>${escapeHtml((item.subtitle||"").split(" • ").slice(1).join(" · ")||"—")}</dd></div></dl>`;
  }
  return h;
}
function filteredOthers(type){const st=$(`#${type}-filter`).value;return items.filter(i=>i.type===type&&(st==="all"||i.status===st))}
function renderModule(type){
  const list=filteredOthers(type);
  if(!list.some(i=>i.id===selected[type]))selected[type]=list[0]?.id||null;
  $(`#${type}-count`).textContent=`${list.length} ${type==="content"?(list.length===1?"publicação":"publicações"):(list.length===1?"cliente":"clientes")}`;
  $(`#${type}-list`).innerHTML=list.length?list.map(i=>otherListItem(i)).join(""):empty("Nada por aqui","Mude o filtro de situação.");
  const item=items.find(i=>i.id===selected[type]);
  $(`#${type}-detail`).innerHTML=item?otherDetailHtml(item):`<div class="empty"><strong>Selecione um item</strong><span>Os detalhes aparecem aqui.</span></div>`;
}
function selectOther(type,id){selected[type]=id;if(narrow()){openModal(id);return}renderModule(type)}
function renderDetail(){
  const box=$("#job-detail");if(!box)return;
  const item=items.find(i=>i.id===selectedJobId);
  box.innerHTML=item?detailHtml(item):`<div class="empty"><strong>Selecione uma vaga</strong><span>Os detalhes aparecem aqui.</span></div>`;
}
function selectJob(id,{scroll=false}={}){
  selectedJobId=id;
  document.querySelectorAll("#jobs-list .job-item").forEach(el=>{const on=el.dataset.id===id;el.classList.toggle("selected",on);el.setAttribute("aria-selected",on)});
  if(narrow()){openModal(id);return}
  renderDetail();$("#job-detail").scrollTop=0;
  if(scroll)document.querySelector(`#jobs-list .job-item[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({block:"nearest"});
}
function render(){
  const hasReal=items.some(isRealJob);
  const jobsPending=items.filter(i=>i.type==="jobs"&&i.status==="pending"&&(!hasReal||isRealJob(i)));
  $("#nav-jobs").textContent=jobsPending.length;$("#nav-jobs").hidden=!jobsPending.length;
  const good=jobsPending.filter(i=>i.fit==="boa"),fresh=jobsPending.filter(i=>(i.tags||[]).includes("Nova"));
  const decided=items.filter(i=>i.type==="jobs"&&i.status!=="pending"&&(!hasReal||isRealJob(i)));
  $("#summary-grid").innerHTML=[["Para analisar",jobsPending.length],["Boas correspondências",good.length],["Novas",fresh.length],["Candidaturas feitas",items.filter(i=>i.type==="jobs"&&i.status==="applied").length]].map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  $("#home-lead").textContent=jobsPending.length?`O Radar separou ${jobsPending.length} ${jobsPending.length===1?"vaga":"vagas"} para você${good.length?`, ${good.length} com boa correspondência`:""}. Escolha onde vale colocar sua energia hoje.`:"Escolha onde vale colocar sua energia hoje.";
  const rank=(a,b)=>((b.tags||[]).includes("Nova")-(a.tags||[]).includes("Nova"))||(b.score||0)-(a.score||0);
  const top=[...good.sort(rank),...jobsPending.filter(i=>i.fit!=="boa").sort(rank)].slice(0,6);
  $("#pending-count").textContent=jobsPending.length?`(${jobsPending.length})`:"";
  $("#overview-list").innerHTML=top.length?top.map(i=>`<button class="rec" data-action="open-job" data-id="${i.id}"><span class="rec-main"><strong>${escapeHtml(i.title)}</strong><span>${escapeHtml(company(i))} · ${escapeHtml(place(i))}</span></span><span class="rec-side">${i.fit?`<span class="fitdot ${i.fit}">${i.fit==="boa"?"Boa":"Possível"}</span>`:""}${(i.tags||[]).includes("Nova")?'<span class="flag">Nova</span>':""}</span></button>`).join(""):empty("Nenhuma vaga na fila","Vá em Vagas e clique em Buscar vagas agora.");
  refreshSourceOptions();
  const jobs=filteredJobs();
  const filtered=jobFilters.fit!=="all"||jobFilters.mode!=="all"||jobFilters.source!=="all"||jobFilters.query;
  const chipBase=items.filter(i=>i.type==="jobs"&&(!hasReal||isRealJob(i))&&($("#job-filter").value==="all"||i.status===$("#job-filter").value));
  const chips=$("#mode-chips");if(chips)chips.innerHTML=MODE_CHIPS.map(([v,l])=>{const n=v==="all"?chipBase.length:chipBase.filter(i=>jobMode(i)===v||(v==="Presencial"&&jobMode(i)==="Local")).length;return `<button class="chip${jobFilters.mode===v?" active":""}" data-mode-chip="${v}" ${n||v==="all"||jobFilters.mode===v?"":"disabled"}>${l}<span>${n}</span></button>`}).join("");
  $("#jobs-count").textContent=`${jobs.length} ${jobs.length===1?"vaga":"vagas"}${filtered?" com estes filtros":""}`;
  if(!jobs.some(j=>j.id===selectedJobId))selectedJobId=jobs[0]?.id||null;
  $("#jobs-list").innerHTML=jobs.length?jobs.map(i=>jobListItem(i)).join(""):empty("Nenhuma vaga aqui","Mude os filtros ou faça uma nova busca.");
  renderDetail();
  const pc=typeof postsPendingCount==="function"?Array(postsPendingCount()).fill(0):[];const up=typeof postsUpcoming==="function"?postsUpcoming():[];const pl=typeof LS!=="undefined"?LS.leads.filter(l=>l.status==="new").sort((a,b)=>(b.score||0)-(a.score||0)):[];const follow=typeof leadsFollowCount==="function"?leadsFollowCount():0;
  $("#nav-content").textContent=pc.length;$("#nav-content").hidden=!pc.length;$("#nav-leads").textContent=pl.length;$("#nav-leads").hidden=!pl.length;
  
  $("#modules").innerHTML=[
    {view:"jobs",title:"Vagas",n:jobsPending.length,line:good.length?`${good.length} com boa correspondência`:"Nenhuma com boa correspondência ainda"},
    {view:"content",title:"Publicações",n:pc.length,line:up[0]?`próximo: ${new Date(up[0].scheduledFor).toLocaleString("pt-BR",{weekday:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}).replace(/\./g,"")}`:"Posts para o seu LinkedIn"},
    {view:"leads",title:"Clientes",n:pl.length,line:follow?`${follow} ${follow===1?"retorno":"retornos"} para hoje`:"Empresas para contatar"}
  ].map(m=>`<button class="module" data-view="${m.view}"><span class="module-title">${m.title}</span><span class="module-n">${m.n}</span><span class="module-line">${m.n===1?"item para analisar":"itens para analisar"} · ${m.line}</span></button>`).join("");
  const mini=i=>`<button class="rec" data-action="open-item" data-id="${i.id}"><span class="rec-main"><strong>${escapeHtml(i.title)}</strong><span>${escapeHtml(i.description||"")}</span></span></button>`;
  $("#overview-content").innerHTML=up.length?up.slice(0,3).map(p=>`<button class="rec" data-view="content" data-post-open="${escapeHtml(p.id)}"><span class="rec-main"><strong>${escapeHtml(p.hook||p.text.split("\n")[0])}</strong><span>${new Date(p.scheduledFor).toLocaleString("pt-BR",{weekday:"long",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span></span><span class="rec-side"><span class="state post-${p.status}">${p.status==="draft"?"Para aprovar":"Agendado"}</span></span></button>`).join(""):empty("Nenhum post planejado","Vá em Publicações para o robô escrever a semana.");
  $("#overview-leads").innerHTML=pl.length?pl.slice(0,3).map(l=>`<button class="rec" data-view="leads" data-lead-open="${escapeHtml(l.id)}"><span class="rec-main"><strong>${escapeHtml(l.name)}</strong><span>${escapeHtml(l.category||"")}${l.reasons?.[0]?` · ${escapeHtml(l.reasons[0])}`:""}</span></span><span class="rec-side"><span class="score ${l.score>=70?"boa":l.score>=50?"possivel":"baixa"}">${l.score??""}</span></span></button>`).join(""):empty("Nenhuma empresa para contatar","Crie uma campanha em Clientes e clique em Buscar empresas.");
  const history=items.filter(i=>i.status!=="pending"&&!(i.type==="jobs"&&i.status==="saved")&&(i.type!=="jobs"||!hasReal||isRealJob(i))).sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
  $("#history-list").innerHTML=history.length?history.map(card).join(""):empty("Nenhuma decisão ainda","Quando você aprovar, pedir ajuste ou recusar algo, aparece aqui.");
}
function openModal(id,mode="details"){
  const item=items.find(i=>i.id===id);if(!item)return;selectedId=id;
  $("#modal-content").innerHTML=detailHtml(item,mode);$("#modal-backdrop").classList.remove("hidden");document.body.classList.add("modal-open");
  if(mode==="adjust")$("#adjust-note")?.focus();else $("#modal-close").focus();
}
function closeModal(){$("#modal-backdrop").classList.add("hidden");document.body.classList.remove("modal-open");selectedId=null}
function nextPendingAfter(id){const list=filteredJobs();const i=list.findIndex(j=>j.id===id);return list[i+1]?.id||list[i-1]?.id||null}
function updateStatus(id,status,note){
  const item=items.find(i=>i.id===id);if(!item)return;
  if(item.type==="jobs"){
    const filter=$("#job-filter").value;
    const next=filter!=="all"&&status!==filter?nextPendingAfter(id):id;
    item.status=status;if(note)item.note=note;item.updatedAt=new Date().toISOString();
    if(status==="applied")item.appliedAt=item.updatedAt;else if(status==="pending")delete item.appliedAt;
    save();closeModal();selectedJobId=next;render();
    fetch("/api/jobs/decision",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status,title:item.originalTitle||item.title,company:company(item)})}).catch(()=>{});
    showToast(status==="applied"?"Candidatura registrada. Ela fica no Histórico e o robô não vai trazer esta vaga de novo.":status==="rejected"?"Vaga descartada. O robô não vai mostrá-la de novo.":status==="saved"?"Vaga salva para depois.":"A vaga voltou para análise.");return;
  }
  const t=item.type;const list=filteredOthers(t);const k=list.findIndex(x=>x.id===id);
  if(status!=="pending"&&$(`#${t}-filter`).value==="pending")selected[t]=list[k+1]?.id||list[k-1]?.id||null;
  item.status=status;if(note)item.note=note;item.updatedAt=new Date().toISOString();save();closeModal();render();
  showToast(status==="approved"?(t==="content"?"Publicação aprovada. Por enquanto, copie o texto e publique no LinkedIn.":"Contato aprovado. Envie a mensagem você mesmo, depois de revisar."):status==="rejected"?"Sugestão recusada.":status==="pending"?"Voltou para análise.":"Pedido de ajuste salvo.");
}
function showAdjust(id){const item=items.find(i=>i.id===id);if(!item)return;const pane=item.type==="jobs"?"#job-detail":`#${item.type}-detail`;if(narrow()||activeView!==(item.type==="jobs"?"jobs":item.type)){openModal(id,"adjust");return}$(pane).innerHTML=detailHtml(item,"adjust");$("#adjust-note").focus()}
document.addEventListener("click",e=>{
  const open=e.target.closest("[data-open-job]");if(open){const h=document.getElementById(`apply-hint-${open.dataset.openJob.replace(/[^a-z0-9]/gi,"")}`);if(h)h.hidden=false}
  const nav=e.target.closest("[data-view]");if(nav){e.preventDefault();setView(nav.dataset.view);if(nav.dataset.leadOpen&&typeof selectLead==="function"){LS.filter="new";selectLead(nav.dataset.leadOpen)}if(nav.dataset.postOpen&&typeof selectPost==="function"){const pp=PS.items.find(x=>x.id===nav.dataset.postOpen);PS.tab=pp?.status==="approved"?"scheduled":"review";selectPost(nav.dataset.postOpen)}return}
  const btn=e.target.closest("[data-action]");if(!btn)return;
  if(e.target.closest("a[href]")&&btn.dataset.action==="select")return;
  const {action,id}=btn.dataset;
  if(action==="select"){const it=items.find(i=>i.id===id);if(it?.type==="jobs")selectJob(id);else if(it){if(activeView==="history")openModal(id);else selectOther(it.type,id)}}
  if(action==="open-job"){setView("jobs");selectJob(id,{scroll:true})}
  if(action==="open-item"){const it=items.find(i=>i.id===id);if(it){setView(it.type);selectOther(it.type,id)}}
  if(action==="save-draft"){const it=items.find(i=>i.id===id);if(it){it.draft=$("#draft-text").value;it.updatedDraftAt=new Date().toISOString();save();showToast("Texto salvo.")}}
  if(action==="copy-draft"){const text=$("#draft-text")?.value||"";navigator.clipboard?.writeText(text).then(()=>showToast("Texto copiado."),()=>showToast("Selecione o texto e copie manualmente."))}
  if(action==="save-image-brief"){const it=items.find(i=>i.id===id);if(it){it.imageBrief=$("#image-brief-text").value.trim();save();showToast("Descrição da imagem salva.")}}
  if(action==="restore-examples"){const real=items.filter(i=>i.type==="jobs");items=real;save();render();showToast("Exemplos restaurados.")}
  if(action==="details")openModal(id);
  if(action==="approve")updateStatus(id,"approved");
  if(action==="applied")updateStatus(id,"applied");
  if(action==="save-later")updateStatus(id,"saved");
  if(action==="reject")updateStatus(id,"rejected");
  if(action==="reopen")updateStatus(id,"pending");
  if(action==="adjust")showAdjust(id);
  if(action==="cancel-adjust"){const it=items.find(i=>i.id===id);if(!$("#modal-backdrop").classList.contains("hidden"))openModal(id);else if(it?.type==="jobs")renderDetail();else renderModule(it.type)}
  if(action==="save-adjust"){const note=$("#adjust-note").value.trim();if(!note){showToast("Descreva o ajuste desejado.");$("#adjust-note").focus();return}updateStatus(id,"adjustments",note)}
  if(action==="close")closeModal();
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape")closeModal();
  const it=e.target.closest?.(".job-item");if(it&&(e.key==="Enter"||e.key===" ")){e.preventDefault();it.click()}
  if(activeView==="jobs"&&(e.key==="ArrowDown"||e.key==="ArrowUp")&&e.target.closest?.("#jobs-list")){e.preventDefault();const list=filteredJobs();const i=list.findIndex(j=>j.id===selectedJobId);const n=list[Math.max(0,Math.min(list.length-1,i+(e.key==="ArrowDown"?1:-1)))];if(n){selectJob(n.id,{scroll:true});document.querySelector(`#jobs-list .job-item[data-id="${CSS.escape(n.id)}"]`)?.focus()}}
});
$("#modal-close").addEventListener("click",closeModal);$("#modal-backdrop").addEventListener("click",e=>{if(e.target.id==="modal-backdrop")closeModal()});
$("#job-filter").addEventListener("change",render);

document.addEventListener("input",e=>{if(e.target.id==="draft-text"){const c=$("#draft-count");if(c)c.textContent=`${e.target.value.length} caracteres`}});
// Tema: claro por padrão; escuro opcional (escolhido em Meu perfil).
(function(){const apply=t=>{document.documentElement.dataset.theme=t;document.querySelectorAll("[data-theme-choice]").forEach(b=>b.classList.toggle("active",b.dataset.themeChoice===t));document.querySelector('meta[name="color-scheme"]').content=t;document.querySelector('meta[name="theme-color"]').content=t==="dark"?"#0d1f1c":"#112926"};let t="light";try{t=localStorage.getItem("radar-theme")==="dark"?"dark":"light"}catch{}apply(t);document.addEventListener("click",e=>{const b=e.target.closest("[data-theme-choice]");if(!b)return;t=b.dataset.themeChoice;apply(t);try{localStorage.setItem("radar-theme",t)}catch{}})})();
$("#fit-select").addEventListener("change",e=>{jobFilters.fit=e.target.value;render()});
$("#mode-filter").addEventListener("change",e=>{jobFilters.mode=e.target.value;render()});
document.addEventListener("click",e=>{const c=e.target.closest("[data-mode-chip]");if(!c)return;jobFilters.mode=c.dataset.modeChip;const sel=$("#mode-filter");if(sel)sel.value=jobFilters.mode;render()});
$("#source-filter").addEventListener("change",e=>{jobFilters.source=e.target.value;render()});
let queryTimer;$("#job-query").addEventListener("input",e=>{clearTimeout(queryTimer);queryTimer=setTimeout(()=>{jobFilters.query=e.target.value;render()},150)});
(function(){const tz="America/Bahia";const now=new Date();const hour=Number(new Intl.DateTimeFormat("pt-BR",{hour:"numeric",hourCycle:"h23",timeZone:tz}).format(now));$("#greeting").textContent=hour<12?"Bom dia":hour<18?"Boa tarde":"Boa noite";const cap=t=>t.charAt(0).toUpperCase()+t.slice(1);$("#today-label").textContent=cap(new Intl.DateTimeFormat("pt-BR",{dateStyle:"full",timeZone:tz}).format(now));$("#hero-date").textContent=cap(new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"numeric",month:"long",timeZone:tz}).format(now))})();
render();
