import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,join,resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomBytes} from 'node:crypto';
import {collectBrazil,norm,plain} from './sources-br.mjs';
import {matchProfile} from './match-profile.mjs';
import {collectApis} from './sources-apis.mjs';
import {collectRemote,openToBrazil,isBrazilLocation} from './sources-remote.mjs';
import {NICHES,OFFERS,buildOfferSheet,searchCampaign,composeMessages,scoreLead,STATUSES,customNiche} from './leads.mjs';
import {sendMail} from './mailer.mjs';
import {createAuth,isHttps,isLocal,passwordProblem,MIN_PASSWORD} from './auth.mjs';
import {INTERVIEW,CHECKIN,PILLARS,DEFAULT_VOICE,DAY_NAMES,AI_DEFAULTS,aiConfig,aiChat,buildStoryBank,planWeek,writePost,marketSignals,searchPhotos,photoProvider,choosePostPhoto,reminderEmail} from './posts.mjs';
import {LINKEDIN_CALLBACK,authorizationUrl,exchangeCode,memberInfo,publishMemberPost,sealToken,openToken} from './linkedin.mjs';

const root=dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||8765);
const host=process.env.HOST||'127.0.0.1';
const dataDir=process.env.RADAR_DATA_DIR||root;
const publicUrl=(process.env.RADAR_PUBLIC_URL||`http://localhost:${port}`).replace(/\/$/,'');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.md':'text/markdown; charset=utf-8','.pdf':'application/pdf'};
const cache=new Map();
const cacheMs=60*60*1000;
const stateFile=join(dataDir,'.radar-jobs-state.json');
// ---------- Proteção por senha ----------
const auth=createAuth({file:join(dataDir,'.radar-auth.json'),sendCode:async(code,req)=>{
  const k=state.integrations||{};if(!k.gmailUser||!k.gmailPass)throw Error('configure o Gmail em Meu perfil › E-mail para prospecção');
  const onde=String(req.headers['user-agent']||'').replace(/\(.*?\)/g,'').slice(0,80);
  await sendMail({user:k.gmailUser,pass:k.gmailPass,from:k.gmailUser,fromName:'Radar',to:k.alertEmail||k.gmailUser,subject:`Seu código de acesso ao Radar: ${code}`,text:`Alguém (esperamos que você) entrou no Radar com a sua senha a partir de um computador novo.\n\nCódigo: ${code}\n\nEle vale por 10 minutos.\nNavegador: ${onde}\nHorário: ${new Date().toLocaleString('pt-BR',{timeZone:'America/Bahia'})}\n\nSe não foi você, troque a senha em Meu perfil › Segurança.\n\n— Radar`});
}});
await auth.load();
const sineBahiaUrl='https://www.ba.gov.br/trabalho/280/vagas-do-dia-sinebahia';
let state={settings:null,profile:null,latest:null,seen:{},catalog:[],decisions:{},integrations:{},apiCache:{},manualJobs:[],campaigns:[],leads:{},leadBlocks:{ids:{},phones:{}},emailLog:[]};
try{state={...state,...JSON.parse(await readFile(stateFile,'utf8'))}}catch{}
state.seen||={};state.catalog||=[];state.decisions||={};state.integrations||={};state.apiCache||={};state.manualJobs||=[];state.campaigns||=[];state.leads||={};state.leadBlocks||={ids:{},phones:{}};state.emailLog||=[];
state.posts||={};state.posts.voice||={};state.posts.interview||={};state.posts.stories||=[];state.posts.diary||=[];state.posts.items||=[];
state.linkedin||={};
async function persistState(){await writeFile(stateFile,JSON.stringify(state),'utf8')}
const supportTerms=/suporte|support|help.?desk|customer success|customer service|atendimento ao cliente|implementation|implanta[cç][aã]o|service desk|t[eé]cnico de inform[aá]tica|t[eé]cnico em inform[aá]tica|inform[aá]tica|\bti\b|infraestrutura|sistemas/i;
const dataTerms=/dados|data analyst|business intelligence|power bi|\bbi\b|analytics|indicadores|relat[oó]rios|intelig[eê]ncia de mercado/i;
const operationsTerms=/opera[cç][oõ]es|operations|assistente administrativo|auxiliar administrativo|administrative assistant|office assistant|processos|automa[cç][aã]o|automation|administrativ|auxiliar de escrit[oó]rio|back.?office|assistente de escrit[oó]rio/i;
const devTerms=/desenvolvedor|desenvolvedora|programador|programadora|developer|software engineer|engenheir[oa] de software|front.?end|back.?end|full.?stack|\breact\b|node\.?js|python|\bjava\b|\.net|\bc#|\bphp\b|laravel|mobile|android|\bios\b|flutter|\bqa\b|tester|test automation|analista de testes|devops|\bsre\b|cloud engineer|web developer/i;
const internTech=/est[aá]gi|intern|trainee/i;
const internTechArea=/\bti\b|tecnologia|sistemas|inform[aá]tica|dados|desenvolvimento|\bads\b|computa[cç][aã]o|software|suporte/i;
// Áreas próximas da experiência registrada no currículo: entram como "possível correspondência", não como boa.
const adjacentTerms=/secret[aá]ri|atendente|atendimento|\bsac\b|telemarketing|teleatendimento|call center|central de relacionamento|recepcionista|estoque|estoquista|almoxarif|log[ií]stic|expedi[cç][aã]o|faturamento|cadastro|digitador|auxiliar de produ|operador de produ|desenvolvedor|programador|developer|analista de sistemas/i;
const juniorTerms=/\b(junior|júnior|jr\.?|entry.level|est[aá]gio|estagi[aá]rio|intern|trainee|assistente|assistant|associate|auxiliar)\b/i;
const seniorTerms=/\b(senior|sênior|sr\.?|pleno|pl|staff|principal|lead|líder|manager|gerente|head|director|diretor|diretora|coordenador|coordenadora|supervisor|supervisora)\b|\b(iii|iv)\b/i;
const brazilGeo=/\b(brazil|brasil|br|latam|latin america|south america|worldwide|global|anywhere)\b/i;
const cityGeo=/feira de santana/i;
function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:null}catch{return null}}
function dateValue(value){const date=new Date(value);return Number.isFinite(date.getTime())?date.toISOString():null}
function normalizeJobicy(raw){return {externalId:`jobicy:${raw.id}`,title:plain(raw.jobTitle),company:plain(raw.companyName),location:plain(raw.jobGeo),remote:true,level:plain(raw.jobLevel),description:plain(raw.jobDescription||raw.jobExcerpt).slice(0,2500),source:'Jobicy',sourceUrl:safeUrl(raw.url),publishedAt:dateValue(raw.pubDate),applyType:'Site de origem'}}
function normalizeRemotive(raw){return {externalId:`remotive:${raw.id}`,title:plain(raw.title),company:plain(raw.company_name),location:plain(raw.candidate_required_location),remote:true,level:plain(raw.job_type),description:plain(raw.description).slice(0,2500),source:'Remotive',sourceUrl:safeUrl(raw.url),publishedAt:dateValue(raw.publication_date),applyType:'Site de origem'}}
function normalizeLever(raw,slug){return {externalId:`lever:${slug}:${raw.id}`,title:plain(raw.text),company:slug,location:plain(raw.categories?.location),remote:raw.workplaceType==='remote'||/remot/i.test(raw.categories?.location||''),level:plain(raw.categories?.commitment),description:plain(raw.descriptionPlain||raw.description).slice(0,2500),source:'Lever',sourceUrl:safeUrl(raw.hostedUrl||raw.applyUrl),applyUrl:safeUrl(raw.applyUrl),publishedAt:null,applyType:'Formulário da empresa'}}
function normalizeGreenhouse(raw,slug){return {externalId:`greenhouse:${slug}:${raw.id}`,title:plain(raw.title),company:slug,location:plain(raw.location?.name),remote:/remot/i.test(raw.location?.name||''),level:'',description:plain(raw.content).slice(0,2500),source:'Greenhouse',sourceUrl:safeUrl(raw.absolute_url),publishedAt:null,applyType:'Formulário da empresa'}}
function normalizeSineBahia(html){
  const marker='VAGAS PARA FEIRA DE SANTANA DIA ';
  const at=html.indexOf(marker);
  if(at<0)return [];
  const start=html.lastIndexOf('<h2',at),end=html.indexOf('<h2',at);
  if(start<0||end<0)return [];
  const heading=plain(html.slice(start,html.indexOf('</h2>',at)+5));
  const match=/DIA\s+(\d{2})\/(\d{2})\/(\d{4})/i.exec(heading);
  if(!match)return [];
  const publishedAt=new Date(Date.UTC(Number(match[3]),Number(match[2])-1,Number(match[1]),12)).toISOString();
  const blocks=[...html.slice(html.indexOf('</h2>',at)+5,end).matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)];
  return blocks.map(([,block])=>{
    const title=plain(block.split(/<br\s*\/?\s*>/i)[0]);
    const description=plain(block);
    const id=createHash('sha256').update(`${match[1]}-${match[2]}-${match[3]}:${title}`).digest('hex').slice(0,16);
    return {externalId:`sinebahia:${id}`,title,company:'SineBahia',location:'Feira de Santana, BA',remote:false,level:'',description:description.slice(0,2500),source:'SineBahia',sourceUrl:sineBahiaUrl,publishedAt,dateKind:'bulletin',applyType:'Orientações na fonte oficial',city:'Feira de Santana',workplace:'onsite',language:'pt',country:'Brasil'};
  }).filter(job=>job.title);
}
function parseBoard(input){try{const u=new URL(input.trim());const slug=u.pathname.split('/').filter(Boolean)[0];if(!slug||!/^[a-z0-9_-]+$/i.test(slug))return null;if(u.hostname==='jobs.lever.co')return {type:'lever',slug};if(['boards.greenhouse.io','job-boards.greenhouse.io'].includes(u.hostname))return {type:'greenhouse',slug};return null}catch{return null}}
function isExclusiveRestriction(job){
  if(job.pcdOnly)return true;
  const text=`${job.title} ${job.description}`;
  if(/\bPCD\b/i.test(job.title)&&!/tamb[eé]m|inclusive|e pcd|ou pcd/i.test(job.title))return true;
  return /(exclusiv[ao]s?|somente|apenas|destinad[ao]s? exclusivamente)\s+(para|a)\s+(pessoas?\s+com\s+defici[eê]ncia|pcd)/i.test(text);
}
function areaFit(job,settings){
  const desired=(settings.jobRoles||'').toLowerCase();
  const title=job.title;
  const wantedSupport=/suporte|support|atendimento|implanta[cç][aã]o/i.test(desired);
  const wantedData=/dados|data|\bbi\b|power bi/i.test(desired);
  const wantedOperations=/process|automa|administrativ|opera[cç][aã]o/i.test(desired);
  const wantedIntern=/est[aá]gio/i.test(settings.jobLevels||'');
  const wantedDev=/desenvolv|programad|developer|software|full.?stack|front|back.?end|react|python|java|\.net|php|mobile|flutter|\bqa\b|teste|devops/i.test(desired);
  if(/marketing|sales|vendas|vendedor|recruiter|recrutador|promotor/i.test(title))return null;
  if((wantedSupport&&supportTerms.test(title))||(wantedData&&dataTerms.test(title))||(wantedOperations&&operationsTerms.test(title))||(wantedDev&&devTerms.test(title)))return 'boa';
  if(wantedIntern&&internTech.test(title)&&internTechArea.test(title))return 'boa';
  if(adjacentTerms.test(title))return 'possivel';
  // O título não diz tudo: requisitos claros do perfil na descrição também contam como possibilidade.
  if(/power bi|\bsql\b|suporte t[eé]cnico|help.?desk|n8n|atendimento ao cliente|excel avan[cç]ado/i.test(job.description||''))return 'possivel';
  return null;
}
function classify(job,settings){
  if(job.manual)return {reason:null,fit:areaFit(job,settings)||'possivel'};
  if(!job.title||!job.sourceUrl)return {reason:'incompleta'};
  if(isExclusiveRestriction(job))return {reason:'restrita'};
  // Período 0 = todas as vagas ainda abertas, sem limite de data de publicação.
  const openAll=String(settings.jobMaxAgeDays)==='0';
  const maxAge=openAll?3650:Math.max(1,Math.min(30,Number(settings.jobMaxAgeDays)||7));
  if(job.deadline&&Date.parse(job.deadline)<Date.now()-86400000)return {reason:'foraDoPrazo'};
  if(!job.publishedAt)return {reason:'semData'};
  const age=Date.now()-Date.parse(job.publishedAt);
  if(!Number.isFinite(age)||age>maxAge*86400000||age< -86400000)return {reason:'foraDoPrazo'};
  if(seniorTerms.test(`${job.title} ${job.level}`)&&!/j[uú]nior|\bjr\b|est[aá]gi|trainee/i.test(job.title))return {reason:'senioridade'};
  if(/est[aá]gi|estagi[aá]ri|\bintern(ship)?\b/i.test(job.title)&&!/est[aá]gi/i.test(settings.jobLevels||''))return {reason:'senioridade'};
  const workplace=job.workplace||(job.remote?'remote':'onsite');
  if(workplace==='remote'){
    if(jobRegion(job)==='exterior'){
      // Fora do Brasil: só entra se a pessoa quiser vagas internacionais e se a empresa aceita quem mora no Brasil.
      if(!settings.international)return {reason:'local'};
      if(job.openToBrazil===false||!openToBrazil(job.location,job.restrictions))return {reason:'exterior'};
    }else if(!settings.remote)return {reason:'local'};
  }
  else{
    if(workplace==='hybrid'&&!settings.hybrid)return {reason:'local'};
    if(workplace==='onsite'&&!settings.onsite)return {reason:'local'};
    const city=norm(String(settings.jobCity||'').split(/[,\-\/]/)[0]);
    if(!city||!norm(`${job.city||''} ${job.location||''}`).includes(city))return {reason:'local'};
  }
  const fit=areaFit(job,settings);
  if(!fit)return {reason:'area'};
  return {reason:null,fit};
}
function jobRegion(job){const w=job.workplace||(job.remote?'remote':'onsite');if(w!=='remote')return 'local';if(job.region)return job.region;if(job.country==='Brasil'||isBrazilLocation(job.location)||/brasil|brazil/i.test(job.location||''))return 'brasil';return 'exterior'}
function rejectionReason(job,settings){return classify(job,settings).reason}
function eligible(job,settings){return rejectionReason(job,settings)===null}
function assess(job,fit='boa'){
  const m=matchProfile(job,state.profile,fit);
  const gap=m.gaps.length?m.gaps.join(' '):(job.language==='pt'?'Confira requisitos obrigatórios, escolaridade, experiência mínima e prazo de inscrição na vaga original.':'Confira idioma, senioridade, requisitos obrigatórios e elegibilidade geográfica na vaga original.');
  return {score:m.score,evidence:m.evidence,gaps:m.gaps,gap,reqMet:m.reqMet,reqAsked:m.reqAsked,matchRatio:m.matchRatio,matchSummary:m.matchSummary,resume:'Selecione no currículo mestre as experiências e requisitos marcados acima. A versão final ainda precisa da sua revisão.'};
}
const smallWords=new Set(['de','da','do','das','dos','e','em','para','a','o','com','na','no','ou']);
function tidyTitle(title){
  let t=plain(title).replace(/^\d{5,}\s*-\s*/,'');
  // Remove cidade repetida no título ("- Feira de Santana/BA", "| Feira de Santana (BA)", "( CENTRO - FEIRA DE SANTANA/BA)").
  t=t.replace(/\s*\([^()]*feira de santana[^()]*\)\s*/i,' ').replace(/\s*[\|\-–—]\s*(unidade\s+)?feira de santana\s*[\/(\-]?\s*(ba|bahia)?\)?\s*$/i,'').replace(/\s*\|\s*feira de santana\s*\(ba\)\s*/i,' ').trim();
  t=t.replace(/\s+(unidade\s+)?feira de santana(\s*[-\/,]\s*(ba|bahia))?\s*$/i,'').trim();
  const letters=t.replace(/[^A-Za-zÀ-ÿ]/g,'');
  if(letters.length>3&&letters===letters.toUpperCase()){
    t=t.toLowerCase().split(' ').map((w,i)=>i>0&&smallWords.has(w)?w:(/^(ti|ads|sac|pcd|bi|erp|crm|rh|dp|ba|sp)$/.test(w)?w.toUpperCase():w.charAt(0).toUpperCase()+w.slice(1))).join(' ');
  }
  return t.replace(/\s{2,}/g,' ').replace(/\s+([,.;:])/g,'$1').trim()||String(title);
}
function portugueseTitle(title){return tidyTitle(title).replace(/remote/ig,'Remoto').replace(/cloud support engineer/ig,'Profissional de suporte em nuvem').replace(/office assistant/ig,'Assistente de escritório').replace(/customer support/ig,'Suporte ao cliente').replace(/customer service/ig,'Atendimento ao cliente').replace(/technical support/ig,'Suporte técnico').replace(/data analyst/ig,'Analista de dados').replace(/administrative assistant/ig,'Assistente administrativo').replace(/operations assistant/ig,'Assistente de operações').replace(/junior/ig,'Júnior')}
function portugueseOverview(job){const role=portugueseTitle(job.title);const place=job.workplace==='hybrid'?`vaga híbrida em ${job.location}`:job.remote?(jobRegion(job)==='exterior'?'vaga remota no exterior, aberta a quem mora no Brasil':'vaga remota no Brasil'):`vaga em ${job.location}`;const dateLabel=job.dateKind==='bulletin'?'no boletim de':job.dateKind==='firstSeen'?'vista pela primeira vez pelo Radar em':'publicada em';const language=job.language!=='pt'&&/\b(the|you|we|our|experience|responsibilities|requirements|skills|company)\b/i.test(job.description)?'A descrição original está em inglês; confirme o nível exigido e se aceita pessoas no Brasil.':'Confira os requisitos completos na vaga original.';return `${role} na ${job.company}. ${place}, ${dateLabel} ${new Date(job.publishedAt).toLocaleDateString('pt-BR')}. ${language}`}
async function fetchJson(url,headers={},options={}){const {timeout=15000,...rest}=options;const response=await fetch(url,{...rest,headers:{'Accept':'application/json','User-Agent':'RadarDaniel/0.2 (personal job discovery)',...headers},signal:AbortSignal.timeout(timeout)});if(!response.ok)throw Error(response.status===403||response.status===429?`acesso bloqueado ou limitado pela fonte (HTTP ${response.status})`:`HTTP ${response.status}`);return response.json()}
async function fetchRaw(url,headers={},timeout=15000){const response=await fetch(url,{headers:{'Accept':'text/html','User-Agent':'RadarDaniel/0.2 (personal job discovery)',...headers},signal:AbortSignal.timeout(timeout)});if(!response.ok)throw Error(`HTTP ${response.status}`);return response}
async function fetchText(url){const response=await fetch(url,{headers:{'Accept':'text/html','User-Agent':'RadarDaniel/0.1 (personal job discovery)'},signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error(`HTTP ${response.status}`);return response.text()}
// Cache em memória; consultas pagas (ttl longo) também ficam salvas em disco para não gastar a cota ao reiniciar.
async function cached(key,loader,ttl=cacheMs){
  const found=cache.get(key)||(ttl>cacheMs?state.apiCache[key]:null);
  if(found&&Date.now()-found.time<ttl)return found.data;
  const data=await loader();const entry={time:Date.now(),data};cache.set(key,entry);
  if(ttl>cacheMs){state.apiCache[key]=entry;for(const [k,v] of Object.entries(state.apiCache))if(Date.now()-v.time>3*86400000)delete state.apiCache[k]}
  return data;
}
const reasonLabels={incompleta:'anúncio sem título ou link',restrita:'vaga exclusiva para um perfil não informado',semData:'sem data de publicação confirmada',foraDoPrazo:'fora do prazo de publicação escolhido',senioridade:'nível diferente do procurado',local:'fora da região ou modalidade escolhida',exterior:'vaga no exterior que não aceita quem mora no Brasil',area:'fora das áreas escolhidas',duplicada:'mesma vaga em outra fonte',jaDecidida:'você já se candidatou ou marcou que não tem interesse',compatibilidade:'poucos requisitos da vaga constam no seu currículo'};
const httpTools={fetchJson,fetchRaw,fetchText,cached};
function dedupKey(job){return `${norm(plain(job.company)).replace(/ /g,'')}:${norm(plain(job.title)).replace(/ /g,'')}:${norm(job.city||(job.remote?'remoto':job.location)).replace(/ /g,'')}`}
async function collect(settings){
  const runAt=new Date().toISOString();
  const sources=[],failures=[],all=[],sourceStats=[];
  const track=(source,fn)=>fn().then(list=>{all.push(...list);sources.push(source);sourceStats.push({source,received:list.length,errors:[]})}).catch(error=>{failures.push(`${source}: ${error.message}`);sourceStats.push({source,received:0,errors:[error.message]})});
  const tasks=[];
  tasks.push(collectRemote(settings,httpTools).then(results=>{for(const {jobs,stat} of results){all.push(...jobs);sourceStats.push(stat);if(stat.received||stat.errors.length<stat.queries)sources.push(stat.source);if(stat.errors.length)failures.push(`${stat.source}: ${stat.errors.slice(0,2).join('; ')}`)}}).catch(error=>failures.push(`Fontes remotas: ${error.message}`)));
  if((settings.onsite||settings.hybrid)&&/feira de santana/i.test(settings.jobCity||''))tasks.push(track('SineBahia',async()=>normalizeSineBahia(await cached('sinebahia',()=>fetchText(sineBahiaUrl)))));
  tasks.push(collectApis(settings,httpTools,state.integrations||{}).then(results=>{for(const {jobs,stat} of results){all.push(...jobs);sourceStats.push(stat);if(stat.received||stat.errors.length<stat.queries)sources.push(stat.source);if(stat.errors.length)failures.push(`${stat.source}: ${stat.errors.slice(0,2).join('; ')}`)}}).catch(error=>failures.push(`Fontes com chave: ${error.message}`)));
  for(const m of state.manualJobs||[])all.push({...m});
  tasks.push(collectBrazil(settings,httpTools).then(results=>{for(const {jobs,stat} of results){all.push(...jobs);sourceStats.push(stat);if(stat.received||stat.errors.length<stat.queries)sources.push(stat.source);if(stat.errors.length)failures.push(`${stat.source}: ${stat.errors.slice(0,3).join('; ')}${stat.errors.length>3?` (+${stat.errors.length-3})`:''}`)}}).catch(error=>failures.push(`Fontes brasileiras: ${error.message}`)));
  const boards=String(settings.jobSources||'').split(/[\n,;]+/).map(parseBoard).filter(Boolean).slice(0,12);
  for(const board of boards){const key=`${board.type}:${board.slug}`;tasks.push(track(key,async()=>{const data=await cached(key,()=>fetchJson(board.type==='lever'?`https://api.lever.co/v0/postings/${board.slug}?mode=json`:`https://boards-api.greenhouse.io/v1/boards/${board.slug}/jobs?content=true`));const rows=board.type==='lever'?data:data.jobs;if(!Array.isArray(rows))throw Error('Resposta inválida');return rows.map(raw=>board.type==='lever'?normalizeLever(raw,board.slug):normalizeGreenhouse(raw,board.slug))}))}
  await Promise.all(tasks);

  // Histórico: quando o Radar viu cada anúncio pela primeira e pela última vez.
  for(const job of all){
    const entry=state.seen[job.externalId]||(state.seen[job.externalId]={firstSeenAt:runAt});
    entry.lastSeenAt=runAt;
    job.firstSeenAt=entry.firstSeenAt;
    job.isNew=entry.firstSeenAt===runAt;
    if(job.dateKind==='firstSeen')job.publishedAt=entry.firstSeenAt;
  }
  const cutoff=Date.now()-90*86400000;
  for(const [id,entry] of Object.entries(state.seen))if(Date.parse(entry.lastSeenAt)<cutoff)delete state.seen[id];

  const excluded={incompleta:0,restrita:0,semData:0,foraDoPrazo:0,senioridade:0,local:0,exterior:0,area:0,duplicada:0,jaDecidida:0,compatibilidade:0};
  // Vagas em que a pessoa já se candidatou ou que descartou não voltam, nem pelo mesmo anúncio em outra fonte.
  const closedIds=new Set(),closedKeys=new Set();
  for(const [id,d] of Object.entries(state.decisions||{}))if(d.status==='applied'||d.status==='rejected'){closedIds.add(id);if(d.key)closedKeys.add(d.key)}
  const maxAgeDays=String(settings.jobMaxAgeDays)==='0'?0:Math.max(1,Math.min(30,Number(settings.jobMaxAgeDays)||7));
  const ageLimit=(maxAgeDays||3650)*86400000;
  const recentCount=all.filter(job=>job.publishedAt&&Number.isFinite(Date.parse(job.publishedAt))&&Date.now()-Date.parse(job.publishedAt)<=ageLimit&&Date.now()-Date.parse(job.publishedAt)>= -86400000).length;
  // Fontes de origem primeiro; agregadores por último, para que a vaga agrupada aponte para onde ela nasceu.
  const aggregatorRank=j=>(['Google Vagas','Adzuna','Jooble','Jobicy','Remotive','Himalayas','RemoteOK','Working Nomads'].includes(j.source)?1:0);
  all.sort((a,b)=>aggregatorRank(a)-aggregatorRank(b));
  const catalog=[];const groups=new Map();
  for(const job of all){
    const {reason,fit}=classify(job,settings);
    const entry={id:job.externalId,url:job.sourceUrl,title:job.title,company:job.company,location:job.location,source:job.source,publishedAt:job.publishedAt,reason};
    catalog.push(entry);
    if(reason){excluded[reason]++;continue}
    const key=dedupKey(job);
    if(closedIds.has(job.externalId)||closedKeys.has(key)){excluded.jaDecidida++;entry.reason='jaDecidida';continue}
    const found=groups.get(key);
    if(found){excluded.duplicada++;entry.reason='duplicada';entry.duplicateOf=found.externalId;if(!found.alsoOn.some(x=>x.url===job.sourceUrl))found.alsoOn.push({source:job.source,url:job.sourceUrl});continue}
    groups.set(key,{...job,fit,alsoOn:[]});
  }
  // Exigência de compatibilidade: vagas remotas (o Brasil todo) passam por um filtro mais rigoroso que as da cidade.
  const remoteMin=Math.max(0,Math.min(100,Number(settings.remoteMinMatch??70)))/100;
  const localMin=Math.max(0,Math.min(100,Number(settings.localMinMatch??40)))/100;
  const jobs=[];
  for(const job of groups.values()){
    const full={...job,region:jobRegion(job),fitLabel:job.fit==='boa'?'Boa correspondência':'Possível correspondência',titlePt:jobRegion(job)==='exterior'?tidyTitle(job.title):portugueseTitle(job.title),overviewPt:portugueseOverview(job),...assess(job,job.fit)};
    const remote=full.workplace==='remote'||(full.remote&&!full.workplace);
    let ok=true;
    if(remote){
      if(full.fit!=='boa')ok=false;
      else if(full.reqAsked>=3)ok=full.matchRatio>=remoteMin;
      else if(full.reqAsked>0)ok=full.reqMet===full.reqAsked;
    }else if(full.reqAsked>=3)ok=full.matchRatio>=localMin;
    if(!ok){excluded.compatibilidade++;const c=catalog.find(e=>e.id===full.externalId);if(c)c.reason='compatibilidade';continue}
    jobs.push(full);
  }
  jobs.sort((a,b)=>(a.fit===b.fit?0:a.fit==='boa'?-1:1)||(b.isNew-a.isNew)||b.score-a.score||(b.publishedAt||'').localeCompare(a.publishedAt||''));
  for(const stat of sourceStats){stat.recommended=jobs.filter(j=>j.source===stat.source).length}
  const kept=jobs.slice(0,400);
  return {jobs:kept,sources,failures,excluded,scanned:all.length,recentCount,maxAgeDays,searchedAt:runAt,sourceStats,catalog,
    counts:{boa:kept.filter(j=>j.fit==='boa').length,possivel:kept.filter(j=>j.fit==='possivel').length,novas:kept.filter(j=>j.isNew).length,remotoBrasil:kept.filter(j=>j.region==='brasil').length,exterior:kept.filter(j=>j.region==='exterior').length,local:kept.filter(j=>j.region==='local').length},
    notConnected:['LinkedIn','Indeed','Glassdoor','InfoJobs','Catho']};
}

// ---------- Prova de cobertura ----------
const blockedHosts=[[/linkedin\./i,'LinkedIn'],[/indeed\./i,'Indeed'],[/glassdoor\./i,'Glassdoor'],[/\/\/(www\.)?infojobs\./i,'InfoJobs'],[/catho\./i,'Catho'],[/vagas\.com/i,'Vagas.com']];
function idsFromUrl(url){
  const ids=[];
  try{
    const u=new URL(url);
    if(/gupy\.io$/i.test(u.hostname)){const token=/\/job(?:s)?\/([^/?#]+)/.exec(u.pathname)?.[1];if(token){if(/^\d+$/.test(token))ids.push(`gupy:${token}`);else{try{const decoded=JSON.parse(Buffer.from(decodeURIComponent(token),'base64').toString('utf8'));if(decoded.jobId)ids.push(`gupy:${decoded.jobId}`)}catch{}}}}
    if(/empregos\.com\.br$/i.test(u.hostname)){const id=/\/vaga\/(\d+)/.exec(u.pathname)?.[1];if(id)ids.push(`empregos:${id}`)}
    if(/\.pandape\.infojobs\.com\.br$/i.test(u.hostname)){const id=/\/Detail\/(\d+)/i.exec(u.pathname)?.[1];if(id)ids.push(`pandape:${u.hostname.toLowerCase()}:${id}`)}
    if(/solides\.com\.br$/i.test(u.hostname)){const id=/\/vagas?\/(\d+)/.exec(u.pathname)?.[1]||/vacancies\/(\d+)/.exec(u.pathname)?.[1];if(id)ids.push(`solides:${id}`)}
  }catch{}
  return ids;
}
function cleanUrl(url){try{const u=new URL(url);return `${u.hostname.replace(/^www\./,'')}${u.pathname.replace(/\/$/,'')}`.toLowerCase()}catch{return ''}}
const stopWords=new Set(['de','da','do','das','dos','e','em','para','a','o','vaga','vagas','remoto','remota','hibrido','presencial','feira','santana','ba','bahia','brasil','jr','junior','na','no','com']);
function coverage(text){
  const catalog=state.latest?.catalog||[];
  const byId=new Map(catalog.map(x=>[x.id,x]));
  const byUrl=new Map(catalog.map(x=>[cleanUrl(x.url),x]));
  const lines=String(text||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).slice(0,60);
  const rows=lines.map(line=>{
    const url=/https?:\/\/\S+/.exec(line)?.[0]||'';
    const label=line.replace(url,'').replace(/[|;–—-]+/g,' ').trim();
    let match=null,how='';
    for(const id of url?idsFromUrl(url):[]){if(byId.has(id)){match=byId.get(id);how='mesmo anúncio'}}
    if(!match&&url&&byUrl.has(cleanUrl(url))){match=byUrl.get(cleanUrl(url));how='mesmo link'}
    if(!match&&label){
      const words=norm(label).split(' ').filter(w=>w.length>1&&!stopWords.has(w));
      if(words.length>=2){
        let best=null,bestScore=0;
        for(const item of catalog){const hay=` ${norm(`${item.title} ${item.company}`)} `;const hits=words.filter(w=>hay.includes(` ${w} `)).length/words.length;if(hits>bestScore){bestScore=hits;best=item}}
        if(bestScore>=0.75){match=best;how='cargo e empresa parecidos'}
      }
    }
    const host=url?blockedHosts.find(([re])=>re.test(url))?.[1]:null;
    if(match){
      const shown=match.reason===null;
      return {line,status:shown?'recomendada':'descartada',how,source:match.source,title:match.title,company:match.company,url:match.url,reason:shown?'Apareceu na lista de revisão.':(match.reason==='duplicada'?'Encontrada; aparece agrupada com o mesmo anúncio de outra fonte.':`Encontrada, mas descartada: ${reasonLabels[match.reason]||match.reason}.`)};
    }
    let reason='Não apareceu nas fontes consultadas.';
    if(host)reason=`${host} não está conectado ao robô: os termos de uso restringem coleta automática. Verifique se a mesma vaga existe na página da empresa ou na Gupy/Sólides.`;
    else if(url&&/gupy\.io/i.test(url))reason='É da Gupy, mas não veio nas buscas atuais: acrescente o cargo desta vaga em Configurações ou verifique se ela ainda está aberta.';
    else if(url&&/solides/i.test(url))reason='É da Sólides, mas não veio nas buscas atuais: acrescente o cargo desta vaga em Configurações.';
    else if(url&&/pandape\.infojobs/i.test(url))reason='Vaga de uma empresa que usa o Pandapé. Adicione o endereço “Trabalhe conosco” dessa empresa (ex.: https://empresa.pandape.infojobs.com.br) em Meu perfil > Páginas de carreiras.';
    else if(url&&/empregos\.com\.br/i.test(url))reason='É do Empregos.com.br, mas não veio na última busca: pode ser de outra cidade, mais antiga que o período escolhido ou já encerrada.';
    else if(url)reason='Site ainda não conectado ao robô. Se for página de carreiras Lever, Greenhouse ou Pandapé, adicione-a em Meu perfil.';
    return {line,status:'nao-encontrada',source:host||'',reason};
  });
  const summary={total:rows.length,recomendadas:rows.filter(r=>r.status==='recomendada').length,descartadas:rows.filter(r=>r.status==='descartada').length,naoEncontradas:rows.filter(r=>r.status==='nao-encontrada').length};
  return {rows,summary,searchedAt:state.latest?.searchedAt||null};
}

async function greenhouseQuestions(externalId){
  const match=/^greenhouse:([a-z0-9_-]+):(\d+)$/i.exec(externalId||'');
  if(!match)throw Error('Vaga Greenhouse inválida');
  const data=await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${match[1]}/jobs/${match[2]}?questions=true`);
  const standard=/^(first name|last name|email|phone|resume(?:\/cv)?|cover letter|linkedin profile|website|nome|sobrenome|e-mail|telefone|curr[ií]culo|carta de apresenta[cç][aã]o|address line \d+|city|region \(state\/county\/province\)|postal code\/zip code|country)$/i;
  return (Array.isArray(data.questions)?data.questions:[]).map(q=>plain(q.label)).filter(q=>q&&!standard.test(q)).slice(0,30);
}
async function bodyJson(req){let body='';for await(const chunk of req){body+=chunk;if(body.length>200000)throw Error('Dados excessivos')}return JSON.parse(body||'{}')}
function reply(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
// ---------- Clientes (campanhas e empresas) ----------
function emailPublic(){const k=state.integrations||{};return {user:k.gmailUser||'',configured:!!(k.gmailUser&&k.gmailPass),senderName:k.senderName||'',senderTitle:k.senderTitle||'',senderPhone:k.senderPhone||'',senderSite:k.senderSite||'',alertEmail:k.alertEmail||'',digestEnabled:k.digestEnabled!==false,digestHour:k.digestHour??5,lastDigestAt:state.lastDigestAt||null,dailyLimit:k.dailyLimit||20,sentToday:emailsSentToday()}}
function emailsSentToday(){const day=new Date().toLocaleDateString('pt-BR',{timeZone:'America/Bahia'});return (state.emailLog||[]).filter(e=>new Date(e.at).toLocaleDateString('pt-BR',{timeZone:'America/Bahia'})===day).length}
function senderInfo(){const k=state.integrations||{};const p=state.profile||{};const nameParts=String(p.name||'').split(/\s+/).filter(w=>w.length>2&&!/^(de|da|do|dos|das)$/i.test(w));return {name:k.senderName||(nameParts.length?`${nameParts[0]} ${nameParts.at(-1)}`:'Daniel'),title:k.senderTitle||'',phone:k.senderPhone||p.phone||'',site:k.senderSite||p.portfolio||''}}
function jobCatalogForSignals(){const cat=(state.latest?.catalog||[]).map(c=>({title:c.title,company:c.company,source:c.source,url:c.url}));for(const j of state.latest?.jobs||[])cat.push({title:j.title,company:j.company,source:j.source,url:j.sourceUrl});return cat}
// Empresas de campanhas excluídas: some quem ainda não foi contatado; quem já teve conversa fica no histórico.
function dropOrphanLeads(){const ids=new Set(state.campaigns.map(c=>c.id));let n=0;for(const [k,l] of Object.entries(state.leads||{}))if(!ids.has(l.campaignId)&&l.status==='new'){delete state.leads[k];n++}return n}
function leadsSummary(){const all=Object.values(state.leads||{});const by={};for(const s of STATUSES)by[s]=0;for(const l of all)by[l.status]=(by[l.status]||0)+1;return by}
function leadMetrics(){const out={};for(const l of Object.values(state.leads||{})){const k=`${l.campaignId}|${l.niche}`;const m=out[k]||(out[k]={campaignId:l.campaignId,niche:l.niche,total:0,contacted:0,replied:0,meeting:0,won:0});m.total++;if(['contacted','replied','meeting','proposal','won','lost'].includes(l.status)||l.contactedAt)m.contacted++;if(['replied','meeting','proposal','won'].includes(l.status)||l.repliedAt)m.replied++;if(['meeting','proposal','won'].includes(l.status))m.meeting++;if(l.status==='won')m.won++}return Object.values(out)}
function cleanCampaign(d,prev={}){
  const c={...prev};
  c.id=prev.id||`camp-${Date.now().toString(36)}`;
  c.name=plain(d.name||prev.name||'Nova campanha').slice(0,80);
  c.offerSummary=String(d.offerSummary??prev.offerSummary??'').slice(0,1000);
  if(d.offer&&typeof d.offer==='object'){const o={};for(const f of ['template','name','short','summary','problem','delivery','result','hiring','opening','questions','generatedBy'])if(d.offer[f]!==undefined)o[f]=String(d.offer[f]).slice(0,1500);c.offer=o}
  else if(!c.offer)c.offer=buildOfferSheet(c.offerSummary);
  if(Array.isArray(d.niches))c.niches=d.niches.map(String).slice(0,20);
  if(Array.isArray(d.customNiches))c.customNiches=d.customNiches.map(x=>plain(x).slice(0,60)).filter(Boolean).slice(0,10);
  for(const k of (c.customNiches||[])){const n=customNiche(k);if(n&&!(c.niches||[]).includes(n.key))(c.niches||(c.niches=[])).push(n.key)}
  for(const f of ['city','tone','channel'])if(d[f]!==undefined)c[f]=plain(d[f]).slice(0,80);
  for(const f of ['radiusKm','pagesPerNiche'])if(d[f]!==undefined)c[f]=Number(d[f])||undefined;
  if(Array.isArray(d.signals))c.signals=d.signals.map(String).slice(0,10);
  if(Array.isArray(d.sizes))c.sizes=d.sizes.map(String).slice(0,5);
  c.updatedAt=new Date().toISOString();c.createdAt=prev.createdAt||c.updatedAt;
  return c;
}
async function leadsApi(req,res,url){
  const parts=url.pathname.split('/').filter(Boolean);// api, campaigns|leads, id?, action?
  if(parts[1]==='campaigns'){
    if(parts.length===2&&req.method==='GET')return reply(res,200,{campaigns:state.campaigns,niches:NICHES.map(({key,label,cnae})=>({key,label,cnae})),offers:OFFERS.map(o=>({key:o.key,name:o.name})),metrics:leadMetrics(),summary:leadsSummary(),serpapi:!!state.integrations?.serpapiKey});
    if(parts.length===2&&req.method==='POST'){const d=await bodyJson(req);const c=cleanCampaign(d);state.campaigns.push(c);await persistState();return reply(res,200,{campaign:c})}
    if(parts[2]==='offer-sheet'&&req.method==='POST'){const d=await bodyJson(req);return reply(res,200,{offer:buildOfferSheet(d.summary,d.template||null)})}
    const c=state.campaigns.find(x=>x.id===parts[2]);
    if(!c)return reply(res,404,{error:'Campanha não encontrada'});
    if(parts.length===3&&req.method==='PUT'){const d=await bodyJson(req);const i=state.campaigns.indexOf(c);state.campaigns[i]=cleanCampaign(d,c);await persistState();return reply(res,200,{campaign:state.campaigns[i]})}
    if(parts.length===3&&req.method==='DELETE'){state.campaigns=state.campaigns.filter(x=>x!==c);const removed=dropOrphanLeads();await persistState();return reply(res,200,{ok:true,removed})}
    if(parts[3]==='search'&&req.method==='POST'){
      const stats=await searchCampaign(c,{http:httpTools,keys:state.integrations,state,jobCatalog:jobCatalogForSignals(),sender:senderInfo()});
      await persistState();
      return reply(res,200,{stats,leads:Object.values(state.leads).filter(l=>l.campaignId===c.id)});
    }
    if(parts[3]==='regenerate'&&req.method==='POST'){let n=0;for(const l of Object.values(state.leads))if(l.campaignId===c.id&&!l.messagesEditedAt){l.messages=composeMessages(l,c,senderInfo());n++}await persistState();return reply(res,200,{updated:n})}
  }
  if(parts[1]==='leads'){
    if(parts.length===2&&req.method==='GET')return reply(res,200,{leads:Object.values(state.leads||{}),summary:leadsSummary(),email:emailPublic()});
    const l=state.leads[decodeURIComponent(parts[2]||'')];
    if(!l)return reply(res,404,{error:'Empresa não encontrada'});
    const now=new Date().toISOString();
    if(parts.length===3&&req.method==='POST'){
      const d=await bodyJson(req);
      if(d.status&&STATUSES.includes(d.status)&&d.status!==l.status){
        l.history=(l.history||[]).concat({at:now,event:`Situação: ${d.status}`});
        if(d.status==='contacted'&&!l.contactedAt){l.contactedAt=now;l.followUpAt=l.followUpAt||new Date(Date.now()+4*86400000).toISOString()}
        if(d.status==='replied'){l.repliedAt=l.repliedAt||now;l.followUpAt=null}
        if(d.status==='blocked'){state.leadBlocks.ids[l.id]=true;if(l.phoneDigits)state.leadBlocks.phones[l.phoneDigits]=true;l.followUpAt=null}
        l.status=d.status;
      }
      if(d.messages&&typeof d.messages==='object'){l.messages={...l.messages,...Object.fromEntries(['whatsapp','emailSubject','emailBody'].filter(k=>typeof d.messages[k]==='string').map(k=>[k,d.messages[k].slice(0,5000)]))};l.messagesEditedAt=now}
      if(typeof d.notes==='string')l.notes=d.notes.slice(0,3000);
      if(d.followUpAt!==undefined)l.followUpAt=d.followUpAt||null;
      if(typeof d.email==='string'&&(!d.email||/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(d.email)))l.email=d.email||null;
      if(d.event)l.history=(l.history||[]).concat({at:now,event:plain(d.event).slice(0,200)});
      l.updatedAt=now;
      if(d.rescore)Object.assign(l,scoreLead(l));
      await persistState();return reply(res,200,{lead:l});
    }
    if(parts[3]==='send-email'&&req.method==='POST'){
      const k=state.integrations||{};
      if(!k.gmailUser||!k.gmailPass)return reply(res,400,{error:'Configure o e-mail de envio em Meu perfil > E-mail para prospecção.'});
      if(state.leadBlocks.ids[l.id]||l.status==='blocked')return reply(res,400,{error:'Esta empresa pediu para não ser contatada.'});
      if(!l.email)return reply(res,400,{error:'Esta empresa não tem e-mail cadastrado.'});
      const limit=k.dailyLimit||20;
      if(emailsSentToday()>=limit)return reply(res,429,{error:`Limite de ${limit} e-mails por dia atingido. Os próximos podem ser enviados amanhã.`});
      const d=await bodyJson(req);
      const subject=String(d.subject||l.messages?.emailSubject||'').slice(0,200),text=String(d.body||l.messages?.emailBody||'').slice(0,8000);
      if(!subject||!text)return reply(res,400,{error:'Assunto e mensagem são obrigatórios.'});
      try{
        await sendMail({user:k.gmailUser,pass:k.gmailPass,from:k.gmailUser,fromName:senderInfo().name,to:l.email,subject,text});
        state.emailLog.push({at:now,to:l.email,leadId:l.id});state.emailLog=state.emailLog.slice(-2000);
        l.messages={...l.messages,emailSubject:subject,emailBody:text};
        l.history=(l.history||[]).concat({at:now,event:`E-mail enviado para ${l.email}`});
        if(l.status==='new'){l.status='contacted';l.contactedAt=now;l.followUpAt=new Date(Date.now()+4*86400000).toISOString()}
        l.emailSentAt=now;l.updatedAt=now;
        await persistState();return reply(res,200,{lead:l,email:emailPublic()});
      }catch(e){return reply(res,502,{error:`O e-mail não foi enviado: ${e.message}`})}
    }
  }
  return false;
}

// ---------- Publicações ----------
function aiPublic(){const c=aiConfig(state.integrations);return {configured:!!c.key,baseUrl:c.baseUrl,model:c.model,fastModel:c.fastModel,defaults:AI_DEFAULTS}}
function linkedinStatus(){const l=state.linkedin;const c=l.connection;return {configured:!!(l.clientId&&l.clientSecret),connected:!!(c?.token&&Date.parse(c.expiresAt)>Date.now()+300000),name:c?.name||null,expiresAt:c?.expiresAt||null,autoPublish:!!l.autoPublish,redirectUri:`${publicUrl}${LINKEDIN_CALLBACK}`}}
function postsPublic(){const P=state.posts;return {items:P.items,voice:{...DEFAULT_VOICE,...P.voice},interview:P.interview,stories:P.stories,diary:P.diary.slice(-12),lastPlanAt:P.lastPlanAt||null,questions:{interview:INTERVIEW,checkin:CHECKIN},pillars:PILLARS,dayNames:DAY_NAMES,ai:aiPublic(),pexels:!!state.integrations?.pexelsKey,photoProvider:state.integrations?.pexelsKey?photoProvider(state.integrations.pexelsKey):null,email:emailPublic(),linkedin:linkedinStatus(),signals:marketSignals(state)}}
const publishingPosts=new Set();
function imagePath(post){return join(dataDir,'post-images',`${createHash('sha256').update(post.id).digest('hex')}.bin`)}
async function bodyBytes(req,max=10*1024*1024){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max)throw Error('Imagem maior que 10 MB.');chunks.push(chunk)}return Buffer.concat(chunks)}
function imageMime(bytes){if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';throw Error('Use uma imagem PNG ou JPEG.')}
async function imageForPost(post){
  const img=post.image||{};
  if(img.uploadedKind===img.kind&&img.uploadedAt){const bytes=await readFile(imagePath(post));return {bytes,mime:imageMime(bytes),alt:img.cardTitle||post.hook||'Imagem do post'}}
  if(img.kind==='photo'&&img.chosen?.large){
    const source=new URL(img.chosen.large);
    const allowed=new Set(['images.pexels.com','cdn.pixabay.com','pixabay.com']);
    if(source.protocol!=='https:'||!allowed.has(source.hostname))throw Error('Escolha uma foto do Pixabay ou Pexels na tela do post.');
    const response=await fetch(source,{signal:AbortSignal.timeout(20000)});
    if(!response.ok||!allowed.has(new URL(response.url).hostname))throw Error('Não consegui baixar a foto escolhida. Escolha outra imagem.');
    if(Number(response.headers.get('content-length'))>10*1024*1024)throw Error('A foto escolhida é maior que 10 MB.');
    const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>10*1024*1024)throw Error('A foto escolhida é maior que 10 MB.');
    return {bytes,mime:imageMime(bytes),alt:img.chosen.alt||post.hook||'Foto do post'};
  }
  throw Error(img.kind==='card'?'Salve o card antes de publicar automaticamente.':'Escolha ou envie a imagem deste post antes da publicação automática.');
}
async function publishApprovedPost(post,{retry=false}={}){
  if(post.status!=='approved')throw Error('Aprove o post antes de publicar.');
  if(!post.humanApprovedAt)throw Error('Confirme pessoalmente este post no Radar antes de publicá-lo no LinkedIn.');
  if(post.linkedinUrn)throw Error('Este post já foi enviado ao LinkedIn.');
  if(post.linkedinAttemptedAt&&!retry)throw Error('Já houve uma tentativa de publicação. Verifique seu perfil antes de tentar novamente.');
  if(publishingPosts.has(post.id))throw Error('Este post já está sendo enviado.');
  const l=state.linkedin;if(!linkedinStatus().connected)throw Error('Conecte o LinkedIn novamente em Meu perfil.');
  const image=await imageForPost(post);
  publishingPosts.add(post.id);
  try{
    post.linkedinAttemptedAt=new Date().toISOString();post.linkedinError=null;await persistState();
    const result=await publishMemberPost({token:openToken(l.connection.token,dataDir),sub:l.connection.sub,text:post.text,image});
    post.linkedinUrn=result.urn;post.linkedinUrl=result.url;post.status='published';post.publishedAt=new Date().toISOString();post.updatedAt=post.publishedAt;
    post.history=(post.history||[]).concat({at:post.publishedAt,event:'Publicado no LinkedIn'});await persistState();return result;
  }catch(e){post.linkedinError=String(e.message||e).slice(0,300);post.history=(post.history||[]).concat({at:new Date().toISOString(),event:`Publicação não confirmada: ${post.linkedinError}`});await persistState();throw e}
  finally{publishingPosts.delete(post.id)}
}
async function linkedinApi(req,res,url){
  const l=state.linkedin;
  if(url.pathname==='/api/linkedin/status'&&req.method==='GET')return reply(res,200,linkedinStatus());
  if(url.pathname==='/api/linkedin/app'&&req.method==='POST'){
    const d=await bodyJson(req);const id=String(d.clientId||'').trim(),secret=String(d.clientSecret||'').trim();
    if(!/^[A-Za-z0-9_-]{5,200}$/.test(id)||secret.length<8||secret.length>300)return reply(res,400,{error:'Informe o Client ID e o Client Secret do aplicativo LinkedIn.'});
    l.clientId=id;l.clientSecret=secret;l.connection=null;l.pending=null;l.autoPublish=false;await persistState();return reply(res,200,linkedinStatus());
  }
  if(url.pathname==='/api/linkedin/start'&&req.method==='GET'){
    if(!linkedinStatus().configured)return reply(res,409,{error:'Cadastre o aplicativo LinkedIn em Meu perfil primeiro.'});
    const nonce=randomBytes(24).toString('base64url');l.pending={nonce,session:req.session.id,expiresAt:Date.now()+10*60000};await persistState();
    res.writeHead(302,{Location:authorizationUrl({clientId:l.clientId,redirectUri:`${publicUrl}${LINKEDIN_CALLBACK}`,state:nonce}),'Cache-Control':'no-store'});res.end();return true;
  }
  if(url.pathname===LINKEDIN_CALLBACK&&req.method==='GET'){
    const pending=l.pending;l.pending=null;await persistState();
    if(!pending||pending.expiresAt<Date.now()||pending.session!==req.session.id||pending.nonce!==url.searchParams.get('state'))return reply(res,400,{error:'Autorização expirada ou inválida. Volte ao Radar e tente conectar novamente.'});
    if(url.searchParams.has('error')){res.writeHead(302,{Location:'/?linkedin=cancelled','Cache-Control':'no-store'});res.end();return true}
    const code=url.searchParams.get('code');if(!code)return reply(res,400,{error:'O LinkedIn não devolveu o código de autorização.'});
    try{
      const token=await exchangeCode({clientId:l.clientId,clientSecret:l.clientSecret,redirectUri:`${publicUrl}${LINKEDIN_CALLBACK}`,code});
      const info=await memberInfo(token.access_token);
      l.connection={token:sealToken(token.access_token,dataDir),sub:info.sub,name:info.name,picture:info.picture,connectedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+Math.min(60*86400,Number(token.expires_in)||3600)*1000).toISOString()};
      l.autoPublish=false;await persistState();res.writeHead(302,{Location:'/?linkedin=connected','Cache-Control':'no-store'});res.end();return true;
    }catch(e){console.error('Conexão LinkedIn:',e.message);return reply(res,502,{error:e.message})}
  }
  if(url.pathname==='/api/linkedin/auto'&&req.method==='POST'){
    const d=await bodyJson(req);if(d.enabled&&!linkedinStatus().connected)return reply(res,409,{error:'Conecte sua conta do LinkedIn primeiro.'});
    l.autoPublish=!!d.enabled;await persistState();return reply(res,200,linkedinStatus());
  }
  if(url.pathname==='/api/linkedin/disconnect'&&req.method==='POST'){
    l.connection=null;l.pending=null;l.autoPublish=false;await persistState();return reply(res,200,linkedinStatus());
  }
  return false;
}
function cleanVoice(d){
  const v={...DEFAULT_VOICE,...state.posts.voice};
  for(const f of ['goal','market','language','audience','time','tone','depth','length','emojis','avoid','examples','cta','imagePreference','editorialGuidance','updatedAt'])if(typeof d[f]==='string')v[f]=d[f].slice(0,f==='examples'?4000:600);
  for(const f of ['postsPerWeek','hashtags','callEvery'])if(d[f]!==undefined)v[f]=Math.max(0,Math.min(f==='postsPerWeek'?7:10,Number(d[f])||0));
  if(Array.isArray(d.sequence))v.sequence=d.sequence.map(String).filter(x=>['emprego','clientes',...PILLARS.map(p=>p.key)].includes(x)).slice(0,7);
 if(Array.isArray(d.days))v.days=d.days.map(String).filter(x=>/^[0-6]$/.test(x));
  if(Array.isArray(d.pillars))v.pillars=d.pillars.map(String).filter(x=>PILLARS.some(p=>p.key===x));
  for(const f of ['autoPlan','autoApprove','remindEmail'])if(d[f]!==undefined)v[f]=!!d[f];
  return v;
}
let planning=false,planningJob=null;
async function postsApi(req,res,url){
  const P=state.posts;const parts=url.pathname.split('/').filter(Boolean);
  const cfg=aiConfig(state.integrations);
  if(url.pathname==='/api/ai/test'&&req.method==='POST'){
    const d=await bodyJson(req);const t0=Date.now();
    try{const r=await aiChat(cfg,{system:'Responda em português, em uma frase curta.',user:'Diga "Conexão com a IA funcionando" e mais nada.',model:d.model||cfg.model,maxTokens:2000,temperature:0,session:'radar-teste',timeout:90000});return reply(res,200,{ok:true,text:r.text.slice(0,200),model:r.model,ms:Date.now()-t0})}
    catch(e){return reply(res,200,{ok:false,error:e.message,model:d.model||cfg.model})}
  }
  if(url.pathname==='/api/ai/models'&&req.method==='GET'){
    try{const data=await fetchJson(`${cfg.baseUrl}/models`,{Authorization:`Bearer ${cfg.key}`,'User-Agent':'RadarPortal/0.3'},{timeout:20000});return reply(res,200,{models:(data.data||data.models||[]).map(m=>m.id||m.name).filter(Boolean)})}
    catch(e){return reply(res,200,{models:[],error:e.message})}
  }
  if(parts[1]!=='posts')return false;
  if(parts.length===2&&req.method==='GET')return reply(res,200,postsPublic());
  if(parts[2]==='voice'&&req.method==='POST'){P.voice=cleanVoice(await bodyJson(req));await persistState();return reply(res,200,{voice:P.voice})}
  if(parts[2]==='interview'&&req.method==='POST'){
    const d=await bodyJson(req);
    if(d.profile&&typeof d.profile==='object')state.profile=d.profile;
    for(const q of INTERVIEW)if(typeof d.answers?.[q.key]==='string')P.interview[q.key]=d.answers[q.key].slice(0,4000);
    P.interviewAt=new Date().toISOString();await persistState();
    if(!d.build)return reply(res,200,{ok:true});
    try{const fresh=await buildStoryBank(cfg,{profile:state.profile,interview:P.interview,diary:P.diary});const used=new Map(P.stories.map(s=>[s.id,s]));P.stories=fresh.map(s=>used.get(s.id)?{...s,used:used.get(s.id).used}:s).concat(P.stories.filter(s=>s.manual));await persistState();return reply(res,200,{stories:P.stories})}
    catch(e){return reply(res,502,{error:`Respostas salvas, mas o banco de histórias não foi montado: ${e.message}`})}
  }
  if(parts[2]==='checkin'&&req.method==='POST'){
    const d=await bodyJson(req);const answers={};for(const q of CHECKIN)if(typeof d.answers?.[q.key]==='string'&&d.answers[q.key].trim())answers[q.key]=d.answers[q.key].trim().slice(0,3000);
    if(!Object.keys(answers).length)return reply(res,400,{error:'Responda pelo menos uma pergunta.'});
    const at=new Date();const entry={id:`ck-${at.getTime().toString(36)}`,at:at.toISOString(),weekOf:at.toLocaleDateString('pt-BR',{timeZone:'America/Bahia'}),answers};
    P.diary.push(entry);P.diary=P.diary.slice(-60);await persistState();return reply(res,200,{entry})
  }
  if(parts[2]==='stories'&&parts[3]&&req.method==='POST'){const s=P.stories.find(x=>x.id===parts[3]);if(!s)return reply(res,404,{error:'História não encontrada'});const d=await bodyJson(req);if(d.archived!==undefined)s.archived=!!d.archived;await persistState();return reply(res,200,{story:s})}
  if(parts[2]==='plan-status'&&req.method==='GET')return reply(res,200,planningJob||{status:'idle'});
  if(parts[2]==='plan'&&req.method==='POST'){
    const d=await bodyJson(req);if(d.profile&&typeof d.profile==='object')state.profile=d.profile;
    if(planning)return reply(res,409,{error:'O Radar já está escrevendo os posts. Aguarde um instante.'});
    planning=true;planningJob={status:'running',phase:'images',created:0,updated:0,errors:[],startedAt:new Date().toISOString()};
    void (async()=>{
      try{
        const photoKey=state.integrations?.pexelsKey;
        for(const post of P.items.filter(x=>x.status==='draft'&&!x.image?.chosen&&Date.parse(x.scheduledFor)>Date.now()-86400000)){
          if(!photoKey)break;
          try{if(await choosePostPhoto(post,photoKey,httpTools,{otherPosts:P.items})){planningJob.updated++;await persistState()}}
          catch(e){planningJob.errors.push(`Imagem: ${e.message}`)}
        }
        planningJob.phase='writing';
        const result=await planWeek(cfg,state,{count:Math.max(1,Math.min(7,Number(d.count)||Number(P.voice.postsPerWeek)||3)),manual:true,topics:Array.isArray(d.topics)?d.topics.slice(0,7):[],photoKey,http:httpTools,onPost:async()=>{planningJob.created++;await persistState()}});
        await persistState();planningJob={...planningJob,status:'done',errors:planningJob.errors.concat(result.errors),note:result.note||null,finishedAt:new Date().toISOString()};
      }catch(e){planningJob={...planningJob,status:'error',errors:planningJob.errors.concat(e.message),finishedAt:new Date().toISOString()};console.error('Planejamento dos posts:',e.message)}
      finally{planning=false}
    })();
    return reply(res,202,{status:'running'});
  }
  if(parts[2]==='compare'&&req.method==='POST'){
    const d=await bodyJson(req);const models=(d.models||[]).slice(0,6);const voice={...DEFAULT_VOICE,...P.voice};
    const story=P.stories.find(s=>s.id===d.storyId)||P.stories.find(s=>s.pillar==='prova')||P.stories[0]||null;
    // Um modelo por vez: o plano Go recusa (erro 500) quando vários pedidos pesados chegam juntos.
    const results=[];for(const m of models){const t0=Date.now();try{const w=await writePost(cfg,{voice,interview:P.interview,profile:state.profile,pillar:story?.pillar||'historia',story,signals:marketSignals(state),language:voice.language==='en'?'en':'pt',model:m});results.push({model:m,text:w.text,ms:Date.now()-t0})}catch(e){results.push({model:m,error:e.message,ms:Date.now()-t0})}}
    return reply(res,200,{story,results});
  }
  const post=P.items.find(x=>x.id===parts[2]);
  if(!post)return reply(res,404,{error:'Post não encontrado'});
  const now=new Date().toISOString();
  if(parts[3]==='image'&&req.method==='POST'){
    try{const bytes=await bodyBytes(req);const mime=imageMime(bytes);await mkdir(join(dataDir,'post-images'),{recursive:true,mode:0o700});await writeFile(imagePath(post),bytes,{mode:0o600});post.image||={};post.image.uploadedKind=post.image.kind;post.image.uploadedAt=now;post.image.uploadedMime=mime;if(post.status==='approved'){post.status='draft';post.humanApprovedAt=null}await persistState();return reply(res,200,{post})}
    catch(e){return reply(res,400,{error:e.message})}
  }
  if(parts[3]==='publish-now'&&req.method==='POST'){
    try{const d=await bodyJson(req);const result=await publishApprovedPost(post,{retry:d.retry===true});return reply(res,200,{post,result})}
    catch(e){return reply(res,409,{error:e.message,post})}
  }
  if(parts.length===3&&req.method==='DELETE'){P.items=P.items.filter(x=>x!==post);await persistState();return reply(res,200,{ok:true})}
  if(parts.length===3&&req.method==='POST'){
    const d=await bodyJson(req);
    // Mudar texto ou imagem exige nova aprovação; mudar só o horário mantém o post aprovado.
    if(post.status==='approved'&&d.status!=='approved'&&((typeof d.text==='string'&&d.text!==post.text)||(d.image&&Object.keys(d.image).some(k=>!['photoQuery'].includes(k))))){post.status='draft';post.humanApprovedAt=null}
    if(typeof d.text==='string'){post.text=d.text.slice(0,3000);post.editedAt=now}
    if(d.status&&['draft','approved','published','skipped'].includes(d.status)&&d.status!==post.status){post.status=d.status;post.history=(post.history||[]).concat({at:now,event:{draft:'Voltou para rascunho',approved:'Aprovado',published:'Publicado',skipped:'Descartado'}[d.status]});if(d.status==='approved')post.humanApprovedAt=now;else post.humanApprovedAt=null;if(d.status==='published')post.publishedAt=now}
    if(d.status==='approved'&&!post.humanApprovedAt){post.humanApprovedAt=now;post.history=(post.history||[]).concat({at:now,event:'Aprovação manual confirmada'})}
    if(d.scheduledFor&&!Number.isNaN(Date.parse(d.scheduledFor))){post.scheduledFor=new Date(d.scheduledFor).toISOString();post.remindedAt=null}
    if(d.image&&typeof d.image==='object'){const img=post.image||(post.image={});if(d.image.kind!==undefined||d.image.cardTitle!==undefined||d.image.cardLines!==undefined||d.image.chosen!==undefined||d.image.style!==undefined){img.uploadedAt=null;img.uploadedKind=null}for(const f of ['kind','printIdea','cardTitle','photoQuery'])if(typeof d.image[f]==='string')img[f]=d.image[f].slice(0,300);if(['contrast','editorial','minimal'].includes(d.image.style))img.style=d.image.style;if(Array.isArray(d.image.cardLines))img.cardLines=d.image.cardLines.map(x=>String(x).slice(0,80)).slice(0,3);if(d.image.chosen===null||typeof d.image.chosen==='object'){img.chosen=d.image.chosen?{id:d.image.chosen.id,large:String(d.image.chosen.large||''),thumb:String(d.image.chosen.thumb||''),author:String(d.image.chosen.author||''),page:String(d.image.chosen.page||''),provider:String(d.image.chosen.provider||'')}:null;img.autoSelected=false}}
    post.updatedAt=now;await persistState();return reply(res,200,{post});
  }
  if(parts[3]==='rewrite'&&req.method==='POST'){
    const d=await bodyJson(req);const voice={...DEFAULT_VOICE,...P.voice};
    try{const w=await writePost(cfg,{voice,interview:P.interview,profile:state.profile,pillar:post.pillar,story:P.stories.find(s=>s.id===post.storyId)||null,signals:marketSignals(state),language:post.language,instruction:String(d.instruction||'').slice(0,500),previous:post.text,model:d.model||undefined});
      Object.assign(post,{text:w.text,hook:w.hook,image:{...w.image,chosen:null},factsUsed:w.factsUsed,model:w.model,updatedAt:now});post.history=(post.history||[]).concat({at:now,event:`Reescrito${d.instruction?`: ${String(d.instruction).slice(0,80)}`:''}`});await persistState();return reply(res,200,{post})}
    catch(e){return reply(res,502,{error:e.message})}
  }
  if(parts[3]==='photos'&&req.method==='GET'){
    try{const photos=await searchPhotos(state.integrations?.pexelsKey,url.searchParams.get('q')||post.image?.photoQuery,{http:httpTools});return reply(res,200,{photos})}
    catch(e){return reply(res,400,{error:e.message})}
  }
  return false;
}
// ---------- Resumo diário por e-mail (padrão: 5h, horário da Bahia) ----------
const bahiaDay=(d=new Date())=>d.toLocaleDateString('en-CA',{timeZone:'America/Bahia'});
const bahiaHour=(d=new Date())=>Number(d.toLocaleString('en-US',{hour:'numeric',hourCycle:'h23',timeZone:'America/Bahia'}));
function buildDigest(){
  const latest=state.latest||{jobs:[]};const closed=new Set(Object.entries(state.decisions||{}).filter(([,d])=>d.status==='applied'||d.status==='rejected').map(([id])=>id));
  const jobs=(latest.jobs||[]).filter(j=>!closed.has(j.externalId));
  const fresh=jobs.filter(j=>j.isNew||Date.now()-Date.parse(j.firstSeenAt||0)<26*3600000);
  const by=r=>jobs.filter(j=>j.region===r).length;
  const rank=(a,b)=>(a.fit===b.fit?0:a.fit==='boa'?-1:1)||((b.isNew?1:0)-(a.isNew?1:0))||(b.score||0)-(a.score||0);
  const top=[...jobs].sort(rank).slice(0,8);
  const P=state.posts||{items:[]};const today=bahiaDay();
  const drafts=P.items.filter(x=>x.status==='draft');
  const todayPosts=P.items.filter(x=>['draft','approved'].includes(x.status)&&bahiaDay(new Date(x.scheduledFor))===today);
  const leads=Object.values(state.leads||{});const newLeads=leads.filter(l=>l.status==='new');
  const follow=leads.filter(l=>l.followUpAt&&['contacted','replied','meeting','proposal'].includes(l.status)&&bahiaDay(new Date(l.followUpAt))<=today);
  const url=process.env.RADAR_PUBLIC_URL||state.publicUrl||`http://localhost:${port}`;
  const name=String(state.profile?.name||'').split(/\s+/)[0]||'';
  const regionLabel={brasil:'remoto no Brasil',exterior:'fora do Brasil',local:'na sua cidade'};
  const period=Number(latest.maxAgeDays)===1?'últimas 24 horas':latest.maxAgeDays?`últimos ${latest.maxAgeDays} dias`:'todas as abertas';
  const lines=[`Bom dia${name?`, ${name}`:''}! Aqui está o que o Radar preparou para hoje.`,'',
    `VAGAS (${period}) — ${jobs.length} para você olhar${fresh.length?`, ${fresh.length} novas desde ontem`:''}`,
    `Remoto no Brasil: ${by('brasil')} · Fora do Brasil: ${by('exterior')} · Na sua cidade: ${by('local')}`];
  if(top.length){lines.push('','Destaques:');for(const j of top)lines.push(`• ${j.titlePt||j.title} — ${j.company} (${regionLabel[j.region]||j.location})${j.fit==='boa'?' · boa correspondência':''}${j.isNew?' · nova':''}`,`  ${j.sourceUrl}`)}
  else lines.push('Nenhuma vaga nova dentro dos seus filtros hoje.');
  lines.push('',`PUBLICAÇÕES — ${drafts.length} ${drafts.length===1?'post esperando':'posts esperando'} sua aprovação.`);
  for(const x of todayPosts)lines.push(`• Hoje às ${new Date(x.scheduledFor).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Bahia'})}: ${x.hook||x.text.split('\n')[0]}${x.status==='draft'?' (ainda não aprovado)':''}`);
  lines.push('',`CLIENTES — ${newLeads.length} ${newLeads.length===1?'empresa':'empresas'} para contatar${follow.length?` e ${follow.length} ${follow.length===1?'retorno':'retornos'} para hoje`:''}.`);
  lines.push('',`Abrir o Radar: ${url}`,'','— Radar');
  const subject=`Radar · ${new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'America/Bahia'})}: ${jobs.length} ${jobs.length===1?'vaga':'vagas'}, ${drafts.length} ${drafts.length===1?'post':'posts'}, ${newLeads.length} ${newLeads.length===1?'cliente':'clientes'}`;
  return {subject,text:lines.join('\n'),counts:{jobs:jobs.length,fresh:fresh.length,brasil:by('brasil'),exterior:by('exterior'),local:by('local'),drafts:drafts.length,leads:newLeads.length,followUps:follow.length}};
}
async function sendDigest({force=false}={}){
  const k=state.integrations||{};
  if(!k.gmailUser||!k.gmailPass)throw Error('Configure o Gmail em Meu perfil › E-mail para prospecção.');
  if(!force&&k.digestEnabled===false)return {skipped:'desligado'};
  const d=buildDigest();
  await sendMail({user:k.gmailUser,pass:k.gmailPass,from:k.gmailUser,fromName:'Radar',to:k.alertEmail||k.gmailUser,subject:d.subject,text:d.text});
  state.lastDigestAt=new Date().toISOString();if(!force)state.lastDigestDay=bahiaDay();await persistState();
  return {ok:true,to:k.alertEmail||k.gmailUser,counts:d.counts};
}
let digestBusy=false;
async function digestTick(){
  const k=state.integrations||{};
  if(digestBusy||k.digestEnabled===false||!k.gmailUser||!k.gmailPass)return;
  if(state.lastDigestDay===bahiaDay()||bahiaHour()<(k.digestHour??5))return;
  digestBusy=true;
  try{
    // Garante que a busca do dia já rodou antes de mandar o resumo.
    if(state.settings&&bahiaDay(new Date(state.latest?.searchedAt||0))!==bahiaDay())await dailyRun();
    const r=await sendDigest();console.log(`Resumo diário enviado para ${r.to}`);
  }catch(e){console.error('Resumo diário falhou:',e.message)}finally{digestBusy=false}
}
// Automação: planeja a semana sozinho e manda lembrete por e-mail na hora de cada post.
async function postsTick(){
  const P=state.posts;const voice={...DEFAULT_VOICE,...P.voice};const cfg=aiConfig(state.integrations);const k=state.integrations||{};
  try{
    if(voice.autoPlan&&cfg.key&&!planning&&(!P.lastPlanAt||Date.now()-Date.parse(P.lastPlanAt)>20*3600000)&&(P.stories.length||Object.keys(P.interview).length)){
      const soon=P.items.filter(x=>['draft','approved'].includes(x.status)&&Date.parse(x.scheduledFor)>Date.now()&&Date.parse(x.scheduledFor)<Date.now()+8*86400000).length;
      if(soon<(Number(voice.postsPerWeek)||3)){
        planning=true;
        try{const r=await planWeek(cfg,state,{photoKey:k.pexelsKey,http:httpTools,onPost:async()=>persistState()});await persistState();console.log(`Publicações: ${r.created.length} posts planejados${r.errors.length?` (${r.errors.length} com erro)`:''}`);
          if(r.created.length&&voice.remindEmail&&k.gmailUser&&k.gmailPass){const list=r.created.map(p=>`• ${new Date(p.scheduledFor).toLocaleString('pt-BR',{timeZone:'America/Bahia',weekday:'long',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}: ${p.hook||p.text.split('\n')[0]}`).join('\n');await sendMail({user:k.gmailUser,pass:k.gmailPass,from:k.gmailUser,fromName:'Radar',to:k.alertEmail||k.gmailUser,subject:`Seus ${r.created.length} posts da próxima semana estão prontos`,text:`O Radar escreveu os posts da próxima semana:\n\n${list}\n\n${voice.autoApprove?'Eles já estão aprovados; você recebe cada um por e-mail na hora de publicar.':'Revise e aprove em alguns minutos: '+publicUrl+'/#content'}\n\n— Radar`}).catch(e=>console.error('E-mail da pauta falhou:',e.message))}
        }finally{planning=false}
      }
    }
    if(state.linkedin.autoPublish&&linkedinStatus().connected){
      for(const post of P.items.filter(x=>x.status==='approved'&&x.humanApprovedAt&&!x.linkedinAttemptedAt&&Date.parse(x.scheduledFor)<=Date.now()&&Date.now()-Date.parse(x.scheduledFor)<36*3600000)){
        try{await publishApprovedPost(post);console.log(`Publicação LinkedIn concluída: ${post.id}`)}
        catch(e){if(post.linkedinError!==e.message){post.linkedinError=String(e.message).slice(0,300);await persistState()}console.error(`Publicação LinkedIn ${post.id}: ${e.message}`)}
      }
    }
    if(voice.remindEmail&&k.gmailUser&&k.gmailPass){
      for(const post of P.items.filter(x=>x.status==='approved'&&!x.remindedAt&&Date.parse(x.scheduledFor)<=Date.now()&&Date.now()-Date.parse(x.scheduledFor)<36*3600000)){
        const m=reminderEmail(post,{localUrl:`${publicUrl}/#content`});
        try{await sendMail({user:k.gmailUser,pass:k.gmailPass,from:k.gmailUser,fromName:'Radar',to:k.alertEmail||k.gmailUser,subject:m.subject,text:m.text});post.remindedAt=new Date().toISOString();post.history=(post.history||[]).concat({at:post.remindedAt,event:'Lembrete enviado por e-mail'});await persistState()}
        catch(e){console.error('Lembrete de post falhou:',e.message)}
      }
    }
  }catch(e){console.error('Publicações:',e.message)}
}

// Rotas públicas (tela de entrada) e a trava que exige sessão em todo o resto.
const PUBLIC_FILES=new Set(['/entrar','/entrar.html']);
function sendCookies(res,cookies){if(cookies?.length)res.setHeader('Set-Cookie',cookies)}
async function authRoutes(req,res,url){
  const p=url.pathname;
  if(PUBLIC_FILES.has(p)&&req.method==='GET'){
    if(auth.session(req)){res.writeHead(302,{Location:safeReturn(url.searchParams.get('volta'))});res.end();return true}
    const html=await readFile(join(root,'entrar.html'));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',"Content-Security-Policy":"default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'"});res.end(html);return true;
  }
  if(p==='/api/health')return reply(res,200,{ok:true,version:'0.4',startedAt,canRestart:process.env.RADAR_LOOP==='1'}),true;
  if(p==='/api/auth/status'&&req.method==='GET')return reply(res,200,{...auth.status(req),minPassword:MIN_PASSWORD}),true;
  if(p==='/api/auth/setup'&&req.method==='POST'){const d=await bodyJson(req);const r=await auth.setup(req,d);return finishAuth(res,r.status===200?await auth.login(req,{username:d.username,password:d.password,remember:true}):r)}
  if(p==='/api/auth/login'&&req.method==='POST')return finishAuth(res,await auth.login(req,await bodyJson(req)));
  if(p==='/api/auth/verify'&&req.method==='POST')return finishAuth(res,await auth.verify(req,await bodyJson(req)));
  // Daqui para baixo, tudo exige estar logado.
  const session=auth.session(req);
  if(!session){
    if(p.startsWith('/api/'))return reply(res,401,{error:'Faça login para continuar.',login:true}),true;
    res.writeHead(302,{Location:`/entrar${p==='/'?'':`?volta=${encodeURIComponent(p+url.search)}`}`,'Cache-Control':'no-store'});res.end();return true;
  }
  req.session=session;
  {const host=String(req.headers['x-forwarded-host']||req.headers.host||'');if(host&&!/^(localhost|127\.|\[::1\])/.test(host)){const u=`${isHttps(req)?'https':'http'}://${host}`;if(state.publicUrl!==u){state.publicUrl=u;persistState().catch(()=>{})}}}
  if(p==='/api/digest/test'&&req.method==='POST'){try{const r=await sendDigest({force:true});return reply(res,200,r),true}catch(e){return reply(res,400,{error:e.message}),true}}
  if(p==='/api/digest/preview'&&req.method==='GET')return reply(res,200,buildDigest()),true;
  if(p==='/api/auth/logout'&&req.method==='POST'){const d=await bodyJson(req);sendCookies(res,await auth.logout(req,{all:d.all||false}));return reply(res,200,{ok:true}),true}
  if(p==='/api/auth/password'&&req.method==='POST')return finishAuth(res,await auth.changePassword(req,await bodyJson(req)));
  if(p==='/api/auth/security'&&req.method==='GET')return reply(res,200,{user:session.user,twoFactor:auth.twoFactor(),emailReady:!!(state.integrations?.gmailUser&&state.integrations?.gmailPass),sessions:auth.sessions(req),events:auth.events(),https:isHttps(req),local:isLocal(req)}),true;
  if(p==='/api/auth/two-factor'&&req.method==='POST'){const d=await bodyJson(req);if(d.enabled&&!(state.integrations?.gmailUser&&state.integrations?.gmailPass))return reply(res,400,{error:'Configure primeiro o Gmail em Meu perfil › E-mail para prospecção: é para lá que o código vai.'}),true;await auth.setTwoFactor(!!d.enabled);return reply(res,200,{ok:true,twoFactor:auth.twoFactor()}),true}
  return false;
}
function safeReturn(v){v=String(v||'/');return /^\/(?!\/)[^\s]*$/.test(v)&&!v.startsWith('/entrar')?v:'/'}
function finishAuth(res,r){sendCookies(res,r.cookies);reply(res,r.status,r.body);return true}

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://localhost:${port}`);
    // Cabeçalhos de segurança em todas as respostas.
    res.setHeader('X-Frame-Options','DENY');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Permissions-Policy','camera=(), geolocation=(), microphone=(self)');
    if(isHttps(req))res.setHeader('Strict-Transport-Security','max-age=31536000');
    // Pedidos que alteram dados só valem vindos do próprio Radar (proteção contra sites de terceiros).
    if(req.method!=='GET'&&req.method!=='HEAD'&&req.headers.origin){let same=false;try{same=new URL(req.headers.origin).host===req.headers.host}catch{}if(!same)return reply(res,403,{error:'Origem não permitida'})}
    if(await authRoutes(req,res,url))return;
    if(url.pathname==='/api/jobs/search'&&req.method==='POST'){
      const data=await bodyJson(req);const settings=data.settings||{};
      if(data.profile&&typeof data.profile==='object')state.profile=data.profile;
      if(Array.isArray(data.decisions))for(const d of data.decisions.slice(0,2000))if(d?.id&&!state.decisions[d.id]&&(d.status==='applied'||d.status==='rejected'))state.decisions[d.id]={status:d.status,at:d.at||new Date().toISOString(),key:(()=>{const j=(state.latest?.jobs||[]).find(x=>x.externalId===d.id);return j?dedupKey(j):null})(),title:String(d.title||'').slice(0,200),company:String(d.company||'').slice(0,200)};
      // O período escolhido na tela de vagas vale só para esta busca; a busca diária usa o período do perfil.
      const period=Number(data.periodDays);
      const runSettings=Number.isFinite(period)&&period>=0&&period<=30&&data.periodDays!==undefined&&data.periodDays!==null&&data.periodDays!==''?{...settings,jobMaxAgeDays:String(period)}:settings;
      const result=await collect(runSettings);
      state.settings=settings;
      if(result.sources.length)state.latest=result;
      await persistState();
      const {catalog,...visible}=result;
      return reply(res,200,visible);
    }
    if(url.pathname==='/api/jobs/latest'){const {catalog,...visible}=state.latest||{jobs:[],sources:[],failures:[],scanned:0,searchedAt:null};return reply(res,200,visible)}
    if(url.pathname==='/api/integrations'&&req.method==='GET'){const k=state.integrations||{};return reply(res,200,{serpapi:!!k.serpapiKey,serpapiBudget:Number(k.serpapiBudget)||4,adzuna:!!(k.adzunaId&&k.adzunaKey),jooble:!!k.joobleKey,email:emailPublic(),ai:aiPublic(),pexels:!!k.pexelsKey,photoProvider:k.pexelsKey?photoProvider(k.pexelsKey):null})}
    if(url.pathname==='/api/integrations'&&req.method==='POST'){
      const d=await bodyJson(req);const k=state.integrations||(state.integrations={});
      for(const f of ['serpapiKey','adzunaId','adzunaKey','joobleKey','gmailPass','aiKey','pexelsKey']){if(typeof d[f]==='string'&&d[f].trim())k[f]=d[f].trim().slice(0,200);if(d.remove===f.replace(/Id$|Key$/,'')||d.remove===f)delete k[f]}
      if(d.remove==='adzuna'){delete k.adzunaId;delete k.adzunaKey}
      if(d.remove==='gmail'){delete k.gmailPass}
      if(d.remove==='ai'){delete k.aiKey}
      if(d.remove==='pexels'){delete k.pexelsKey}
      for(const f of ['aiBaseUrl','aiModel','aiFastModel'])if(typeof d[f]==='string')k[f]=d[f].trim().slice(0,200);
      for(const f of ['gmailUser','senderName','senderTitle','senderPhone','senderSite'])if(typeof d[f]==='string')k[f]=d[f].trim().slice(0,200);
      if(typeof d.alertEmail==='string'){const v=d.alertEmail.trim();if(!v||/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v))k.alertEmail=v}
      if(d.digestEnabled!==undefined)k.digestEnabled=!!d.digestEnabled;
      if(d.digestHour!==undefined)k.digestHour=Math.max(0,Math.min(23,Number(d.digestHour)||5));
      if(d.dailyLimit!==undefined)k.dailyLimit=Math.max(1,Math.min(50,Number(d.dailyLimit)||20));
      if(d.serpapiBudget!==undefined)k.serpapiBudget=Math.max(1,Math.min(30,Number(d.serpapiBudget)||4));
      if(['senderName','senderTitle','senderPhone','senderSite'].some(f=>typeof d[f]==='string'))for(const l of Object.values(state.leads||{})){const c=state.campaigns.find(x=>x.id===l.campaignId);if(c&&!l.messagesEditedAt&&l.status==='new')l.messages=composeMessages(l,c,senderInfo())}
      await persistState();return reply(res,200,{ok:true,serpapi:!!k.serpapiKey,adzuna:!!(k.adzunaId&&k.adzunaKey),jooble:!!k.joobleKey,serpapiBudget:k.serpapiBudget||4,email:emailPublic(),ai:aiPublic(),pexels:!!k.pexelsKey,photoProvider:k.pexelsKey?photoProvider(k.pexelsKey):null});
    }
    if(url.pathname==='/api/jobs/manual'&&req.method==='POST'){
      const d=await bodyJson(req);
      let link;try{link=new URL(String(d.url||'').trim());if(!/^https?:$/.test(link.protocol))throw 0}catch{return reply(res,400,{error:'Link inválido'})}
      let title=plain(d.title||''),company=plain(d.company||'');
      const blocked=/linkedin\.|indeed\.|glassdoor\./i.test(link.hostname);
      if(!title&&!blocked){try{const html=await (await fetchRaw(link.href,{'User-Agent':'Mozilla/5.0 RadarDaniel/0.2'})).text();title=plain(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i.exec(html)?.[1]||/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1]||'');const desc=plain(/<meta[^>]+(?:name|property)=["'](?:og:)?description["'][^>]+content=["']([^"']+)/i.exec(html)?.[1]||'');d.description=d.description||desc}catch{}}
      if(!title)return reply(res,400,{error:blocked?'Este site não pode ser lido pelo robô. Informe o cargo e a empresa.':'Não consegui ler o título da vaga. Informe o cargo e a empresa.'});
      const cityName=plain(d.city||'')||String(state.settings?.jobCity||'').split(',')[0];
      const job={externalId:`manual:${createHash('sha256').update(link.href).digest('hex').slice(0,16)}`,manual:true,title:title.slice(0,200),company:company||link.hostname.replace(/^www\./,''),location:d.remote?'Brasil — remoto':cityName,city:d.remote?'':cityName,remote:!!d.remote,workplace:d.remote?'remote':'onsite',level:'',description:plain(d.description||'').slice(0,2500),source:'Adicionada por você',sourceUrl:link.href,publishedAt:new Date().toISOString(),dateKind:'published',applyType:'Site de origem',language:'pt',country:'Brasil'};
      state.manualJobs=(state.manualJobs||[]).filter(j=>j.externalId!==job.externalId).concat(job).slice(-300);
      await persistState();
      const fit=areaFit(job,state.settings||{})||'possivel';
      return reply(res,200,{ok:true,job:{...job,fit,fitLabel:fit==='boa'?'Boa correspondência':'Possível correspondência',titlePt:portugueseTitle(job.title),overviewPt:portugueseOverview(job),firstSeenAt:job.publishedAt,isNew:true,...assess(job,fit)}});
    }
    if(url.pathname.startsWith('/api/linkedin/')){const handled=await linkedinApi(req,res,url);if(handled!==false)return}
    if(url.pathname.startsWith('/api/posts')||url.pathname.startsWith('/api/ai/')){const handled=await postsApi(req,res,url);if(handled!==false)return}
    if(url.pathname.startsWith('/api/leads')||url.pathname.startsWith('/api/campaigns')){const handled=await leadsApi(req,res,url);if(handled!==false)return}
    if(url.pathname==='/api/jobs/decision'&&req.method==='POST'){
      const d=await bodyJson(req);
      if(!d.id||typeof d.id!=='string')return reply(res,400,{error:'Vaga não informada'});
      if(!d.status||d.status==='pending'){delete state.decisions[d.id]}
      else{
        const job=(state.latest?.jobs||[]).find(j=>j.externalId===d.id);
        const key=job?dedupKey(job):(d.title&&d.company?dedupKey({title:d.title,company:d.company,city:d.city||'',remote:!!d.remote,location:d.location||''}):null);
        state.decisions[d.id]={status:String(d.status).slice(0,20),at:new Date().toISOString(),key,title:String(d.title||job?.title||'').slice(0,200),company:String(d.company||job?.company||'').slice(0,200)};
      }
      await persistState();
      return reply(res,200,{ok:true});
    }
    if(url.pathname==='/api/sync'&&req.method==='POST'){const data=await bodyJson(req);if(data.settings&&typeof data.settings==='object')state.settings=data.settings;if(data.profile&&typeof data.profile==='object')state.profile=data.profile;await persistState();return reply(res,200,{ok:true,savedAt:new Date().toISOString()})}
    if(url.pathname==='/api/jobs/coverage'&&req.method==='POST'){const data=await bodyJson(req);return reply(res,200,coverage(data.text))}
    if(url.pathname==='/api/jobs/questions'&&req.method==='GET')return reply(res,200,{questions:await greenhouseQuestions(url.searchParams.get('id'))});
    if(url.pathname==='/cidades-br.json'){const content=await readFile(join(root,'cidades-br.json'));res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=86400'});return res.end(content)}
    // Reinício pedido pela própria tela (depois de uma atualização). O iniciar-radar.bat sobe o servidor de novo na mesma janela.
    if(url.pathname==='/api/restart'&&req.method==='POST'){if(req.headers['x-radar']!=='1')return reply(res,403,{error:'Pedido inválido'});reply(res,200,{ok:true,restarting:true});console.log('Reiniciando o Radar para carregar a versão nova…');setTimeout(()=>process.exit(75),300);return}
    if(req.method!=='GET')return reply(res,405,{error:'Método não permitido'});
    const pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
    const file=resolve(root,'.'+pathname);
    if(!file.startsWith(root+'\\')&&!file.startsWith(root+'/'))return reply(res,403,{error:'Acesso negado'});
    if(!['.html','.js','.css','.pdf'].includes(extname(file)))return reply(res,404,{error:'Arquivo não encontrado'});
    const content=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)],'Cache-Control':'no-store'});res.end(content);
  }catch(error){reply(res,error.code==='ENOENT'?404:500,{error:error.message})}
});
dropOrphanLeads();
let running=false;
const startedAt=new Date().toISOString();
async function dailyRun(){if(state.settings&&!running){running=true;try{const result=await collect(state.settings);if(result.sources.length){state.latest=result;await persistState();console.log(`Busca diária: ${result.jobs.length} vagas relevantes`)}}catch(error){console.error(`Busca diária falhou: ${error.message}`)}finally{running=false}}}
function scheduleDaily(){const now=new Date();const brazilNow=new Date(now.toLocaleString('en-US',{timeZone:'America/Bahia'}));const next=new Date(brazilNow);next.setHours(24,0,0,0);const delay=Math.max(60000,next-brazilNow);setTimeout(async()=>{await dailyRun();scheduleDaily()},delay).unref()}
// definir-senha.bat → node server.mjs --definir-senha : cria ou troca o acesso direto no computador do servidor.
async function passwordCli(){
  const {createInterface}=await import('node:readline');
  const tty=!!process.stdin.isTTY;
  const rl=createInterface({input:process.stdin,output:process.stdout,terminal:tty});
  // Fila de linhas: funciona digitando no terminal e também com entrada redirecionada.
  const lines=[],waiting=[];rl.on('line',l=>{const w=waiting.shift();if(w)w(l);else lines.push(l)});
  let hide=false;const orig=rl._writeToOutput?.bind(rl);if(tty&&orig)rl._writeToOutput=c=>{if(hide&&!/^\r?\n$/.test(c)&&!c.startsWith(prompt))orig(c.replace(/[^\r\n]/g,'*'));else orig(c)};
  let prompt='';
  const ask=(q,hidden)=>{prompt=q;hide=!!hidden;process.stdout.write(q);return new Promise(r=>{const done=v=>{hide=false;if(!tty)process.stdout.write('\n');r(v)};if(lines.length)done(lines.shift());else waiting.push(done)})};
  console.log('\n=== Radar: definir usuário e senha de acesso ===');
  console.log(auth.hasUser()?'Já existe um acesso. O novo vai substituí-lo e desconectar todos os aparelhos.\n':'Crie o acesso que você vai usar para entrar no Radar.\n');
  const username=(await ask('Usuário (ex.: daniel): '))||'daniel';
  let password;
  for(;;){password=await ask(`Senha (mínimo ${MIN_PASSWORD} caracteres, letras e números): `,true);const prob=passwordProblem(password,username);if(prob){console.log(prob);continue}const again=await ask('Repita a senha: ',true);if(again!==password){console.log('As senhas não conferem. Tente de novo.');continue}break}
  const r=await auth.setPassword(username,password,null);rl.close();
  console.log(r.status===200?`\nPronto! Usuário "${username.trim().toLowerCase()}" criado. Todos os aparelhos foram desconectados.\n`:`\nNão deu certo: ${r.body.error}\n`);
  process.exit(r.status===200?0:1);
}
if(process.argv.includes('--definir-senha'))await passwordCli();
if(process.argv[1]===fileURLToPath(import.meta.url)){server.on('error',error=>{if(error.code==='EADDRINUSE'){console.error(`\nA porta ${port} já está em uso: outra janela do Radar (versão antiga) ainda está aberta.\nFeche essa janela ou use iniciar-radar.bat, que fecha a versão antiga automaticamente.\n`);process.exit(1)}throw error});server.listen(port,host,()=>{console.log(`RadarDaniel em http://${host}:${port}`);if(!auth.hasUser())console.log('Primeiro acesso: abra http://localhost:'+port+' neste computador para criar seu usuário e senha.');scheduleDaily();setInterval(postsTick,60000).unref();setInterval(digestTick,5*60000).unref();setTimeout(digestTick,60000).unref();setTimeout(postsTick,30000).unref();
  // Se o computador estava desligado na hora da busca diária, recupera ao ligar o servidor.
  const last=Date.parse(state.latest?.searchedAt||0);
  if(state.settings&&(!Number.isFinite(last)||Date.now()-last>20*3600000)){console.log('Última busca tem mais de 20 horas; buscando agora.');dailyRun()}
})}
export {server,collect,eligible,assess,parseBoard,classify,coverage,state,portugueseTitle,portugueseOverview};
