/* společné pro všechny stránky: toast, mobilní menu, service worker */
const toast = document.querySelector('#toast');
function notify(message){if(!toast)return;toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2800)}

/* ---- mobilní menu ---- */
/* menu i překryv přesunout VEN z hlavičky přímo do <body>:
   topbar má backdrop-filter, který připnutým potomkům mění vztažný bod
   a na mobilech způsobuje chyby vykreslování — mimo hlavičku jsou nezávislé */
(function(){
  const nav=document.getElementById('mobile-nav');
  if(!nav) return;
  if(nav.parentElement !== document.body) document.body.appendChild(nav);
  if(!document.querySelector('.nav-overlay')){
    const ov=document.createElement('div');
    ov.className='nav-overlay';
    ov.hidden=true;
    ov.addEventListener('click', zavriMenu);
    document.body.appendChild(ov);
  }
  /* symbol každé položky v jemném zlatém kroužku */
  const iko={'Mapa':'◎','Objevuj':'✦','Deník':'✎','Přidat místo':'⊕','O projektu':'❖','Komunita':'☾'};
  nav.querySelectorAll('a').forEach(a=>{
    if(a.querySelector('.mn-ico')) return;
    const t=a.textContent.trim();
    const s=document.createElement('span');
    s.className='mn-ico';
    s.textContent=iko[t]||'✦';
    a.prepend(s);
  });
  /* zvýraznit položku aktuální stránky (funguje s .html i bez) */
  const norm=s=>(s.replace(/\/+$/,'').replace(/\.html$/,'')||'/');
  const cesta=norm(location.pathname);
  nav.querySelectorAll('a').forEach(a=>{
    const href=a.getAttribute('href')||'';
    if(href.startsWith('/') && norm(href)===cesta) a.classList.add('aktivni');
  });
})();

function nastavMenu(otevrit){
  const nav=document.getElementById('mobile-nav');
  const ov=document.querySelector('.nav-overlay');
  const b=document.querySelector('.menu-button');
  if(nav) nav.hidden=!otevrit;
  if(ov) ov.hidden=!otevrit;
  if(b){b.setAttribute('aria-expanded',String(otevrit));b.textContent=otevrit?'✕':'☰';}
}
function zavriMenu(){ nastavMenu(false); }

/* delegace na celý dokument — funguje bez ohledu na překreslení hlavičky */
document.addEventListener('click',function(e){
  const btn=e.target.closest('.menu-button');
  if(btn){
    e.preventDefault();
    const nav=document.getElementById('mobile-nav');
    nastavMenu(nav ? nav.hidden : true);
    return;
  }
  if(e.target.closest('#mobile-nav a')) zavriMenu();
});
document.addEventListener('keydown',function(e){ if(e.key==='Escape') zavriMenu(); });

/* ---- zvoneček: vzkazy od správce (na všech stránkách, pro přihlášené) ---- */
function zpravyInit(){
  const db = window.atlasDb;
  const ucet = window.atlasUcet && window.atlasUcet();
  const actions = document.querySelector('.header-actions');
  if(!db || !ucet || !actions) return;
  if(actions.querySelector('.bell')) return; // už vloženo

  const bell = document.createElement('button');
  bell.className = 'bell';
  bell.type = 'button';
  bell.setAttribute('aria-label','Vzkazy od správce');
  bell.setAttribute('aria-expanded','false');
  bell.innerHTML = '🔔<span class="bell-badge" hidden></span>';
  actions.insertBefore(bell, actions.querySelector('.profile') || actions.firstChild);

  const panel = document.createElement('div');
  panel.className = 'bell-panel';
  panel.hidden = true;
  document.body.appendChild(panel);

  async function nacti(){
    let data = [];
    try { const r = await db.rpc('atlas_moje_zpravy'); if(r.error) throw r.error; data = r.data || []; }
    catch(e){ return; }
    const neprec = data.filter(z=>!z.precteno).length;
    const badge = bell.querySelector('.bell-badge');
    if(neprec>0){ badge.textContent = neprec>9?'9+':String(neprec); badge.hidden=false; bell.classList.add('ma-nove'); }
    else { badge.hidden=true; bell.classList.remove('ma-nove'); }
    if(!data.length){
      panel.innerHTML = '<div class="bell-head">Vzkazy od správce</div><div class="bell-prazdno">Zatím žádné vzkazy 🌿</div>';
    } else {
      panel.innerHTML = '<div class="bell-head">Vzkazy od správce</div>' + data.map(z=>
        `<div class="bell-zprava${z.precteno?'':' nova'}">`+
          `<p class="bell-text">${zEsc(z.text)}</p>`+
          `<p class="bell-meta">${z.misto_nazev?('k místu '+zEsc(z.misto_nazev)+' · '):''}${zKdy(z.vytvoreno)}</p>`+
        `</div>`).join('');
    }
  }
  nacti();

  bell.addEventListener('click', async function(e){
    e.preventDefault();
    const otevrit = panel.hidden;
    panel.hidden = !otevrit;
    bell.setAttribute('aria-expanded', String(otevrit));
    if(otevrit){
      const badge = bell.querySelector('.bell-badge');
      badge.hidden = true; bell.classList.remove('ma-nove');
      try { await db.from('atlas_zpravy').update({precteno:true}).eq('precteno',false); } catch(_){}
    }
  });
  document.addEventListener('click', function(e){
    if(!panel.hidden && !e.target.closest('.bell-panel') && !e.target.closest('.bell')) panel.hidden = true;
  });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') panel.hidden = true; });
}
function zEsc(t){const d=document.createElement('div');d.textContent=t||'';return d.innerHTML}
function zKdy(iso){if(!iso)return'';const d=new Date(iso);return `${d.getDate()}. ${d.getMonth()+1}. ${d.getFullYear()}`}
if(window.atlasAuthReady) zpravyInit();
window.addEventListener('atlas-auth-ready', zpravyInit);

/* PWA: registrace service workeru */
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('/sw.js').catch(err=>console.warn('SW se nepodařilo zaregistrovat:',err));
  });
}
