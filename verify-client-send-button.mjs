import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync('leads-ui.js','utf8');
const start=source.indexOf('function leadDetailHtml('),end=source.indexOf('\nfunction historyText',start);
const ctx={shortAddress:s=>s||'',LS:{email:{configured:true},niches:[]},escapeHtml:s=>String(s??''),safeUrl:s=>s||null,nicheLabel:s=>s,icon:()=>'',fmtDate:()=>'',scoreClass:()=>'',LEAD_STATUS:{new:'Para contatar'},section:(title,body)=>body};
vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
for(const email of [null,'contato@empresa.test']){const html=ctx.leadDetailHtml({id:'test',name:'Empresa',status:'new',email,messages:{emailBody:'Teste'}});assert(html.includes('data-lead-action="send-email"'));assert(!html.includes('data-id="test" disabled'));if(!email)assert(html.includes('Ainda não encontramos'));}
console.log('Botão presente com e sem e-mail; aviso de endereço ausente: OK.');

