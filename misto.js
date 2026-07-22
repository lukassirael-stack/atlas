/* Profil místa — data z databáze podle ?m=slug */

const SLUG = new URLSearchParams(location.search).get('m');
let mistoData = null;

/* rychlé hero: cestu fotky předává odkaz z mapy/dlaždic (?f=...) — stahování začne okamžitě,
   často už je obrázek v mezipaměti z náhledové karty; skutečná data ho pak případně tiše opraví */
const FOTKA_Z_ODKAZU = new URLSearchParams(location.search).get('f');
let heroCesta = null;
if (FOTKA_Z_ODKAZU && /^[\w\-./]+$/.test(FOTKA_Z_ODKAZU) && window.atlasFotoUrl) {
  heroCesta = FOTKA_Z_ODKAZU;
  nastavHero(window.atlasFotoUrl(heroCesta));
}
const SEKCE = [
  ['popis','Popis místa'],
  ['pristup','Jak se sem dostat'],
  ['hloubka','Hloubka místa'],
  ['prace_s_mistem','Práce s místem'],
  ['nejlepsi_cas','Nejlepší čas'],
];

const RADAR = {cx:150, cy:115, r:76};
function radarBod(index, hodnota){
  const uhel = -Math.PI/2 + index * (2*Math.PI/5);
  const d = (hodnota/100) * RADAR.r;
  return [RADAR.cx + Math.cos(uhel)*d, RADAR.cy + Math.sin(uhel)*d];
}
function vykresliRadar(dna){
  const osy = ['klid','energie','mystika','krasa','lecivost'];
  if (!dna || !dna.zapisu){
    osy.forEach(o=>{const el=document.querySelector('#val-'+o);if(el)el.textContent='–'});
    return;
  }
  const body = osy.map((o,i)=>radarBod(i, dna[o]||0));
  const bodyStr = body.map(b=>b.map(n=>n.toFixed(2)).join(',')).join(' ');
  document.querySelector('#radar-area').setAttribute('points', bodyStr);
  document.querySelector('#radar-shadow').setAttribute('points',
    body.map(b=>[(b[0]-RADAR.cx)*1.02+RADAR.cx+2,(b[1]-RADAR.cy)*1.02+RADAR.cy+2].map(n=>n.toFixed(2)).join(',')).join(' '));
  const vg = document.querySelector('#radar-vertices');
  vg.innerHTML = body.map(b=>`<circle class="radar-vertex" cx="${b[0].toFixed(2)}" cy="${b[1].toFixed(2)}" r="3"/>`).join('');
  osy.forEach(o=>{const el=document.querySelector('#val-'+o);if(el)el.textContent=(dna[o]??'–')+' %'});
}

function fmtDatum(iso){
  if(!iso)return'';
  const d=new Date(iso);
  return `${d.getDate()}. ${d.getMonth()+1}. ${d.getFullYear()}`;
}
function escHtml(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML}

async function nactiMisto(){
  const db = window.atlasDb;
  if (!db || !SLUG){
    document.querySelector('#place-nazev').textContent = 'Místo nenalezeno';
    document.querySelector('#place-souradnice').textContent = '';
    return;
  }
  const fotkyPromise = db.rpc('atlas_misto_fotky', { p_slug: SLUG });
  const { data, error } = await db.rpc('atlas_misto_detail', { p_slug: SLUG });
  const m = data && data[0];
  if (error || !m){
    document.querySelector('#place-nazev').textContent = 'Místo nenalezeno';
    document.querySelector('#place-souradnice').textContent = 'Zkontroluj odkaz, nebo se vrať na mapu.';
    return;
  }
  mistoData = m;
  document.title = `${m.nazev} — Atlas energetických míst`;

  document.querySelector('#place-nazev').textContent = m.nazev;
  document.querySelector('#place-souradnice').textContent = window.atlasSouradnice(m.lat, m.lng);
  document.querySelector('#place-tags').innerHTML =
    (m.stitky||[]).map(k=>`<span>${window.atlasStitek(k)}</span>`).join('');

  const rys = window.atlasRys(m.zapisu ? m : null);
  const metaCasti = [];
  if (m.zapisu) metaCasti.push(`<b>${m.zapisu} ${m.zapisu===1?'zápis':m.zapisu<5?'zápisy':'zápisů'}</b>`);
  if (rys) metaCasti.push(`nejsilnější rys <b>${rys}</b>`);
  if (m.autor_nick) metaCasti.push(`přidal ${escHtml(m.autor_nick)}`);
  document.querySelector('#place-meta').innerHTML = metaCasti.join(' · ');

  // navigace: předání souřadnic do mapové aplikace v telefonu
  const nav = document.querySelector('#place-navigace');
  if (nav && m.lat != null && m.lng != null) {
    const g = `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}`;
    const mapy = `https://mapy.cz/zakladni?source=coor&id=${m.lng},${m.lat}&x=${m.lng}&y=${m.lat}&z=16`;
    nav.innerHTML =
      `<a class="nav-btn nav-primary" href="${g}" target="_blank" rel="noopener">🧭 Naviguj mě sem</a>` +
      `<a class="nav-btn" href="${mapy}" target="_blank" rel="noopener">🗺 Mapy.cz</a>` +
      `<button type="button" class="nav-btn nav-copy" data-gps="${m.lat}, ${m.lng}">⎘ GPS</button>`;
    nav.querySelector('.nav-copy')?.addEventListener('click', async (e) => {
      try {
        await navigator.clipboard.writeText(e.currentTarget.dataset.gps);
        notify('Souřadnice zkopírovány 🌿');
      } catch (_) { notify('Kopírování se nepodařilo.'); }
    });
  }

  const textEl = document.querySelector('#place-text');
  textEl.innerHTML = SEKCE.filter(([k])=>m[k]&&m[k].trim()).map(([k,nadpis])=>
    `<section class="place-section"><p class="eyebrow">${nadpis}</p><p>${escHtml(m[k])}</p></section>`
  ).join('') || '<section class="place-section"><p>U tohoto místa zatím není žádný popis.</p></section>';

  vykresliRadar(m.zapisu ? m : null);
  const note = document.querySelector('#dna-note');
  if (m.zapisu) note.innerHTML = `Průměr z <b>${m.zapisu} ${m.zapisu===1?'zápisu':'zápisů'}</b> lidí, kteří tu skutečně stáli.`;
  else note.textContent = 'Zatím bez zápisů — DNA se objeví, jakmile někdo zapíše návštěvu.';

  await nactiFotky(m.autor_id, fotkyPromise);

  nactiZapisy();
  nactiKomentare();
}

function nastavHero(url){
  const el = document.querySelector('#place-hero-bg');
  if (!el) return;
  if (!url){ el.classList.add('zjevena'); return; }
  if (el.dataset.url === url) return;
  el.dataset.url = url;
  const img = new Image();
  img.onload = ()=>{ if(el.dataset.url!==url) return; el.style.backgroundImage = `url(${url})`; el.classList.add('zjevena'); };
  img.onerror = ()=>{ if(el.dataset.url!==url) return; el.classList.add('zjevena'); };
  img.src = url;
}

async function nactiFotky(autorId, hotovyDotaz){
  const db = window.atlasDb;
  const { data: fotky } = await (hotovyDotaz || db.rpc('atlas_misto_fotky', { p_slug: SLUG }));
  if (!fotky || !fotky.length){ nastavHero('img/brana-svit.jpg'); return; }

  // hlavní foto do hero — prolne se až po načtení (žádné probliknutí)
  nastavHero(window.atlasFotoUrl(fotky[0].cesta));

  // smí přeřazovat? autor místa nebo správce
  const ucet = window.atlasUcet && window.atlasUcet();
  const profil = window.atlasProfil && window.atlasProfil();
  const smiRadit = !!(profil && profil.spravce) || !!(ucet && autorId && ucet.id === autorId);

  // galerie zobraz jen když je víc fotek, nebo když smí správce/autor spravovat
  const grid = document.querySelector('#galerie-grid');
  const sekce = document.querySelector('#place-galerie');
  if (!grid || !sekce) return;
  if (fotky.length < 2 && !smiRadit) return;

  sekce.hidden = false;
  grid.innerHTML = fotky.map((f,i)=>{
    const url = window.atlasFotoUrl(f.cesta) || '';
    const hlavni = i===0;
    return `<figure class="galerie-item${hlavni?' je-hlavni':''}" data-lb="${i}" style="cursor:zoom-in">
      <img src="${url}" alt="Fotka místa" loading="lazy" />
      ${hlavni ? '<span class="foto-odznak">Hlavní</span>' : ''}
    </figure>`;
  }).join('');
  grid.querySelectorAll('[data-lb]').forEach(el=>{
    el.addEventListener('click',()=>otevriLightbox(fotky, Number(el.dataset.lb), smiRadit, autorId));
  });

  if (smiRadit) {
    /* dlaždice pro dodatečné nahrání fotek (autor místa nebo správce) */
    grid.insertAdjacentHTML('beforeend',
      `<label class="galerie-item galerie-add" style="display:grid;place-items:center;cursor:pointer;`+
      `border:1px dashed rgba(201,161,74,.6);border-radius:12px;min-height:96px;`+
      `color:var(--gold-deep,#b98f38);font:600 13px 'Jost',sans-serif;text-align:center;padding:10px">`+
      `➕ Přidat fotky<input type="file" accept="image/*" multiple hidden></label>`);
    grid.querySelector('.galerie-add input').addEventListener('change', e=>pridejFotky(e.target, autorId, fotky));
  }
}

/* ---- prohlížeč fotek (lightbox) ---- */
let lbFotky=[], lbIndex=0, lbSmi=false, lbAutorId=null;
function lightboxStylPridej(){
  if(document.getElementById('lb-styl'))return;
  const s=document.createElement('style'); s.id='lb-styl';
  s.textContent=
    '#foto-lb{position:fixed;inset:0;z-index:120;background:rgba(10,16,12,.94);display:none;'+
      'align-items:center;justify-content:center;flex-direction:column;gap:14px;padding:16px}'+
    '#foto-lb.open{display:flex}'+
    '#foto-lb img{max-width:94vw;max-height:72vh;border-radius:10px;box-shadow:0 22px 60px rgba(0,0,0,.55);'+
      'user-select:none;-webkit-user-drag:none}'+
    '#foto-lb .lb-zavrit{position:absolute;top:14px;right:16px;width:42px;height:42px;border-radius:50%;'+
      'border:1px solid rgba(201,161,74,.5);background:rgba(22,36,29,.7);color:#fbf7ef;font:400 20px/1 sans-serif;cursor:pointer}'+
    '#foto-lb .lb-sipka{position:absolute;top:50%;transform:translateY(-50%);width:46px;height:46px;border-radius:50%;'+
      'border:1px solid rgba(201,161,74,.5);background:rgba(22,36,29,.7);color:#c9a14a;font:400 22px/1 sans-serif;cursor:pointer}'+
    '#foto-lb .lb-prev{left:12px}#foto-lb .lb-next{right:12px}'+
    '#foto-lb .lb-pocet{color:#d9d3c2;font:500 13px "Jost",sans-serif;letter-spacing:.08em}'+
    '#foto-lb .lb-akce{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}'+
    '#foto-lb .lb-akce button{border:1px solid rgba(201,161,74,.55);background:rgba(22,36,29,.7);color:#fbf7ef;'+
      'border-radius:99px;padding:9px 16px;font:600 13px "Jost",sans-serif;cursor:pointer}'+
    '#foto-lb .lb-akce .lb-smaz:hover{border-color:#b5442d;color:#ffd9cf}';
  document.head.appendChild(s);
}
function lightboxEl(){
  let lb=document.querySelector('#foto-lb');
  if(lb)return lb;
  lightboxStylPridej();
  lb=document.createElement('div');
  lb.id='foto-lb';
  lb.innerHTML=
    `<button type="button" class="lb-zavrit" aria-label="Zavřít">×</button>`+
    `<button type="button" class="lb-sipka lb-prev" aria-label="Předchozí fotka">‹</button>`+
    `<img alt="Fotka místa" />`+
    `<button type="button" class="lb-sipka lb-next" aria-label="Další fotka">›</button>`+
    `<p class="lb-pocet"></p>`+
    `<div class="lb-akce" hidden>`+
      `<button type="button" class="lb-hlavni">Nastavit jako hlavní</button>`+
      `<button type="button" class="lb-smaz">Smazat fotku</button>`+
    `</div>`;
  document.body.appendChild(lb);
  lb.querySelector('.lb-zavrit').addEventListener('click',zavriLightbox);
  lb.addEventListener('click',e=>{if(e.target===lb)zavriLightbox()});
  lb.querySelector('.lb-prev').addEventListener('click',()=>posunLightbox(-1));
  lb.querySelector('.lb-next').addEventListener('click',()=>posunLightbox(1));
  lb.querySelector('.lb-hlavni').addEventListener('click',async()=>{
    const f=lbFotky[lbIndex]; if(!f)return;
    const db=window.atlasDb;
    const {error}=await db.rpc('atlas_foto_hlavni',{p_foto_id:f.id});
    if(error){notify('Nepodařilo se: '+error.message);return}
    zavriLightbox(); notify('Hlavní fotka změněna 🌿'); await nactiFotky(lbAutorId);
  });
  lb.querySelector('.lb-smaz').addEventListener('click',async()=>{
    const f=lbFotky[lbIndex]; if(!f)return;
    zavriLightbox();
    await smazFoto(f, lbAutorId);
  });
  /* přejetí prstem */
  let dotykX=null;
  lb.addEventListener('touchstart',e=>{dotykX=e.touches[0].clientX},{passive:true});
  lb.addEventListener('touchend',e=>{
    if(dotykX===null)return;
    const d=e.changedTouches[0].clientX-dotykX; dotykX=null;
    if(Math.abs(d)>40)posunLightbox(d<0?1:-1);
  },{passive:true});
  document.addEventListener('keydown',e=>{
    if(!lb.classList.contains('open'))return;
    if(e.key==='Escape')zavriLightbox();
    if(e.key==='ArrowLeft')posunLightbox(-1);
    if(e.key==='ArrowRight')posunLightbox(1);
  });
  return lb;
}
function otevriLightbox(fotky,index,smi,autorId){
  lbFotky=fotky; lbIndex=index; lbSmi=!!smi; lbAutorId=autorId;
  const lb=lightboxEl();
  lb.classList.add('open');
  document.body.style.overflow='hidden';
  vykresliLightbox();
}
function zavriLightbox(){
  const lb=document.querySelector('#foto-lb');
  if(lb)lb.classList.remove('open');
  document.body.style.overflow='';
}
function posunLightbox(smer){
  if(!lbFotky.length)return;
  lbIndex=(lbIndex+smer+lbFotky.length)%lbFotky.length;
  vykresliLightbox();
}
function vykresliLightbox(){
  const lb=document.querySelector('#foto-lb');
  const f=lbFotky[lbIndex];
  if(!lb||!f)return;
  lb.querySelector('img').src=window.atlasFotoUrl(f.cesta)||'';
  lb.querySelector('.lb-pocet').textContent=`${lbIndex+1} / ${lbFotky.length}`;
  const vic=lbFotky.length>1;
  lb.querySelector('.lb-prev').hidden=!vic;
  lb.querySelector('.lb-next').hidden=!vic;
  const akce=lb.querySelector('.lb-akce');
  akce.hidden=!lbSmi;
  akce.querySelector('.lb-hlavni').hidden=(lbIndex===0);   /* hlavní už je */
}

async function nactiZapisy(){
  const db=window.atlasDb, box=document.querySelector('#log-list');
  const { data, error } = await db.from('atlas_zapisy')
    .select('id,autor_id,text,klid,energie,mystika,krasa,lecivost,vytvoren,atlas_profily(nick)')
    .eq('misto_id', mistoData.id).order('vytvoren',{ascending:false}).limit(50);
  if (error){
    box.innerHTML = `<li class="log-prazdno">Zápisy se nepodařilo načíst. Zkus obnovit stránku.</li>`;
    return;
  }
  if (!data || !data.length){
    box.innerHTML = `<li class="log-prazdno">Zatím tu nikdo nezapsal návštěvu. Až tu budeš stát, buď první.</li>`;
    return;
  }
  const ucet=window.atlasUcet&&window.atlasUcet(), profil=window.atlasProfil&&window.atlasProfil();
  box.innerHTML = data.map(z=>{
    const nick = z.atlas_profily?.nick || 'poutník';
    const dna = `Klid ${z.klid} · Energie ${z.energie} · Mystika ${z.mystika} · Krása ${z.krasa} · Léčivost ${z.lecivost}`;
    const smi = (profil&&profil.spravce) || (ucet&&ucet.id===z.autor_id);
    const upr = smi ? `<button type="button" class="edit-link" data-edit-zapis="${z.id}">✎ Upravit</button>` : '';
    return `<li class="log-item" data-zapis="${z.id}"><div class="log-head"><span class="log-nick">${escHtml(nick)}</span><span class="log-badge">◎ ověřeno na místě</span><time>${fmtDatum(z.vytvoren)}</time></div><p class="zapis-text">${escHtml(z.text)}</p><p class="log-dna">${dna}</p>${upr}</li>`;
  }).join('');
  if(ucet||profil) box.querySelectorAll('[data-edit-zapis]').forEach(b=>{
    const z=data.find(x=>String(x.id)===b.dataset.editZapis);
    b.addEventListener('click',()=>otevriEditZapis(z));
  });
}

async function nactiKomentare(){
  const db=window.atlasDb, box=document.querySelector('#comment-list');
  const { data, error } = await db.from('atlas_komentare')
    .select('id,autor_id,text,vytvoren,atlas_profily(nick)')
    .eq('misto_id', mistoData.id).eq('stav','zverejneny').order('vytvoren',{ascending:false}).limit(50);
  if (error){
    box.innerHTML = `<li class="log-prazdno">Komentáře se nepodařilo načíst. Zkus obnovit stránku.</li>`;
    return;
  }
  if (!data || !data.length){
    box.innerHTML = `<li class="log-prazdno">Zatím bez komentářů.</li>`;
    return;
  }
  const ucet=window.atlasUcet&&window.atlasUcet(), profil=window.atlasProfil&&window.atlasProfil();
  box.innerHTML = data.map(k=>{
    const nick = k.atlas_profily?.nick || 'poutník';
    const smi = (profil&&profil.spravce) || (ucet&&ucet.id===k.autor_id);
    const upr = smi ? `<button type="button" class="edit-link" data-edit-koment="${k.id}">✎ Upravit</button>` : '';
    return `<li class="log-item comment" data-koment="${k.id}"><div class="log-head"><span class="log-nick">${escHtml(nick)}</span><time>${fmtDatum(k.vytvoren)}</time></div><p class="koment-text">${escHtml(k.text)}</p>${upr}</li>`;
  }).join('');
  if(ucet||profil) box.querySelectorAll('[data-edit-koment]').forEach(b=>{
    const k=data.find(x=>String(x.id)===b.dataset.editKoment);
    b.addEventListener('click',()=>otevriEditKoment(k));
  });
}

/* ---- editace zápisu (text + DNA) ---- */
function otevriEditZapis(z){
  const m=document.querySelector('#edit-log-modal'); if(!m||!z) return;
  m.querySelector('#edit-log-text').value=z.text;
  m.querySelectorAll('#edit-log-dna input[type=range]').forEach(r=>{
    r.value=z[r.dataset.k]; r.closest('.slider-row').querySelector('output').textContent=r.value;
  });
  m.dataset.id=z.id;
  openModal('#edit-log-modal');
}
document.querySelector('#edit-log-dna')?.addEventListener('input',e=>{
  if(e.target.type==='range') e.target.closest('.slider-row').querySelector('output').textContent=e.target.value;
});
document.querySelector('#edit-log-form')?.addEventListener('submit',async event=>{
  event.preventDefault();
  const m=document.querySelector('#edit-log-modal'), db=window.atlasDb;
  const text=m.querySelector('#edit-log-text').value.trim();
  if(!text){notify('Zápis nemůže být prázdný.');return}
  const dna={}; m.querySelectorAll('#edit-log-dna input[type=range]').forEach(r=>{dna[r.dataset.k]=Number(r.value)});
  const btn=event.currentTarget.querySelector('button[type=submit]'); btn.disabled=true; const p=btn.textContent; btn.textContent='Ukládám…';
  const {data:upraveno,error}=await db.from('atlas_zapisy').update({text,klid:dna.klid,energie:dna.energie,mystika:dna.mystika,krasa:dna.krasa,lecivost:dna.lecivost}).eq('id',m.dataset.id).select('id');
  btn.disabled=false; btn.textContent=p;
  if(error){notify('Úprava se nepodařila: '+error.message);return}
  if(!upraveno||!upraveno.length){notify('Úprava se neuložila — nemáš k ní oprávnění, nebo vypršelo přihlášení.');return}
  closeModal(m); notify('Zápis upraven 🌿'); nactiZapisy();
});

/* ---- editace komentáře (text) ---- */
function otevriEditKoment(k){
  const m=document.querySelector('#edit-comment-modal'); if(!m||!k) return;
  m.querySelector('#edit-comment-text').value=k.text;
  m.dataset.id=k.id;
  openModal('#edit-comment-modal');
}
document.querySelector('#edit-comment-form')?.addEventListener('submit',async event=>{
  event.preventDefault();
  const m=document.querySelector('#edit-comment-modal'), db=window.atlasDb;
  const text=m.querySelector('#edit-comment-text').value.trim();
  if(!text){notify('Komentář nemůže být prázdný.');return}
  const btn=event.currentTarget.querySelector('button[type=submit]'); btn.disabled=true; const p=btn.textContent; btn.textContent='Ukládám…';
  const {data:upraveno,error}=await db.from('atlas_komentare').update({text}).eq('id',m.dataset.id).select('id');
  btn.disabled=false; btn.textContent=p;
  if(error){notify('Úprava se nepodařila: '+error.message);return}
  if(!upraveno||!upraveno.length){notify('Úprava se neuložila — nemáš k ní oprávnění, nebo vypršelo přihlášení.');return}
  closeModal(m); notify('Komentář upraven 🌿'); nactiKomentare();
});

/* ---- modály ---- */
function openModal(id){const m=document.querySelector(id);if(!m)return;m.classList.add('open');m.setAttribute('aria-hidden','false');m.querySelector('textarea,input,button')?.focus()}
function closeModal(m){if(!m)return;m.classList.remove('open');m.setAttribute('aria-hidden','true')}
function otevriSUctem(id){if(window.vyzadujUcet&&!window.vyzadujUcet())return;openModal(id)}
document.querySelector('#open-log')?.addEventListener('click',()=>otevriSUctem('#log-modal'));
document.querySelector('#open-log-2')?.addEventListener('click',()=>otevriSUctem('#log-modal'));
document.querySelector('#open-comment')?.addEventListener('click',()=>otevriSUctem('#comment-modal'));
document.querySelector('#open-comment-2')?.addEventListener('click',()=>otevriSUctem('#comment-modal'));
document.querySelectorAll('.modal-close').forEach(button=>button.addEventListener('click',()=>closeModal(document.querySelector('#'+button.dataset.close))));
document.querySelectorAll('.modal-backdrop').forEach(backdrop=>backdrop.addEventListener('click',event=>{if(event.target===backdrop)closeModal(backdrop)}));
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.modal-backdrop.open').forEach(closeModal)});

/* ---- poloha ---- */
const geoCapture=document.querySelector('#geo-capture');
const geoButton=document.querySelector('#geo-get');
const geoStatus=document.querySelector('#geo-status');
let geoFix=null;
function geoChybaText(err){
  if(/FBAN|FBAV|FB_IAB|Instagram/i.test(navigator.userAgent))
    return 'Prohlížeč uvnitř aplikace (Facebook, Instagram…) polohu neumí. Otevři Atlas přes menu ⋮ v běžném prohlížeči — bez polohy zápis pořídit nelze.';
  if(err&&err.code===1)
    return 'Přístup k poloze je zablokovaný. Klepni na ikonu vedle adresy → Oprávnění → Poloha → Povolit a stránku obnov. Bez polohy zápis pořídit nelze.';
  if(err&&err.code===3)
    return 'Hledání polohy trvá moc dlouho. Zkus to prosím znovu.';
  return 'Polohu se nepodařilo načíst. Máš v telefonu zapnutou polohu (GPS)? Jsi venku, pod otevřeným nebem?';
}
function geoReset(){geoFix=null;geoCapture?.classList.remove('ready');if(!geoStatus)return;geoStatus.className='geo-status';geoStatus.textContent='Poloha zatím nenačtena. Musíš stát přímo na místě.';geoButton.textContent='◎ Načíst mou polohu';geoButton.disabled=false}
geoButton?.addEventListener('click',()=>{
  if(!navigator.geolocation){geoStatus.className='geo-status err';geoStatus.textContent='Tvůj prohlížeč polohu nepodporuje.';return}
  geoStatus.className='geo-status';geoStatus.textContent='Hledám tvou polohu…';geoButton.disabled=true;
  navigator.geolocation.getCurrentPosition(position=>{
    const{latitude,longitude,accuracy}=position.coords;
    geoFix={lat:latitude,lng:longitude,accuracy};
    geoCapture.classList.add('ready');
    geoStatus.className='geo-status ok';
    geoStatus.innerHTML=`<b>${latitude.toFixed(5)} N, ${longitude.toFixed(5)} E</b><br>přesnost ±${Math.round(accuracy)} m`;
    geoButton.textContent='◎ Načíst znovu';geoButton.disabled=false;
  },error=>{
    geoStatus.className='geo-status err';
    geoStatus.textContent=geoChybaText(error);
    geoButton.disabled=false;
  },{enableHighAccuracy:true,timeout:12000,maximumAge:0});
});

/* ---- fotka ze zápisu ---- */
const logPhotoInputs=[document.querySelector('#log-photo-cam'),document.querySelector('#log-photo-gal')].filter(Boolean);
const logPhotoPreview=document.querySelector('#log-photo-preview');
const logPhotoText=document.querySelector('#log-photo-drop .photo-text');
let logPhotoFile=null;
logPhotoInputs.forEach(input=>input.addEventListener('change',()=>{
  const file=input.files[0];
  if(!file)return;
  logPhotoFile=file;
  if(logPhotoPreview.src&&logPhotoPreview.src.startsWith('blob:'))URL.revokeObjectURL(logPhotoPreview.src);
  logPhotoPreview.src=URL.createObjectURL(file);
  logPhotoPreview.hidden=false;
  if(logPhotoText) logPhotoText.textContent='Fotka připravena — klepni pro změnu';
  input.value='';
}));
function logPhotoReset(){logPhotoFile=null;if(!logPhotoPreview)return;if(logPhotoPreview.src&&logPhotoPreview.src.startsWith('blob:'))URL.revokeObjectURL(logPhotoPreview.src);logPhotoPreview.hidden=true;logPhotoPreview.removeAttribute('src');if(logPhotoText)logPhotoText.textContent='Přidej fotku z návštěvy'}

/* ---- posuvníky DNA ---- */
document.querySelectorAll('.slider-row input[type=range]').forEach(slider=>{
  const out=slider.parentElement.querySelector('output');
  const sync=()=>{out.textContent=slider.value};
  slider.addEventListener('input',sync);sync();
});

/* ---- dodatečné fotky galerie (autor místa nebo správce) ---- */
async function pridejFotky(input, autorId, stavajici){
  const db=window.atlasDb, ucet=window.atlasUcet&&window.atlasUcet();
  const soubory=[...input.files].slice(0,6);
  const dlazdice=input.closest('.galerie-add');
  input.value='';
  if(!soubory.length||!ucet||!mistoData)return;
  if((stavajici?.length||0)+soubory.length>12){notify('Galerie má strop 12 fotek.');return}
  if(!navigator.onLine){notify('Jsi mimo signál — fotky do galerie nahraj, až se připojíš.');return}

  /* dlaždice se promění v ukazatel průběhu, ať je vidět, že se něco děje */
  if(dlazdice){
    dlazdice.style.pointerEvents='none';
    dlazdice.innerHTML='<span>Nahrávám…</span>&nbsp;<b class="up-cit">0/'+soubory.length+'</b>';
  }
  const citac=n=>{const b=dlazdice&&dlazdice.querySelector('.up-cit');if(b)b.textContent=n+'/'+soubory.length};

  let maxPoradi=0;(stavajici||[]).forEach(f=>{if(f.poradi>maxPoradi)maxPoradi=f.poradi});
  const radky=[];
  for(let i=0;i<soubory.length;i++){
    citac(i+1);
    let blob=soubory[i], pripona='jpg';
    if(window.atlasZpracujFoto){const z=await window.atlasZpracujFoto(soubory[i]);blob=z.blob;pripona=z.pripona}
    const cesta=`mista/${mistoData.id}/${Date.now()}-${i}.${pripona}`;
    const {error:fe}=await db.storage.from('atlas').upload(cesta,blob,{contentType:blob.type||'image/jpeg',upsert:false});
    if(!fe)radky.push({misto_id:mistoData.id,autor_id:ucet.id,cesta,poradi:++maxPoradi});
  }
  if(!radky.length){
    notify('Fotky se nepodařilo nahrát. Zkontroluj připojení a zkus to znovu.');
    await nactiFotky(autorId);   /* překreslí galerii a vrátí dlaždici do původního stavu */
    return;
  }
  const {error}=await db.from('atlas_fotky').insert(radky);
  if(error){
    radky.forEach(r=>db.storage.from('atlas').remove([r.cesta]));
    notify('Fotky se nepodařilo uložit: '+error.message);
    await nactiFotky(autorId);
    return;
  }
  notify(radky.length===1?'Fotka přidána 🌿':'Fotky přidány 🌿');
  await nactiFotky(autorId);
}

async function smazFoto(f, autorId){
  if(!f)return;
  const db=window.atlasDb;
  const otazka=(window.t?window.t('Opravdu smazat tuhle fotku?'):'Opravdu smazat tuhle fotku?');
  if(!confirm(otazka))return;
  const {data:smazano,error}=await db.from('atlas_fotky').delete().eq('id',f.id).select('id');
  if(error||!smazano||!smazano.length){notify('Fotku se nepodařilo smazat'+(error?': '+error.message:'.'));return}
  db.storage.from('atlas').remove([f.cesta]);
  notify('Fotka smazána.');
  await nactiFotky(autorId);
}

/* ---- offline fronta zápisů ----
   Bez signálu se zápis (včetně fotky a polohy z místa) uschová v telefonu
   a odešle se sám, jakmile se síť vrátí. Poloha i časové razítko jsou z okamžiku návštěvy. */
function frontaDb(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open('atlas-fronta',1);
    r.onupgradeneeded=()=>{r.result.createObjectStore('zapisy',{autoIncrement:true})};
    r.onsuccess=()=>res(r.result);
    r.onerror=()=>rej(r.error);
  });
}
async function frontaPridej(polozka){
  const d=await frontaDb();
  return new Promise((res,rej)=>{
    const t=d.transaction('zapisy','readwrite');
    t.objectStore('zapisy').add(polozka);
    t.oncomplete=()=>res();
    t.onerror=()=>rej(t.error);
  });
}
async function frontaVse(){
  const d=await frontaDb();
  return new Promise((res,rej)=>{
    const t=d.transaction('zapisy','readonly').objectStore('zapisy').openCursor();
    const out=[];
    t.onsuccess=()=>{const c=t.result;if(c){out.push({klic:c.key,z:c.value});c.continue()}else res(out)};
    t.onerror=()=>rej(t.error);
  });
}
async function frontaSmaz(klic){
  const d=await frontaDb();
  return new Promise((res,rej)=>{
    const t=d.transaction('zapisy','readwrite');
    t.objectStore('zapisy').delete(klic);
    t.oncomplete=()=>res();
    t.onerror=()=>rej(t.error);
  });
}
function jeSitovaChyba(e){
  if(!navigator.onLine)return true;
  if(!e)return false;
  if(e instanceof TypeError)return true;
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(e.message||'');
}
let frontaBezi=false;
async function zpracujFrontu(){
  if(frontaBezi||!navigator.onLine)return;
  const db=window.atlasDb;
  if(!db)return;
  frontaBezi=true;
  try{
    const cekajici=await frontaVse();
    for(const {klic,z} of cekajici){
      try{
        const zaznam=z.zaznam;
        if(z.fotoBlob){
          const cesta=`zapisy/${zaznam.misto_id}/${Date.now()}.${z.pripona||'jpg'}`;
          const {error:fe}=await db.storage.from('atlas').upload(cesta,z.fotoBlob,{contentType:z.fotoTyp||'image/jpeg'});
          if(fe){
            if(jeSitovaChyba(fe))throw fe;   /* síť: nechat ve frontě, zkusit později */
            /* jiná chyba fotky: odeslat zápis bez ní */
          } else zaznam.fotka=cesta;
        }
        const {error}=await db.from('atlas_zapisy').insert(zaznam);
        if(error){
          if(jeSitovaChyba(error))throw error;
          /* server zápis odmítl (vzdálenost, duplicita) — z fronty pryč, ať se nezkouší donekonečna */
          if(zaznam.fotka)db.storage.from('atlas').remove([zaznam.fotka]);
          await frontaSmaz(klic);
          notify(error.message.includes('m od místa')?('Uschovaný zápis nebyl přijat: '+error.message)
            :(error.code==='23505'?'Uschovaný zápis nebyl přijat — z toho místa už ten den zápis máš.'
            :'Uschovaný zápis nebyl přijat: '+error.message));
          continue;
        }
        await frontaSmaz(klic);
        notify('Uschovaný zápis z místa se právě odeslal 🌿');
        if(mistoData&&mistoData.id===zaznam.misto_id)nactiMisto();
      }catch(e){break}   /* síť zase vypadla — zbytek fronty počká */
    }
  }catch(_){}finally{frontaBezi=false}
}
window.addEventListener('online',zpracujFrontu);
if(window.atlasAuthReady)zpracujFrontu();
else window.addEventListener('atlas-auth-ready',zpracujFrontu,{once:true});

/* ---- odeslání zápisu ---- */
document.querySelector('#log-form')?.addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.currentTarget;
  if(!geoFix){notify('Nejdřív načti svou polohu — zápis vzniká jen na místě.');geoButton?.focus();return}
  if(!window.vyzadujUcet||!window.vyzadujUcet())return;
  if(!mistoData){notify('Místo se ještě nenačetlo, zkus to za okamžik.');return}
  const textZapisu=form.querySelector('textarea').value.trim();
  if(!textZapisu){notify('Zápis nemůže být prázdný.');return}

  const db=window.atlasDb, ucet=window.atlasUcet();
  const odeslat=form.querySelector('button[type=submit]');
  const puvodni=odeslat.textContent; odeslat.disabled=true; odeslat.textContent='Ukládám…';

  const hodnota=axis=>Number(document.querySelector(`.slider-row input[data-axis="${axis}"]`).value);
  const zaznam={
    misto_id:mistoData.id,
    autor_id:ucet.id,
    text:textZapisu,
    poloha:`SRID=4326;POINT(${geoFix.lng} ${geoFix.lat})`,
    presnost_m:Math.round(geoFix.accuracy),
    klid:hodnota('Klid'), energie:hodnota('Energie'), mystika:hodnota('Mystika'),
    krasa:hodnota('Krása'), lecivost:hodnota('Léčivost')
  };

  /* společný šťastný konec: zavřít, vyčistit, poděkovat */
  const uklid=zprava=>{
    odeslat.disabled=false; odeslat.textContent=puvodni;
    closeModal(document.querySelector('#log-modal'));
    form.reset(); geoReset(); logPhotoReset();
    document.querySelectorAll('.slider-row input[type=range]').forEach(s=>s.dispatchEvent(new Event('input')));
    notify(zprava);
  };
  /* uschovat do telefonu, když není síť */
  const uschovej=async blob=>{
    try{
      await frontaPridej({zaznam,fotoBlob:blob||null,fotoTyp:blob?(blob.type||'image/jpeg'):null,pripona:blob?pripona:null,vytvoreno:Date.now()});
      uklid('Jsi mimo signál — zápis je uschovaný v telefonu a odešle se sám, až se připojíš.');
    }catch(e){
      odeslat.disabled=false; odeslat.textContent=puvodni;
      notify('Zápis se nepodařilo uschovat. Zůstává vyplněný — zkus Uložit, až chytíš signál.');
    }
  };

  let pripona='jpg', fotoBlob=null;
  if(logPhotoFile){
    fotoBlob=logPhotoFile;
    if(window.atlasZpracujFoto){ const z=await window.atlasZpracujFoto(logPhotoFile); fotoBlob=z.blob; pripona=z.pripona; }
  }

  /* bez sítě rovnou do fronty — nic nezkoušet, ať to netrvá */
  if(!navigator.onLine){ await uschovej(fotoBlob); return; }

  if(fotoBlob){
    const cesta=`zapisy/${mistoData.id}/${Date.now()}.${pripona}`;
    const {error:fe}=await db.storage.from('atlas').upload(cesta,fotoBlob,{contentType:fotoBlob.type||'image/jpeg'});
    if(fe){
      if(jeSitovaChyba(fe)){ await uschovej(fotoBlob); return; }
      notify('Fotku se nepodařilo nahrát — zápis uložím bez ní.');
    }
    else zaznam.fotka=cesta;
  }

  const {error}=await db.from('atlas_zapisy').insert(zaznam);

  if(error){
    if(jeSitovaChyba(error)){ delete zaznam.fotka; await uschovej(fotoBlob); return; }
    odeslat.disabled=false; odeslat.textContent=puvodni;
    console.error(error);
    if(zaznam.fotka) db.storage.from('atlas').remove([zaznam.fotka]);
    notify(error.message.includes('m od místa') ? error.message
      : (error.code==='23505' ? 'Z tohoto místa už dnes zápis máš. Přijď zas jindy.'
      : 'Zápis se nepodařilo uložit: '+error.message));
    return;
  }
  uklid('Zápis uložen. Tvé vnímání vstoupilo do DNA místa.');
  nactiMisto();
});

/* ---- odeslání komentáře ---- */
document.querySelector('#comment-form')?.addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.currentTarget;
  if(!window.vyzadujUcet||!window.vyzadujUcet())return;
  if(!mistoData){notify('Místo se ještě nenačetlo, zkus to za okamžik.');return}
  const textKomentare=form.querySelector('textarea').value.trim();
  if(!textKomentare){notify('Komentář nemůže být prázdný.');return}

  const db=window.atlasDb, ucet=window.atlasUcet();
  const odeslat=form.querySelector('button[type=submit]');
  odeslat.disabled=true;
  const {error}=await db.from('atlas_komentare').insert({
    misto_id:mistoData.id, autor_id:ucet.id,
    text:textKomentare
  });
  odeslat.disabled=false;
  if(error){console.error(error);notify('Komentář se nepodařilo uložit: '+error.message);return}
  closeModal(document.querySelector('#comment-modal'));
  form.reset();
  notify('Děkujeme! Komentář je zveřejněn.');
  nactiKomentare();
});

/* ---- start ---- */
if (window.atlasAuthReady) nactiMisto();
else window.addEventListener('atlas-auth-ready', nactiMisto, {once:true});
