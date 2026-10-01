import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {authorizationUrl,exchangeCode,memberInfo,publishMemberPost,sealToken,openToken} from '../linkedin.mjs';

test('OAuth usa autorização oficial, escopos mínimos e retorno exato',()=>{
  const u=new URL(authorizationUrl({clientId:'abc123',redirectUri:'https://app-radar.setupdja.website/api/linkedin/callback',state:'aleatorio'}));
  assert.equal(u.hostname,'www.linkedin.com');assert.equal(u.searchParams.get('state'),'aleatorio');
  assert.equal(u.searchParams.get('scope'),'openid profile w_member_social');
  assert.equal(u.searchParams.get('redirect_uri'),'https://app-radar.setupdja.website/api/linkedin/callback');
});

test('troca código e lê identidade sem revelar credenciais',async()=>{
  const calls=[];const fetcher=async(url,options)=>{calls.push({url,options});return new Response(url.includes('accessToken')?JSON.stringify({access_token:'token',expires_in:3600}):JSON.stringify({sub:'782bbtaQ',name:'Daniel'}),{status:200})};
  const token=await exchangeCode({clientId:'abc123',clientSecret:'segredo123',redirectUri:'https://app-radar.setupdja.website/api/linkedin/callback',code:'codigo',fetcher});
  const info=await memberInfo(token.access_token,{fetcher});
  assert.equal(info.sub,'782bbtaQ');assert.equal(calls[0].options.body.get('redirect_uri'),'https://app-radar.setupdja.website/api/linkedin/callback');
  assert.equal(calls[1].options.headers.Authorization,'Bearer token');
});

test('publicação com imagem registra, envia e usa o ativo retornado',async()=>{
  const calls=[];const fetcher=async(url,options)=>{
    calls.push({url:String(url),options});
    if(String(url).includes('registerUpload'))return new Response(JSON.stringify({value:{asset:'urn:li:digitalmediaAsset:ABC',uploadMechanism:{'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest':{uploadUrl:'https://api.linkedin.com/mediaUpload/ABC',headers:{}}}}}),{status:200});
    if(String(url).includes('mediaUpload'))return new Response('',{status:201});
    return new Response('',{status:201,headers:{'x-restli-id':'urn:li:ugcPost:123'}});
  };
  const result=await publishMemberPost({token:'access',sub:'782bbtaQ',text:'Post aprovado',image:{bytes:Buffer.from('imagem'),mime:'image/png',alt:'Meu card'},fetcher});
  assert.equal(result.urn,'urn:li:ugcPost:123');assert.equal(calls.length,3);
  assert.equal(calls[1].options.method,'PUT');
  const payload=JSON.parse(calls[2].options.body);
  assert.equal(payload.author,'urn:li:person:782bbtaQ');
  assert.equal(payload.specificContent['com.linkedin.ugc.ShareContent'].media[0].media,'urn:li:digitalmediaAsset:ABC');
});

test('token é cifrado e alterações no arquivo são detectadas',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'radar-linkedin-'));
  try{const sealed=sealToken('access-token',dir);assert.equal(openToken(sealed,dir),'access-token');assert.doesNotMatch(sealed,/access-token/);assert.throws(()=>openToken(sealed.slice(0,-2)+'xx',dir))}
  finally{await rm(dir,{recursive:true,force:true})}
});
