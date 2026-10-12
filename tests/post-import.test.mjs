import test from 'node:test';
import assert from 'node:assert/strict';
import {describeImport,safeImportPath,unzipPosts} from '../post-import.mjs';
import {publishTelegram} from '../telegram.mjs';
import {publishMemberPost} from '../linkedin.mjs';
test('LEIA-ME define ordem e mantém as três imagens na ordem indicada',()=>{
 const files=[{path:'pacote/LEIA-ME.md',text:'| 1 | [Texto](posts/02-teste.txt) | [A](midias/02-b.jpg), [B](midias/02-a.jpg) |\n| 2 | [Texto](posts/01-teste.txt) | [C](midias/01-a.jpg) |'},{path:'pacote/posts/01-teste.txt',text:'Texto 1\n\n#Hashtag'},{path:'pacote/posts/02-teste.txt',text:'Texto 2'},{path:'pacote/midias/01-a.jpg'},{path:'pacote/midias/02-a.jpg'},{path:'pacote/midias/02-b.jpg'}];const p=describeImport(files);assert.equal(p[0].text,'Texto 2');assert.deepEqual(p[0].media,['pacote/midias/02-b.jpg','pacote/midias/02-a.jpg']);assert.equal(p[1].text,'Texto 1\n\n#Hashtag');assert.throws(()=>safeImportPath('../segredo'));assert.throws(()=>unzipPosts(Buffer.alloc(30)));
});
test('Telegram envia álbum e preserva texto longo sem truncar',async()=>{
 const calls=[],record=[];const fetcher=async(url,opts)=>{calls.push({url,opts});return new Response(JSON.stringify({ok:true,result:calls.length===1?[{message_id:1},{message_id:2}]:{message_id:3}}))};const text='Texto original '.repeat(100);const r=await publishTelegram({token:'123456:'+ 'a'.repeat(30),chatId:'@teste',text,media:[{bytes:Buffer.from('a'),mime:'image/jpeg'},{bytes:Buffer.from('b'),mime:'image/jpeg'}],fetcher,onSent:ids=>record.push([...ids])});assert.equal(calls.length,2);assert.ok(calls[0].url.endsWith('/sendMediaGroup'));assert.equal(JSON.parse(calls[1].opts.body).text,text);assert.deepEqual(r.messageIds,[1,2,3]);assert.deepEqual(record[0],[1,2]);
});
test('LinkedIn anexa todas as imagens importadas na ordem',async()=>{
 let asset=0,payload;const fetcher=async(url,opts)=>{if(String(url).includes('registerUpload'))return new Response(JSON.stringify({value:{asset:'urn:li:asset:'+ ++asset,uploadMechanism:{'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest':{uploadUrl:'https://api.linkedin.com/upload'}}}}));if(opts.method==='PUT')return new Response('');payload=JSON.parse(opts.body);return new Response('',{headers:{'x-restli-id':'urn:li:share:1'}})};await publishMemberPost({token:'test',sub:'abc',text:'Original',images:[{bytes:Buffer.from('a'),mime:'image/jpeg'},{bytes:Buffer.from('b'),mime:'image/jpeg'}],fetcher});assert.equal(payload.specificContent['com.linkedin.ugc.ShareContent'].media.length,2);assert.equal(payload.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text,'Original');
});
