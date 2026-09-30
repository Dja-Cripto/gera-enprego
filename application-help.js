const APPLICATION_HELP_KEY="radar-application-help-v1";
let applicationHelp={};
try{applicationHelp=JSON.parse(localStorage.getItem(APPLICATION_HELP_KEY))||{}}catch{}

function saveApplicationHelp(){localStorage.setItem(APPLICATION_HELP_KEY,JSON.stringify(applicationHelp))}
function applicationQuestions(text){return text.split(/\r?\n/).map(q=>q.replace(/^\s*(?:\d+[.)-]|[-•])\s*/,"").trim()).filter(Boolean).slice(0,30)}
function profileFact(list,pattern){return (Array.isArray(list)?list:[]).find(x=>pattern.test(`${x.title||""} ${x.description||""}`))}
function suggestedApplicationAnswer(question,item){
  const q=question.toLocaleLowerCase("pt-BR");
  const currentProfile=typeof profile!=="undefined"?profile:{};
  const education=profileFact(currentProfile.academic,/análise e desenvolvimento de sistemas|\bads\b/i);
  const support=profileFact(currentProfile.experiences,/suporte técnico|telemarketing|atento/i);
  const admin=profileFact(currentProfile.experiences,/administrativ/i);
  const dataProject=profileFact(currentProfile.projects,/dashboard|dados/i);
  if(/sal[aá]rio|remunera|pretens[aã]o salarial|disponibilidade|in[ií]cio|hor[aá]rio|viagem|mudan[cç]a|pcd|defici[eê]ncia|identifica|g[eê]nero|ra[cç]a|etnia|cpf|documento|endere[cç]o|idade|nascimento|eliminat[oó]ria/i.test(q))return {answer:"",review:"Resposta pessoal ou eliminatória: confirme seus dados e a condição atual antes de responder."};
  if(/cnh|habilita[cç][aã]o|dirigir/i.test(q))return {answer:currentProfile.license?`Meu perfil registra CNH ${currentProfile.license}. Confirme se a categoria e a validade continuam corretas.`:"",review:"Confirme a categoria e a validade da CNH antes de responder."};
  if(/por que|motiva[cç][aã]o|interesse|apresente.se|fale sobre voc[eê]|quem [eé] voc[eê]/i.test(q))return {answer:`Tenho interesse na vaga de ${item.title} porque ela se relaciona com minha trajetória em atendimento, organização de processos e tecnologia. ${education?`Estou cursando ${education.title}. `:""}${support?`Na ${support.company}, atuei com suporte técnico e orientação a clientes. `:""}Quero contribuir com essa experiência e continuar desenvolvendo minhas competências na área.`,review:"Revise se o motivo reflete seu interesse real na empresa e nesta vaga."};
  if(/suporte|atendimento|cliente|problema|incidente|chamado|sistema/i.test(q))return {answer:support?`Tenho experiência em atendimento e suporte técnico na ${support.company}. ${support.description}`:"",review:support?"Confirme se a pergunta exige uma ferramenta ou prazo específico que não consta no perfil.":"Não encontrei experiência suficiente no currículo para responder com segurança."};
  if(/dado|power bi|sql|excel|indicador|relat[oó]rio|dashboard/i.test(q))return {answer:`Tenho formação complementar em ${["Power BI","SQL","Excel"].filter(x=>(currentProfile.skillsTech||"").includes(x)).join(", ")}. ${dataProject?`Também desenvolvi o projeto ${dataProject.title}: ${dataProject.description}`:""}`.trim(),review:"Diferencie cursos e projetos de experiência profissional; informe o nível de domínio com precisão."};
  if(/forma[cç][aã]o|faculdade|gradua[cç][aã]o|curso t[eé]cnico|escolaridade/i.test(q))return {answer:`${education?`${education.title}, em andamento. `:""}${(currentProfile.technical||[]).map(x=>`Curso técnico em ${x.title}${x.detail?` (${x.detail})`:""}.`).join(" ")}`.trim(),review:"Confira a situação atual da graduação e as datas exigidas pelo formulário."};
  if(/experi[eê]ncia|trajet[oó]ria|trabalh|profissional/i.test(q))return {answer:`${support?`Atuei na ${support.company} com ${support.description.charAt(0).toLowerCase()+support.description.slice(1)} `:""}${admin?`Também trabalhei na área administrativa, com ${admin.description.charAt(0).toLowerCase()+admin.description.slice(1)}`:""}`.trim(),review:"Ajuste o foco para o requisito exato da pergunta e não acrescente resultados não comprovados."};
  if(/ponto forte|qualidade|compet[eê]ncia|habilidade/i.test(q))return {answer:"Minha experiência em atendimento técnico me ajudou a desenvolver comunicação com clientes e investigação de problemas. Também tenho prática com organização de processos e sigo estudando dados e automação.",review:"Escolha apenas competências que você consiga exemplificar em uma entrevista."};
  return {answer:"",review:"Não há informação suficiente para sugerir uma resposta segura. Escreva sua resposta e revise antes de enviar."};
}
function renderApplicationHelp(item){
  const entry=applicationHelp[item.id]||{questions:"",answers:[]};
  const questions=applicationQuestions(entry.questions||"");
  return `<section class="application-help" aria-labelledby="application-help-title"><div class="modal-label">AJUDA PARA A CANDIDATURA</div><h3 id="application-help-title">Responder perguntas da vaga</h3><p class="helper">${item.source==='Greenhouse'?'Você pode consultar as perguntas públicas desta vaga. ':'Abra o formulário da vaga e cole aqui cada pergunta em uma linha. '}As sugestões usam seu currículo cadastrado neste navegador. Nenhuma resposta é enviada à empresa por este painel.</p>${item.source==='Greenhouse'?`<button class="button button-outline" type="button" data-application-action="load-public-questions" data-id="${escapeHtml(item.id)}">Consultar perguntas da vaga</button>`:''}<label for="application-questions">Perguntas que apareceram na candidatura</label><textarea id="application-questions" rows="5" placeholder="Ex.: Por que você tem interesse nesta vaga?&#10;Você tem experiência com atendimento ao cliente?">${escapeHtml(entry.questions||"")}</textarea><div class="modal-actions"><button class="button" type="button" data-application-action="prepare" data-id="${escapeHtml(item.id)}">Preparar respostas</button><button class="button button-outline" type="button" data-application-action="save" data-id="${escapeHtml(item.id)}">Salvar perguntas</button></div><div id="application-answers">${questions.map((q,index)=>renderApplicationAnswer(item,entry,q,index)).join("")}</div></section>`;
}
function renderApplicationAnswer(item,entry,question,index){
  const stored=entry.answers?.[index];
  const suggestion=stored&&stored.question===question?stored:suggestedApplicationAnswer(question,item);
  return `<div class="application-answer"><div class="application-question"><span>${index+1}</span><strong>${escapeHtml(question)}</strong></div><label for="application-answer-${index}">Resposta para revisar</label><textarea id="application-answer-${index}" data-application-answer="${index}" rows="4" placeholder="Escreva sua resposta após conferir os fatos">${escapeHtml(suggestion.answer||"")}</textarea><p class="application-review">${escapeHtml(suggestion.review||"Revise antes de usar.")}</p><button class="button button-outline" type="button" data-application-action="copy" data-index="${index}" data-id="${escapeHtml(item.id)}">Copiar resposta</button></div>`;
}
function saveApplicationForm(id){
  const questionsText=document.querySelector("#application-questions")?.value||"";
  const questions=applicationQuestions(questionsText);
  const answers=questions.map((question,index)=>{
    const previous=applicationHelp[id]?.answers?.[index];
    return {question,answer:previous?.question===question?document.querySelector(`[data-application-answer="${index}"]`)?.value||"":"",review:previous?.question===question?previous.review:"Revise antes de usar."};
  });
  applicationHelp[id]={questions:questionsText,answers,updatedAt:new Date().toISOString()};
  saveApplicationHelp();
  return applicationHelp[id];
}
document.addEventListener("click",async event=>{
  const button=event.target.closest("[data-application-action]");if(!button)return;
  const {applicationAction:action,id,index}=button.dataset;
  if(action==='load-public-questions'){
    button.disabled=true;button.textContent='Consultando...';
    try{
      const response=await fetch(`/api/jobs/questions?id=${encodeURIComponent(id)}`);
      if(!response.ok)throw Error(`HTTP ${response.status}`);
      const data=await response.json();
      const field=document.querySelector('#application-questions');
      const existing=applicationQuestions(field.value);
      const added=(data.questions||[]).filter(q=>!existing.includes(q));
      if(!added.length){showToast('Nenhuma pergunta adicional pública encontrada para esta vaga.');return}
      field.value=[...existing,...added].join('\n');
      showToast(`${added.length} perguntas carregadas. Prepare e revise as respostas.`);
    }catch{showToast('Não foi possível consultar as perguntas. Abra a vaga e cole as perguntas aqui.')}
    finally{button.disabled=false;button.textContent='Consultar perguntas da vaga'}
  }
  if(action==="prepare"){
    const item=items.find(x=>x.id===id);if(!item)return;
    const questionsText=document.querySelector("#application-questions").value;
    const questions=applicationQuestions(questionsText);
    if(!questions.length){showToast("Cole pelo menos uma pergunta.");return}
    applicationHelp[id]={questions:questionsText,answers:questions.map(question=>({question,...suggestedApplicationAnswer(question,item)})),updatedAt:new Date().toISOString()};
    saveApplicationHelp();
    document.querySelector("#application-answers").innerHTML=questions.map((q,i)=>renderApplicationAnswer(item,applicationHelp[id],q,i)).join("");
    showToast("Respostas preparadas. Revise cada uma antes de usar.");
  }
  if(action==="save"){saveApplicationForm(id);showToast("Perguntas e respostas salvas neste navegador.")}
  if(action==="copy"){
    const answer=document.querySelector(`[data-application-answer="${index}"]`)?.value.trim();
    if(!answer){showToast("Escreva e revise a resposta antes de copiar.");return}
    saveApplicationForm(id);
    try{await navigator.clipboard.writeText(answer);showToast("Resposta copiada. Confira antes de enviar.")}catch{showToast("Não foi possível copiar automaticamente. Selecione o texto da resposta.")}
  }
});
