import fs from 'node:fs';
import {composeMessages} from '/app/leads.mjs';
const file='/data/.radar-jobs-state.json';
const s=JSON.parse(fs.readFileSync(file,'utf8'));
const backup=`/data/.radar-before-email-context-${Date.now()}.json`;
fs.copyFileSync(file,backup);fs.chmodSync(backup,0o600);
const k=s.integrations||{},p=s.profile||{};
const sender={name:k.senderName||p.name||'Daniel',title:k.senderTitle||'',site:k.senderSite||p.portfolio||''};
let updated=0,skipped=0;
for(const l of Object.values(s.leads||{})){
 const c=s.campaigns.find(c=>c.id===l.campaignId);
 if(!c||l.status!=='new'||l.contactedAt||l.emailSentAt){skipped++;continue;}
 const m=composeMessages(l,c,sender);
 l.messages={...l.messages,emailSubject:m.emailSubject,emailBody:m.emailBody};
 l.updatedAt=new Date().toISOString();updated++;
}
fs.writeFileSync(file+'.context-tmp',JSON.stringify(s));fs.renameSync(file+'.context-tmp',file);
console.log(JSON.stringify({updated,skipped,sent:0}));
