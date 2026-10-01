const PROFILE_KEY="radar-profile-v1";
const SETTINGS_KEY="radar-settings-v1";
const RESUME_META_KEY="radar-resume-meta-v1";
const ASSISTANT_REQUESTS_KEY="radar-assistant-requests-v1";

// Perfil inicial: vem de perfil-pessoal.js (só no seu computador, fora do GitHub); sem ele, começa em branco.
const profileSeed=window.PERFIL_PESSOAL||{schemaVersion:4,name:"",city:"",phone:"",email:"",portfolio:"",license:"",summary:"",skillsTech:"",skillsOther:"",academic:[],technical:[],experiences:[],courses:[],projects:[],languages:[]};
const settingsSeed={jobRoles:"Suporte técnico; suporte a sistemas; implantação de software; dados e BI júnior; processos e automação",jobCity:"Feira de Santana, BA",jobLevels:"Estágio; assistente; júnior",jobMaxAgeDays:"1",remote:true,international:true,hybrid:true,onsite:true,jobSources:"https://tel.pandape.infojobs.com.br",remoteMinMatch:"70",localMinMatch:"40",offer:"Automações para pequenos negócios, geração de descrições de produtos e análise de dados",clientTypes:"Lojas e pequenos comércios",clientRegion:"Feira de Santana e região",clientSignals:"Catálogo atualizado com frequência; tarefas repetitivas de conteúdo ou cadastro",contentTopics:"Projetos do portfólio; dados; automação; aprendizados em ADS",linkedin:"",imageStyle:"Editorial limpo, tecnológico, sem texto na imagem",assistantNotes:"Escrever em primeira pessoa, com fatos verificáveis e sem exagerar experiência."};

function readLocal(key,fallback){try{const data=JSON.parse(localStorage.getItem(key));if(data&&typeof data==="object")return data}catch{}return structuredClone(fallback)}
let profile=readLocal(PROFILE_KEY,profileSeed);
if(profile.schemaVersion!==4){
  const previous=profile;
  profile={...structuredClone(profileSeed),...previous,schemaVersion:4};
  for(const key of ["phone","email","portfolio","license","summary","skillsTech","skillsOther","academic","technical","projects","languages"]){if(previous[key]===undefined)profile[key]=structuredClone(profileSeed[key])}
  if(previous.summary===undefined||previous.summary.startsWith("Profissional da área de tecnologia e dados com experiência em otimização"))profile.summary=profileSeed.summary;
  const previousDescriptions={
    "exp-1":"Atuação em sala limpa e suporte às etapas da linha produtiva.",
    "exp-2":"Suporte técnico de telefonia fixa e redes, diagnóstico de incidentes e atendimento ao cliente.",
    "exp-3":"Controle de inventário, entradas e saídas de mercadorias em sistemas de estoque.",
    "exp-4":"Documentos, lançamentos em sistemas e organização de cadastros."
  };
  if(Array.isArray(previous.experiences))profile.experiences=previous.experiences.map(old=>old.description===previousDescriptions[old.id]?structuredClone(profileSeed.experiences.find(item=>item.id===old.id)):old);
  if(profileSeed.languages?.[2]&&Array.isArray(previous.languages)&&!previous.languages.some(item=>item.title.toLowerCase()==="espanhol"))profile.languages=[...previous.languages,structuredClone(profileSeed.languages[2])];
  if(Array.isArray(previous.courses))profile.courses=[...profileSeed.courses,...previous.courses.filter(old=>!profileSeed.courses.some(item=>item.title.toLowerCase().includes(old.title.slice(0,14).toLowerCase())||old.title.toLowerCase().includes(item.title.slice(0,14).toLowerCase())))];
  profile.courses=profile.courses.map(item=>({...item,category:item.category||"Administrativo e outros"}));
  localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));
}
let settings={...settingsSeed,...readLocal(SETTINGS_KEY,settingsSeed)};
// Migração única: inclui a página de vagas da Tel (Pandapé), grande empregadora local que apareceu na prova de cobertura.
// v0.5: busca automática das últimas 24 horas e vagas fora do Brasil ligadas por padrão (dá para mudar em Meu perfil).
if(!settings.migratedV5){settings.jobMaxAgeDays="1";if(settings.international===undefined)settings.international=true;settings.migratedV5=true;try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}catch{}}
if(!settings.migratedPandape){if(!/pandape/i.test(settings.jobSources||""))settings.jobSources=[settings.jobSources,"https://tel.pandape.infojobs.com.br"].filter(Boolean).join("\n");settings.migratedPandape=true;try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}catch{}}
let resumeMeta=readLocal(RESUME_META_KEY,{});
let assistantRequests=readLocal(ASSISTANT_REQUESTS_KEY,[]);
function persistProfile(){localStorage.setItem(PROFILE_KEY,JSON.stringify(profile))}
function persistSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}
function field(form,name){return form.elements.namedItem(name)}
function fillForm(form,data,keys){for(const key of keys){const el=field(form,key);if(!el)continue;if(el.type==="checkbox")el.checked=Boolean(data[key]);else el.value=data[key]??""}}
function readForm(form,keys){const next={};for(const key of keys){const el=field(form,key);next[key]=el.type==="checkbox"?el.checked:el.value.trim()}return next}
function markSaved(id,text){const el=document.querySelector(id);el.textContent=text;setTimeout(()=>{if(el.textContent===text)el.textContent=""},4000)}
const profileFields=["name","city","phone","email","portfolio","license","summary","skillsTech","skillsOther"];
const settingsFields=Object.keys(settingsSeed);
fillForm(document.querySelector("#profile-form"),profile,profileFields);
fillForm(document.querySelector("#settings-form"),settings,settingsFields);
function renderPortfolioLink(){const link=document.querySelector("#portfolio-open"),url=safeUrl(profile.portfolio);link.hidden=!url;if(url)link.href=url;else link.removeAttribute("href")}
renderPortfolioLink();

document.querySelector("#profile-form").addEventListener("submit",event=>{
  event.preventDefault();profile={...profile,...readForm(event.currentTarget,profileFields)};persistProfile();renderPortfolioLink();markSaved("#profile-saved","Alterações salvas neste navegador.");showToast("Dados do currículo atualizados.");
});
document.querySelector("#settings-form").addEventListener("submit",event=>{
  event.preventDefault();settings={...settings,...readForm(event.currentTarget,settingsFields)};persistSettings();markSaved("#settings-saved","Preferências salvas neste navegador.");showToast("Configurações salvas.");
});

const entryConfig={
  academic:{key:"academic",form:"#academic-form",list:"#academic-list",keys:["title","detail"],label:"Formação acadêmica"},
  technical:{key:"technical",form:"#technical-form",list:"#technical-list",keys:["title","detail"],label:"Curso técnico"},
  experience:{key:"experiences",form:"#experience-form",list:"#experience-list",keys:["title","company","period","description"],label:"Experiência"},
  course:{key:"courses",form:"#course-form",list:"#course-list",keys:["title","detail","category"],label:"Curso"},
  project:{key:"projects",form:"#project-form",list:"#project-list",keys:["title","description","url"],label:"Projeto"},
  language:{key:"languages",form:"#language-form",list:"#language-list",keys:["title","detail"],label:"Idioma"}
};
function renderEntries(kind){
  const config=entryConfig[kind],list=document.querySelector(config.list),data=profile[config.key]||[];
  const card=entry=>`<div class="profile-entry"><div><strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml(kind==="experience"?`${entry.company} • ${entry.period}`:kind==="project"?entry.url||"Projeto do portfólio":entry.detail)}</span>${["experience","project"].includes(kind)&&entry.description?`<p>${escapeHtml(entry.description)}</p>`:""}</div><div class="entry-actions"><button class="text-button" type="button" data-profile-edit="${kind}" data-id="${escapeHtml(entry.id)}">Editar</button><button class="text-button danger" type="button" data-profile-remove="${kind}" data-id="${escapeHtml(entry.id)}">Remover</button></div></div>`;
  if(kind==="course"){
    document.querySelector("#course-count").textContent=`${data.length} ${data.length===1?"item":"itens"}`;
    const categories=["Tecnologia, dados e BI","IA e automação","Administrativo e outros"];
    list.innerHTML=categories.map(category=>{const entries=data.filter(x=>(x.category||"Administrativo e outros")===category);return entries.length?`<div class="course-group"><h3>${category}</h3>${entries.map(card).join("")}</div>`:""}).join("")||`<p class="helper">Nenhum item cadastrado.</p>`;
  }else list.innerHTML=data.length?data.map(card).join(""):`<p class="helper">Nenhum item cadastrado.</p>`;
}
for(const kind of Object.keys(entryConfig))renderEntries(kind);

function saveEntry(event,kind){
  event.preventDefault();const form=event.currentTarget,config=entryConfig[kind],data=profile[config.key],keys=config.keys;
  const values=readForm(form,keys);const id=field(form,"entryId").value;
  if(id){const index=data.findIndex(x=>x.id===id);if(index>=0)data[index]={...data[index],...values}}
  else data.push({id:crypto.randomUUID(),...values});
  persistProfile();form.reset();field(form,"entryId").value="";renderEntries(kind);showToast(`${config.label} salvo.`);
}
for(const [kind,config] of Object.entries(entryConfig))document.querySelector(config.form).addEventListener("submit",event=>saveEntry(event,kind));
document.addEventListener("click",event=>{
  const edit=event.target.closest("[data-profile-edit]");
  if(edit){const kind=edit.dataset.profileEdit,config=entryConfig[kind],entry=profile[config.key].find(x=>x.id===edit.dataset.id);if(!entry)return;const form=document.querySelector(config.form);fillForm(form,entry,config.keys);field(form,"entryId").value=entry.id;form.scrollIntoView({behavior:"smooth",block:"center"});field(form,"title").focus();return}
  const remove=event.target.closest("[data-profile-remove]");
  if(remove){const kind=remove.dataset.profileRemove;if(!confirm("Remover este item do currículo?"))return;const key=entryConfig[kind].key;profile[key]=profile[key].filter(x=>x.id!==remove.dataset.id);persistProfile();renderEntries(kind);showToast("Item removido do currículo.")}
});

function openResumeDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open("radar-resume-files",1);request.onupgradeneeded=()=>request.result.createObjectStore("files");request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function storeResume(file){const db=await openResumeDb();return new Promise((resolve,reject)=>{const tx=db.transaction("files","readwrite");tx.objectStore("files").put(file,"current");tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function getResume(){const db=await openResumeDb();return new Promise((resolve,reject)=>{const tx=db.transaction("files","readonly");const request=tx.objectStore("files").get("current");request.onsuccess=()=>{db.close();resolve(request.result)};request.onerror=()=>{db.close();reject(request.error)}})}
function renderResume(){const target=document.querySelector("#resume-current");if(resumeMeta.name){target.innerHTML=`<div class="document-file"><span class="document-icon">PDF</span><div><strong>${escapeHtml(resumeMeta.name)}</strong><small>Guardado em ${escapeHtml(new Intl.DateTimeFormat("pt-BR",{dateStyle:"short"}).format(new Date(resumeMeta.savedAt)))} • ${resumeMeta.mode==="replace"?"substituição pendente":"comparação pendente"}</small></div></div>${resumeMeta.notes?`<p class="helper"><strong>Seu pedido:</strong> ${escapeHtml(resumeMeta.notes)}</p>`:""}<button type="button" class="text-button" id="download-resume">Baixar arquivo guardado</button><p class="helper">A análise automática ainda não foi executada.</p>`}
  else target.innerHTML=`<div class="document-file"><span class="document-icon">PDF</span><div><strong>Currículo inicial do projeto</strong><small>Base usada para preencher este perfil piloto</small></div></div><a class="text-button" href="Daniel%20De%20Jesus%20Alves.pdf" target="_blank" rel="noopener noreferrer">Abrir PDF inicial ↗</a>`}
renderResume();
document.querySelector("#resume-form").addEventListener("submit",async event=>{
  event.preventDefault();const form=event.currentTarget;const file=field(form,"resume").files[0];if(!file)return;
  if(file.size>10*1024*1024){showToast("Escolha um PDF de até 10 MB.");return}
  const header=new TextDecoder().decode(await file.slice(0,5).arrayBuffer());
  if(header!=="%PDF-"){showToast("O arquivo escolhido não é um PDF válido.");return}
  const mode=field(form,"uploadMode").value;const notes=field(form,"updateNotes").value.trim();
  try{await storeResume(file);resumeMeta={name:file.name,savedAt:new Date().toISOString(),mode,notes};localStorage.setItem(RESUME_META_KEY,JSON.stringify(resumeMeta));renderResume();form.reset();showToast("PDF guardado para análise. O perfil ainda não foi alterado.")}
  catch{showToast("Não foi possível guardar o PDF neste navegador.")}
});
document.addEventListener("click",async event=>{if(event.target.id!=="download-resume")return;try{const file=await getResume();if(!file){showToast("Arquivo não encontrado neste navegador.");return}const url=URL.createObjectURL(file);const link=document.createElement("a");link.href=url;link.download=resumeMeta.name||"curriculo.pdf";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch{showToast("Não foi possível abrir o PDF guardado.")}});

function renderAssistantRequests(){document.querySelector("#assistant-requests").innerHTML=assistantRequests.length?`<p class="modal-label">PEDIDOS REGISTRADOS</p>${assistantRequests.map(item=>`<div class="request-entry"><span class="status adjustments">Pendente</span><p>${escapeHtml(item.text)}</p></div>`).join("")}`:""}
renderAssistantRequests();
document.querySelector("#assistant-request-form").addEventListener("submit",event=>{event.preventDefault();const form=event.currentTarget;const text=field(form,"request").value.trim();if(!text)return;assistantRequests.unshift({id:crypto.randomUUID(),text,createdAt:new Date().toISOString()});localStorage.setItem(ASSISTANT_REQUESTS_KEY,JSON.stringify(assistantRequests));form.reset();renderAssistantRequests();showToast("Pedido registrado. A análise por IA ainda não está conectada.")});

