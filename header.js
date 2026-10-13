/* společné pro všechny stránky: toast, mobilní menu, service worker */
const toast = document.querySelector('#toast');
/* delší zpráva zůstane vidět déle; nová zpráva nenechá tu předchozí, aby ji předčasně schovala */
let toastCasovac=null;
function notify(message){
  if(!toast)return;
  toast.textContent=message;toast.classList.add('show');
  clearTimeout(toastCasovac);
  toastCasovac=setTimeout(()=>toast.classList.remove('show'),Math.min(9000,Math.max(2800,String(message).length*55)));
}

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
  const iko={'Mapa':'◎','Objevuj':'✦','Deník':'✎','Přidat místo':'⊕','O projektu':'❖','Nápověda':'✱','Komunita':'☾'};
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

/* ---- tlačítko Zpět: vlevo v hlavičce na každé stránce kromě úvodní ----
   Vrací o krok zpět v Atlasu; kdo přišel odjinud (sdílený odkaz, e-mail), toho vede na úvod. */
(function(){
  const topbar=document.querySelector('.topbar');
  const brand=topbar&&topbar.querySelector('.brand');
  if(!topbar||!brand||topbar.querySelector('.zpet-btn')) return;
  const norm=s=>(s.replace(/\/+$/,'').replace(/\.html$/,'')||'/');
  const cesta=norm(location.pathname);
  if(cesta==='/'||cesta==='/index') return;
  const start=document.createElement('div');
  start.className='topbar-start';
  topbar.insertBefore(start,brand);
  const b=document.createElement('button');
  b.type='button';
  b.className='zpet-btn';
  b.setAttribute('aria-label','Zpět');
  b.innerHTML='<span class="zpet-sipka" aria-hidden="true">←</span><span class="zpet-text">Zpět</span>';
  b.addEventListener('click',function(){
    let zAtlasu=false;
    try{ zAtlasu=!!document.referrer && new URL(document.referrer).origin===location.origin; }catch(_){}
    if(zAtlasu && history.length>1) history.back(); else location.href='/';
  });
  start.append(b,brand);
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

/* ---- systémové Zpět zavírá otevřené okno ----
   Formulář i fotka přes celou obrazovku dostanou při otevření vlastní krok v historii.
   Tlačítko Zpět (v telefonu i v prohlížeči) pak zavře okno a člověk zůstává na stránce,
   rozepsaný text ve formuláři zůstává. Okna se poznají samy podle třídy .open / atributu hidden. */
(function(){
  if(!window.history || !history.pushState || !window.MutationObserver) return;
  const VRSTVY='.modal-backdrop, #foto-lb';
  const otevrene=[];            // prvky v pořadí otevření
  const zavirane=new Set();     // právě zavírané tlačítkem Zpět — historie už je posunutá
  let tiche=0;                  // kolik vlastních history.back() ještě doběhne
  const jeOtevrena=el=>el.classList.contains('open');

  function zavri(el){
    const krizek=el.querySelector('.modal-close, .lb-zavrit');
    if(krizek) krizek.click();
    if(jeOtevrena(el)){ el.classList.remove('open'); el.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
  }
  function zmena(el){
    const i=otevrene.indexOf(el);
    if(jeOtevrena(el)){
      if(i>=0) return;
      otevrene.push(el);
      try{ history.pushState({atlasOkno:otevrene.length},''); }catch(_){}
    } else if(i>=0){
      otevrene.splice(i,1);
      if(zavirane.delete(el)) return;                 // zavřelo ho Zpět — krok historie je už pryč
      if(history.state && history.state.atlasOkno){ tiche++; history.back(); }
    }
  }
  new MutationObserver(zaznamy=>{
    const hotove=new Set();
    zaznamy.forEach(z=>{
      const el=z.target;
      if(el.nodeType!==1 || hotove.has(el) || !el.matches(VRSTVY)) return;
      hotove.add(el); zmena(el);
    });
  }).observe(document.documentElement,{attributes:true,attributeFilter:['class'],subtree:true});

  window.addEventListener('popstate',()=>{
    if(tiche>0){ tiche--; return; }
    const el=otevrene[otevrene.length-1];
    if(!el) return;
    zavirane.add(el);
    zavri(el);
    if(jeOtevrena(el)) zavirane.delete(el);            // okno se zavřít nedalo — nic nepředstírat
  });
})();

/* ---- návštěvy uschované bez signálu: společná fronta pro všechny stránky ----
   Návštěva zapsaná mimo signál čeká v telefonu (IndexedDB). Odesílá se sama z kterékoli stránky,
   jakmile je spojení — a dokud čeká, je to vidět v proužku pod hlavičkou. */
window.atlasFronta=(function(){
  function otevri(){
    return new Promise((res,rej)=>{
      const r=indexedDB.open('atlas-fronta',2);
      r.onupgradeneeded=()=>{
        const d=r.result;
        if(!d.objectStoreNames.contains('zapisy'))d.createObjectStore('zapisy',{autoIncrement:true});
        if(!d.objectStoreNames.contains('koncepty'))d.createObjectStore('koncepty');
      };
      r.onsuccess=()=>res(r.result);
      r.onerror=()=>rej(r.error);
    });
  }
  function zapis(prace){
    return otevri().then(d=>new Promise((res,rej)=>{
      const t=d.transaction('zapisy','readwrite');
      prace(t.objectStore('zapisy'));
      t.oncomplete=()=>res();
      t.onerror=()=>rej(t.error);
    }));
  }
  const pridej=polozka=>zapis(s=>s.add(polozka)).then(obnovPruh);
  const uloz=(klic,polozka)=>zapis(s=>s.put(polozka,klic));
  const smaz=klic=>zapis(s=>s.delete(klic));
  function vse(){
    return otevri().then(d=>new Promise((res,rej)=>{
      const t=d.transaction('zapisy','readonly').objectStore('zapisy').openCursor();
      const out=[];
      t.onsuccess=()=>{const c=t.result;if(c){out.push({klic:c.key,z:c.value});c.continue()}else res(out)};
      t.onerror=()=>rej(t.error);
    }));
  }
  function jeSitovaChyba(e){
    if(!navigator.onLine)return true;
    if(!e)return false;
    if(e instanceof TypeError)return true;
    return /failed to fetch|networkerror|network request failed|load failed|fetch failed|aborted|timeout/i.test(e.message||'');
  }
  /* chyba, kterou opakování nespraví (pravidla databáze) — všechno ostatní zkusíme později znovu */
  function jeTrvalaChyba(e){
    const kod=String((e&&e.code)||'');
    return /^(22|23)/.test(kod)||kod==='P0001'||kod==='42501';
  }
  const overeniOdmitnuto=e=>!!e&&(e.code==='23505'||/m od místa|už máš ověřené/.test(e.message||''));

  /* proužek pod hlavičkou: kolik návštěv čeká */
  let pruh=null;
  async function obnovPruh(){
    let n=0;
    try{
      const ucet=window.atlasUcet&&window.atlasUcet();
      const v=await vse();
      n=v.filter(x=>!ucet||!x.z.zaznam||x.z.zaznam.autor_id===ucet.id).length;
    }catch(_){}
    if(!n){ if(pruh){pruh.remove();pruh=null;} return; }
    if(!pruh){
      const topbar=document.querySelector('.topbar');
      if(!topbar) return;
      pruh=document.createElement('div');
      pruh.className='fronta-pruh';
      pruh.setAttribute('role','status');
      pruh.innerHTML='<span class="fp-text"></span><button type="button" class="fp-odeslat">Odeslat teď</button>';
      pruh.querySelector('.fp-odeslat').addEventListener('click',()=>{
        if(!navigator.onLine){ notify('Jsi mimo signál — návštěva se odešle sama, jakmile se připojíš.'); return; }
        if(!(window.atlasUcet&&window.atlasUcet())){ notify('Přihlas se, ať se uschovaná návštěva může odeslat.'); return; }
        zpracuj(true);
      });
      topbar.insertAdjacentElement('afterend',pruh);
    }
    pruh.querySelector('.fp-text').textContent=
      n===1?'◷ 1 návštěva čeká na odeslání':(n<5?`◷ ${n} návštěvy čekají na odeslání`:`◷ ${n} návštěv čeká na odeslání`);
  }

  let bezi=false;
  async function zpracuj(rucne){
    if(bezi||!navigator.onLine)return;
    const db=window.atlasDb, ucet=window.atlasUcet&&window.atlasUcet();
    if(!db||!ucet){ obnovPruh(); return; }
    bezi=true;
    let zbylo=false;
    try{
      const cekajici=await vse();
      for(const {klic,z} of cekajici){
        if(!z||!z.zaznam){ await smaz(klic); continue; }
        if(z.zaznam.autor_id!==ucet.id) continue;               /* návštěva jiného účtu v tomhle telefonu */
        try{
          /* 1) návštěva sama */
          if(!z.zapisHotov){
            let {error}=await db.from('atlas_zapisy').insert(z.zaznam);
            if(error&&z.zaznam.poloha&&overeniOdmitnuto(error)){
              /* ověření polohy neprošlo — návštěva i slova se uloží, jen bez odznaku ◎ */
              const bez={...z.zaznam}; delete bez.poloha; delete bez.presnost_m;
              const r=await db.from('atlas_zapisy').insert(bez);
              error=r.error;
              if(!error){ z.zaznam=bez; z.bezOvereni=true; }
            }
            if(error){
              if(jeSitovaChyba(error)||!jeTrvalaChyba(error))throw error;
              await smaz(klic);
              notify('Uschovaná návštěva nebyla přijata: '+error.message);
              continue;
            }
            z.zapisHotov=true;
            await uloz(klic,z);
          }
          /* 2) slova a fotka na zeď místa */
          if(z.komentarText||z.fotoBlob){
            if(z.fotoBlob&&!z.fotkaCesta&&!z.fotoChyba){
              const cesta=`komentare/${z.zaznam.misto_id}/${Date.now()}.${z.pripona||'jpg'}`;
              const {error:fe}=await db.storage.from('atlas').upload(cesta,z.fotoBlob,{contentType:z.fotoTyp||'image/jpeg'});
              if(fe){ if(jeSitovaChyba(fe))throw fe; z.fotoChyba=true; }
              else z.fotkaCesta=cesta;
              await uloz(klic,z);
            }
            const koment={misto_id:z.zaznam.misto_id,autor_id:z.zaznam.autor_id,text:z.komentarText||'✦',lang:z.lang||'cs'};
            if(z.fotkaCesta)koment.fotka=z.fotkaCesta;
            const {error:ke}=await db.from('atlas_komentare').insert(koment);
            if(ke){
              if(jeSitovaChyba(ke)||!jeTrvalaChyba(ke))throw ke;
              await smaz(klic);
              notify('Návštěva je zapsaná. Tvá slova se uložit nepodařilo: '+ke.message);
              window.dispatchEvent(new CustomEvent('atlas-fronta-odeslano',{detail:{misto_id:z.zaznam.misto_id}}));
              continue;
            }
          }
          await smaz(klic);
          notify(z.bezOvereni?'Uschovaná návštěva se odeslala — tentokrát bez ověření polohy.'
            :(z.jenSlova?'Tvá slova z návštěvy se právě odeslala 🌿':'Uschovaná návštěva se právě odeslala 🌿'));
          window.dispatchEvent(new CustomEvent('atlas-fronta-odeslano',{detail:{misto_id:z.zaznam.misto_id}}));
        }catch(e){ zbylo=true; break; }                          /* spojení zase vypadlo — zbytek počká */
      }
    }catch(_){}finally{ bezi=false; obnovPruh(); }
    if(rucne&&zbylo) notify('Spojení je teď slabé — zkusím to znovu, jakmile se zlepší.');
  }

  window.addEventListener('online',()=>zpracuj());
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) zpracuj(); });
  const start=()=>{ obnovPruh(); zpracuj(); };
  if(window.atlasAuthReady) start(); else window.addEventListener('atlas-auth-ready',start,{once:true});

  return {pridej,vse,smaz,zpracuj,obnovPruh,jeSitovaChyba,jeTrvalaChyba,overeniOdmitnuto};
})();

/* ---- zvoneček: vzkazy od správce + (pro správce) místa čekající na schválení ---- */
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

  let posledniCeka = 0;   // kolik míst + komentářů čeká na schválení (jen pro správce)

  function aktualizujBadge(n){
    const badge = bell.querySelector('.bell-badge');
    if(n>0){ badge.textContent = n>9?'9+':String(n); badge.hidden=false; bell.classList.add('ma-nove'); }
    else { badge.hidden=true; bell.classList.remove('ma-nove'); }
  }

  async function nacti(){
    let data = [];
    try { const r = await db.rpc('atlas_moje_zpravy'); if(r.error) throw r.error; data = r.data || []; }
    catch(e){ return; }

    /* správce: kolik míst a komentářů čeká na schválení */
    let cekaMista = 0, cekaKomentare = 0;
    const profil = window.atlasProfil && window.atlasProfil();
    if(profil && profil.spravce){
      try {
        const c = await db.rpc('atlas_ceka_prehled');
        if(!c.error && c.data){ cekaMista = c.data.mista || 0; cekaKomentare = c.data.komentare || 0; }
      } catch(_){}
    }
    posledniCeka = cekaMista + cekaKomentare;

    const neprec = data.filter(z=>!z.precteno).length;
    aktualizujBadge(neprec + posledniCeka);

    const radekOdkaz = text =>
      `<a class="bell-zprava nova" href="/sprava" style="display:block;text-decoration:none;color:inherit;cursor:pointer">`+
        `<p class="bell-text">${text}</p>`+
        `<p class="bell-meta">otevřít Správu Atlasu ›</p>`+
      `</a>`;
    const radekCeka = cekaMista>0
      ? radekOdkaz(`🗺 ${cekaMista} ${cekaMista===1?'místo čeká':(cekaMista<5?'místa čekají':'míst čeká')} na schválení`)
      : '';
    const radekKoment = cekaKomentare>0
      ? radekOdkaz(`✎ ${cekaKomentare} ${cekaKomentare===1?'komentář čeká':(cekaKomentare<5?'komentáře čekají':'komentářů čeká')} na schválení`)
      : '';

    if(!data.length && !posledniCeka){
      panel.innerHTML = '<div class="bell-head">Vzkazy od správce</div><div class="bell-prazdno">Zatím žádné vzkazy 🌿</div>';
    } else {
      panel.innerHTML = '<div class="bell-head">Vzkazy od správce</div>' + radekCeka + radekKoment + data.map(z=>
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
      /* vzkazy se otevřením označí jako přečtené; počet čekajících míst na odznaku zůstává, dokud je neschválíš */
      aktualizujBadge(posledniCeka);
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
