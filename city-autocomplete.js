// Autocompletar de cidades brasileiras em qualquer campo de cidade (name="city", name="jobCity" ou data-city).
// Lista completa dos 5.571 municípios em cidades-br.json: [nome, UF, lat, lng, capital, porte]. O porte (tamanho da faixa de CEP, em milhares) ordena as cidades maiores primeiro.
(function(){
  let list=null,loading=null,box=null,input=null,items=[],active=-1;
  const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
  const UFS=new Set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "));
  const isCity=el=>el&&el.tagName==="INPUT"&&(el.name==="city"||el.name==="jobCity"||el.hasAttribute("data-city"));
  function load(){
    if(list||loading)return loading;
    loading=fetch("cidades-br.json").then(r=>r.ok?r.json():[]).then(rows=>{list=rows.map(r=>({name:r[0],uf:r[1],capital:!!r[4],size:(r[5]||1)*(r[4]?4:1),key:norm(r[0])}));return list}).catch(()=>{list=[];return list});
    return loading;
  }
  function homeUf(){try{const s=JSON.parse(localStorage.getItem("radar-settings-v1")||"{}");return (String(s.jobCity||"").split(",")[1]||"").trim().toUpperCase()}catch{return ""}}
  function search(raw){
    if(!list)return [];
    let words=norm(raw.replace(/-/g," ")).split(" ").filter(Boolean);
    let uf="";
    if(words.length>1&&UFS.has(words.at(-1).toUpperCase())){uf=words.pop().toUpperCase()}
    const q=words.join(" ");if(q.length<2)return [];
    const home=homeUf();const out=[];
    for(const c of list){
      if(uf&&c.uf!==uf)continue;
      let rank=c.key.startsWith(q)?0:(" "+c.key).includes(" "+q)?1:c.key.includes(q)?2:-1;
      if(rank<0)continue;
      out.push({c,rank,sort:[rank,-(c.size*(c.uf===home?5:1)),c.key.length,0]});
    }
    out.sort((a,b)=>{for(let i=0;i<4;i++)if(a.sort[i]!==b.sort[i])return a.sort[i]-b.sort[i];return a.c.key.localeCompare(b.c.key)});
    return out.slice(0,8).map(o=>o.c);
  }
  function esc(s){return String(s).replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]))}
  function highlight(name,q){
    const n=norm(name),k=norm(q.split(",")[0]);const i=k?n.indexOf(k):-1;
    if(i<0||n.length!==name.length)return esc(name);
    return esc(name.slice(0,i))+"<mark>"+esc(name.slice(i,i+k.length))+"</mark>"+esc(name.slice(i+k.length));
  }
  function ensureBox(){
    if(box)return box;
    box=document.createElement("ul");box.className="city-ac";box.id="city-ac";box.setAttribute("role","listbox");box.hidden=true;
    box.addEventListener("mousedown",e=>{const li=e.target.closest("li[data-i]");if(li){e.preventDefault();choose(Number(li.dataset.i))}});
    document.body.appendChild(box);return box;
  }
  function place(){
    if(!box||box.hidden||!input)return;
    const r=input.getBoundingClientRect();
    Object.assign(box.style,{left:`${r.left}px`,top:`${r.bottom+4}px`,width:`${Math.max(r.width,240)}px`});
  }
  function show(){
    ensureBox();
    items=search(input.value);active=items.length?0:-1;
    if(!items.length){hide();return}
    box.innerHTML=items.map((c,i)=>`<li role="option" id="city-ac-${i}" data-i="${i}" aria-selected="${i===active}"${i===active?' class="active"':""}><span>${highlight(c.name,input.value)}</span><small>${c.uf}</small></li>`).join("");
    box.hidden=false;input.setAttribute("aria-expanded","true");input.setAttribute("aria-activedescendant",`city-ac-${active}`);place();
  }
  function hide(){if(box)box.hidden=true;if(input){input.setAttribute("aria-expanded","false");input.removeAttribute("aria-activedescendant")}active=-1}
  function move(d){
    if(!items.length)return;active=(active+d+items.length)%items.length;
    box.querySelectorAll("li").forEach((li,i)=>{li.classList.toggle("active",i===active);li.setAttribute("aria-selected",i===active)});
    input.setAttribute("aria-activedescendant",`city-ac-${active}`);
  }
  function choose(i){
    const c=items[i];if(!c||!input)return;
    input.value=`${c.name}, ${c.uf}`;hide();
    input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));
  }
  function attach(el){
    if(el.dataset.cityAc)return;el.dataset.cityAc="1";
    el.setAttribute("autocomplete","off");el.setAttribute("role","combobox");el.setAttribute("aria-autocomplete","list");el.setAttribute("aria-controls","city-ac");el.setAttribute("aria-expanded","false");
    if(!el.placeholder)el.placeholder="Comece a digitar a cidade";
  }
  document.addEventListener("focusin",e=>{if(isCity(e.target)){attach(e.target);input=e.target;load()}});
  document.addEventListener("input",e=>{
    if(!isCity(e.target)||e.isTrusted===false)return;
    input=e.target;attach(input);
    load().then(()=>{if(document.activeElement===input)show()});
  });
  document.addEventListener("keydown",e=>{
    if(!isCity(e.target)||!box||box.hidden)return;
    if(e.key==="ArrowDown"){e.preventDefault();move(1)}
    else if(e.key==="ArrowUp"){e.preventDefault();move(-1)}
    else if(e.key==="Enter"&&active>=0){e.preventDefault();e.stopPropagation();choose(active)}
    else if(e.key==="Tab"&&active>=0&&input.value&&!/,\s*[A-Z]{2}$/.test(input.value)){choose(active)}
    else if(e.key==="Escape"){e.stopPropagation();hide()}
  },true);
  document.addEventListener("focusout",e=>{if(isCity(e.target))setTimeout(hide,120)});
  window.addEventListener("resize",place);window.addEventListener("scroll",place,true);
})();
