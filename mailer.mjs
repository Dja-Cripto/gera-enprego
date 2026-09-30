// Envio de e-mail por SMTP (Gmail com "senha de app"), sem dependências externas.
import tls from 'node:tls';
import net from 'node:net';
import {randomBytes} from 'node:crypto';

const b64=s=>Buffer.from(String(s),'utf8').toString('base64');
const encodeHeader=s=>/^[\x20-\x7e]*$/.test(s)?s:`=?UTF-8?B?${b64(s)}?=`;
const wrap76=s=>s.replace(/.{1,76}/g,m=>m+'\r\n');

export function buildMessage({from,fromName,to,subject,text,replyTo}){
  const domain=String(from).split('@')[1]||'localhost';
  const headers=[
    `From: ${fromName?`${encodeHeader(fromName)} `:''}<${from}>`,
    `To: <${to}>`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString().replace('GMT','+0000')}`,
    `Message-ID: <${randomBytes(12).toString('hex')}@${domain}>`,
    ...(replyTo?[`Reply-To: <${replyTo}>`]:[]),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];
  return headers.join('\r\n')+'\r\n\r\n'+wrap76(b64(String(text).replace(/\r?\n/g,'\r\n')));
}

// Cliente SMTP mínimo: EHLO, AUTH LOGIN, MAIL FROM, RCPT TO, DATA, QUIT.
export function sendMail({host='smtp.gmail.com',port=465,secure=true,user,pass,from,fromName,to,subject,text,timeout=30000}){
  return new Promise((resolve,reject)=>{
    const socket=secure?tls.connect({host,port,servername:host}):net.connect({host,port});
    socket.setTimeout(timeout,()=>{socket.destroy();reject(Error('tempo esgotado ao falar com o servidor de e-mail'))});
    let buffer='';const waiters=[];
    socket.setEncoding('utf8');
    let pending=[];
    socket.on('data',chunk=>{buffer+=chunk;let idx;while((idx=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,idx).replace(/\r$/,'');buffer=buffer.slice(idx+1);pending.push(line);if(/^\d{3}(?: |$)/.test(line)){const code=Number(line.slice(0,3));const text=pending.join('\n');pending=[];const w=waiters.shift();if(w)w({code,text})}}});
    socket.on('error',e=>reject(Error(`falha de conexão com o servidor de e-mail: ${e.message}`)));
    const next=()=>new Promise(r=>waiters.push(r));
    const cmd=async(line,expect)=>{const p=next();socket.write(line+'\r\n');const res=await p;if(!expect.includes(res.code))throw Error(res.code===535?'usuário ou senha de app recusados pelo Gmail':`servidor respondeu ${res.text.split('\n').pop()}`);return res};
    (async()=>{
      const greet=await next();if(greet.code!==220)throw Error(`servidor não aceitou a conexão (${greet.code})`);
      await cmd(`EHLO radar.local`,[250]);
      await cmd('AUTH LOGIN',[334]);await cmd(b64(user),[334]);await cmd(b64(pass),[235]);
      await cmd(`MAIL FROM:<${from}>`,[250]);
      await cmd(`RCPT TO:<${to}>`,[250,251]);
      await cmd('DATA',[354]);
      const body=buildMessage({from,fromName,to,subject,text}).replace(/\r\n\./g,'\r\n..');
      await cmd(body+'\r\n.',[250]);
      try{await cmd('QUIT',[221])}catch{}
      socket.end();resolve({ok:true});
    })().catch(e=>{socket.destroy();reject(e)});
  });
}
