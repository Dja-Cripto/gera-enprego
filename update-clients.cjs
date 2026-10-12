const fs=require('fs');
let l=fs.readFileSync('leads.mjs','utf8');
const a=l.indexOf('  const email=[formal?'),b=l.indexOf('\n  return {whatsapp',a);
if(a<0||b<0)throw Error('email block missing');
l=l.slice(0,a)+`  const sectorExamples={contabilidade:'organização de documentos dos clientes, conferência de informações e atualização de planilhas',imobiliaria:'organização de contatos interessados em imóveis, acompanhamento de propostas e atualização de cadastros',distribuidora:'consolidação de pedidos, atualização de estoque e geração de relatórios',clinica:'organização de agendamentos e rotinas administrativas',restaurante:'organização de pedidos e controle de informações de vendas'};
  const examples=sectorExamples[lead.niche]||fill('{docs}',niche);
  const context=hiring?reason:'';
  const email=[formal?\`Olá, equipe da \${company},\`:\`Olá, pessoal da \${company},\`,'',intro,'',context,context?'':'',\`Para a \${company}, gostaria de avaliar se faz sentido automatizar rotinas como \${examples}. São possibilidades para conversarmos; a solução depende de como vocês trabalham hoje.\`,'',\`Desenvolvo automações sob medida para conectar ferramentas, organizar informações e reduzir tarefas manuais. Qual rotina mais toma tempo da equipe atualmente?\`,'',\`Também trabalho com design e criação de anúncios.\`,sender?.site?\`Para conhecer meus projetos e outras formas de contato, acesse meu portfólio: \${sender.site}\`:'Se quiser conhecer meus projetos, posso compartilhar meu portfólio por e-mail.','',\`Se houver interesse, podemos conversar por aqui e avaliar uma solução para a \${company}.\`,'','Obrigado,',sig].filter((line,i,arr)=>line!==''||arr[i-1]!=='').join('\\n');
`+l.slice(b);
l=l.replace('},7*86400000);','},20*60*60*1000);');
l=l.replace("const toCheck=touched.filter(l=>l.website&&!l.siteCheckedAt).slice(0,15);","const toCheck=touched.filter(l=>l.website&&(!l.siteCheckedAt||(!l.email&&Date.now()-Date.parse(l.siteCheckedAt)>86400000))).slice(0,60);");
fs.writeFileSync('leads.mjs',l);
let s=fs.readFileSync('server.mjs','utf8');
s=s.replace('  c.updatedAt=new Date().toISOString();c.createdAt=prev.createdAt||c.updatedAt;','  c.autoSearch=d.autoSearch!==undefined?d.autoSearch!==false:prev.autoSearch!==false;\n  c.updatedAt=new Date().toISOString();c.createdAt=prev.createdAt||c.updatedAt;');
const marker='// Automação: planeja a semana sozinho';
s=s.replace(marker,`let clientsBusy=false;
async function clientsTick(){
  if(clientsBusy||!state.integrations?.serpapiKey)return;
  clientsBusy=true;
  try{
    for(const c of state.campaigns){
      if(c.autoSearch===false||c.lastAutoSearchDay===bahiaDay())continue;
      // A tentativa fica registrada antes da consulta para evitar repetição e consumo de cota.
      c.lastAutoSearchDay=bahiaDay();await persistState();
      try{await searchCampaign(c,{http:httpTools,keys:state.integrations,state,jobCatalog:jobCatalogForSignals(),sender:senderInfo()});}
      catch(e){c.lastStats={errors:[e.message]};}
      await persistState();
    }
  }finally{clientsBusy=false;}
}
`+marker);
s=s.replace('scheduleDaily();setInterval(postsTick','scheduleDaily();setInterval(()=>clientsTick().catch(e=>console.error("Busca de clientes:",e.message)),60000).unref();setTimeout(()=>clientsTick().catch(e=>console.error("Busca de clientes:",e.message)),45000).unref();setInterval(postsTick');
fs.writeFileSync('server.mjs',s);
let u=fs.readFileSync('leads-ui.js','utf8');
u=u.replace('<fieldset class="full porte" disabled>', '<label class="full"><span><input type="checkbox" name="autoSearch"'+"${c.autoSearch!==false?' checked':''}"+'> Buscar novos clientes todos os dias à meia-noite (horário da Bahia)</span><small>Prepara contatos e mensagens. O envio depende da sua aprovação.</small></label><fieldset class="full porte" disabled>');
u=u.replace('return {name:fd.get("name"),offerSummary:', 'return {autoSearch:fd.has("autoSearch"),name:fd.get("name"),offerSummary:');
fs.writeFileSync('leads-ui.js',u);
