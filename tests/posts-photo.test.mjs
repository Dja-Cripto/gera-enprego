import test from 'node:test';
import assert from 'node:assert/strict';
import {choosePostPhoto,nextSlots} from '../posts.mjs';

test('novos lotes encontram horários mesmo depois de três semanas ocupadas',()=>{
  const voice={days:['1'],time:'08:30'};
  const from=new Date('2026-09-30T15:00:00Z');
  const taken=nextSlots(voice,[],10,from);
  const next=nextSlots(voice,taken,3,from);
  assert.equal(next.length,3);
  assert.ok(next.every(slot=>!taken.includes(slot)));
  assert.ok(Date.parse(next[0])>Date.parse(taken.at(-1)));
});

test('associa uma foto do Pixabay ao post gerado sem aprová-lo',async()=>{
  let searched='';
  const http={cached:async(_key,load)=>load(),fetchJson:async url=>{searched=new URL(url).searchParams.get('q');return {hits:[{id:12,tags:'programação, escritório',webformatURL:'https://pixabay.com/thumb.jpg',largeImageURL:'https://pixabay.com/large.jpg',pageURL:'https://pixabay.com/photos/12',user:'Fotógrafo'}]}}};
  const post={status:'draft',pillar:'prova',image:{kind:'card',photoQuery:'software development computer'}};
  const changed=await choosePostPhoto(post,'12345-abcdef0123456789abcdef',http);
  assert.equal(changed,true);
  assert.equal(searched,'software development computer');
  assert.equal(post.status,'draft');
  assert.equal(post.image.kind,'photo');
  assert.equal(post.image.chosen.provider,'Pixabay');
  assert.equal(post.image.chosen.large,'https://pixabay.com/large.jpg');
});

test('não substitui uma imagem já escolhida pelo usuário',async()=>{
  const post={status:'draft',pillar:'dica',image:{kind:'photo',chosen:{id:3}}};
  assert.equal(await choosePostPhoto(post,'12345-abcdef0123456789abcdef',{}),false);
  assert.equal(post.image.chosen.id,3);
});

test('evita repetir uma foto usada em outro post da mesma semana',async()=>{
  const http={cached:async(_key,load)=>load(),fetchJson:async()=>({hits:[
    {id:10,tags:'primeira',webformatURL:'https://pixabay.com/1-thumb.jpg',largeImageURL:'https://pixabay.com/1.jpg',pageURL:'https://pixabay.com/photos/1',user:'A'},
    {id:11,tags:'segunda',webformatURL:'https://pixabay.com/2-thumb.jpg',largeImageURL:'https://pixabay.com/2.jpg',pageURL:'https://pixabay.com/photos/2',user:'B'}
  ]})};
  const post={id:'novo',status:'draft',pillar:'historia',scheduledFor:'2026-10-07T11:30:00.000Z',image:{kind:'card'}};
  const otherPosts=[{id:'anterior',status:'draft',scheduledFor:'2026-10-06T11:30:00.000Z',image:{chosen:{id:10,provider:'Pixabay'}}}];
  assert.equal(await choosePostPhoto(post,'12345-abcdef0123456789abcdef',http,{otherPosts}),true);
  assert.equal(post.image.chosen.id,11);
});
