// Sessão: se o servidor disser que a sessão acabou (401), volta para a tela de entrada.
(function(){
  const orig=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
    const r=await orig(input,init);
    let path="";try{path=new URL(typeof input==="string"?input:input?.url||"",location.href).pathname}catch{}
    if(r.status===401&&path.startsWith("/api/")&&!path.startsWith("/api/auth/"))location.href=`/entrar?volta=${encodeURIComponent(location.pathname+location.hash)}`;
    return r;
  };
})();

// Meu perfil › Segurança
const SEC={data:null};
async function secApi(path,body){const r=await fetch(path,body?{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{});let d={};try{d=await r.json()}catch{}if(!r.ok)throw Error(d.error||`Erro ${r.status}`);return d}
function describeUa(ua){ua=String(ua||"");const b=/Edg\//.test(ua)?"Edge":/OPR\//.test(ua)?"Opera":/Chrome\//.test(ua)?"Chrome":/Firefox\//.test(ua)?"Firefox":/Safari\//.test(ua)?"Safari":"Navegador";const o=/Windows/.test(ua)?"Windows":/Android/.test(ua)?"Android":/iPhone|iPad/.test(ua)?"iPhone":/Mac OS/.test(ua)?"Mac":/Linux/.test(ua)?"Linux":"";return `${b}${o?` no ${o}`:""}`}
function when(iso){const d=new Date(iso);return d.toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}
async function loadSecurity(){try{SEC.data=await secApi("/api/auth/security")}catch{SEC.data=null}renderSecurity()}
function renderSecurity(){
  const box=document.querySelector("#security-body");if(!box)return;const d=SEC.data;
  if(!d){box.innerHTML='<p class="muted">Não foi possível carregar as informações de segurança.</p>';return}
  const others=d.sessions.filter(s=>!s.current).length;
  box.innerHTML=`
    <div class="sec-grid">
      <div class="source-key">
        <div class="source-key-head"><strong>Conta</strong><span class="state approved">Protegida</span></div>
        <p class="muted small">Você entrou como <strong>${escapeHtml(d.user)}</strong>. ${d.https?"Conexão segura (HTTPS).":d.local?"Acesso local, neste computador.":"Atenção: conexão sem HTTPS."}</p>
        <form id="password-form" class="form-grid" autocomplete="off">
          <label class="full">Senha atual<input name="current" type="password" autocomplete="current-password" required></label>
          <label>Nova senha<input name="password" type="password" autocomplete="new-password" minlength="10" required></label>
          <label>Repita a nova senha<input name="confirm" type="password" autocomplete="new-password" required></label>
          <div class="form-actions full"><button class="button button-secondary" type="submit">Trocar senha</button><span class="muted small">Ao trocar, os outros aparelhos são desconectados.</span></div>
        </form>
      </div>
      <div class="source-key">
        <div class="source-key-head"><strong>Verificação por e-mail</strong><span class="state ${d.twoFactor?"approved":""}">${d.twoFactor?"Ligada":"Desligada"}</span></div>
        <p class="muted small">Ao entrar de um computador novo, além da senha, o Radar manda um código de 6 dígitos para o seu Gmail. ${d.emailReady?"":"Para ligar, configure antes o Gmail em E-mail para prospecção."}</p>
        <label class="toggle"><input type="checkbox" id="twofa-toggle" ${d.twoFactor?"checked":""} ${d.emailReady||d.twoFactor?"":"disabled"}><span><strong>Pedir código em computadores novos</strong><small>Computadores confiáveis ficam dispensados por 30 dias.</small></span></label>
      </div>
      <div class="source-key full">
        <div class="source-key-head"><strong>Aparelhos conectados</strong><span class="muted small">${d.sessions.length}</span></div>
        <ul class="session-list">${d.sessions.map(s=>`<li><div><strong>${escapeHtml(describeUa(s.ua))}</strong>${s.current?' <span class="flag soft">este aparelho</span>':""}<span class="muted small">Último uso ${when(s.lastSeen)} · IP ${escapeHtml(s.ip||"—")} · ${s.remember?"lembrado por 30 dias":"sessão de 12 horas"}</span></div></li>`).join("")}</ul>
        <div class="row-actions">${others?`<button class="button button-secondary" data-sec="logout-others">Desconectar os outros ${others}</button>`:""}<button class="button button-ghost danger" data-sec="logout">Sair deste aparelho</button></div>
        ${d.events?.length?`<details class="disclosure"><summary>Atividade recente <svg class="i chev" aria-hidden="true"><use href="#i-chevron"/></svg></summary><div class="disclosure-body"><ul class="plain small">${d.events.slice(0,15).map(e=>`<li><span class="muted">${when(e.at)}</span> · ${escapeHtml(e.event)} · ${escapeHtml(describeUa(e.ua))} · IP ${escapeHtml(e.ip||"—")}</li>`).join("")}</ul></div></details>`:""}
      </div>
    </div>`;
}
async function logout(all){try{await secApi("/api/auth/logout",{all})}catch{}if(all!=="others")location.href="/entrar"}
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-sec]");if(!b)return;
  if(b.dataset.sec==="logout")logout(false);
  if(b.dataset.sec==="logout-others"){await logout("others");showToast("Os outros aparelhos foram desconectados.");loadSecurity()}
});
document.addEventListener("change",async e=>{
  if(e.target.id!=="twofa-toggle")return;
  try{const r=await secApi("/api/auth/two-factor",{enabled:e.target.checked});showToast(r.twoFactor?"Verificação por e-mail ligada.":"Verificação por e-mail desligada.");loadSecurity()}
  catch(err){e.target.checked=!e.target.checked;showToast(err.message)}
});
document.addEventListener("submit",async e=>{
  if(e.target.id!=="password-form")return;e.preventDefault();const f=e.target;
  if(f.password.value!==f.confirm.value){showToast("As duas senhas novas não são iguais.");return}
  try{await secApi("/api/auth/password",{current:f.current.value,password:f.password.value});f.reset();showToast("Senha trocada. Os outros aparelhos foram desconectados.");loadSecurity()}
  catch(err){showToast(err.message)}
});
document.querySelector("#sidebar-logout")?.addEventListener("click",()=>logout(false));
loadSecurity();
