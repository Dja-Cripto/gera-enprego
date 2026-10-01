// Fontes de vagas remotas: brasileiras (comunidades de programação) e internacionais abertas a quem mora no Brasil.
// Cada fonte é independente: se uma cair, aparece no diagnóstico e as outras continuam.
import {plain,norm,searchTerms} from './sources-br.mjs';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function safeUrl(v){try{const u=new URL(v);return /^https?:$/.test(u.protocol)?u.href:null}catch{return null}}
function iso(v){if(v==null||v==='')return null;const n=Number(v);const d=Number.isFinite(n)&&String(v).length<=13?new Date(n<1e12?n*1000:n):new Date(v);return Number.isFinite(d.getTime())?d.toISOString():null}

// ---------- Quem pode se candidatar de onde ----------
// Aberta ao Brasil: sem restrição, mundial, América Latina, Américas ou Brasil explícito.
const OPEN=/\b(worldwide|anywhere|global|globally|world|international|latam|latin america|south america|americas|brazil|brasil|remote\s*\(?anywhere|no location|any location|todo o mundo|qualquer lugar)\b/i;
// Restrita a outro país/região (e não cita Brasil/LATAM/mundo).
const CLOSED=/\b(us|usa|u\.s\.|united states|canada|uk|united kingdom|europe|european|eu|emea|germany|deutschland|france|spain|portugal|netherlands|ireland|poland|india|australia|new zealand|philippines|mexico only|apac|asia|africa|israel|japan|singapore|north america|us only|usa only|us-based|eastern europe|cet|est only|pst)\b/i;
export function openToBrazil(location,extra=''){
  const text=`${location||''} ${extra||''}`.trim();
  if(!text)return true; // sem restrição informada
  if(/\b(brazil|brasil)\b/i.test(text))return true;
  if(OPEN.test(text))return !/\b(us|usa|united states|canada|europe|uk)\s+only\b/i.test(text);
  return !CLOSED.test(text);
}
export function isBrazilLocation(text){return /\b(brazil|brasil)\b/i.test(String(text||''))||/\b[A-Z]{2}\b.*\b(brasil|brazil)\b/.test(String(text||''))}

// Termos em inglês para buscas internacionais, a partir dos cargos em português.
const EN=[
  [/suporte|help.?desk|service desk|atendimento/i,['customer support','technical support','support specialist','customer service']],
  [/dados|\bbi\b|power bi|indicadores|analytics/i,['data analyst','business intelligence','analytics']],
  [/process|automa|opera/i,['operations','automation','process']],
  [/implanta/i,['implementation','onboarding specialist']],
  [/customer success/i,['customer success']],
  [/desenvolv|programad|developer|software|full.?stack/i,['software engineer','developer','full stack','frontend','backend']],
  [/react|javascript|typescript|node/i,['react','javascript','typescript','node']],
  [/python/i,['python']],[/\bjava\b/i,['java']],[/\.net|c#/i,['.net']],[/php|laravel/i,['php']],
  [/mobile|android|ios|flutter/i,['mobile','flutter','android']],
  [/\bqa\b|teste/i,['qa','test automation']],[/devops|cloud|sre|infra/i,['devops','cloud','sre']],
];
export function englishTerms(settings){const roles=String(settings.jobRoles||'');const out=[];for(const [re,list] of EN)if(re.test(roles))out.push(...list);return [...new Set(out)].slice(0,10)}
const wantsDev=settings=>/desenvolv|programad|developer|software|full.?stack|front|back.?end|react|python|java|\.net|php|mobile|flutter|\bqa\b|devops/i.test(String(settings.jobRoles||''));
// Para filtrar listas grandes: mantém só anúncios cujo título conversa com algum termo buscado.
function titleMatcher(settings){
  const words=[...englishTerms(settings),...searchTerms(settings)].flatMap(t=>norm(t).split(' ')).filter(w=>w.length>=3&&!['analista','assistente','auxiliar','specialist','junior','senior','remote','remoto','tecnico'].includes(w));
  const set=[...new Set(words)];
  return title=>{const t=norm(title);return set.some(w=>new RegExp(`\\b${w}`).test(t))};
}

function intlJob(base){
  const open=openToBrazil(base.location,base.restrictions);
  return {remote:true,workplace:'remote',country:open&&isBrazilLocation(base.location)?'Brasil':'Exterior',region:open&&isBrazilLocation(base.location)?'brasil':'exterior',openToBrazil:open,language:'en',applyType:'Site de origem',dateKind:base.publishedAt?'published':'firstSeen',level:'',...base,title:plain(base.title),company:plain(base.company)||'Empresa não informada',description:plain(base.description).slice(0,2500)};
}

// ---------- Himalayas (remotas internacionais, com restrição de país explícita) ----------
export async function collectHimalayas(settings,http){
  const stat={source:'Himalayas',queries:0,received:0,errors:[]};const out=new Map();const match=titleMatcher(settings);
  for(let offset=0;offset<300;offset+=100){
    try{
      stat.queries++;
      const data=await http.cached(`himalayas:${offset}`,()=>http.fetchJson(`https://himalayas.app/jobs/api?limit=100&offset=${offset}`,{},{timeout:25000}),3*3600000);
      const rows=Array.isArray(data?.jobs)?data.jobs:[];
      for(const r of rows){
        if(!match(r.title))continue;
        const loc=(r.locationRestrictions||[]).map(x=>typeof x==='string'?x:x?.name||'').join(', ');
        const job=intlJob({externalId:`himalayas:${r.guid||r.applicationLink||r.title}`,title:r.title,company:r.companyName,location:loc||'Worldwide',restrictions:(r.timezoneRestrictions||[]).join(' '),description:r.description||r.excerpt,sourceUrl:safeUrl(r.applicationLink||r.guid),publishedAt:iso(r.pubDate),level:(r.seniority||[]).join(' '),source:'Himalayas'});
        if(job.sourceUrl)out.set(job.externalId,job);
      }
      if(rows.length<100)break;
    }catch(e){stat.errors.push(e.message);break}
    await sleep(300);
  }
  const jobs=[...out.values()];stat.received=jobs.length;return {jobs,stat};
}

// ---------- RemoteOK ----------
export async function collectRemoteOk(settings,http){
  const stat={source:'RemoteOK',queries:1,received:0,errors:[]};const match=titleMatcher(settings);
  try{
    const data=await http.cached('remoteok',()=>http.fetchJson('https://remoteok.com/api',{},{timeout:25000}),3*3600000);
    const rows=(Array.isArray(data)?data:[]).filter(r=>r&&r.id&&r.position);
    const jobs=rows.filter(r=>match(r.position)).map(r=>intlJob({externalId:`remoteok:${r.id}`,title:r.position,company:r.company,location:r.location||'Worldwide',description:r.description,sourceUrl:safeUrl(r.url||r.apply_url),publishedAt:iso(r.epoch||r.date),source:'RemoteOK'})).filter(j=>j.sourceUrl);
    stat.received=jobs.length;return {jobs,stat};
  }catch(e){stat.errors.push(e.message);return {jobs:[],stat}}
}

// ---------- Working Nomads ----------
export async function collectWorkingNomads(settings,http){
  const stat={source:'Working Nomads',queries:1,received:0,errors:[]};const match=titleMatcher(settings);
  try{
    const data=await http.cached('workingnomads',()=>http.fetchJson('https://www.workingnomads.com/api/exposed_jobs/',{},{timeout:25000}),3*3600000);
    const rows=Array.isArray(data)?data:[];
    const jobs=rows.filter(r=>match(r.title)).map(r=>intlJob({externalId:`workingnomads:${norm(r.url||r.title).slice(-80)}`,title:r.title,company:r.company_name,location:r.location||'Worldwide',description:r.description,sourceUrl:safeUrl(r.url),publishedAt:iso(r.pub_date),source:'Working Nomads'})).filter(j=>j.sourceUrl);
    stat.received=jobs.length;return {jobs,stat};
  }catch(e){stat.errors.push(e.message);return {jobs:[],stat}}
}

// ---------- Remotive e Jobicy com busca por termo e região ----------
export async function collectRemotiveSearch(settings,http){
  const stat={source:'Remotive',queries:0,received:0,errors:[]};const out=new Map();
  for(const term of ['',...englishTerms(settings).slice(0,6)]){
    try{
      stat.queries++;
      const data=await http.cached(`remotive:${norm(term)||'all'}`,()=>http.fetchJson(`https://remotive.com/api/remote-jobs?${new URLSearchParams(term?{search:term,limit:'100'}:{limit:'100'})}`,{},{timeout:25000}),3*3600000);
      for(const r of data?.jobs||[])out.set(`remotive:${r.id}`,intlJob({externalId:`remotive:${r.id}`,title:r.title,company:r.company_name,location:r.candidate_required_location||'Worldwide',description:r.description,sourceUrl:safeUrl(r.url),publishedAt:iso(r.publication_date),level:r.job_type,source:'Remotive'}));
    }catch(e){stat.errors.push(`"${term||'recentes'}": ${e.message}`)}
    await sleep(400);
  }
  const jobs=[...out.values()].filter(j=>j.sourceUrl);stat.received=jobs.length;return {jobs,stat};
}
export async function collectJobicyGeo(settings,http){
  const stat={source:'Jobicy',queries:0,received:0,errors:[]};const out=new Map();
  for(const geo of ['','latam']){
    try{
      stat.queries++;
      const data=await http.cached(`jobicy:${geo||'all'}`,()=>http.fetchJson(`https://jobicy.com/api/v2/remote-jobs?count=100${geo?`&geo=${geo}`:''}`,{},{timeout:25000}),3*3600000);
      for(const r of data?.jobs||[])out.set(`jobicy:${r.id}`,intlJob({externalId:`jobicy:${r.id}`,title:r.jobTitle,company:r.companyName,location:r.jobGeo||(geo?geo.toUpperCase():''),description:r.jobDescription||r.jobExcerpt,sourceUrl:safeUrl(r.url),publishedAt:iso(r.pubDate),level:r.jobLevel,source:'Jobicy'}));
    }catch(e){stat.errors.push(`${geo}: ${e.message}`)}
  }
  const jobs=[...out.values()].filter(j=>j.sourceUrl);stat.received=jobs.length;return {jobs,stat};
}

// ---------- Comunidades brasileiras de programação no GitHub ----------
// Repositórios onde empresas publicam vagas como issues (frontendbr, backend-br, react-brasil…).
const GITHUB_REPOS=['frontendbr/vagas','backend-br/vagas','react-brasil/vagas','androiddevbr/vagas','qa-brasil/vagas','soujava/vagas-java','phpdevbr/vagas','dotnetdevbr/vagas','pythonbrasil/vagas'];
function parseGithubIssue(issue,repo){
  const labels=(issue.labels||[]).map(l=>typeof l==='string'?l:l.name||'');
  const text=`${issue.title} ${labels.join(' ')}`;
  const remote=/remot|home.?office|anywhere/i.test(text);const hybrid=/h[ií]brid/i.test(text);
  const loc=/^\s*\[([^\]]+)\]/.exec(issue.title)?.[1]||'';
  const company=/\b(?:na|no|@|at)\s+([A-Z0-9][\w&.\- ]{1,40})\s*$/.exec(issue.title.replace(/\[[^\]]*\]/g,'').trim())?.[1]||'';
  const workplace=remote?'remote':hybrid?'hybrid':'onsite';
  return {externalId:`github:${repo}:${issue.number}`,title:plain(issue.title.replace(/\[[^\]]*\]/g,'')).replace(/\s{2,}/g,' ').trim(),company:company||`Comunidade ${repo.split('/')[0]}`,location:remote?'Brasil — remoto':(loc||'Local a confirmar'),city:remote?'':loc.split(/[,\-\/]/)[0].trim(),remote,workplace,country:'Brasil',region:'brasil',level:labels.filter(l=>/j[uú]nior|pleno|s[eê]nior|est[aá]gio|trainee/i.test(l)).join(' '),description:plain(issue.body||'').slice(0,2500),source:'GitHub Vagas',sourceDetail:repo,sourceUrl:safeUrl(issue.html_url),publishedAt:iso(issue.created_at),dateKind:'published',applyType:'Instruções no anúncio',language:'pt'};
}
export async function collectGithubBoards(settings,http){
  const stat={source:'GitHub Vagas',queries:0,received:0,errors:[]};const jobs=[];
  if(!wantsDev(settings))return null;
  const since=new Date(Date.now()-30*86400000).toISOString();
  for(const repo of GITHUB_REPOS){
    try{
      stat.queries++;
      const rows=await http.cached(`github:${repo}`,()=>http.fetchJson(`https://api.github.com/repos/${repo}/issues?${new URLSearchParams({state:'open',per_page:'100',since,sort:'created',direction:'desc'})}`,{Accept:'application/vnd.github+json'},{timeout:20000}),3*3600000);
      for(const issue of Array.isArray(rows)?rows:[]){if(issue.pull_request)continue;const j=parseGithubIssue(issue,repo);if(j.sourceUrl&&j.title)jobs.push(j)}
    }catch(e){stat.errors.push(`${repo}: ${e.message}`);if(/403|429/.test(e.message))break}
    await sleep(250);
  }
  stat.received=jobs.length;return {jobs,stat};
}

export async function collectRemote(settings,http){
  const tasks=[];
  if(settings.remote)tasks.push(collectGithubBoards(settings,http));
  if(settings.international||settings.remote){tasks.push(collectRemotiveSearch(settings,http),collectJobicyGeo(settings,http))}
  if(settings.international)tasks.push(collectHimalayas(settings,http),collectRemoteOk(settings,http),collectWorkingNomads(settings,http));
  return (await Promise.all(tasks)).filter(Boolean);
}
