// Conectores de vagas brasileiras usados pelo robô do Radar.
// Cada conector recebe as preferências do usuário, faz as consultas no servidor
// e devolve vagas normalizadas + estatísticas da fonte. Uma falha em uma fonte
// não interrompe as demais e fica registrada para o painel.
import {createHash} from 'node:crypto';

export const casaTrabalhadorUrl='https://feiradesantana.ba.gov.br/servico.asp?id=32&link=casadotrabalhador/s14/informativo.asp';
const browserHeaders={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 RadarDaniel/0.2','Accept-Language':'pt-BR,pt;q=0.9'};

const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',hellip:'…',ordm:'º',ordf:'ª',deg:'°',middot:'·',bull:'•',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',laquo:'«',raquo:'»',copy:'©',reg:'®',euro:'€',sup1:'¹',sup2:'²',sup3:'³',frac12:'½'};
const accents={acute:'́',grave:'̀',circ:'̂',tilde:'̃',uml:'̈',cedil:'̧',ring:'̊'};
export function decodeEntities(text){
  return String(text).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi,(m,code)=>{
    if(code[0]==='#'){const n=code[1].toLowerCase()==='x'?parseInt(code.slice(2),16):parseInt(code.slice(1),10);return Number.isFinite(n)&&n>0&&n<0x110000?String.fromCodePoint(n):m}
    if(named[code]!==undefined)return named[code];
    if(named[code.toLowerCase()]!==undefined&&code!=='Amp')return named[code.toLowerCase()];
    const a=/^([A-Za-z])(acute|grave|circ|tilde|uml|cedil|ring)$/.exec(code);
    if(a)return (a[1]+accents[a[2]]).normalize('NFC');
    if(/^(aelig|AElig|szlig|oslash|Oslash)$/.test(code))return {aelig:'æ',AElig:'Æ',szlig:'ß',oslash:'ø',Oslash:'Ø'}[code];
    return m;
  });
}
export function plain(value){let text=String(value||'');text=text.replace(/<[^>]*>/g,' ');for(let i=0;i<2&&/&[#a-z0-9]+;/i.test(text);i++)text=decodeEntities(text);return text.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()}
function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:null}catch{return null}}
function dateValue(value){if(!value)return null;const text=/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value}T12:00:00.000Z`:value;const date=new Date(text);return Number.isFinite(date.getTime())?date.toISOString():null}
const hash=text=>createHash('sha256').update(text).digest('hex').slice(0,24);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export function norm(text){return String(text||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}

// Expande os cargos escritos pelo usuário em várias buscas separadas.
const expansions=[
  [/suporte t[eé]cnico|suporte de ti|help.?desk|service desk/i,['suporte técnico','analista de suporte','técnico de informática','help desk','service desk']],
  [/suporte a sistemas|suporte ao cliente|atendimento/i,['suporte a sistemas','suporte ao cliente','atendimento ao cliente']],
  [/implanta/i,['implantação de sistemas','analista de implantação']],
  [/dados|\bbi\b|power bi|indicadores/i,['analista de dados','assistente de dados','power bi','business intelligence']],
  [/process|automa/i,['assistente administrativo','auxiliar administrativo','automação','analista de processos']],
  [/administrativ/i,['assistente administrativo','auxiliar administrativo']],
];
export function searchTerms(settings){
  const roles=String(settings.jobRoles||'');
  const terms=[];
  for(const [pattern,list] of expansions)if(pattern.test(roles))terms.push(...list);
  if(/est[aá]gio/i.test(settings.jobLevels||'')){terms.push('estágio TI','estágio análise e desenvolvimento de sistemas','estágio dados')}
  for(const raw of roles.split(/[;,\n]+/)){const t=raw.replace(/\b(j[uú]nior|jr\.?|pleno|s[eê]nior)\b/gi,'').trim();if(t.length>2&&t.length<40)terms.push(t)}
  const seen=new Set();
  return terms.filter(t=>{const k=norm(t);if(!k||seen.has(k))return false;seen.add(k);return true}).slice(0,24);
}
export function cityParts(jobCity){const [city,uf]=String(jobCity||'').split(/[,\-\/]/).map(s=>s.trim());const states={BA:'Bahia',SP:'São Paulo',RJ:'Rio de Janeiro',MG:'Minas Gerais',PE:'Pernambuco',SE:'Sergipe',CE:'Ceará',PR:'Paraná',RS:'Rio Grande do Sul',SC:'Santa Catarina',GO:'Goiás',DF:'Distrito Federal',ES:'Espírito Santo',PB:'Paraíba',RN:'Rio Grande do Norte',AL:'Alagoas',PI:'Piauí',MA:'Maranhão',PA:'Pará',AM:'Amazonas',MT:'Mato Grosso',MS:'Mato Grosso do Sul',TO:'Tocantins',RO:'Rondônia',AC:'Acre',AP:'Amapá',RR:'Roraima'};return {city:city||'',state:states[(uf||'').toUpperCase()]||uf||''}}

// ---------- Gupy (portal público de vagas para candidatos) ----------
// A página portal.gupy.io consulta /api/job-search/jobs. Não é a API empresarial
// da Gupy (que exige credenciais da empresa); é a busca pública do candidato.
const gupyBase='https://portal.gupy.io/api/job-search/jobs';
const gupyWorkplace={remote:'remote',hybrid:'hybrid','on-site':'onsite'};
export function normalizeGupy(raw){
  const workplace=gupyWorkplace[raw.workplaceType]||(raw.isRemoteWork?'remote':'onsite');
  const place=[raw.city,raw.state].filter(Boolean).join(', ');
  return {externalId:`gupy:${raw.id}`,title:plain(raw.name),company:plain(raw.careerPageName)||'Empresa na Gupy',location:workplace==='remote'?(place?`Brasil — remoto (empresa em ${place})`:'Brasil — remoto'):(place||'Local a confirmar'),city:raw.city||'',remote:workplace==='remote',workplace,level:'',description:plain(raw.description).slice(0,2500),source:'Gupy',sourceUrl:safeUrl(raw.jobUrl),publishedAt:dateValue(raw.publishedDate),deadline:raw.applicationDeadline||null,dateKind:'published',applyType:'Formulário da empresa na Gupy',language:'pt',country:'Brasil'};
}
// Atenção: com limit alto o portal devolve pagination.total errado (fixo em 100).
// Por isso a paginação segue até vir uma página incompleta, sem confiar no total.
async function gupyQuery(http,params,maxItems){
  const rows=[];const limit=50;let offset=0;
  while(rows.length<maxItems){
    const qs=new URLSearchParams({...params,limit:String(limit),offset:String(offset)});
    const data=await http.fetchJson(`${gupyBase}?${qs}`,{...browserHeaders,Referer:'https://portal.gupy.io/'});
    const page=Array.isArray(data?.data)?data.data:null;
    if(!page)throw Error('resposta inesperada da Gupy');
    rows.push(...page);offset+=page.length;
    if(page.length<limit)break;
    await sleep(250);
  }
  return rows;
}
export async function collectGupy(settings,http){
  const stat={source:'Gupy',queries:0,received:0,errors:[]};
  const found=new Map();
  const add=list=>{for(const raw of list){if(raw?.id&&!found.has(raw.id))found.set(raw.id,raw)}};
  const {city,state}=cityParts(settings.jobCity);
  const wantLocal=(settings.onsite||settings.hybrid)&&city;
  if(wantLocal){
    // Todas as vagas da cidade, sem depender de termo: a triagem local decide.
    try{stat.queries++;add(await http.cached(`gupy:city:${norm(city)}`,()=>gupyQuery(http,{city,state},800)))}catch(e){stat.errors.push(`cidade ${city}: ${e.message}`)}
  }
  if(settings.remote){
    for(const term of searchTerms(settings)){
      try{stat.queries++;add(await http.cached(`gupy:remote:${norm(term)}`,()=>gupyQuery(http,{jobName:term,workplaceType:'remote'},200)))}catch(e){stat.errors.push(`"${term}": ${e.message}`)}
      if(stat.errors.length>=4&&stat.errors.length===stat.queries)break; // fonte fora do ar: não insistir
    }
  }
  const jobs=[...found.values()].map(normalizeGupy);
  stat.received=jobs.length;
  return {jobs,stat};
}

// ---------- Sólides Vagas (portal público) ----------
const solidesBase='https://vagas.solides.com.br/api/vacancies';
export function normalizeSolides(raw){
  const cityName=raw.city?.name||raw.address?.city?.name||'';
  const uf=raw.state?.code||raw.address?.state?.code||'';
  const type=norm(raw.jobType);
  const workplace=type.includes('remot')||raw.homeOffice?'remote':type.includes('hibrid')?'hybrid':'onsite';
  const place=[cityName,uf].filter(Boolean).join(', ');
  const slug=/^[a-z0-9-]+$/i.test(raw.slug||'')?raw.slug:null;
  const url=slug?`https://${slug}.vagas.solides.com.br/vaga/${raw.id}`:`https://vagas.solides.com.br/vagas/todos/${encodeURIComponent(raw.title||'')}`;
  return {externalId:`solides:${raw.id}`,title:plain(raw.title).replace(/\s*\|\s*[^|]*-\s*[A-Z]{2}\s*$/,''),company:plain(raw.companyName)||'Empresa na Sólides',location:workplace==='remote'?'Brasil — remoto':(place||'Local a confirmar'),city:cityName,remote:workplace==='remote',workplace,level:plain(raw.seniority?.name||raw.seniority||''),description:plain(raw.description).slice(0,2500),source:'Sólides',sourceUrl:safeUrl(url),publishedAt:dateValue(raw.createdAt),deadline:raw.date?.due||null,dateKind:'published',applyType:'Formulário da empresa na Sólides',pcdOnly:!!raw.pcdOnly,questions:(raw.killerQuestions||[]).map(q=>plain(q.question)).filter(Boolean).slice(0,15),language:'pt',country:'Brasil'};
}
// A API da Sólides aceita no máximo 20 itens por página e devolve as vagas mais recentes primeiro.
async function solidesQuery(http,params,maxAgeDays,maxPages){
  const out=[];const oldest=Date.now()-(maxAgeDays+1)*86400000;
  for(let page=1;page<=maxPages;page++){
    const data=await http.fetchJson(`${solidesBase}?${new URLSearchParams({page:String(page),take:'20',...params})}`,{...browserHeaders,Referer:'https://vagas.solides.com.br/'});
    if(!Array.isArray(data?.data))throw Error('resposta inesperada da Sólides');
    out.push(...data.data);
    const last=Date.parse(`${data.data.at(-1)?.createdAt||''}T23:59:59Z`);
    if(!data.data.length||page>=Number(data.totalPages||0)||(Number.isFinite(last)&&last<oldest))break;
    await sleep(250);
  }
  return out;
}
export async function collectSolides(settings,http){
  const stat={source:'Sólides',queries:0,received:0,errors:[]};
  const found=new Map();
  const add=rows=>{for(const raw of rows)if(raw?.id&&!found.has(raw.id))found.set(raw.id,raw)};
  const {city}=cityParts(settings.jobCity);
  const uf=(String(settings.jobCity||'').split(/[,\-\/]/)[1]||'').trim().toUpperCase();
  const maxAge=String(settings.jobMaxAgeDays)==='0'?30:Math.max(1,Math.min(30,Number(settings.jobMaxAgeDays)||7));
  if((settings.onsite||settings.hybrid)&&city){
    // Todas as vagas da cidade (formato usado pelo próprio site: "Feira de Santana - BA").
    const location=uf?`${city} - ${uf}`:city;
    try{stat.queries++;add(await http.cached(`solides:city:${norm(location)}`,()=>solidesQuery(http,{title:'',locations:location},30,15)))}catch(e){stat.errors.push(`cidade ${location}: ${e.message}`)}
  }
  if(settings.remote){
    for(const term of searchTerms(settings)){
      try{stat.queries++;add(await http.cached(`solides:remote:${norm(term)}:${maxAge}`,()=>solidesQuery(http,{title:term,jobsType:'remoto'},maxAge,5)))}catch(e){stat.errors.push(`"${term}": ${e.message}`)}
      if(stat.errors.length>=4&&stat.errors.length===stat.queries)break;
    }
  }
  const cityKey=norm(city);
  const jobs=[...found.values()].map(normalizeSolides).filter(j=>j.remote||(cityKey&&norm(j.city)===cityKey));
  stat.received=jobs.length;
  return {jobs,stat};
}

// ---------- Casa do Trabalhador de Feira de Santana (lista oficial, sem data) ----------
function decode(buffer,contentType){
  const charset=/charset=([^;]+)/i.exec(contentType||'')?.[1]?.trim().toLowerCase();
  let text=new TextDecoder(charset&&charset!=='utf-8'?charset:'utf-8').decode(buffer);
  if((!charset||charset==='utf-8')&&text.includes('�'))text=new TextDecoder('latin1').decode(buffer);
  return text;
}
export function parseCasaTrabalhador(html){
  // A página publica um bloco por cargo: "CARGO – SETOR", depois "N VAGAS" e os requisitos, cada um em um parágrafo.
  const text=String(html).replace(/<(script|style)[\s\S]*?<\/\1>/gi,' ').replace(/<br\s*\/?>|<\/(p|li|div|tr|h\d)>/gi,'\n');
  const lines=text.split('\n').map(plain).filter(Boolean);
  const jobs=[];let current=null;
  const finish=()=>{if(!current)return;const {title,sector,count,details,pcd}=current;jobs.push({pcdOnly:!!pcd,externalId:`casatrabalhador:${hash(norm(`${title} ${sector} ${details.join(' ')}`))}`,title,company:`Casa do Trabalhador${sector?` (${sector.toLowerCase()})`:''}`,location:'Feira de Santana, BA',city:'Feira de Santana',remote:false,workplace:'onsite',level:'',description:`${title}${sector?` — ${sector}`:''}. ${count} ${count===1?'vaga':'vagas'}. ${details.join('. ')}`.slice(0,2500),source:'Casa do Trabalhador',sourceUrl:casaTrabalhadorUrl,publishedAt:null,dateKind:'firstSeen',applyType:'Atendimento presencial na Casa do Trabalhador',language:'pt',country:'Brasil'});current=null};
  for(let i=0;i<lines.length;i++){
    const line=lines[i],next=lines[i+1]||'';
    const countMatch=/^(\d+)\s*VAGAS?$/i.exec(next);
    if(countMatch&&!/VAGAS DE EMPREGO/i.test(line)){
      finish();
      const pcd=/\bPCD\b|pessoa com defici/i.test(line);
      const clean=line.replace(/\(?\s*PCD[^)–—]*\)?/gi,' ').replace(/\s+[–—-]\s+(?=[–—-])/g,' ');
      const [title,...sector]=clean.split(/\s+[–—-]\s*/).map(x=>x.trim()).filter(Boolean);
      current={title:(title||line).trim(),sector:sector.join(' - ').replace(/^[-–—\s]+/,'').trim(),count:Number(countMatch[1]),details:[],pcd};
      i++;continue;
    }
    if(current&&current.details.length<8&&line.length<160)current.details.push(line);
  }
  finish();
  return jobs.filter(j=>j.title.length>2);
}
export async function collectCasaTrabalhador(settings,http){
  const stat={source:'Casa do Trabalhador',queries:1,received:0,errors:[]};
  if(!/feira de santana/i.test(settings.jobCity||'')||!(settings.onsite||settings.hybrid))return null;
  try{
    const load=async()=>{const res=await http.fetchRaw(casaTrabalhadorUrl,browserHeaders);return decode(await res.arrayBuffer(),res.headers.get('content-type'))};
    const html=await http.cached('casatrabalhador',async()=>{try{return await load()}catch{await sleep(2000);return load()}});
    const jobs=parseCasaTrabalhador(html);
    if(!jobs.length)stat.errors.push('nenhuma vaga reconhecida na página (o formato pode ter mudado)');
    stat.received=jobs.length;
    return {jobs,stat};
  }catch(e){stat.errors.push(e.message);return {jobs:[],stat}}
}

// ---------- Empregos.com.br (páginas públicas por cidade) ----------
// Os dados vêm no JSON que a própria página entrega (__NUXT_DATA__), no formato "devalue" do Nuxt.
function slug(text){return norm(text).replace(/ /g,'-')}
export function unflattenNuxt(arr){
  const memo=new Map();
  const wrappers=new Set(['ShallowReactive','Reactive','Ref','ShallowRef','EmptyRef','EmptyShallowRef','NuxtError']);
  const res=(idx,depth=0)=>{
    if(typeof idx!=='number'||depth>60)return idx;
    if(memo.has(idx))return memo.get(idx);
    const x=arr[idx];let out;
    if(Array.isArray(x)){
      if(typeof x[0]==='string'&&x[0]==='Date')out=x[1];
      else if(typeof x[0]==='string'&&(x[0]==='Set'))out=x.slice(1).map(i=>res(i,depth+1));
      else if(typeof x[0]==='string'&&wrappers.has(x[0]))out=res(x[1],depth+1);
      else{out=[];memo.set(idx,out);for(const i of x)out.push(res(i,depth+1));return out}
    }else if(x&&typeof x==='object'){out={};memo.set(idx,out);for(const k of Object.keys(x))out[k]=res(x[k],depth+1);return out}
    else out=x;
    memo.set(idx,out);return out;
  };
  return res(0);
}
export function parseEmpregosPage(html){
  const m=/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if(!m)throw Error('formato da página mudou (sem dados da busca)');
  const root=unflattenNuxt(JSON.parse(m[1]));
  const data=root?.data?.['fetch-jobs'];
  if(!data||!Array.isArray(data.jobCollection))throw Error('formato da página mudou (sem lista de vagas)');
  return data.jobCollection;
}
export function normalizeEmpregos(raw){
  const loc=(raw.location||[])[0]||{};
  const type=norm(raw.workplaceTypes);
  const workplace=type.includes('remot')?'remote':type.includes('hibrid')?'hybrid':'onsite';
  const cityName=loc.city||'';const uf=loc.stateAbbreviation||loc.state||'';
  const place=[cityName,uf].filter(Boolean).join(', ');
  const title=plain(raw.title);
  const created=raw.createdAt?(/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw.createdAt)?raw.createdAt:`${raw.createdAt}-03:00`):null;
  return {externalId:`empregos:${raw.referenceId}`,title,company:plain(raw.company?.name)||'Empresa no Empregos.com.br',location:workplace==='remote'?'Brasil — remoto':(place||'Local a confirmar'),city:cityName,remote:workplace==='remote',workplace,level:plain(raw.role?.hierarchicalLevel||''),description:plain(raw.description).slice(0,2500),source:'Empregos.com.br',sourceUrl:safeUrl(`https://www.empregos.com.br/vaga/${raw.referenceId}/${slug(title)}-em-${slug(cityName)}-${slug(uf)}`),publishedAt:dateValue(created),dateKind:'published',applyType:'Candidatura no Empregos.com.br',language:'pt',country:'Brasil'};
}
export async function collectEmpregos(settings,http){
  const {city}=cityParts(settings.jobCity);
  const uf=(String(settings.jobCity||'').split(/[,\-\/]/)[1]||'').trim();
  if(!city||!uf||!(settings.onsite||settings.hybrid))return null;
  const stat={source:'Empregos.com.br',queries:1,received:0,errors:[]};
  const openAll=String(settings.jobMaxAgeDays)==='0';
  const maxAge=openAll?3650:Math.max(1,Math.min(30,Number(settings.jobMaxAgeDays)||7));
  const base=`https://www.empregos.com.br/vagas/oportunidades-em-${slug(city)}-${slug(uf)}`;
  try{
    const rows=await http.cached(`empregos:${slug(city)}:${maxAge}`,async()=>{
      const out=[];const oldest=Date.now()-(maxAge+1)*86400000;
      for(let page=1;page<=15;page++){
        const res=await http.fetchRaw(page===1?base:`${base}/${page}`,browserHeaders);
        const list=parseEmpregosPage(await res.text());
        out.push(...list);
        const last=Date.parse(list.at(-1)?.createdAt||'');
        if(list.length<20||(Number.isFinite(last)&&last<oldest))break;
        await sleep(400);
      }
      return out;
    });
    const cityKey=norm(city);
    const seen=new Set();
    const jobs=rows.map(normalizeEmpregos).filter(j=>{if(seen.has(j.externalId))return false;seen.add(j.externalId);return j.remote||norm(j.city)===cityKey});
    stat.received=jobs.length;
    return {jobs,stat};
  }catch(e){stat.errors.push(e.message);return {jobs:[],stat}}
}

// ---------- Pandapé (páginas "Trabalhe conosco" de empresas que usam o sistema do InfoJobs) ----------
const monthsShort={jan:0,fev:1,mar:2,abr:3,mai:4,jun:5,jul:6,ago:7,set:8,out:9,nov:10,dez:11};
function pandapeDate(text){
  const m=/(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z.]*(?:\s+(\d{4}))?/i.exec(text||'');
  if(!m)return null;
  const now=new Date();let year=Number(m[3])||now.getFullYear();
  let d=new Date(Date.UTC(year,monthsShort[m[2].toLowerCase()],Number(m[1]),15));
  if(!m[3]&&d.getTime()>now.getTime()+86400000)d=new Date(Date.UTC(year-1,monthsShort[m[2].toLowerCase()],Number(m[1]),15));
  return d.toISOString();
}
export function parsePandapeCards(html,host,company){
  const jobs=[];
  for(const m of String(html).matchAll(/<a[^>]*class="[^"]*card-vacancy[^"]*"[^>]*href="\/Detail\/(\d+)"[^>]*>([\s\S]*?)<\/a>/gi)){
    const [,id,body]=m;
    const title=plain(/<h3[^>]*>([\s\S]*?)<\/h3>/i.exec(body)?.[1]||'');
    const field=icon=>plain(new RegExp(`icon-${icon}[^<]*<\\/i>\\s*<\\/div>([\\s\\S]*?)<\\/div>`,'i').exec(body)?.[1]||'');
    const place=field('location-pin-1');const mode=norm(field('buildings'));
    const date=plain(/vacancy-date[^>]*>([\s\S]*?)<\/div>/i.exec(body)?.[1]||'');
    const workplace=mode.includes('remot')?'remote':mode.includes('hibrid')?'hybrid':'onsite';
    const cityName=place.split(/\s+-\s+/)[0]||'';
    jobs.push({externalId:`pandape:${host}:${id}`,title,company,location:workplace==='remote'?'Brasil — remoto':place.replace(' - ',', '),city:cityName,remote:workplace==='remote',workplace,level:'',description:`${title} — ${[place,field('clock'),field('sheet')].filter(Boolean).join(' · ')}. Confira a descrição completa na página da vaga.`,source:'Pandapé',sourceUrl:safeUrl(`https://${host}/Detail/${id}`),publishedAt:pandapeDate(date),dateKind:'published',applyType:'Formulário da empresa (Pandapé/InfoJobs)',language:'pt',country:'Brasil'});
  }
  return jobs.filter(j=>j.title&&j.sourceUrl);
}
export async function collectPandape(settings,http){
  const hosts=[...new Set(String(settings.jobSources||'').split(/[\n,;\s]+/).map(u=>{try{const h=new URL(u.trim()).hostname.toLowerCase();return /^[a-z0-9-]+\.pandape\.infojobs\.com\.br$/.test(h)?h:null}catch{return null}}).filter(Boolean))].slice(0,15);
  if(!hosts.length)return null;
  const stat={source:'Pandapé',queries:hosts.length,received:0,errors:[]};
  const {city}=cityParts(settings.jobCity);const cityKey=norm(city);
  const jobs=[];
  for(const host of hosts){
    try{
      const list=await http.cached(`pandape:${host}`,async()=>{
        const home=await (await http.fetchRaw(`https://${host}/`,browserHeaders)).text();
        const company=plain(/<title>([\s\S]*?)<\/title>/i.exec(home)?.[1]||host).split(/\s+-\s+Trabalhe|\s+\|\s+/i)[0]||host;
        const out=[];
        for(let page=1;page<=10;page++){
          const data=await http.fetchJson(`https://${host}/ListVacancies`,{...browserHeaders,'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8','X-Requested-With':'XMLHttpRequest'},{method:'POST',body:`PageSize=20&PageNumber=${page}`});
          out.push(...parsePandapeCards(data?.view||'',host,company));
          if(data?.isLast!==false)break;
          await sleep(300);
        }
        return out;
      });
      jobs.push(...list.filter(j=>j.remote||!cityKey||norm(j.city)===cityKey));
    }catch(e){stat.errors.push(`${host}: ${e.message}`)}
  }
  stat.received=jobs.length;
  return {jobs,stat};
}

export async function collectBrazil(settings,http){
  const results=await Promise.all([collectGupy(settings,http),collectSolides(settings,http),collectCasaTrabalhador(settings,http),collectEmpregos(settings,http),collectPandape(settings,http)]);
  return results.filter(Boolean);
}
