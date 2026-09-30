// Módulo Clientes: campanhas (uma por oferta), busca de empresas, sinais, pontuação e mensagens.
// Regra do produto: o robô encontra, pesquisa e escreve; o primeiro contato é sempre enviado pela pessoa
// (WhatsApp com um clique) ou por e-mail aprovado um a um. Quem pede para não ser contatado é bloqueado.
import {createHash} from 'node:crypto';
import {plain,norm} from './sources-br.mjs';

const hash=t=>createHash('sha256').update(String(t)).digest('hex').slice(0,16);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// ---------- Nichos ----------
// docs: documentos/fluxos típicos do ramo (usados na explicação e na mensagem).
export const NICHES=[
  {key:'contabilidade',label:'Escritórios de contabilidade',plural:'escritórios de contabilidade',maps:'escritório de contabilidade',cnae:'6920-6/01',docs:'notas fiscais e recibos que os clientes mandam por foto',flow:'dúvidas de clientes sobre guias e prazos'},
  {key:'transportadora',label:'Transportadoras',plural:'transportadoras',maps:'transportadora',cnae:'4930-2/02',docs:'canhotos e comprovantes de entrega fotografados pelos motoristas',flow:'pedidos de rastreio e cotação'},
  {key:'distribuidora',label:'Distribuidoras e atacadistas',plural:'distribuidoras',maps:'distribuidora atacadista',cnae:'46',docs:'pedidos e notas de compra',flow:'pedidos de clientes pelo WhatsApp'},
  {key:'autopecas',label:'Autopeças',plural:'lojas de autopeças',maps:'loja de autopeças',cnae:'4530-7/03',docs:'notas de compra e pedidos de fornecedores',flow:'consultas de preço e disponibilidade de peças'},
  {key:'oficina',label:'Oficinas mecânicas',plural:'oficinas',maps:'oficina mecânica',cnae:'4520-0/01',docs:'orçamentos e notas de peças',flow:'agendamento de revisões e orçamentos'},
  {key:'clinica',label:'Clínicas e consultórios',plural:'clínicas',maps:'clínica médica',cnae:'8630-5/03',docs:'guias de convênio e pedidos médicos',flow:'marcação e confirmação de consultas'},
  {key:'odonto',label:'Clínicas odontológicas',plural:'clínicas odontológicas',maps:'clínica odontológica',cnae:'8630-5/04',docs:'guias de convênio e fichas de pacientes',flow:'marcação e confirmação de consultas'},
  {key:'laboratorio',label:'Laboratórios',plural:'laboratórios',maps:'laboratório de análises clínicas',cnae:'8640-2/02',docs:'pedidos médicos e guias',flow:'dúvidas sobre preparo e resultados'},
  {key:'advocacia',label:'Escritórios de advocacia',plural:'escritórios de advocacia',maps:'escritório de advocacia',cnae:'6911-7/01',docs:'documentos de clientes, como RG, comprovantes e contratos',flow:'atendimento inicial de novos clientes'},
  {key:'imobiliaria',label:'Imobiliárias',plural:'imobiliárias',maps:'imobiliária',cnae:'6821-8/01',docs:'documentos de locatários e contratos',flow:'perguntas sobre imóveis e agendamento de visitas'},
  {key:'farmacia',label:'Farmácias',plural:'farmácias',maps:'farmácia',cnae:'4771-7/01',docs:'receitas e notas de fornecedores',flow:'pedidos e consultas de preço pelo WhatsApp'},
  {key:'construcao',label:'Materiais de construção',plural:'lojas de material de construção',maps:'loja de material de construção',cnae:'4744-0/99',docs:'orçamentos e pedidos',flow:'orçamentos pelo WhatsApp'},
  {key:'supermercado',label:'Supermercados',plural:'supermercados',maps:'supermercado',cnae:'4711-3/02',docs:'notas de fornecedores',flow:'pedidos e entregas'},
  {key:'restaurante',label:'Restaurantes e delivery',plural:'restaurantes',maps:'restaurante',cnae:'5611-2/01',docs:'notas de fornecedores e comandas',flow:'pedidos de delivery e reservas'},
  {key:'escola',label:'Escolas e cursos',plural:'escolas',maps:'escola particular',cnae:'8513-9/00',docs:'fichas de matrícula e documentos de alunos',flow:'dúvidas de pais e matrículas'},
];
const nicheByKey=k=>NICHES.find(n=>n.key===k);
export function customNiche(label){const l=String(label||'').trim().slice(0,60);return l?{key:`custom:${norm(l).replace(/ /g,'-')}`,label:l,plural:l.toLowerCase(),maps:l.toLowerCase(),cnae:'',docs:'documentos e registros do dia a dia',flow:'atendimento de clientes',custom:true}:null}
function resolveNiche(key,campaign){return nicheByKey(key)||(campaign.customNiches||[]).map(customNiche).find(n=>n&&n.key===key)||null}

// ---------- Ofertas (modelos até a IA própria ser conectada) ----------
export const OFFERS=[
  {key:'foto-planilha',name:'Da foto para a planilha',short:'automações que transformam fotos e PDFs em planilhas',match:/foto|imagem|image|pdf|nota|comprovante|document|digita|excel|word|planilha|ocr|extra/i,
    problem:'Funcionários perdem horas digitando no Excel ou no sistema os dados de {docs}, e erros de digitação acontecem.',
    delivery:'A empresa envia a foto ou o PDF (pelo WhatsApp, e-mail ou uma pasta) e os dados caem sozinhos na planilha, no documento ou no sistema, prontos para conferir.',
    result:'Menos horas de digitação, menos erros e informação disponível no mesmo dia.',
    hiring:['digitador','lançamento','lancamento','faturamento','auxiliar administrativo','assistente administrativo','auxiliar de escritório','cadastro','assistente fiscal','auxiliar contábil','auxiliar contabil','arquivo'],
    opening:'Vi que vocês lidam com {docs}. Ajudo empresas a transformar isso em planilha sem ninguém precisar digitar.',
    questions:['Quantos documentos vocês recebem por dia, mais ou menos?','Quem faz a digitação hoje e quanto tempo leva?','Em qual planilha ou sistema esses dados precisam cair?']},
  {key:'whatsapp',name:'Atendimento automático no WhatsApp',short:'atendimento automático no WhatsApp',match:/whats|atendimento|chat|bot|mensag/i,
    problem:'A equipe responde as mesmas perguntas de clientes no WhatsApp o dia todo, como {flow}.',
    delivery:'Um assistente responde na hora as perguntas frequentes, coleta os dados do cliente e passa para a equipe só o que precisa de uma pessoa.',
    result:'Respostas mais rápidas, menos clientes perdidos e equipe livre para o que importa.',
    hiring:['atendente','recepcionista','sac','telemarketing','operador de atendimento','assistente comercial'],
    opening:'Vi que vocês atendem muitos clientes pelo WhatsApp. Ajudo empresas a responder as perguntas repetidas na hora, sem sobrecarregar a equipe.',
    questions:['Quantas conversas chegam por dia?','Quais perguntas se repetem mais?','Quem responde hoje e em que horário?']},
  {key:'agendamento',name:'Agendamento e lembretes automáticos',short:'agendamento e lembretes automáticos',match:/agend|lembrete|consulta|horário|horario|marca/i,
    problem:'Horários são marcados e confirmados na mão, e faltas sem aviso deixam a agenda vazia.',
    delivery:'Os clientes marcam sozinhos pelo link ou WhatsApp e recebem confirmação e lembrete automáticos.',
    result:'Menos faltas, menos tempo ao telefone e agenda sempre atualizada.',
    hiring:['recepcionista','secretária','secretaria','atendente'],
    opening:'Ajudo {plural} a automatizar marcação e lembretes, para reduzir faltas e ligações.',
    questions:['Quantos atendimentos vocês marcam por semana?','As faltas sem aviso são um problema?','Como os clientes marcam hoje?']},
  {key:'relatorios',name:'Relatórios e controles automáticos',short:'relatórios e planilhas de controle automáticos',match:/relat|dashboard|indicador|power bi|controle|planilha/i,
    problem:'Relatórios e planilhas de controle são montados na mão toda semana, juntando dados de vários lugares.',
    delivery:'Os dados são reunidos sozinhos e o relatório fica pronto e atualizado, com os números que o dono precisa ver.',
    result:'Decisões com números atualizados e horas a menos de trabalho manual.',
    hiring:['analista de dados','assistente financeiro','auxiliar financeiro','analista administrativo'],
    opening:'Ajudo empresas a ter os relatórios e controles prontos sozinhos, sem montar planilha na mão.',
    questions:['Quais relatórios vocês montam hoje?','De onde vêm os dados?','Quanto tempo isso leva por semana?']},
  {key:'descricoes',name:'Descrições de produtos com IA',short:'descrições e cadastros de produtos gerados com IA',match:/descri|produto|catálogo|catalogo|cadastro|anúncio|anuncio|marketplace/i,
    problem:'Cadastrar produtos e escrever descrições um por um toma muito tempo da equipe.',
    delivery:'A partir da foto e de poucos dados, a descrição e o cadastro ficam prontos para revisar e publicar.',
    result:'Catálogo atualizado mais rápido e com textos padronizados.',
    hiring:['cadastro de produtos','e-commerce','ecommerce','marketplace','auxiliar de loja'],
    opening:'Ajudo lojas a cadastrar produtos e escrever descrições muito mais rápido, com revisão da equipe.',
    questions:['Quantos produtos vocês cadastram por mês?','Onde vocês vendem (site, marketplace, Instagram)?','Quem faz os cadastros hoje?']},
];
const offerByKey=k=>OFFERS.find(o=>o.key===k)||OFFERS[0];
export function pickOffer(summary){return OFFERS.find(o=>o.match.test(summary||''))||OFFERS[0]}
// Monta a ficha a partir do resumo. Hoje usa modelos; quando a IA própria existir, esta é a função a trocar.
export function buildOfferSheet(summary,templateKey){
  const o=templateKey?offerByKey(templateKey):pickOffer(summary);
  const text=String(summary||'').trim();
  const outputs=[/excel|planilha/i.test(text)&&'planilha (Excel)',/word|documento/i.test(text)&&'documento (Word)',/sistema|erp/i.test(text)&&'sistema da empresa'].filter(Boolean);
  let delivery=o.delivery;
  if(o.key==='foto-planilha'&&outputs.length)delivery=delivery.replace('na planilha, no documento ou no sistema',`em ${outputs.join(' ou ')}`);
  return {template:o.key,name:o.name,short:o.short,summary:text,problem:o.problem,delivery,result:o.result,hiring:o.hiring.join(', '),opening:o.opening,questions:o.questions.join('\n'),generatedBy:'modelo'};
}
function fill(t,niche){return String(t||'').replaceAll('{docs}',niche?.docs||'documentos do dia a dia').replaceAll('{flow}',niche?.flow||'dúvidas de clientes').replaceAll('{plural}',niche?.plural||'empresas')}

// ---------- Telefone e WhatsApp ----------
export function phoneInfo(raw){
  let d=String(raw||'').replace(/\D/g,'');
  if(!d)return {digits:'',mobile:false,wa:null};
  if(d.startsWith('0'))d=d.replace(/^0+/,'');
  if(!d.startsWith('55')&&(d.length===10||d.length===11))d='55'+d;
  const local=d.startsWith('55')?d.slice(4):d;
  const mobile=local.length===9&&local.startsWith('9');
  return {digits:d,mobile,wa:d.length>=12?d:null};
}

// ---------- Sinais vindos do robô de vagas ----------
const genericWords=new Set(['ltda','me','eireli','epp','sa','s','a','de','da','do','das','dos','e','feira','santana','bahia','ba','brasil','clinica','clínica','escritorio','contabilidade','contabil','servicos','serviços','comercio','comércio','grupo','centro','loja','empresa','associados','advocacia','advogados','distribuidora','transportes','transportadora','oficina','farmacia','laboratorio','imobiliaria','supermercado','restaurante','escola','autopecas','pecas','materiais','construcao','odontologia','odontologica','medica','saude']);
function keyTokens(name){return norm(name).split(' ').filter(w=>w.length>=4&&!genericWords.has(w))}
export function hiringSignals(lead,jobCatalog,offer){
  const toks=keyTokens(lead.name);
  if(!toks.length)return [];
  const roles=(offer?.hiring||'').split(',').map(r=>norm(r)).filter(Boolean);
  const out=[];
  for(const j of jobCatalog||[]){
    const comp=norm(j.company);if(!comp)continue;
    const ctoks=keyTokens(j.company);
    const same=toks.some(t=>ctoks.includes(t))&&(toks.length===1||toks.filter(t=>ctoks.includes(t)).length>=Math.min(2,toks.length));
    if(!same)continue;
    const title=norm(j.title);
    const relevant=roles.some(r=>title.includes(r));
    out.push({type:relevant?'hiring-relevant':'hiring',text:`Está contratando: ${j.title}${j.source?` (${j.source})`:''}`,url:j.url||null});
    if(out.length>=3)break;
  }
  return out;
}

// ---------- Site da empresa ----------
const emailRe=/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
export function parseSite(html){
  const text=String(html||'');
  const emails=[...new Set((text.match(emailRe)||[]).map(e=>e.toLowerCase()).filter(e=>!/\.(png|jpe?g|gif|webp|svg)$/.test(e)&&!/(sentry|example|wixpress|godaddy|domain|seudominio|email\.com$)/.test(e)))];
  const mailto=[...text.matchAll(/mailto:([^"'?\s>]+)/gi)].map(m=>decodeURIComponent(m[1]).toLowerCase());
  const all=[...new Set([...mailto,...emails])].filter(e=>/^[^@]+@[^@]+\.[a-z]{2,}$/.test(e));
  const whatsapp=/wa\.me\/|api\.whatsapp\.com|whatsapp/i.test(text);
  const instagram=/instagram\.com\/[a-z0-9_.]+/i.exec(text)?.[0]||null;
  return {email:all[0]||null,emails:all.slice(0,3),whatsapp,instagram:instagram?`https://www.${instagram.replace(/^https?:\/\/(www\.)?/,'')}`:null};
}

// ---------- Pontuação ----------
export function scoreLead(lead){
  let score=35;const reasons=[];
  if(lead.signals?.some(s=>s.type==='hiring-relevant')){score+=30;reasons.push(lead.signals.find(s=>s.type==='hiring-relevant').text)}
  else if(lead.signals?.some(s=>s.type==='hiring')){score+=10;reasons.push(lead.signals.find(s=>s.type==='hiring').text)}
  if(lead.mobile){score+=12;reasons.push('Telefone celular: provável WhatsApp')}
  else if(lead.whatsappOnSite){score+=10;reasons.push('O site indica atendimento por WhatsApp')}
  else if(lead.phoneDigits){score+=4;reasons.push('Tem telefone fixo')}
  if(lead.email){score+=6;reasons.push('E-mail encontrado no site')}
  if(lead.website){score+=4;reasons.push('Tem site próprio')}else reasons.push('Sem site na ficha do Google')
  const r=Number(lead.reviews)||0;
  if(r>=100){score+=10;reasons.push(`${r} avaliações no Google: empresa movimentada`)}
  else if(r>=20){score+=6;reasons.push(`${r} avaliações no Google`)}
  else if(r>0)score+=2;
  if(!lead.phoneDigits&&!lead.email){score-=15;reasons.push('Sem telefone nem e-mail encontrados')}
  return {score:Math.max(0,Math.min(100,score)),reasons};
}

// ---------- Mensagens ----------
function firstName(name){return String(name||'').trim().split(/\s+/)[0]||''}
export function composeMessages(lead,campaign,sender){
  const niche=resolveNiche(lead.niche,campaign);
  const sheet=campaign.offer||buildOfferSheet(campaign.offerSummary);
  const me=sender?.name||'Daniel';
  const city=campaign.city?String(campaign.city).split(',')[0]:'';
  const company=lead.name;
  const hiring=lead.signals?.find(s=>s.type==='hiring-relevant')||lead.signals?.find(s=>s.type==='hiring');
  const reason=hiring?`Vi que vocês estão com uma vaga aberta (${hiring.text.replace(/^Está contratando: /,'').replace(/\s*\(.*\)$/,'')}), e imagino que parte desse trabalho seja lidar com ${niche?.docs||'tarefas repetitivas'}.`:fill(sheet.opening,niche);
  const formal=campaign.tone==='formal';
  const hello=formal?`Olá, equipe da ${company}. Tudo bem?`:`Oi, pessoal da ${company}! Tudo bem?`;
  const intro=`Sou ${me}${city?`, aqui de ${city}`:''}, e trabalho com ${sheet.short||'automação de processos'}.`;
  const offerLine=fill(sheet.delivery,niche);
  const ask=`Faz sentido eu te mostrar um exemplo rápido de como ficaria para a ${company}?`;
  const whatsapp=[hello,`${intro} ${reason}`,offerLine,ask].join('\n\n');
  const subject=`${sheet.name||'Automação'} para a ${company}`;
  const questions=String(sheet.questions||'').split('\n').map(q=>q.trim()).filter(Boolean).slice(0,2);
  const sig=[sender?.name||me,sender?.title||'',sender?.phone?`WhatsApp: ${sender.phone}`:'',sender?.site||''].filter(Boolean).join('\n');
  const email=[formal?`Olá, equipe da ${company},`:`Olá, pessoal da ${company},`,'',`${intro} ${reason}`,'',fill(sheet.problem,niche),'',`Como funciona: ${offerLine}`,`Resultado: ${sheet.result}`,'',questions.length?`Para eu entender se faz sentido para vocês:\n${questions.map(q=>`• ${q}`).join('\n')}`:'','',`Posso te mandar um exemplo de 1 minuto?`,'',`Obrigado,`,sig,'',`—`,`Se não quiser receber mais mensagens minhas, é só responder "não".`].filter((l,i,a)=>!(l===''&&a[i-1]==='')).join('\n');
  return {whatsapp,emailSubject:subject,emailBody:email};
}

// ---------- Busca no Google Maps (via SerpApi) ----------
// Coordenadas de todos os municípios (cidades-br.json: [nome, UF, lat, lng, capital]) para o filtro de raio.
let cityList=null;
async function cityCoords(city,uf){
  if(!cityList){try{const {readFile}=await import('node:fs/promises');cityList=JSON.parse(await readFile(new URL('./cidades-br.json',import.meta.url),'utf8'))}catch{cityList=[]}}
  const c=norm(city),u=String(uf||'').trim().toUpperCase();
  const hit=cityList.find(r=>norm(r[0])===c&&(!u||r[1]===u))||cityList.find(r=>norm(r[0])===c);
  return hit?[hit[2],hit[3]]:CITY_COORDS[c]||null;
}
const CITY_COORDS={'feira de santana':[-12.2664,-38.9663],'salvador':[-12.9714,-38.5014],'vitoria da conquista':[-14.8615,-40.8442],'camacari':[-12.6996,-38.3263],'alagoinhas':[-12.1356,-38.4192]};
function haversine(a,b){const R=6371,toR=x=>x*Math.PI/180;const dLat=toR(b[0]-a[0]),dLng=toR(b[1]-a[1]);const h=Math.sin(dLat/2)**2+Math.cos(toR(a[0]))*Math.cos(toR(b[0]))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function zoomFor(km){return km<=5?14:km<=10?13:km<=25?12:km<=50?11:10}
export function normalizePlace(r,nicheKey,campaignId){
  const p=phoneInfo(r.phone);
  const id=`maps:${r.place_id||r.data_id||hash(`${r.title}|${r.address}`)}`;
  return {id,campaignId,niche:nicheKey,name:plain(r.title),category:plain(r.type||(r.types||[])[0]||''),address:plain(r.address||''),phone:plain(r.phone||''),phoneDigits:p.digits,mobile:p.mobile,wa:p.wa,website:/^https?:\/\//i.test(r.website||'')?r.website:null,rating:Number(r.rating)||null,reviews:Number(r.reviews)||0,lat:r.gps_coordinates?.latitude??null,lng:r.gps_coordinates?.longitude??null,mapsUrl:r.place_id?`https://www.google.com/maps/place/?q=place_id:${r.place_id}`:(r.link||null),source:'Google Maps'};
}
export async function searchCampaign(campaign,deps){
  const {http,keys,state,jobCatalog,sender}=deps;
  const stats={queries:0,found:0,added:0,updated:0,skippedBlocked:0,errors:[]};
  if(!keys?.serpapiKey){stats.errors.push('Cadastre a chave do SerpApi em Meu perfil > Fontes extras para buscar empresas no Google Maps.');return stats}
  const city=String(campaign.city||'').split(',')[0].trim();
  const uf=(String(campaign.city||'').split(',')[1]||'').trim();
  const coords=await cityCoords(city,uf);
  const radius=Math.max(2,Math.min(100,Number(campaign.radiusKm)||15));
  const pages=Math.max(1,Math.min(3,Number(campaign.pagesPerNiche)||1));
  const offer=campaign.offer||buildOfferSheet(campaign.offerSummary);
  const niches=(campaign.niches||[]).map(k=>resolveNiche(k,campaign)).filter(Boolean);
  if(!niches.length){stats.errors.push('Escolha pelo menos um nicho na campanha.');return stats}
  state.leads||={};state.leadBlocks||={ids:{},phones:{}};
  const touched=[];
  for(const niche of niches){
    for(let page=0;page<pages;page++){
      const q=coords?niche.maps:`${niche.maps} em ${city}${uf?` ${uf}`:''}`;
      const key=`maps:${norm(q)}:${norm(city)}:${radius}:${page}`;
      try{
        stats.queries++;
        const rows=await http.cached(key,async()=>{
          const params=new URLSearchParams({engine:'google_maps',q,type:'search',hl:'pt',gl:'br',api_key:keys.serpapiKey});
          if(coords)params.set('ll',`@${coords[0]},${coords[1]},${zoomFor(radius)}z`);
          if(page)params.set('start',String(page*20));
          const data=await http.fetchJson(`https://serpapi.com/search.json?${params}`,{},{timeout:60000});
          if(data?.error&&!/hasn't returned any results/i.test(data.error))throw Error(data.error);
          return Array.isArray(data?.local_results)?data.local_results:[];
        },7*86400000);
        for(const r of rows){
          const place=normalizePlace(r,niche.key,campaign.id);
          if(coords&&place.lat!=null&&haversine(coords,[place.lat,place.lng])>radius)continue;
          if(!coords&&city&&place.address&&!norm(place.address).includes(norm(city)))continue;
          if(state.leadBlocks.ids[place.id]||(place.phoneDigits&&state.leadBlocks.phones[place.phoneDigits])){stats.skippedBlocked++;continue}
          stats.found++;
          const prev=state.leads[place.id];
          const lead=prev?{...prev,...place,campaignId:prev.campaignId||campaign.id,niche:prev.niche||niche.key}:{...place,status:'new',notes:'',history:[{at:new Date().toISOString(),event:'Encontrada no Google Maps'}],foundAt:new Date().toISOString()};
          if(prev)stats.updated++;else stats.added++;
          state.leads[place.id]=lead;touched.push(lead);
        }
        if(rows.length<20)break;
      }catch(e){stats.errors.push(`${niche.label}: ${e.message}`);break}
      await sleep(200);
    }
  }
  // Enriquecimento leve: site da empresa (e-mail, WhatsApp) para os mais promissores ainda não verificados.
  const toCheck=touched.filter(l=>l.website&&!l.siteCheckedAt).slice(0,15);
  for(let i=0;i<toCheck.length;i+=3){
    await Promise.all(toCheck.slice(i,i+3).map(async l=>{
      try{const res=await http.fetchRaw(l.website,{'User-Agent':'Mozilla/5.0 RadarDaniel/0.2','Accept':'text/html'},8000);const info=parseSite((await res.text()).slice(0,400000));Object.assign(l,{email:l.email||info.email,emails:info.emails,whatsappOnSite:info.whatsapp,instagram:info.instagram,siteCheckedAt:new Date().toISOString()})}
      catch{l.siteCheckedAt=new Date().toISOString();l.siteError=true}
    }));
  }
  for(const l of touched){
    l.signals=hiringSignals(l,jobCatalog,offer);
    Object.assign(l,scoreLead(l));
    if(!l.messagesEditedAt)l.messages=composeMessages(l,campaign,sender);
    l.updatedAt=new Date().toISOString();
  }
  campaign.lastSearchAt=new Date().toISOString();campaign.lastStats=stats;
  return stats;
}

export const STATUSES=['new','contacted','replied','meeting','proposal','won','lost','blocked'];
export {resolveNiche,offerByKey};
