import test from 'node:test';
import assert from 'node:assert/strict';
import {choosePillars,planWeek,DEFAULT_VOICE} from '../posts.mjs';
test('sequência fixa mantém informação, emprego e projeto em cada lote',()=>{
 assert.deepEqual(choosePillars(DEFAULT_VOICE,6,null),['dica','emprego','prova','dica','emprego','prova']);
});
test('geração preserva entrevista original, orientação e projeto escolhido',async()=>{
 const original=globalThis.fetch;const requests=[];
 globalThis.fetch=async(_url,opts)=>{requests.push(JSON.parse(opts.body));return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({posts:JSON.parse(JSON.parse(opts.body).messages[1].content).map(()=>({text:'Um projeto antigo me ensinou muito.',hook:'Aprendizado',image:{kind:'card',cardLines:[]},factsUsed:[]}))})}}]}))};
 try{
 const state={profile:{name:'Daniel'},posts:{voice:{...DEFAULT_VOICE},items:[],diary:[],interview:{projeto:'Projeto de 2022, concluído, mas não vingou comercialmente.'},stories:[{id:'old',title:'Projeto antigo',pillar:'prova',facts:['Concluído'],angle:'Aprendizado',used:0}]}};
 const r=await planWeek({key:'test',baseUrl:'https://example.test',model:'test'},state,{count:1,manual:true,topics:[{pillar:'emprego',instruction:'Busco vaga remota'}]});
 assert.equal(r.created.length,1);assert.equal(r.created[0].status,'draft');assert.equal(r.created[0].pillar,'chamada');
 const prompt=JSON.parse(requests[0].messages[1].content).map(p=>p.system+p.user).join('\n');assert.match(prompt,/não vingou comercialmente/);assert.match(prompt,/Busco vaga remota/);assert.match(prompt,/conseguir uma vaga de emprego/);assert.match(prompt,/Projeto antigo deve ser narrado no passado/);
 const project=await planWeek({key:'test',baseUrl:'https://example.test',model:'test'},state,{count:1,manual:true,topics:[{pillar:'prova',storyId:'old',instruction:'Contar no passado'}]});assert.equal(project.created[0].storyId,'old');
 const before=requests.length;const batch=await planWeek({key:'test',baseUrl:'https://example.test',model:'test'},state,{count:3,manual:true});assert.equal(batch.created.length,3);assert.equal(requests.length-before,1);
 }finally{globalThis.fetch=original}
});
