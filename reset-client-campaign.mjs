import fs from 'node:fs';
const file='/data/.radar-jobs-state.json';
const s=JSON.parse(fs.readFileSync(file,'utf8'));
const oldId='camp-automacao-email-feira';
const old=s.campaigns.find(c=>c.id===oldId);
if(!old)throw Error('Campanha anterior não encontrada; nenhuma alteração realizada.');
const backup=`/data/.radar-before-reset-clients-${Date.now()}.json`;
fs.copyFileSync(file,backup);fs.chmodSync(backup,0o600);
const now=new Date().toISOString();
const day=new Date().toLocaleDateString('en-CA',{timeZone:'America/Bahia'});
const c={...old,id:`camp-automacao-email-${Date.now().toString(36)}`,name:'Automação para empresas · Nova prospecção por e-mail',niches:['contabilidade','distribuidora','imobiliaria','oficina'],pagesPerNiche:3,radiusKm:25,autoSearch:true,lastAutoSearchDay:day,createdAt:now,updatedAt:now};
delete c.lastSearchAt;delete c.lastStats;
s.campaigns=s.campaigns.filter(x=>x.id!==oldId);s.campaigns.push(c);
let removed=0;for(const [id,l] of Object.entries(s.leads||{}))if(l.campaignId===oldId&&l.status==='new'&&!l.contactedAt&&!l.emailSentAt){delete s.leads[id];removed++;}
let cacheRemoved=0;for(const key of Object.keys(s.apiCache||{}))if(key.startsWith('maps:')){delete s.apiCache[key];cacheRemoved++;}
fs.writeFileSync(file+'.reset-tmp',JSON.stringify(s));fs.renameSync(file+'.reset-tmp',file);
console.log(JSON.stringify({campaign:c.name,id:c.id,removed,cacheRemoved,initialClients:Object.values(s.leads||{}).filter(l=>l.campaignId===c.id).length,pagesPerNiche:c.pagesPerNiche,niches:c.niches,daily:c.autoSearch}));
