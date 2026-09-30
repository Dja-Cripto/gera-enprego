// Camada de proteção do Radar: login com senha, sessões, bloqueio de tentativas e verificação por e-mail.
// - Senha guardada só como hash scrypt (com sal); nunca em texto.
// - Sessão em cookie HttpOnly + SameSite=Lax (+ Secure quando o acesso é por HTTPS); no servidor fica só o hash do token.
// - Bloqueio progressivo por IP depois de tentativas erradas.
// - Opcional: código de 6 dígitos por e-mail ao entrar de um computador novo.
// - Criar ou trocar a senha sem estar logado só é permitido no próprio computador (localhost) ou pelo definir-senha.bat.
import {scrypt as scryptCb,randomBytes,timingSafeEqual,createHash,randomInt} from 'node:crypto';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {statSync,readFileSync} from 'node:fs';
import {promisify} from 'node:util';

const scrypt=promisify(scryptCb);
const sha=t=>createHash('sha256').update(String(t)).digest('hex');
const HOUR=3600000,DAY=24*HOUR;
export const SESSION_COOKIE='radar_sessao',DEVICE_COOKIE='radar_aparelho';
export const MIN_PASSWORD=10;

export function parseCookies(req){const out={};for(const part of String(req.headers.cookie||'').split(';')){const i=part.indexOf('=');if(i>0)out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim())}return out}
// Cabeçalhos de IP podem ser enviados pelo próprio cliente. Para limitar tentativas,
// use somente o endereço da conexão recebido pelo servidor.
export function clientIp(req){return String(req.socket?.remoteAddress||'').trim()}
export function isHttps(req){return req.headers['x-forwarded-proto']==='https'||/https/.test(String(req.headers['cf-visitor']||''))||!!req.socket?.encrypted}
// "Local" = pedido feito no próprio computador do servidor, sem passar por túnel/proxy.
export function isLocal(req){const ip=String(req.socket?.remoteAddress||'');const host=String(req.headers.host||'').toLowerCase();return /^(127\.|::1$|::ffff:127\.)/.test(ip)&&/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)&&!req.headers['cf-connecting-ip']&&!req.headers['x-forwarded-for']&&!req.headers['cf-ray']}
function cookie(name,value,{maxAge,secure}){return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax${secure?'; Secure':''}${maxAge!=null?`; Max-Age=${Math.floor(maxAge/1000)}`:''}`}
async function hashPassword(password,salt=randomBytes(16).toString('hex')){const key=await scrypt(String(password).normalize('NFKC'),salt,64,{N:16384,r:8,p:1});return {salt,hash:key.toString('hex')}}
export function passwordProblem(p,username=''){
  p=String(p||'');
  if(p.length<MIN_PASSWORD)return `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`;
  if(username&&p.toLowerCase().includes(String(username).toLowerCase()))return 'A senha não pode conter o nome de usuário.';
  if(/^(.)\1+$/.test(p)||/^(0123456789|1234567890|abcdefghij|qwertyuiop)/i.test(p))return 'Essa senha é fácil demais de adivinhar.';
  if(!(/[a-zA-Z]/.test(p)&&/[^a-zA-Z]/.test(p)))return 'Misture letras com números ou símbolos.';
  return null;
}

export function createAuth({file,sendCode}){
  let data={user:null,sessions:{},devices:{},twoFactor:false,codes:{},events:[]};
  const attempts=new Map();// ip -> {fails, lockedUntil}
  async function load(){try{data={...data,...JSON.parse(await readFile(file,'utf8'))};mtime=statSync(file).mtimeMs}catch{}data.sessions||={};data.devices||={};data.codes||={};data.events||=[];prune()}
  let mtime=0;
  async function save(){const tmp=`${file}.tmp`;await writeFile(tmp,JSON.stringify(data),'utf8');await rename(tmp,file);try{mtime=statSync(file).mtimeMs}catch{}}
  // Se o arquivo mudou por fora (definir-senha.bat), recarrega: a nova senha vale na hora e as sessões antigas caem.
  function fresh(){try{const m=statSync(file).mtimeMs;if(m!==mtime){data={user:null,sessions:{},devices:{},twoFactor:false,codes:{},events:[],...JSON.parse(readFileSync(file,'utf8'))};mtime=m}}catch{}}
  function prune(){const now=Date.now();for(const [k,s] of Object.entries(data.sessions))if(s.expiresAt<now)delete data.sessions[k];for(const [k,d] of Object.entries(data.devices))if(d.expiresAt<now)delete data.devices[k];for(const [k,c] of Object.entries(data.codes))if(c.expiresAt<now)delete data.codes[k]}
  function log(event,req){data.events.push({at:new Date().toISOString(),event,ip:clientIp(req),ua:String(req.headers['user-agent']||'').slice(0,160)});data.events=data.events.slice(-200)}

  // ---------- Bloqueio por tentativas ----------
  function lockState(ip){const a=attempts.get(ip);if(!a)return null;if(a.lockedUntil&&a.lockedUntil>Date.now())return Math.ceil((a.lockedUntil-Date.now())/60000);return null}
  function fail(ip){const a=attempts.get(ip)||{fails:0};a.fails++;if(a.fails>=5){const level=Math.min(4,Math.floor((a.fails-5)/3));a.lockedUntil=Date.now()+[15,30,60,240,1440][level]*60000}attempts.set(ip,a);return a}
  function ok(ip){attempts.delete(ip)}

  // ---------- Sessões ----------
  function readSession(req){
    fresh();
    const token=parseCookies(req)[SESSION_COOKIE];if(!token)return null;
    const s=data.sessions[sha(token)];if(!s||s.expiresAt<Date.now())return null;
    const now=Date.now();if(now-(s.lastSeen||0)>5*60000){s.lastSeen=now;s.ip=clientIp(req);save().catch(()=>{})}
    return {...s,id:sha(token).slice(0,12)};
  }
  function newSession(req,res,remember){
    const token=randomBytes(32).toString('base64url');const ttl=remember?30*DAY:12*HOUR;
    data.sessions[sha(token)]={user:data.user.username,createdAt:Date.now(),lastSeen:Date.now(),expiresAt:Date.now()+ttl,remember:!!remember,ip:clientIp(req),ua:String(req.headers['user-agent']||'').slice(0,160)};
    const cookies=[cookie(SESSION_COOKIE,token,{maxAge:remember?ttl:null,secure:isHttps(req)})];
    return cookies;
  }
  function trustedDevice(req){const id=parseCookies(req)[DEVICE_COOKIE];const d=id&&data.devices[sha(id)];return !!(d&&d.expiresAt>Date.now())}
  function trustDevice(req){const id=randomBytes(24).toString('base64url');data.devices[sha(id)]={createdAt:Date.now(),expiresAt:Date.now()+30*DAY,ua:String(req.headers['user-agent']||'').slice(0,160)};return cookie(DEVICE_COOKIE,id,{maxAge:30*DAY,secure:isHttps(req)})}

  const api={
    load,
    hasUser:()=>(fresh(),!!data.user),
    session:readSession,
    status(req){const s=readSession(req);return {configured:!!data.user,loggedIn:!!s,user:s?.user||null,canSetup:!data.user&&isLocal(req),twoFactor:!!data.twoFactor,lockedMinutes:lockState(clientIp(req))}},
    async setup(req,{username,password}){
      if(data.user)return {status:409,body:{error:'O acesso já foi criado. Entre com o seu usuário e senha.'}};
      if(!isLocal(req))return {status:403,body:{error:'Por segurança, o primeiro acesso só pode ser criado no próprio computador do servidor (ou pelo arquivo definir-senha.bat).'}};
      return api.setPassword(username,password,req);
    },
    async setPassword(username,password,req){
      username=String(username||'').trim().toLowerCase();
      if(!/^[a-z0-9._-]{3,32}$/.test(username))return {status:400,body:{error:'Use um usuário de 3 a 32 letras, números, ponto, hífen ou sublinhado.'}};
      const problem=passwordProblem(password,username);if(problem)return {status:400,body:{error:problem}};
      const h=await hashPassword(password);data.user={username,...h,createdAt:data.user?.createdAt||new Date().toISOString(),changedAt:new Date().toISOString()};
      data.sessions={};// troca de senha derruba todas as sessões
      data.codes={};data.devices={};// códigos e aparelhos confiáveis antigos também perdem validade
      if(req)log('senha definida',req);await save();return {status:200,body:{ok:true}};
    },
    async login(req,{username,password,remember}){
      fresh();
      const ip=clientIp(req);const locked=lockState(ip);
      if(locked)return {status:429,body:{error:`Muitas tentativas. Tente de novo em ${locked} minuto${locked>1?'s':''}.`}};
      if(!data.user)return {status:409,body:{error:'O acesso ainda não foi criado.'}};
      const candidate=await hashPassword(password||'',data.user.salt);
      const sameUser=String(username||'').trim().toLowerCase()===data.user.username;
      const samePass=timingSafeEqual(Buffer.from(candidate.hash,'hex'),Buffer.from(data.user.hash,'hex'));
      if(!sameUser||!samePass){const a=fail(ip);log('senha errada',req);await save();await new Promise(r=>setTimeout(r,700));const left=Math.max(0,5-a.fails);return {status:401,body:{error:a.lockedUntil?`Muitas tentativas. Acesso bloqueado por ${lockState(ip)} minutos.`:`Usuário ou senha incorretos.${left&&left<=3?` Restam ${left} tentativa${left>1?'s':''}.`:''}`}}}
      ok(ip);
      if(data.twoFactor&&sendCode&&!trustedDevice(req)){
        const code=String(randomInt(0,1000000)).padStart(6,'0');const ticket=randomBytes(24).toString('base64url');
        data.codes[sha(ticket)]={code:sha(code),expiresAt:Date.now()+10*60000,tries:0,remember:!!remember};
        try{await sendCode(code,req)}catch(e){return {status:502,body:{error:`Não consegui enviar o código por e-mail: ${e.message}`}}}
        log('código enviado',req);await save();
        return {status:200,body:{needCode:true,ticket}};
      }
      const cookies=newSession(req,null,remember);log('entrou',req);await save();
      return {status:200,body:{ok:true},cookies};
    },
    async verify(req,{ticket,code,trust}){
      fresh();
      const ip=clientIp(req);const locked=lockState(ip);if(locked)return {status:429,body:{error:`Muitas tentativas. Tente de novo em ${locked} minutos.`}};
      const c=data.codes[sha(ticket||'')];
      if(!c||c.expiresAt<Date.now())return {status:400,body:{error:'O código expirou. Entre de novo para receber outro.',restart:true}};
      if(sha(String(code||'').replace(/\D/g,''))!==c.code){c.tries++;fail(ip);await save();if(c.tries>=5){delete data.codes[sha(ticket)];await save();return {status:400,body:{error:'Código errado várias vezes. Entre de novo.',restart:true}}}return {status:401,body:{error:'Código incorreto.'}}}
      delete data.codes[sha(ticket)];ok(ip);
      const cookies=newSession(req,null,c.remember);if(trust)cookies.push(trustDevice(req));log('entrou com código',req);await save();
      return {status:200,body:{ok:true},cookies};
    },
    async logout(req,{all}={}){
      const token=parseCookies(req)[SESSION_COOKIE];
      if(all){const keep=token&&data.sessions[sha(token)];data.sessions={};if(keep&&all==='others')data.sessions[sha(token)]=keep}
      else if(token)delete data.sessions[sha(token)];
      log(all?'saiu de todos':'saiu',req);await save();
      return all==='others'?[]:[cookie(SESSION_COOKIE,'',{maxAge:0,secure:isHttps(req)})];
    },
    async changePassword(req,{current,password}){
      const candidate=await hashPassword(current||'',data.user.salt);
      if(!timingSafeEqual(Buffer.from(candidate.hash,'hex'),Buffer.from(data.user.hash,'hex'))){fail(clientIp(req));return {status:401,body:{error:'A senha atual está incorreta.'}}}
      const r=await api.setPassword(data.user.username,password,req);if(r.status!==200)return r;
      const cookies=newSession(req,null,true);await save();return {status:200,body:{ok:true},cookies};
    },
    async setTwoFactor(on){data.twoFactor=!!on;if(!on)data.devices={};await save()},
    sessions(req){const mine=sha(parseCookies(req)[SESSION_COOKIE]||'');return Object.entries(data.sessions).map(([k,s])=>({current:k===mine,createdAt:new Date(s.createdAt).toISOString(),lastSeen:new Date(s.lastSeen).toISOString(),expiresAt:new Date(s.expiresAt).toISOString(),ip:s.ip,ua:s.ua,remember:s.remember})).sort((a,b)=>b.lastSeen.localeCompare(a.lastSeen))},
    events:()=>data.events.slice(-30).reverse(),
    twoFactor:()=>!!data.twoFactor,
  };
  return api;
}
