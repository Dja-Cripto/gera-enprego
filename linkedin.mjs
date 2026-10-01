// Integração oficial Share on LinkedIn (OAuth 2.0 + publicações de membros).
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

export const LINKEDIN_CALLBACK='/api/linkedin/callback';
const API='https://api.linkedin.com';

export function authorizationUrl({clientId,redirectUri,state}){
  const url=new URL('https://www.linkedin.com/oauth/v2/authorization');
  for(const [key,value] of Object.entries({response_type:'code',client_id:clientId,redirect_uri:redirectUri,state,scope:'openid profile w_member_social'}))url.searchParams.set(key,value);
  return url.href;
}

async function linkedinRequest(url,{method='GET',token,body,headers={},timeout=20000,fetcher=fetch}={}){
  const options={method,headers:{...(token?{Authorization:`Bearer ${token}`}:{ }),...headers},signal:AbortSignal.timeout(timeout)};
  if(body!==undefined){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body)}
  const response=await fetcher(url,options);
  const raw=await response.text();let parsed={};try{parsed=JSON.parse(raw)}catch{}
  if(!response.ok){const detail=String(parsed.message||parsed.error_description||parsed.error||'').slice(0,180);throw Error(`LinkedIn respondeu ${response.status}${detail?`: ${detail}`:''}`)}
  return {data:parsed,response};
}

export async function exchangeCode({clientId,clientSecret,redirectUri,code,fetcher=fetch}){
  const body=new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:redirectUri,client_id:clientId,client_secret:clientSecret});
  const response=await fetcher('https://www.linkedin.com/oauth/v2/accessToken',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(20000)});
  const data=await response.json();
  if(!response.ok||!data.access_token)throw Error(`Não foi possível concluir a autorização do LinkedIn (${response.status}). Confira os produtos e o endereço de retorno do aplicativo.`);
  return data;
}

export async function memberInfo(token,{fetcher=fetch}={}){
  const {data}=await linkedinRequest(`${API}/v2/userinfo`,{token,fetcher});
  if(!/^[A-Za-z0-9_-]{3,100}$/.test(String(data.sub||'')))throw Error('O LinkedIn não informou o identificador da conta. Ative Sign In with LinkedIn using OpenID Connect no aplicativo.');
  return {sub:data.sub,name:String(data.name||'Conta do LinkedIn').slice(0,160),picture:String(data.picture||'').slice(0,500)};
}

export async function publishMemberPost({token,sub,text,image=null,fetcher=fetch}){
  const author=`urn:li:person:${sub}`;
  if(!String(text||'').trim())throw Error('O post está vazio.');
  let media=null;
  if(image){
    if(!Buffer.isBuffer(image.bytes)||!image.bytes.length||image.bytes.length>10*1024*1024)throw Error('Imagem inválida ou maior que 10 MB.');
    if(!['image/jpeg','image/png'].includes(image.mime))throw Error('Use uma imagem PNG ou JPEG.');
    const {data}=await linkedinRequest(`${API}/v2/assets?action=registerUpload`,{method:'POST',token,body:{registerUploadRequest:{recipes:['urn:li:digitalmediaRecipe:feedshare-image'],owner:author,serviceRelationships:[{relationshipType:'OWNER',identifier:'urn:li:userGeneratedContent'}]}},headers:{'X-Restli-Protocol-Version':'2.0.0'},fetcher});
    const upload=data.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'];
    const uploadUrl=new URL(upload?.uploadUrl||'');
    if(uploadUrl.protocol!=='https:'||!['api.linkedin.com','www.linkedin.com'].includes(uploadUrl.hostname)||!data.value?.asset)throw Error('O LinkedIn não forneceu um destino seguro para a imagem.');
    const response=await fetcher(uploadUrl,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':image.mime,...(upload.headers||{})},body:image.bytes,signal:AbortSignal.timeout(60000)});
    if(!response.ok)throw Error(`O LinkedIn recusou a imagem (${response.status}).`);
    media={status:'READY',media:data.value.asset,description:{text:String(image.alt||'Imagem do post').slice(0,200)}};
  }
  const content={shareCommentary:{text:String(text).trim()},shareMediaCategory:media?'IMAGE':'NONE'};
  if(media)content.media=[media];
  const {response}=await linkedinRequest(`${API}/v2/ugcPosts`,{method:'POST',token,headers:{'X-Restli-Protocol-Version':'2.0.0'},body:{author,lifecycleState:'PUBLISHED',specificContent:{'com.linkedin.ugc.ShareContent':content},visibility:{'com.linkedin.ugc.MemberNetworkVisibility':'PUBLIC'}},fetcher});
  const urn=response.headers.get('x-restli-id');
  if(!urn)throw Error('O LinkedIn aceitou o post, mas não devolveu o identificador. Confira seu perfil antes de tentar novamente.');
  return {urn,url:`https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}/`};
}

function tokenKey(dataDir){
  const file=join(dataDir,'.radar-linkedin-key');
  try{return Buffer.from(readFileSync(file,'utf8').trim(),'hex')}
  catch(e){if(e.code!=='ENOENT')throw e;const key=randomBytes(32);try{writeFileSync(file,key.toString('hex'),{flag:'wx',mode:0o600});return key}catch(err){if(err.code==='EEXIST')return Buffer.from(readFileSync(file,'utf8').trim(),'hex');throw err}}
}
export function sealToken(token,dataDir){const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',tokenKey(dataDir),iv);const encrypted=Buffer.concat([cipher.update(String(token),'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),encrypted].map(x=>x.toString('base64url')).join('.')} 
export function openToken(value,dataDir){const [a,b,c]=String(value||'').split('.');if(!a||!b||!c)throw Error('Autorização inválida. Conecte o LinkedIn novamente.');const decipher=createDecipheriv('aes-256-gcm',tokenKey(dataDir),Buffer.from(a,'base64url'));decipher.setAuthTag(Buffer.from(b,'base64url'));return Buffer.concat([decipher.update(Buffer.from(c,'base64url')),decipher.final()]).toString('utf8')}
