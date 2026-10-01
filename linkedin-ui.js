// Configuração única do aplicativo e autorização da conta pelo LinkedIn.
(function(){
  const root=document.querySelector('#linkedin-connect');if(!root)return;
  let status=null;
  const esc=value=>typeof escapeHtml==='function'?escapeHtml(String(value??'')):String(value??'');
  async function api(path,body){const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(data.error||`Erro ${response.status}`);return data}
  function render(){
    if(!status){root.innerHTML='<p class="muted">Não foi possível consultar a conexão.</p>';return}
    const callback=`<p class="muted small">Endereço de retorno para cadastrar no LinkedIn:<br><strong>${esc(status.redirectUri)}</strong></p>`;
    const fields=`<div class="form-grid"><label>Client ID<input id="linkedin-client-id" type="text" autocomplete="off" placeholder="Client ID do aplicativo"></label><label>Client Secret<input id="linkedin-client-secret" type="password" autocomplete="new-password" placeholder="Client Secret do aplicativo"></label></div><button type="button" class="button button-secondary" data-linkedin="save-app">Salvar aplicativo</button>`;
    if(!status.configured){root.innerHTML=`<span class="state adjustments">Aplicativo pendente</span><p>Crie uma vez o aplicativo Radar no <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noopener noreferrer">portal de desenvolvedores do LinkedIn</a>. Ative os produtos <strong>Share on LinkedIn</strong> e <strong>Sign In with LinkedIn using OpenID Connect</strong>. Depois informe as credenciais abaixo.</p>${callback}${fields}`;return}
    if(!status.connected){root.innerHTML=`<span class="state adjustments">Conta não conectada</span><p>O aplicativo está cadastrado. Clique para autorizar sua conta no LinkedIn. O Radar não recebe sua senha.</p><a class="button" href="/api/linkedin/start">Conectar LinkedIn</a>${status.expiresAt?'<p class="muted small">A autorização anterior expirou; conecte novamente.</p>':''}<details class="disclosure"><summary>Trocar Client ID ou Client Secret</summary><div class="disclosure-body">${fields}</div></details>${callback}`;return}
    root.innerHTML=`<span class="state approved">Conectado</span><p>Conta: <strong>${esc(status.name)}</strong>. Autorização válida até ${esc(new Date(status.expiresAt).toLocaleDateString('pt-BR'))}.</p><label class="toggle"><input id="linkedin-auto-publish" type="checkbox" ${status.autoPublish?'checked':''}><span><strong>Publicar automaticamente no horário</strong><small>Somente posts aprovados com imagem pronta. O Radar nunca publica rascunhos.</small></span></label><div class="row-actions"><button type="button" class="button button-ghost" data-linkedin="disconnect">Desconectar</button><a class="button button-secondary" href="/api/linkedin/start">Renovar autorização</a></div><details class="disclosure"><summary>Trocar aplicativo</summary><div class="disclosure-body">${fields}</div></details>`;
  }
  async function refresh(){try{status=await api('/api/linkedin/status');if(typeof PS!=='undefined'){PS.linkedin=status;renderPosts()}}catch{status=null}render();return status}
  window.refreshLinkedinStatus=refresh;
  root.addEventListener('click',async event=>{
    const action=event.target.closest('[data-linkedin]')?.dataset.linkedin;if(!action)return;
    try{
      if(action==='save-app'){
        const box=event.target.closest('details')||root;
        const clientId=box.querySelector('#linkedin-client-id')?.value.trim();const clientSecret=box.querySelector('#linkedin-client-secret')?.value.trim();
        if(!clientId||!clientSecret){showToast('Informe Client ID e Client Secret.');return}
        status=await api('/api/linkedin/app',{clientId,clientSecret});showToast('Aplicativo LinkedIn salvo.');
      }
      if(action==='disconnect'){
        if(!confirm('Desconectar o LinkedIn e parar as publicações automáticas?'))return;
        status=await api('/api/linkedin/disconnect',{});showToast('LinkedIn desconectado.');
      }
      render();if(typeof PS!=='undefined'){PS.linkedin=status;renderPosts()}
    }catch(error){showToast(error.message)}
  });
  root.addEventListener('change',async event=>{
    if(event.target.id!=='linkedin-auto-publish')return;
    try{status=await api('/api/linkedin/auto',{enabled:event.target.checked});showToast(status.autoPublish?'Publicação automática ligada.':'Publicação automática desligada.');render();if(typeof PS!=='undefined'){PS.linkedin=status;renderPosts()}}
    catch(error){event.target.checked=!event.target.checked;showToast(error.message)}
  });
  const result=new URLSearchParams(location.search).get('linkedin');
  if(result){history.replaceState(null,'',location.pathname+location.hash);setTimeout(()=>{if(typeof setView==='function')setView('settings');showToast(result==='connected'?'LinkedIn conectado. Ative a publicação automática se quiser usar o agendamento.':'Conexão com LinkedIn cancelada.')},300)}
  refresh();
})();
