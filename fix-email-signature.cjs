const fs=require('fs');let l=fs.readFileSync('leads.mjs','utf8');l=l.replace("const sig=[sender?.name||me,sender?.title||'',sender?.phone?`WhatsApp: ${sender.phone}`:'',sender?.site||''].filter(Boolean).join('\\n');","const sig=[sender?.name||me,sender?.title||''].filter(Boolean).join('\\n');");l+=`
// HTML seguro para o e-mail, com links HTTP(S) clicáveis.
export function prospectEmailHtml(text){
  const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const parts=String(text).split(/(https?:\\/\\/[^\\s<>]+)/g);
  const body=parts.map(p=>/^https?:\\/\\//.test(p)?\`<a href="\${escape(p)}" style="color:#176050;text-decoration:underline">\${escape(p)}</a>\`:escape(p)).join('').replace(/\\n/g,'<br>');
  return \`<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.65;color:#203833">\${body}</div>\`;
}
`;fs.writeFileSync('leads.mjs',l);
let s=fs.readFileSync('server.mjs','utf8');s=s.replace('searchCampaign,composeMessages,scoreLead','searchCampaign,composeMessages,prospectEmailHtml,scoreLead');s=s.replace('to:l.email,subject,text});','to:l.email,subject,text,html:prospectEmailHtml(text)});');const marker='function jobCatalogForSignals()';s=s.replace(marker,`if(state.clientEmailSignatureVersion!==1){
  for(const l of Object.values(state.leads||{}))if(l.status==='new'&&l.messages?.emailBody){
    l.messages.emailBody=l.messages.emailBody.split('\\n').filter(line=>!/^\\s*WhatsApp\\s*:/i.test(line)).join('\\n');
  }
  state.clientEmailSignatureVersion=1;await persistState();
}
`+marker);fs.writeFileSync('server.mjs',s);
