// Compara uma vaga com o currículo mestre do usuário.
// Só aponta fatos que existem no perfil; o que a vaga pede e não consta vira "a conferir".
import {norm} from './sources-br.mjs';

// [rótulo, padrão na vaga, padrão no perfil]
const skills=[
  ['Power BI',/power ?bi/i,/power ?bi/i],
  ['SQL',/\bsql\b/i,/\bsql\b/i],
  ['Python',/python/i,/python/i],
  ['Excel',/excel|planilha/i,/excel/i],
  ['Pacote Office',/pacote office|word|powerpoint|microsoft office/i,/excel|office|word/i],
  ['Looker / Tableau',/looker|tableau/i,/looker|tableau/i],
  ['Dashboards e indicadores',/dashboard|indicadores|kpi|relat[oó]rios gerenciais/i,/dashboard|indicadores/i],
  ['Automação (n8n, RPA)',/n8n|automa[cç][aã]o de processos|\brpa\b|power automate|zapier|make\.com/i,/n8n|automa/i],
  ['Inteligência artificial',/intelig[eê]ncia artificial|\bia\b|machine learning|chatgpt|llm/i,/intelig[eê]ncia artificial|\bia\b/i],
  ['Suporte técnico e diagnóstico',/suporte t[eé]cnico|help.?desk|service desk|diagn[oó]stic|troubleshoot|incidentes/i,/suporte t[eé]cnico|diagn[oó]stico/i],
  ['Hardware e redes',/hardware|redes|infraestrutura|cabeamento|tcp\/ip/i,/hardware|redes/i],
  ['Atendimento ao cliente',/atendimento|relacionamento com (o )?cliente|\bsac\b|telemarketing|call center|customer/i,/atendimento|telemarketing|cliente/i],
  ['Estoque e inventário',/estoque|invent[aá]rio|almoxarifado|entrada e sa[ií]da/i,/estoque|invent[aá]rio/i],
  ['Logística',/log[ií]stic|expedi[cç][aã]o|suprimentos/i,/log[ií]stic|suprimentos/i],
  ['Rotinas administrativas',/rotinas administrativas|administrativ|emiss[aã]o de (notas|documentos)|arquivo|cadastro/i,/administrativ|cadastro|documentos/i],
  ['Vendas e metas',/vendas|metas comerciais/i,/vendas/i],
  ['CRM',/\bcrm\b|salesforce|hubspot/i,/\bcrm\b/i],
  ['ERP / SAP',/\berp\b|\bsap\b|totvs|protheus/i,/\berp\b|\bsap\b|totvs/i],
  ['ITIL',/\bitil\b/i,/\bitil\b/i],
  ['Linux',/linux/i,/linux/i],
  ['Inglês',/ingl[eê]s|english/i,/ingl[eê]s/i],
  ['Espanhol',/espanhol/i,/espanhol/i],
  ['CNH',/\bcnh\b|carteira de habilita[cç][aã]o/i,/categoria|cnh|a\/b/i],
];

function profileText(profile){
  if(!profile)return '';
  const parts=[profile.summary,profile.skillsTech,profile.skillsOther,profile.license];
  for(const list of ['academic','technical','experiences','courses','projects','languages'])for(const e of profile[list]||[])parts.push(e.title,e.detail,e.company,e.description,e.category);
  return parts.filter(Boolean).join(' \n ');
}
function whereInProfile(profile,pattern){
  for(const e of profile?.experiences||[])if(pattern.test(`${e.title} ${e.description}`))return `experiência como ${e.title} (${e.company}${e.period?`, ${e.period}`:''})`;
  for(const e of profile?.courses||[])if(pattern.test(`${e.title} ${e.detail}`))return `curso ${e.title}`;
  for(const e of profile?.technical||[])if(pattern.test(`${e.title} ${e.detail}`))return `curso técnico ${e.title}`;
  for(const e of profile?.projects||[])if(pattern.test(`${e.title} ${e.description}`))return `projeto ${e.title}`;
  for(const e of profile?.languages||[])if(pattern.test(`${e.title} ${e.detail}`))return `idioma ${e.title}${e.detail?` (${e.detail})`:''}`;
  if(pattern.test(`${profile?.skillsTech||''} ${profile?.skillsOther||''}`))return 'competências do perfil';
  if(pattern.test(profile?.license||''))return `CNH ${profile.license}`;
  if(pattern.test(profile?.summary||''))return 'resumo profissional';
  return null;
}
const domains=[
  [/suporte|help.?desk|service desk|t[eé]cnico de inform|\bti\b|sistemas/i,/suporte t[eé]cnico|diagn[oó]stico|hardware|telemarketing|help.?desk/i],
  [/atendimento|atendente|sac|relacionamento|telemarketing|recepcion/i,/atendimento|telemarketing|cliente/i],
  [/estoque|estoquista|almoxarif|log[ií]stic|expedi|conferente|dep[oó]sito/i,/estoque|invent[aá]rio|log[ií]stic/i],
  [/administrativ|escrit[oó]rio|back.?office|secret[aá]ri|cadastro|faturamento/i,/administrativ|cadastro|documentos/i],
  [/produ[cç][aã]o|oper(ador|a[cç][oõ]es)|industria/i,/produ[cç][aã]o|linha produtiva/i],
  [/dados|\bbi\b|analytics|indicadores|relat[oó]rio/i,/dados|power bi|dashboard|indicadores/i],
];

const monthsPt={jan:0,fev:1,mar:2,abr:3,mai:4,jun:5,jul:6,ago:7,set:8,out:9,nov:10,dez:11};
function periodMonths(period){
  const text=String(period||'').toLowerCase();
  const dates=[...text.matchAll(/(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z.]*\s*(?:de\s*)?(\d{4})/g)].map(m=>Number(m[2])*12+monthsPt[m[1]]);
  const years=dates.length?[]:[...text.matchAll(/\b(19|20)\d{2}\b/g)].map(m=>Number(m[0])*12);
  const list=dates.length?dates:years;
  if(!list.length)return 0;
  const now=new Date();const end=/atual|presente|hoje/.test(text)?now.getFullYear()*12+now.getMonth():list[list.length-1];
  return Math.max(1,end-list[0]+1);
}
export function experienceMonths(profile){return (profile?.experiences||[]).reduce((sum,e)=>sum+periodMonths(e.period),0)}
export function matchProfile(job,profile,fit='boa'){
  const jobText=`${job.title} ${job.description||''}`;
  const pText=profileText(profile);
  const evidence=[],gaps=[];
  let met=0,asked=0;
  if(pText){
    // Experiências relacionadas à área da vaga.
    for(const [jobPattern,expPattern] of domains){
      if(!jobPattern.test(job.title))continue;
      for(const e of profile.experiences||[]){
        if(expPattern.test(`${e.title} ${e.description}`)){const line=`Experiência relacionada: ${e.title} — ${e.company}${e.period?` (${e.period})`:''}.`;if(!evidence.includes(line))evidence.push(line)}
      }
    }
    // Requisitos citados na vaga.
    for(const [label,jobPattern,profilePattern] of skills){
      if(!jobPattern.test(jobText))continue;
      asked++;
      const where=profilePattern.test(pText)?whereInProfile(profile,profilePattern):null;
      if(where){met++;evidence.push(`A vaga cita ${label}; consta no seu currículo (${where}).`)}
      else gaps.push(`A vaga cita ${label}, que não aparece no seu currículo.`);
    }
    // Escolaridade.
    const studying=(profile.academic||[]).some(a=>/andamento|cursando/i.test(`${a.title} ${a.detail}`)&&/superior|gradua|tecn[oó]logo|an[aá]lise e desenvolvimento/i.test(a.title));
    if(/superior completo|gradua[cç][aã]o completa|formado em/i.test(jobText)){asked++;gaps.push(studying?'Pede ensino superior completo; sua graduação em ADS está em andamento.':'Pede ensino superior completo; confira sua formação.')}
    else if(/cursando|ensino superior|gradua[cç][aã]o|est[aá]gi/i.test(jobText)&&studying){asked++;met++;evidence.push('Você cursa Análise e Desenvolvimento de Sistemas (em andamento).')}
    if(/t[eé]cnico em inform[aá]tica|curso t[eé]cnico/i.test(jobText)){asked++;const tech=(profile.technical||[]).map(t=>t.title).join(', ');if(tech&&/inform[aá]tica/i.test(tech)){met++}else gaps.push(`Pede curso técnico${/inform/i.test(jobText)?' em informática':''}; seu curso técnico registrado é ${tech||'nenhum'}.`)}
  }
  const years=/experi[eê]ncia (?:m[ií]nima )?(?:de |comprovada de |comprovada m[ií]nima de )?(\d+)\s*(anos?|meses)/i.exec(jobText);
  if(years&&pText){
    asked++;
    const need=Number(years[1])*(/ano/i.test(years[2])?12:1);const have=experienceMonths(profile);
    if(have>=need){met++;evidence.push(`Pede ${years[1]} ${years[2]} de experiência; seu currículo soma cerca de ${String(Math.round(have/12*10)/10).replace('.',',')} anos de experiência profissional.`)}
    else gaps.push(`Pede ${years[1]} ${years[2]} de experiência; seu currículo soma cerca de ${have} meses.`);
  }else if(years)gaps.push(`Pede ${years[1]} ${years[2]} de experiência; compare com os períodos do seu currículo.`);
  if(pText&&/ensino m[eé]dio completo/i.test(jobText)){asked++;if((profile.academic||[]).some(a=>/m[eé]dio/i.test(a.title)&&!/incompleto|cursando/i.test(`${a.title} ${a.detail}`))||(profile.academic||[]).some(a=>/gradua|superior|tecn[oó]logo/i.test(a.title))){met++}else gaps.push('Pede ensino médio completo; confira sua formação.')}
  if(job.language!=='pt'&&job.language!==undefined)gaps.push('Descrição em outro idioma; confirme o nível de inglês exigido e se aceita pessoas no Brasil.');
  if(!job.language&&/\b(the|you|we|our|responsibilities|requirements)\b/i.test(job.description||''))gaps.push('Descrição em inglês; confirme o idioma exigido e se aceita pessoas no Brasil.');
  if(!evidence.length)evidence.push(fit==='boa'?'O cargo está entre as áreas que você escolheu; o anúncio não detalha requisitos que permitam comparar com o currículo.':'Área próxima da sua experiência; confira se faz sentido para você.');
  const score=Math.max(20,Math.min(96,(fit==='boa'?55:38)+met*7-Math.max(0,asked-met)*4+(evidence.length>1?4:0)));
  const summary=asked?`${met} de ${asked} requisitos citados constam no seu currículo`:null;
  const ratio=asked?met/asked:null;
  return {score,evidence:evidence.slice(0,7),gaps:gaps.slice(0,7),reqMet:met,reqAsked:asked,matchRatio:ratio,matchSummary:summary};
}
export {profileText};
