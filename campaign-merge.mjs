import fs from 'node:fs';
const file='/data/.radar-jobs-state.json';
const state=JSON.parse(fs.readFileSync(file,'utf8'));
const prepared=JSON.parse(fs.readFileSync('/data/.radar-campaign-prepared.json','utf8'));
fs.copyFileSync(file,'/data/.radar-state-before-campaign.json');
state.campaigns||=[];
const i=state.campaigns.findIndex(c=>c.id===prepared.campaign.id);
if(i>=0)state.campaigns[i]=prepared.campaign;else state.campaigns.push(prepared.campaign);
state.leads||={};
for(const lead of prepared.leads){if(!lead.email||['contato@compania.com','usuario@exemplo.com','atendimento@consortimobiliaria.com'].includes(lead.email))continue;lead.emailSourceUrl||=lead.website;if(state.leadBlocks?.ids?.[lead.id])continue;state.leads[lead.id]=state.leads[lead.id]||lead;}
state.apiCache={...state.apiCache,...prepared.apiCache};
fs.writeFileSync(file+'.campaign-tmp',JSON.stringify(state));fs.renameSync(file+'.campaign-tmp',file);
console.log(JSON.stringify({campaign:prepared.campaign.name,ready:Object.values(state.leads).filter(l=>l.campaignId===prepared.campaign.id&&l.email).length}));

