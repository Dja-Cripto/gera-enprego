// Módulo Publicações: banco de histórias, pauta semanal, textos com IA, imagens e lembretes.
// Regra do produto: a IA nunca inventa fatos. Tudo sai do currículo, da entrevista, do check-in semanal
// e do que o próprio Radar observou (vagas e campanhas). A pessoa aprova; o Radar lembra na hora de publicar.
import {createHash,randomUUID} from 'node:crypto';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hash=t=>createHash('sha256').update(String(t)).digest('hex').slice(0,12);

// ---------- Perguntas ----------
export const INTERVIEW=[
  {key:'quem',q:'Em duas ou três frases: quem é você profissionalmente hoje e o que você quer que as pessoas lembrem de você?',hint:'Ex.: trabalho com automação e dados; quero ser lembrado como quem resolve tarefas repetitivas.'},
  {key:'virada',q:'Conte uma virada na sua carreira: de onde você veio, o que mudou e por quê.',hint:'Ex.: do telemarketing para dados.'},
  {key:'projeto',q:'Qual projeto seu dá mais orgulho? Qual era o problema, o que você fez e qual foi o resultado?',hint:'Números ajudam: horas economizadas, erros evitados.'},
  {key:'perrengue',q:'Conte um perrengue ou erro que te ensinou algo importante no trabalho.',hint:'Posts de aprendizado com erro costumam gerar conversa.'},
  {key:'cliente',q:'Uma situação de atendimento ou de cliente que marcou você (sem citar nomes).',hint:'O que aconteceu e o que você aprendeu.'},
  {key:'opiniao',q:'Uma opinião sua sobre a sua área que nem todo mundo concorda.',hint:'Ex.: "planilha bem feita resolve mais que sistema caro".'},
  {key:'ferramentas',q:'Quais ferramentas você usa de verdade no dia a dia e para quê?',hint:'Ex.: Excel para controle de estoque, Python para automatizar relatórios.'},
  {key:'dicas',q:'Três dicas práticas que você daria para quem está começando ou para o seu cliente ideal.',hint:'Uma por linha.'},
  {key:'objetivo',q:'O que você está buscando agora? (tipo de vaga, tipo de cliente, mudança de área, vaga no exterior…)',hint:'Isso orienta as chamadas.'},
  {key:'fora',q:'Algo fora do trabalho que diz muito sobre você e que você não se importa de mostrar.',hint:'Opcional.'},
];
export const CHECKIN=[
  {key:'fiz',q:'O que você fez ou entregou nesta semana?'},
  {key:'aprendi',q:'O que você aprendeu ou descobriu?'},
  {key:'resultado',q:'Algum resultado, número ou reação de alguém (cliente, recrutador, colega)?'},
];
export const PILLARS=[
  {key:'prova',label:'Prova e projeto',desc:'Mostra algo que você fez, com problema, solução e resultado.',weight:3},
  {key:'dica',label:'Dica prática',desc:'Ensina algo útil para o seu público em poucos passos.',weight:3},
  {key:'historia',label:'História e aprendizado',desc:'Um momento da sua trajetória e o que ele ensinou.',weight:2},
  {key:'opiniao',label:'Opinião sobre o mercado',desc:'Um ponto de vista seu sobre a área, com argumento.',weight:1},
  {key:'chamada',label:'Chamada',desc:'Diz o que você busca: vaga ou clientes. A cada 2 semanas.',weight:0},
];
const pillarByKey=k=>PILLARS.find(p=>p.key===k)||PILLARS[0];
export const DEFAULT_VOICE={goal:'ambos',market:'brasil',language:'pt',audience:'Recrutadores de tecnologia e dados; donos de pequenas empresas em Feira de Santana',postsPerWeek:3,sequence:['dica','emprego','prova'],editorialGuidance:'',days:['2','3','4'],time:'08:30',pillars:['prova','dica','historia','opiniao'],callEvery:2,tone:'proximo',depth:'simples',length:'medio',emojis:'poucos',hashtags:3,avoid:'',examples:'',cta:'',autoPlan:true,autoApprove:false,remindEmail:true,imagePreference:'auto'};
export const DAY_NAMES=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

// ---------- Cliente de IA (OpenCode Go ou qualquer serviço compatível) ----------
export const AI_DEFAULTS={baseUrl:'https://opencode.ai/zen/go/v1',model:'kimi-k3',fastModel:'deepseek-v4.1-flash'};
const anthropicStyle=m=>/^qwen/i.test(m||'');
const responsesStyle=m=>/^(grok|gpt|muse)/i.test(m||'');
export function aiConfig(k){return {baseUrl:(k?.aiBaseUrl||AI_DEFAULTS.baseUrl).replace(/\/+$/,''),key:k?.aiKey||'',model:k?.aiModel||AI_DEFAULTS.model,fastModel:k?.aiFastModel||AI_DEFAULTS.fastModel}}
// Modelos que "pensam" antes de responder (Kimi K3, DeepSeek, GLM…) gastam parte do limite de tokens raciocinando.
// Por isso o limite é generoso e, se a resposta vier vazia por falta de espaço, tenta de novo com mais folga.
export async function aiChat(cfg,opts){
  try{return await aiChatOnce(cfg,opts)}
  catch(e){
    if(e.emptyByLength&&!opts._retried)return aiChatOnce(cfg,{...opts,maxTokens:Math.min(32000,(opts.maxTokens||4000)*4),_retried:true});
    // Erro passageiro do provedor (500/502/503/529): espera um pouco e tenta mais uma vez.
    if(e.transient&&!opts._retried){await sleep(4000);return aiChatOnce(cfg,{...opts,_retried:true})}
    throw e}
}
async function aiChatOnce(cfg,{system,user,model,maxTokens=4000,temperature=0.8,session,timeout=180000}){
  if(!cfg?.key)throw Error('Cadastre a chave da IA em Meu perfil › Inteligência artificial.');
  const m=model||cfg.model;
  const headers={'Content-Type':'application/json','Authorization':`Bearer ${cfg.key}`,'User-Agent':'RadarPortal/0.3 (publicacoes)','x-opencode-session':session||'radar-publicacoes'};
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),timeout);
  try{
    let url,body;
    if(anthropicStyle(m)){url=`${cfg.baseUrl}/messages`;headers['x-api-key']=cfg.key;headers['anthropic-version']='2023-06-01';body={model:m,max_tokens:maxTokens,temperature,system,messages:[{role:'user',content:user}]}}
    else if(responsesStyle(m)){url=`${cfg.baseUrl}/responses`;body={model:m,instructions:system,input:user,max_output_tokens:maxTokens}}
    else{url=`${cfg.baseUrl}/chat/completions`;body={model:m,max_tokens:maxTokens,temperature,messages:[{role:'system',content:system},{role:'user',content:user}]}}
    const res=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),signal:ctrl.signal});
    const raw=await res.text();let data={};try{data=JSON.parse(raw)}catch{}
    if(!res.ok){const msg=data?.error?.message||data?.message||raw.slice(0,200);const err=Error(res.status===401?'chave da IA recusada (confira em Meu perfil)':res.status===429?'limite de uso da IA atingido por agora; tente mais tarde':`IA respondeu ${res.status}: ${msg}`);err.transient=[500,502,503,504,529].includes(res.status);throw err}
    let text='';
    if(Array.isArray(data.content))text=data.content.filter(c=>c.type==='text').map(c=>c.text).join('');
    else if(data.choices)text=data.choices[0]?.message?.content||'';
    else if(data.output_text)text=data.output_text;
    else if(Array.isArray(data.output))text=data.output.flatMap(o=>o.content||[]).map(c=>c.text||'').join('');
    text=String(text).replace(/<think>[\s\S]*?<\/think>/g,'').trim();
    if(!text){const finish=data.choices?.[0]?.finish_reason||data.stop_reason||data.incomplete_details?.reason||'';const err=Error(/length|max_tokens|max_output/.test(finish)?`o modelo ${m} usou todo o limite pensando e não chegou a responder`:`a IA devolveu uma resposta vazia (${m}${finish?`, motivo: ${finish}`:''})`);err.emptyByLength=/length|max_tokens|max_output/.test(finish);throw err}
    return {text,model:m,usage:data.usage||null};
  }catch(e){if(e.name==='AbortError')throw Error('a IA demorou demais para responder');throw e}
  finally{clearTimeout(timer)}
}
export function parseJson(text){
  const t=String(text).replace(/```(?:json)?/gi,'').trim();
  const start=Math.min(...['{','['].map(c=>{const i=t.indexOf(c);return i<0?Infinity:i}));
  if(start===Infinity)throw Error('a IA não devolveu o formato esperado');
  const open=t[start],close=open==='{'?'}':']';const end=t.lastIndexOf(close);
  return JSON.parse(t.slice(start,end+1));
}

// ---------- Fatos (a única matéria-prima permitida) ----------
export function profileFacts(profile){
  const p=profile||{};const out=[];
  if(p.name)out.push(`Nome: ${p.name}${p.city?` (${p.city})`:''}`);
  if(p.summary)out.push(`Resumo: ${p.summary}`);
  for(const e of p.experiences||[])out.push(`Experiência: ${e.title} na ${e.company} (${e.period||''}). ${e.description||''}`);
  for(const e of p.projects||[])out.push(`Projeto: ${e.title||e.name}. ${e.description||e.detail||''}`);
  for(const e of p.academic||[])out.push(`Formação: ${e.title} ${e.detail||''}`);
  for(const e of p.technical||[])out.push(`Curso técnico: ${e.title} ${e.detail||''}`);
  const courses=(p.courses||[]).map(c=>c.title||c.name).filter(Boolean);
  if(courses.length)out.push(`Cursos: ${courses.slice(0,25).join('; ')}`);
  if(p.skillsTech)out.push(`Habilidades técnicas: ${p.skillsTech}`);
  if(p.skillsOther)out.push(`Outras habilidades: ${p.skillsOther}`);
  for(const l of p.languages||[])out.push(`Idioma: ${l.title||l.name} ${l.detail||l.level||''}`);
  return out.map(s=>s.replace(/\s+/g,' ').trim()).join('\n');
}
const SKILL_TERMS=['Excel','Power BI','SQL','Python','Google Sheets','Looker','Tableau','ERP','SAP','CRM','Atendimento','Suporte técnico','Help desk','Automação','Inteligência artificial','Dados','Indicadores','Inglês','Redes','Windows','Linux','JavaScript','API','Pacote Office','Logística','Estoque','Faturamento','Vendas','Comunicação','Organização'];
export function marketSignals(state){
  const jobs=state.latest?.jobs||[];const signals={skills:[],jobsCount:jobs.length,niches:[]};
  if(jobs.length){
    const count=new Map();
    for(const j of jobs){const t=`${j.title} ${j.description||''}`.toLowerCase();for(const s of SKILL_TERMS)if(t.includes(s.toLowerCase()))count.set(s,(count.get(s)||0)+1)}
    signals.skills=[...count].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([skill,n])=>({skill,n,pct:Math.round(n/jobs.length*100)}));
  }
  const leads=Object.values(state.leads||{});
  if(leads.length){
    const by={};for(const l of leads){const k=l.niche;const m=by[k]||(by[k]={niche:k,total:0,contacted:0,replied:0});m.total++;if(l.contactedAt)m.contacted++;if(l.repliedAt||['replied','meeting','proposal','won'].includes(l.status))m.replied++}
    signals.niches=Object.values(by).sort((a,b)=>(b.replied-a.replied)||(b.total-a.total)).slice(0,4);
  }
  return signals;
}

// ---------- Voz ----------
function voiceBrief(v,profile){
  const goal={emprego:'conseguir uma vaga de emprego',clientes:'conseguir clientes para os serviços',ambos:'ser lembrado por recrutadores e por possíveis clientes'}[v.goal]||'fortalecer a presença profissional';
  const lang=v.language==='en'?'inglês':v.language==='alternar'?'o idioma indicado em cada pedido':'português do Brasil';
  const tone={proximo:'próximo, simples e humano, como uma conversa',formal:'profissional e sóbrio, sem gírias',inspirador:'motivador sem exagero'}[v.tone]||'próximo';
  const len={curto:'curto (até 600 caracteres)',medio:'médio (900 a 1.300 caracteres)',longo:'longo (até 2.000 caracteres)'}[v.length]||'médio';
  return [`Você escreve posts de LinkedIn em nome de ${String(profile?.name||'a pessoa').split(' ')[0]}, em primeira pessoa.`,
    `Objetivo dos posts: ${goal}. Público: ${v.audience||'profissionais da área'}.`,
    `Idioma: ${lang}. Tom: ${tone}. Profundidade: ${v.depth==='tecnico'?'pode usar termos técnicos':'explique sem jargão'}. Tamanho: ${len}.`,
    `Emojis: ${v.emojis==='nenhum'?'não use':v.emojis==='alguns'?'até 3, com propósito':'no máximo 1'}. Hashtags: exatamente ${Number(v.hashtags)||0}, no fim.`,
    'Preserve época, situação e resultado. Projeto antigo deve ser narrado no passado. Nunca anuncie novidade ou lançamento sem confirmação. Orgulho de concluir não significa sucesso comercial. Preserve fracassos, encerramentos e ressalvas. Se a época for desconhecida, evite hoje, recentemente e acabei de.',
 v.editorialGuidance?`Orientações editoriais: ${v.editorialGuidance}`:'',
 'Estrutura: primeira linha curta que prende a atenção (sem clickbait), parágrafos de 1 a 3 linhas, uma pergunta ou convite no fim.',
    'REGRAS OBRIGATÓRIAS: use apenas os fatos fornecidos; não invente números, empresas, clientes, cargos, datas ou resultados. Se faltar um dado, escreva de forma que não precise dele. Nada de frases feitas de coach, nada de "no mundo de hoje", nada de listas de 10 itens.',
    v.avoid?`Nunca fale de: ${v.avoid}.`:'',
    v.cta?`Quando o post for uma chamada, use esta ideia: ${v.cta}.`:'',
    v.examples?`Exemplos de posts que a pessoa gosta (imite o jeito, não o conteúdo):\n${String(v.examples).slice(0,3000)}`:''].filter(Boolean).join('\n');
}

// ---------- Banco de histórias ----------
export async function buildStoryBank(cfg,{profile,interview,diary}){
  const answers=INTERVIEW.map(q=>interview?.[q.key]?`P: ${q.q}\nR: ${interview[q.key]}`:'').filter(Boolean).join('\n\n');
  const recent=(diary||[]).slice(-6).map(d=>`Semana de ${d.weekOf}: ${CHECKIN.map(q=>d.answers?.[q.key]?`${q.q} ${d.answers[q.key]}`:'').filter(Boolean).join(' | ')}`).join('\n');
  const system='Você é um editor de conteúdo profissional. Extrai histórias verdadeiras de materiais brutos para virar posts de LinkedIn. Responda somente JSON válido.';
  const user=`Material da pessoa:\n\n[CURRÍCULO]\n${profileFacts(profile)||'(vazio)'}\n\n[ENTREVISTA]\n${answers||'(sem respostas ainda)'}\n\n[CHECK-INS]\n${recent||'(nenhum)'}\n\nExtraia de 10 a 20 histórias distintas que rendem um post cada. Para cada uma devolva:\n{"title":"título curto","pillar":"prova|dica|historia|opiniao","facts":["fato 1 exatamente como está no material","fato 2"],"angle":"o ângulo do post em uma frase","source":"curriculo|entrevista|checkin"}\nInclua nos facts época, situação e resultado, inclusive negativos. Preserve projetos antigos, fracassos e encerramentos. Use somente fatos presentes no material. Responda: {"stories":[...]}`;
  const r=await aiChat(cfg,{system,user,model:cfg.fastModel,maxTokens:12000,temperature:0.4,session:'radar-historias'});
  const data=parseJson(r.text);
  return (data.stories||data||[]).filter(s=>s&&s.title&&Array.isArray(s.facts)&&s.facts.length).slice(0,25).map(s=>({id:`st-${hash(s.title+s.facts.join('|'))}`,title:String(s.title).slice(0,120),pillar:PILLARS.some(p=>p.key===s.pillar)?s.pillar:'historia',facts:s.facts.map(f=>String(f).slice(0,400)).slice(0,6),angle:String(s.angle||'').slice(0,300),source:String(s.source||'entrevista'),used:0,createdAt:new Date().toISOString()}));
}

// ---------- Agenda ----------
function bahiaParts(d){const f=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).formatToParts(d);const g=t=>f.find(p=>p.type===t)?.value;return {date:`${g('year')}-${g('month')}-${g('day')}`,dow:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(g('weekday'))}}
export function nextSlots(voice,taken,count,from=new Date()){
  const days=(voice.days?.length?voice.days:DEFAULT_VOICE.days).map(Number);
  const [hh,mm]=String(voice.time||'08:30').split(':').map(Number);
  const out=[];const takenDays=new Set((taken||[]).map(t=>bahiaParts(new Date(t)).date));
  for(let i=1;i<=(takenDays.size+count+1)*7&&out.length<count;i++){
    const d=new Date(from.getTime()+i*86400000);const p=bahiaParts(d);
    if(!days.includes(p.dow)||takenDays.has(p.date))continue;
    // Bahia = UTC-3 o ano todo.
    out.push(new Date(`${p.date}T${String(hh||8).padStart(2,'0')}:${String(mm||0).padStart(2,'0')}:00-03:00`).toISOString());
  }
  return out;
}
export function choosePillars(voice,n,lastCallAt){
 const seq=(voice.sequence||[]).filter(k=>['emprego','clientes',...PILLARS.map(p=>p.key)].includes(k));if(seq.length)return Array.from({length:n},(_,i)=>seq[i%seq.length]);
  const allowed=PILLARS.filter(p=>p.key!=='chamada'&&(voice.pillars||[]).includes(p.key));
  const pool=(allowed.length?allowed:PILLARS.filter(p=>p.weight)).flatMap(p=>Array(Math.max(1,p.weight)).fill(p.key));
  const out=[];let i=Math.floor(Math.random()*pool.length);
  while(out.length<n){const k=pool[i++%pool.length];if(out.at(-1)!==k||pool.length===1)out.push(k);else i++}
  const weeks=Number(voice.callEvery)||2;
  if(weeks>0&&(!lastCallAt||Date.now()-Date.parse(lastCallAt)>(weeks*7-2)*86400000))out[out.length-1]='chamada';
  return out;
}

// ---------- Escrita ----------
export async function writePost(cfg,{voice,profile,pillar,story,diaryEntry,signals,language,instruction,previous,model,interview,requestOnly=false,generated}){
  const p=pillarByKey(pillar);
  const material=[];
 if(interview)material.push(`ENTREVISTA ORIGINAL (prevalece sobre resumos; preserve negativas, datas e ressalvas): ${JSON.stringify(interview).slice(0,24000)}`);
 if(instruction)material.push(`ORIENTAÇÃO DESTE POST: ${instruction}`);
  if(story)material.push(`HISTÓRIA ESCOLHIDA: ${story.title}\nÂngulo: ${story.angle}\nFatos:\n- ${story.facts.join('\n- ')}`);
  if(diaryEntry)material.push(`CHECK-IN DA SEMANA:\n${CHECKIN.map(q=>diaryEntry.answers?.[q.key]?`- ${q.q} ${diaryEntry.answers[q.key]}`:'').filter(Boolean).join('\n')}`);
  if(signals?.skills?.length&&(pillar==='opiniao'||pillar==='dica'))material.push(`O QUE O RADAR OBSERVOU NAS VAGAS (${signals.jobsCount} vagas compatíveis lidas pelo robô): ${signals.skills.map(s=>`${s.skill} em ${s.pct}%`).join(', ')}.`);
  if(signals?.niches?.length&&(pillar==='dica'||pillar==='opiniao')&&voice.goal!=='emprego')material.push(`NICHOS DE CLIENTES QUE A PESSOA ESTÁ PROSPECTANDO: ${signals.niches.map(n=>n.niche).join(', ')}.`);
  if(pillar==='chamada')material.push(`O QUE A PESSOA BUSCA: ${voice.cta||''} Objetivo: ${voice.goal}.`);
  material.push(`CURRÍCULO (use só se ajudar):\n${profileFacts(profile).slice(0,3500)}`);
  const lang=language==='en'?'Escreva este post em inglês.':'Escreva em português do Brasil.';
  const user=`Tipo de post: ${p.label} — ${p.desc}\n${lang}\n\n${material.join('\n\n')}\n\n${previous?`VERSÃO ANTERIOR:\n${previous}\n\nPEDIDO DE AJUSTE: ${instruction||'reescreva melhor'}\n\n`:''}Devolva somente JSON:\n{"text":"o post completo, com quebras de linha e hashtags no fim","hook":"a primeira linha","image":{"kind":"print|card|photo","printIdea":"se kind=print: qual print ou foto real a pessoa deve tirar","cardTitle":"se kind=card: frase de até 60 caracteres","cardLines":["até 3 tópicos curtos"],"photoQuery":"sempre: 2 a 4 palavras em inglês para encontrar foto real relacionada ao post"},"factsUsed":["fatos usados"]}\nEscolha kind=print quando o post fala de um projeto que pode ser mostrado; card para dicas e opiniões; photo só quando nada disso servir.`;
  if(requestOnly)return {system:voiceBrief(voice,profile),user};
  const r=generated?{text:JSON.stringify(generated),model:model||cfg.model}:await aiChat(cfg,{system:voiceBrief(voice,profile),user,model,maxTokens:8000,temperature:0.6,session:`radar-post-${pillar}`});
  const d=parseJson(r.text);
  if(!d.text)throw Error('a IA não devolveu o texto do post');
  const img=d.image||{};
  return {text:String(d.text).trim().slice(0,3000),hook:String(d.hook||'').slice(0,200),image:{kind:['print','card','photo'].includes(img.kind)?img.kind:'card',printIdea:String(img.printIdea||'').slice(0,300),cardTitle:String(img.cardTitle||d.hook||'').slice(0,90),cardLines:(img.cardLines||[]).map(x=>String(x).slice(0,80)).slice(0,3),photoQuery:String(img.photoQuery||'').slice(0,60)},factsUsed:(d.factsUsed||[]).map(String).slice(0,8),model:r.model};
}

export async function planWeek(cfg,state,{count,from=new Date(),photoKey,http,onPost,manual=false,topics=[]}={}){
  const P=state.posts;const voice={...DEFAULT_VOICE,...(P.voice||{})};
  const upcoming=P.items.filter(x=>['draft','approved'].includes(x.status)&&Date.parse(x.scheduledFor)>from.getTime());
  const want=count?Math.min(7,Number(count)):Math.max(0,(Number(voice.postsPerWeek)||3)-upcoming.filter(x=>Date.parse(x.scheduledFor)<from.getTime()+8*86400000).length);
  const slots=nextSlots(voice,upcoming.map(x=>x.scheduledFor),want,from);
  if(!slots.length)return {created:[],errors:[],note:'A semana já está planejada.'};
  const lastCall=P.items.filter(x=>x.pillar==='chamada').map(x=>x.scheduledFor).sort().at(-1);
  const pillars=choosePillars(voice,slots.length,lastCall);
  const signals=marketSignals(state);
  const weekAgo=Date.now()-8*86400000;
  const freshDiary=(P.diary||[]).filter(d=>Date.parse(d.at)>weekAgo&&!d.usedAt).at(-1)||null;
  const created=[],errors=[],prepared=[];
  for(let i=0;i<slots.length;i++){
    const topic=topics[i]||{};const selected=['emprego','clientes',...PILLARS.map(p=>p.key)].includes(topic.pillar)?topic.pillar:pillars[i];const pillar=['emprego','clientes'].includes(selected)?'chamada':selected;const postVoice={...voice,...(selected==='emprego'?{goal:'emprego'}:selected==='clientes'?{goal:'clientes'}:{})};const instruction=String(topic.instruction||'').slice(0,1500);
    let story=null,diaryEntry=null;
    if(freshDiary&&i===0&&pillar==='historia'&&!topic.storyId){diaryEntry=freshDiary}
    else if(pillar!=='chamada'){
      const pool=(P.stories||[]).filter(s=>!s.archived);
      story=pool.find(s=>s.id===topic.storyId)||pool.filter(s=>s.pillar===pillar).sort((a,b)=>a.used-b.used)[0]||pool.sort((a,b)=>a.used-b.used)[0]||null;
    }
    const language=voice.language==='alternar'?(i%2?'en':'pt'):voice.language==='en'?'en':'pt';
    prepared.push({voice:postVoice,profile:state.profile,pillar,story,diaryEntry,signals,language,instruction,interview:P.interview});
  }
  const prompts=await Promise.all(prepared.map(p=>writePost(cfg,{...p,requestOnly:true})));
  const started=Date.now();
  // Um único pedido para o lote evita filas entre posts e concorrência no provedor.
  const response=await aiChatOnce(cfg,{model:cfg.fastModel||AI_DEFAULTS.fastModel,system:'Você é um editor de posts de LinkedIn. Siga integralmente as regras de cada pedido. Devolva apenas JSON válido com {"posts":[...]} na mesma ordem. Cada item deve ter os campos solicitados no respectivo pedido. Preserve datas, negativas e resultados reais.',user:JSON.stringify(prompts),maxTokens:10000,temperature:0.6,session:'radar-post-lote',timeout:45000});
  const batch=parseJson(response.text);
  if(!Array.isArray(batch.posts)||batch.posts.length!==prepared.length)throw Error('A IA devolveu um lote incompleto. Tente gerar novamente.');
  console.log('Lote de posts: '+prepared.length+' textos em '+(Date.now()-started)+' ms ('+response.model+')');
  for(let i=0;i<prepared.length;i++){
    const {pillar,story,diaryEntry,language}=prepared[i];
    try{
      const w=await writePost(cfg,{...prepared[i],model:response.model,generated:batch.posts[i]});
      const post={id:`post-${randomUUID().slice(0,8)}`,status:!manual&&voice.autoApprove?'approved':'draft',pillar,language,storyId:story?.id||null,fromCheckin:!!diaryEntry,scheduledFor:slots[i],...w,createdAt:new Date().toISOString(),history:[{at:new Date().toISOString(),event:`Escrito por ${w.model}`}]};
      post.image.style=['contrast','editorial','minimal'][i%3];
      if(photoKey&&http)try{await choosePostPhoto(post,photoKey,http,{otherPosts:P.items})}catch(error){post.imageError=error.message;errors.push(`Imagem de ${pillarByKey(pillar).label}: ${error.message}`)}
      P.items.push(post);created.push(post);
      if(onPost)await onPost(post,{completed:i+1,total:slots.length});
      if(story)story.used++;
      if(diaryEntry)diaryEntry.usedAt=new Date().toISOString();
    }catch(e){errors.push(`${pillarByKey(pillar).label}: ${e.message}`)}
  }
  P.lastPlanAt=new Date().toISOString();
  return {created,errors};
}

// ---------- Fotos reais (Pixabay ou Pexels, detectado pelo formato da chave) ----------
export const photoProvider=key=>/^\d+-[0-9a-f]{20,}$/i.test(String(key||'').trim())?'Pixabay':'Pexels';
export async function choosePostPhoto(post,key,http,{otherPosts=[]}={}){
  if(!key||!http||post.image?.chosen||post.status==='published'||post.status==='skipped')return false;
  const fallback={prova:'software development computer',dica:'technology workspace',historia:'professional learning technology',opiniao:'digital business technology',chamada:'professional networking'};
  const query=String(post.image?.photoQuery||fallback[post.pillar]||'professional technology').trim();
  const near=otherPosts.filter(p=>p.id!==post.id&&p.status!=='skipped'&&p.image?.chosen&&Math.abs(Date.parse(p.scheduledFor)-Date.parse(post.scheduledFor))<=8*86400000);
  const used=new Set(near.map(p=>`${p.image.chosen.provider}:${p.image.chosen.id}`));
  let photos=await searchPhotos(key,query,{http});
  let photo=photos.find(p=>p.large&&p.thumb&&!used.has(`${p.provider}:${p.id}`));
  if(!photo&&query!==fallback[post.pillar]){
    photos=await searchPhotos(key,fallback[post.pillar]||'professional technology',{http});
    photo=photos.find(p=>p.large&&p.thumb&&!used.has(`${p.provider}:${p.id}`));
  }
  if(!photo)throw Error(`O ${photoProvider(key)} não encontrou uma foto diferente para este post. Tente outra busca.`);
  post.image={...post.image,kind:'photo',chosen:photo,photoQuery:query,autoSelected:true};
  return true;
}
export async function searchPhotos(key,query,{http}){
  if(!key)throw Error('Cadastre a chave do Pixabay ou do Pexels em Meu perfil › Inteligência artificial e imagens.');
  const q=String(query||'').trim()||'office work';const provider=photoProvider(key);
  return http.cached(`${provider}:${q.toLowerCase()}`,async()=>{
    if(provider==='Pixabay'){
      const data=await http.fetchJson(`https://pixabay.com/api/?${new URLSearchParams({key:key.trim(),q,image_type:'photo',orientation:'horizontal',per_page:'12',safesearch:'true'})}`,{},{timeout:20000});
      return (data.hits||[]).map(p=>({id:p.id,alt:p.tags||'',thumb:p.webformatURL,large:p.largeImageURL||p.webformatURL,page:p.pageURL,author:p.user,provider}));
    }
    const data=await http.fetchJson(`https://api.pexels.com/v1/search?${new URLSearchParams({query:q,per_page:'12',orientation:'landscape'})}`,{Authorization:key.trim()},{timeout:20000});
    return (data.photos||[]).map(p=>({id:p.id,alt:p.alt||'',thumb:p.src?.medium,large:p.src?.large2x||p.src?.large,page:p.url,author:p.photographer,provider}));
  },20*3600000);
}

// ---------- Lembrete por e-mail ----------
export function reminderEmail(post,{localUrl}){
  const img=post.image||{};
  const imgLine=img.kind==='photo'&&img.chosen?.large?`Imagem: ${img.chosen.large}\n(foto de ${img.chosen.author} no ${img.chosen.provider||'banco de imagens'})`:img.kind==='print'?`Imagem sugerida: ${img.printIdea}`:img.kind==='card'?'Imagem: baixe o card no Radar (botão "Baixar card").':'';
  return {subject:`Hora de publicar: ${post.hook||'seu post de hoje'}`.slice(0,150),text:`Seu post de hoje está pronto. Copie o texto abaixo e publique no LinkedIn.\n\n${'-'.repeat(30)}\n${post.text}\n${'-'.repeat(30)}\n\n${imgLine}\n\nPublicar direto: https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(post.text)}\n\nDepois de publicar, marque como publicado no Radar: ${localUrl}\n\n— Radar`};
}
