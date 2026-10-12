export async function telegramCall(token,method,body,{fetcher=fetch}={}){
 if(!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token||''))throw Error('Configure o token do bot do Telegram.');
 let response;try{response=await fetcher(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',...(body instanceof FormData?{body}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),signal:AbortSignal.timeout(90000)})}catch{throw Error('O Telegram não confirmou o envio. Verifique o canal antes de repetir.')}
 const result=await response.json();if(!response.ok||!result.ok)throw Error(`Telegram: ${String(result.description||'pedido recusado').replaceAll(token,'[token]').slice(0,180)}`);return result.result;
}
export async function publishTelegram({token,chatId,text,media=[],onSent=async()=>{},fetcher=fetch}){
 if(!chatId)throw Error('Configure o canal ou grupo do Telegram.');if(!text?.trim()||text.length>4096)throw Error('Texto inválido para Telegram.');if(media.length>10)throw Error('Use até 10 mídias por post.');
 const caption=text.length<=1024?text:'';const ids=[];
 if(media.length){
  const form=new FormData();form.set('chat_id',chatId);
  let method;
  if(media.length===1){const m=media[0],video=m.mime==='video/mp4';method=video?'sendVideo':'sendPhoto';form.set(video?'video':'photo',new Blob([m.bytes],{type:m.mime}),video?'video.mp4':'image.jpg');if(caption)form.set('caption',caption);if(video)form.set('supports_streaming','true');}
  else{method='sendMediaGroup';const items=media.map((m,i)=>{form.set('file'+i,new Blob([m.bytes],{type:m.mime}),m.mime==='video/mp4'?`video-${i}.mp4`:`image-${i}.jpg`);return {type:m.mime==='video/mp4'?'video':'photo',media:'attach://file'+i,...(i===0&&caption?{caption}:{})}});form.set('media',JSON.stringify(items));}
  const r=await telegramCall(token,method,form,{fetcher});ids.push(...(Array.isArray(r)?r:[r]).map(m=>m.message_id));await onSent(ids);
 }
 if(!media.length||!caption){const r=await telegramCall(token,'sendMessage',{chat_id:chatId,text},{fetcher});ids.push(r.message_id);await onSent(ids)}
 return {messageIds:ids};
}
