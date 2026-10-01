// Fontes que dependem de chave de API (cadastradas em Meu perfil > Fontes extras).
// Ficam desligadas até a chave ser informada; uma falha aparece no diagnóstico, nunca vira vaga fictícia.
import {plain,norm,cityParts,searchTerms} from './sources-br.mjs';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function safeUrl(v){try{const u=new URL(v);return /^https?:$/.test(u.protocol)?u.href:null}catch{return null}}
function stateName(jobCity){return cityParts(jobCity).state||''}

// "há 3 dias", "3 days ago", "há 5 horas", "ontem", "30+ dias"
export function relativeDate(text,now=Date.now()){
  const t=norm(text);
  if(!t)return null;
  if(/ontem|yesterday/.test(t))return new Date(now-86400000).toISOString();
  if(/hoje|today|agora|just/.test(t))return new Date(now).toISOString();
  const m=/(\d+)\s*\+?\s*(minuto|minute|hora|hour|dia|day|semana|week|mes|month)/.exec(t);
  if(!m)return null;
  const n=Number(m[1]);const unit=m[2];
  const ms=/minut/.test(unit)?60000:/hora|hour/.test(unit)?3600000:/dia|day/.test(unit)?86400000:/semana|week/.test(unit)?7*86400000:30*86400000;
  return new Date(now-n*ms).toISOString();
}
const originPriority=[/gupy\.io/,/solides\.com\.br/,/pandape\.infojobs/,/empregos\.com\.br/,/vagas\.com\.br/,/catho\.com\.br/,/infojobs\.com\.br/,/indeed\./,/glassdoor\./,/linkedin\.com/];
function bestApplyLink(options){
  const list=(options||[]).map(o=>({title:plain(o.title),link:safeUrl(o.link)})).filter(o=>o.link);
  if(!list.length)return {link:null,via:''};
  // Prefere o site da empresa (fora dos agregadores conhecidos) ou o sistema de recrutamento de origem.
  const direct=list.find(o=>!originPriority.some(r=>r.test(o.link)));
  if(direct)return {link:direct.link,via:direct.title};
  list.sort((a,b)=>originPriority.findIndex(r=>r.test(a.link))-originPriority.findIndex(r=>r.test(b.link)));
  return {link:list[0].link,via:list[0].title};
}

// ---------- Google Vagas (Google for Jobs) via SerpApi ----------
export function normalizeGoogleJob(raw,now=Date.now()){
  const ext=raw.detected_extensions||{};
  // Em português o SerpApi costuma trazer a data e o regime só na lista "extensions" (ex.: "há 2 dias", "Tempo integral").
  const extList=(raw.extensions||[]).map(x=>String(x));
  const postedText=ext.posted_at||extList.find(x=>/\bh[aá]\s+\d+|\d+\s*(minuto|hora|dia|semana|m[eê]s)|ontem|hoje|ago\b/i.test(x))||'';
  const wfh=!!ext.work_from_home||extList.some(x=>/remot|home office|trabalho em casa|work from home/i.test(x));
  const {link,via}=bestApplyLink(raw.apply_options);
  const remote=wfh||/remot|home office|anywhere/i.test(`${raw.location} ${raw.title}`);
  const place=plain(raw.location||'');
  const cityName=place.split(/[,\-–]/)[0].trim();
  const highlights=(raw.job_highlights||[]).map(h=>`${plain(h.title||'')}: ${(h.items||[]).map(plain).join('; ')}`).join('\n');
  const origin=plain(via||raw.via||'').replace(/^(via|por)\s+/i,'');
  return {externalId:`google:${String(raw.job_id||'').slice(0,120)||norm(`${raw.title} ${raw.company_name} ${place}`)}`,title:plain(raw.title),company:plain(raw.company_name)||'Empresa não informada',location:remote?'Brasil — remoto':(place||'Local a confirmar'),city:remote?'':cityName,remote,workplace:remote?'remote':'onsite',level:'',description:plain(`${raw.description||''}\n${highlights}`).slice(0,2500),source:'Google Vagas',sourceDetail:origin,sourceUrl:link||safeUrl(raw.share_link),publishedAt:relativeDate(postedText,now),dateKind:relativeDate(postedText,now)?'published':'firstSeen',applyType:origin?`Candidatura em ${origin}`:'Site de origem',language:'pt',country:'Brasil'};
}
export async function collectGoogleJobs(settings,http,keys){
  if(!keys?.serpapiKey)return null;
  const stat={source:'Google Vagas',queries:0,received:0,errors:[]};
  const budget=Math.max(1,Math.min(30,Number(keys.serpapiBudget)||4));
  const {city,state}=cityParts(settings.jobCity);
  const terms=searchTerms(settings);
  const queries=[];
  if((settings.onsite||settings.hybrid)&&city){
    queries.push({q:`vagas de emprego ${city}`,location:`${city}, State of ${state||'Bahia'}, Brazil`,local:true});
    for(const t of terms.slice(0,3))queries.push({q:`${t} ${city}`,location:`${city}, State of ${state||'Bahia'}, Brazil`,local:true});
  }
  if(settings.remote)for(const t of terms.slice(0,4))queries.push({q:`${t} remoto home office`,location:'Brazil',local:false});
  const found=new Map();
  // Distribui o orçamento: primeiras páginas de cada consulta antes de aprofundar.
  // Intercala buscas locais e remotas para o orçamento não ir todo para a cidade.
  const loc=queries.filter(q=>q.local),rem=queries.filter(q=>!q.local),mixed=[];for(let i=0;i<Math.max(loc.length,rem.length);i++){if(loc[i])mixed.push(loc[i]);if(rem[i])mixed.push(rem[i])}
  const plan=mixed.slice(0,budget);
  for(const query of plan){
    try{
      stat.queries++;
      const key=`google:${norm(query.q)}:${norm(query.location)}`;
      const rows=await http.cached(key,async()=>{
        const params=new URLSearchParams({engine:'google_jobs',q:query.q,location:query.location,hl:'pt',gl:'br',google_domain:'google.com.br',api_key:keys.serpapiKey});
        const data=await http.fetchJson(`https://serpapi.com/search.json?${params}`,{},{timeout:60000});
        if(data?.error&&!/hasn't returned any results/i.test(data.error))throw Error(data.error);
        return Array.isArray(data?.jobs_results)?data.jobs_results:[];
      },20*3600000);
      for(const raw of rows){const job=normalizeGoogleJob(raw);if(job.title&&!found.has(job.externalId))found.set(job.externalId,job)}
    }catch(e){stat.errors.push(`"${query.q}": ${e.message}`)}
    await sleep(200);
  }
  const cityKey=norm(city);
  const jobs=[...found.values()].filter(j=>j.remote||!cityKey||norm(j.location).includes(cityKey));
  stat.received=jobs.length;
  return {jobs,stat};
}

// ---------- Adzuna ----------
export async function collectAdzuna(settings,http,keys){
  if(!keys?.adzunaId||!keys?.adzunaKey)return null;
  const stat={source:'Adzuna',queries:0,received:0,errors:[]};
  const {city}=cityParts(settings.jobCity);
  const maxAge=String(settings.jobMaxAgeDays)==='0'?60:Math.max(1,Math.min(30,Number(settings.jobMaxAgeDays)||7));
  const found=new Map();
  const runs=[];
  if((settings.onsite||settings.hybrid)&&city)runs.push({where:city,what:''});
  if(settings.remote)for(const t of searchTerms(settings).slice(0,4))runs.push({where:'',what:`${t} remoto`});
  for(const run of runs){
    try{
      stat.queries++;
      const rows=await http.cached(`adzuna:${norm(run.where)}:${norm(run.what)}:${maxAge}`,async()=>{
        const out=[];
        for(let page=1;page<=5;page++){
          const params=new URLSearchParams({app_id:keys.adzunaId,app_key:keys.adzunaKey,results_per_page:'50',max_days_old:String(maxAge),'content-type':'application/json'});
          if(run.where)params.set('where',run.where);if(run.what)params.set('what',run.what);
          const data=await http.fetchJson(`https://api.adzuna.com/v1/api/jobs/br/search/${page}?${params}`);
          const list=Array.isArray(data?.results)?data.results:[];
          out.push(...list);
          if(list.length<50)break;
          await sleep(300);
        }
        return out;
      });
      for(const r of rows){
        const loc=plain(r.location?.display_name||'');const remote=/remot|home office/i.test(`${r.title} ${r.description}`)&&!run.where;
        const job={externalId:`adzuna:${r.id}`,title:plain(r.title),company:plain(r.company?.display_name)||'Empresa não informada',location:remote?'Brasil — remoto':loc,city:remote?'':loc.split(',')[0].trim(),remote,workplace:remote?'remote':'onsite',level:'',description:plain(r.description).slice(0,2500),source:'Adzuna',sourceUrl:safeUrl(r.redirect_url),publishedAt:r.created||null,dateKind:'published',applyType:'Site de origem',language:'pt',country:'Brasil'};
        if(job.title&&!found.has(job.externalId))found.set(job.externalId,job);
      }
    }catch(e){stat.errors.push(`${run.where||run.what}: ${e.message}`)}
  }
  const cityKey=norm(city);
  const jobs=[...found.values()].filter(j=>j.remote||!cityKey||norm(j.location).includes(cityKey));
  stat.received=jobs.length;
  return {jobs,stat};
}

// ---------- Jooble ----------
export async function collectJooble(settings,http,keys){
  if(!keys?.joobleKey)return null;
  const stat={source:'Jooble',queries:0,received:0,errors:[]};
  const {city,state}=cityParts(settings.jobCity);
  const found=new Map();
  const runs=[];
  if((settings.onsite||settings.hybrid)&&city)runs.push({keywords:'',location:`${city}, ${state||''}`.replace(/,\s*$/,'')});
  if(settings.remote)for(const t of searchTerms(settings).slice(0,4))runs.push({keywords:`${t} remoto`,location:'Brasil'});
  for(const run of runs){
    try{
      stat.queries++;
      const rows=await http.cached(`jooble:${norm(run.keywords)}:${norm(run.location)}`,async()=>{
        const out=[];
        for(let page=1;page<=3;page++){
          const data=await http.fetchJson(`https://jooble.org/api/${encodeURIComponent(keys.joobleKey)}`,{'Content-Type':'application/json'},{method:'POST',body:JSON.stringify({keywords:run.keywords,location:run.location,page:String(page)})});
          const list=Array.isArray(data?.jobs)?data.jobs:[];
          out.push(...list);
          if(list.length<20)break;
          await sleep(300);
        }
        return out;
      });
      for(const r of rows){
        const loc=plain(r.location||'');const remote=/remot|home office/i.test(`${r.title} ${r.type} ${loc}`);
        const job={externalId:`jooble:${r.id||norm(r.link)}`,title:plain(r.title),company:plain(r.company)||'Empresa não informada',location:remote?'Brasil — remoto':loc,city:remote?'':loc.split(',')[0].trim(),remote,workplace:remote?'remote':'onsite',level:'',description:plain(r.snippet).slice(0,2500),source:'Jooble',sourceDetail:plain(r.source),sourceUrl:safeUrl(r.link),publishedAt:r.updated?new Date(r.updated).toISOString():null,dateKind:'published',applyType:'Site de origem',language:'pt',country:'Brasil'};
        if(job.title&&job.sourceUrl&&!found.has(job.externalId))found.set(job.externalId,job);
      }
    }catch(e){stat.errors.push(`${run.keywords||run.location}: ${e.message}`)}
  }
  const cityKey=norm(city);
  const jobs=[...found.values()].filter(j=>j.remote||!cityKey||norm(j.location).includes(cityKey));
  stat.received=jobs.length;
  return {jobs,stat};
}

export async function collectApis(settings,http,keys){
  const results=await Promise.all([collectGoogleJobs(settings,http,keys),collectAdzuna(settings,http,keys),collectJooble(settings,http,keys)]);
  return results.filter(Boolean);
}
