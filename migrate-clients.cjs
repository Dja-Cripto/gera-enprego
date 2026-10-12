const fs=require('fs');let s=fs.readFileSync('server.mjs','utf8');const marker='function jobCatalogForSignals()';if(!s.includes('clientDraftVersion'))s=s.replace(marker,`// Atualiza os rascunhos existentes uma vez, sem tocar em conversas já iniciadas.
if(state.clientDraftVersion!==2){
  for(const l of Object.values(state.leads||{})){
    const c=state.campaigns.find(c=>c.id===l.campaignId);
    if(c&&l.status==='new'&&!l.contactedAt){l.messages=composeMessages(l,c,senderInfo());delete l.messagesEditedAt;}
  }
  state.clientDraftVersion=2;await persistState();
}
`+marker);fs.writeFileSync('server.mjs',s);
