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
  if (m.zapisu) metaCasti.push(`<b>${m.zapisu} ${m.zapisu===1?'návštěva':m.zapisu<5?'návštěvy':'návštěv'}</b>`);
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
  if (m.zapisu) note.innerHTML = `Průměr z <b>${m.zapisu} ${m.zapisu===1?'návštěvy':'návštěv'}</b> poutníků.`;
  else note.textContent = 'Zatím bez návštěv — DNA se objeví s první zapsanou návštěvou.';

  await nactiFotky(m.autor_id, fotkyPromise);

  nactiKomentare();
  nactiMojeNavstevy();
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
  const { data } = await (hotovyDotaz || db.rpc('atlas_misto_fotky', { p_slug: SLUG }));
  const fotky = data || [];
  // hlavní foto do hero — prolne se až po načtení (žádné probliknutí)
  nastavHero(fotky.length ? window.atlasFotoUrl(fotky[0].cesta) : 'img/brana-svit.jpg');

  // smí přeřazovat? autor místa nebo správce
  const ucet = window.atlasUcet && window.atlasUcet();
  const profil = window.atlasProfil && window.atlasProfil();
  const jeSpravce = !!(profil && profil.spravce);
  const jeAutor = !!(ucet && autorId && ucet.id === autorId);
  const smiRadit = jeSpravce || jeAutor;   /* autor své místo eviduje, mazat smí jen správce */

  // galerie zobraz jen když je víc fotek, nebo když smí správce/autor spravovat
  const grid = document.querySelector('#galerie-grid');
  const sekce = document.querySelector('#place-galerie');
  if (!grid || !sekce) return;
  if (fotky.length < 2 && !smiRadit) return;   /* poutníkovi se galerie ukáže až od dvou fotek; autor a správce ji vidí vždy (kvůli dlaždici ➕) */

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
let lbFotky=[], lbIndex=0, lbSmi=false, lbAutorId=null, lbZKomentare=false;
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
      `<button type="button" class="lb-galerie">Do galerie</button>`+
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
  lb.querySelector('.lb-galerie').addEventListener('click',async()=>{
    const f=lbFotky[lbIndex]; if(!f||!f.cesta)return;
    const db=window.atlasDb, ucet=window.atlasUcet&&window.atlasUcet();
    const {data:posl}=await db.from('atlas_fotky').select('poradi').eq('misto_id',mistoData.id).order('poradi',{ascending:false}).limit(1);
    const poradi=((posl&&posl[0]&&posl[0].poradi)||0)+1;
    const {error}=await db.from('atlas_fotky').insert({misto_id:mistoData.id,autor_id:ucet.id,cesta:f.cesta,poradi});
    if(error){notify('Nepodařilo se: '+error.message);return}
    zavriLightbox(); notify('Fotka povýšena do galerie 🌿'); await nactiFotky(mistoData.autor_id);
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
function otevriLightbox(fotky,index,smi,autorId,zKomentare){
  lbFotky=fotky; lbIndex=index; lbSmi=!!smi; lbAutorId=autorId; lbZKomentare=!!zKomentare;
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
  const profil=window.atlasProfil&&window.atlasProfil();
  const spravce=!!(profil&&profil.spravce);
  akce.hidden=!(lbSmi||(lbZKomentare&&spravce));
  akce.querySelector('.lb-hlavni').hidden=lbZKomentare||(lbIndex===0);
  akce.querySelector('.lb-smaz').hidden=lbZKomentare||!spravce;   /* mazání jen správce */
  akce.querySelector('.lb-galerie').hidden=!(lbZKomentare&&spravce);
}

async function nactiKomentare(){
  const db=window.atlasDb, box=document.querySelector('#comment-list');
  const [komentare, navstevnici] = await Promise.all([
    db.from('atlas_komentare')
      .select('id,autor_id,text,fotka,vytvoreno,atlas_profily(nick)')
      .eq('misto_id', mistoData.id).eq('stav','zverejneny').order('vytvoreno',{ascending:false}).limit(50),
    db.from('atlas_zapisy').select('autor_id,vzdalenost_m').eq('misto_id', mistoData.id)
  ]);
  const { data, error } = komentare;
  if (error){
    box.innerHTML = `<li class="log-prazdno">Komentáře se nepodařilo načíst. Zkus obnovit stránku.</li>`;
    return;
  }
  if (!data || !data.length){
    box.innerHTML = `<li class="log-prazdno">Zatím bez komentářů. Byl jsi tu? Poděl se o pár slov.</li>`;
    return;
  }
  const bylTu = new Set((navstevnici.data||[]).map(z=>z.autor_id));
  const overen = new Set((navstevnici.data||[]).filter(z=>z.vzdalenost_m!=null).map(z=>z.autor_id));
  const ucet=window.atlasUcet&&window.atlasUcet(), profil=window.atlasProfil&&window.atlasProfil();
  box.innerHTML = data.map(k=>{
    const nick = k.atlas_profily?.nick || 'poutník';
    const odznak = overen.has(k.autor_id) ? '<span class="log-badge">◎ ověřeno na místě</span>'
                 : (bylTu.has(k.autor_id) ? '<span class="log-badge">✦ byl tu</span>' : '');
    const foto = k.fotka ? `<img class="koment-foto" data-cesta="${k.fotka}" src="${window.atlasFotoUrl(k.fotka)}" alt="Fotka od poutníka" loading="lazy" style="display:block;max-width:180px;max-height:140px;object-fit:cover;border-radius:10px;margin-top:8px;cursor:zoom-in" />` : '';
    const smi = (profil&&profil.spravce) || (ucet&&ucet.id===k.autor_id);
    const upr = smi ? `<button type="button" class="edit-link" data-edit-koment="${k.id}">✎ Upravit</button>` : '';
    return `<li class="log-item comment" data-koment="${k.id}"><div class="log-head"><span class="log-nick">${escHtml(nick)}</span>${odznak}<time>${fmtDatum(k.vytvoreno)}</time></div><p class="koment-text">${escHtml(k.text)}</p>${foto}${upr}</li>`;
  }).join('');
  box.querySelectorAll('.koment-foto').forEach(img=>{
    img.addEventListener('click',()=>otevriLightbox([{id:null,cesta:img.dataset.cesta}],0,false,mistoData.autor_id,true));
  });
  if(ucet||profil) box.querySelectorAll('[data-edit-koment]').forEach(b=>{
    const k=data.find(x=>String(x.id)===b.dataset.editKoment);
    b.addEventListener('click',()=>otevriEditKoment(k));
  });
}

/* ---- tvé návštěvy: přehled pod akcemi a úprava naladění (pět os DNA) ---- */
async function nactiMojeNavstevy(){
  const box=document.querySelector('#moje-navstevy');
  if(!box) return;
  const db=window.atlasDb, ucet=window.atlasUcet&&window.atlasUcet();
  if(!db||!ucet||!mistoData){ box.hidden=true; return; }
  const { data, error } = await db.from('atlas_zapisy')
    .select('id,vytvoreno,vzdalenost_m,klid,energie,mystika,krasa,lecivost')
    .eq('misto_id', mistoData.id).eq('autor_id', ucet.id)
    .order('vytvoreno',{ascending:false}).limit(20);
  if(error||!data||!data.length){ box.hidden=true; return; }
  box.hidden=false;
  box.innerHTML = '<div class="mn-box"><span class="mn-titul">★ Tvé návštěvy</span>' + data.map(z=>
    `<span class="mn-radek">${fmtDatum(z.vytvoreno)}`+
      (z.vzdalenost_m!=null?' <span class="log-badge">◎ ověřeno na místě</span>':'')+
      `<button type="button" class="mn-upravit" data-zapis="${z.id}">✎ Upravit naladění</button>`+
    `</span>`).join('') + '</div>';
  box.querySelectorAll('[data-zapis]').forEach(b=>{
    const z=data.find(x=>String(x.id)===b.dataset.zapis);
    b.addEventListener('click',()=>otevriEditZapis(z));
  });
}
function otevriEditZapis(z){
  const m=document.querySelector('#edit-log-modal'); if(!m||!z) return;
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
  const dna={}; m.querySelectorAll('#edit-log-dna input[type=range]').forEach(r=>{dna[r.dataset.k]=Number(r.value)});
  const btn=event.currentTarget.querySelector('button[type=submit]'); btn.disabled=true; const p=btn.textContent; btn.textContent='Ukládám…';
  const {data:upraveno,error}=await db.from('atlas_zapisy').update(dna).eq('id',m.dataset.id).select('id');
  btn.disabled=false; btn.textContent=p;
  if(error){notify('Úprava se nepodařila: '+error.message);return}
  if(!upraveno||!upraveno.length){notify('Úprava se neuložila — nemáš k ní oprávnění, nebo vypršelo přihlášení.');return}
  closeModal(m); notify('Naladění upraveno 🌿'); nactiMisto();
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
    return 'Prohlížeč uvnitř aplikace (Facebook, Instagram…) polohu neumí. Návštěvu můžeš uložit i bez ověření.';
  if(err&&err.code===1)
    return 'Přístup k poloze je zablokovaný — povol ho přes ikonu vedle adresy. Návštěvu ale můžeš uložit i bez ověření.';
  if(err&&err.code===3)
    return 'Hledání polohy trvá moc dlouho. Zkus to prosím znovu.';
  return 'Polohu se nepodařilo načíst. Máš v telefonu zapnutou polohu (GPS)? Jsi venku, pod otevřeným nebem?';
}
function geoReset(){geoFix=null;geoCapture?.classList.remove('ready');if(!geoStatus)return;geoStatus.className='geo-status';geoStatus.textContent='Nepovinné — ověřená návštěva získá odznak ◎ ověřeno na místě.';geoButton.textContent='◎ Ověřit, že tu stojím';geoButton.disabled=false}
geoButton?.addEventListener('click',()=>{
  if(!navigator.geolocation){geoStatus.className='geo-status err';geoStatus.textContent='Tvůj prohlížeč polohu nepodporuje.';return}
  geoStatus.className='geo-status';geoStatus.textContent='Hledám tvou polohu…';geoButton.disabled=true;
  navigator.geolocation.getCurrentPosition(position=>{
    const{latitude,longitude,accuracy}=position.coords;
    geoFix={lat:latitude,lng:longitude,accuracy};
    geoCapture.classList.add('ready');
    geoStatus.className='geo-status ok';
    geoStatus.innerHTML=`<b>${latitude.toFixed(5)} N, ${longitude.toFixed(5)} E</b><br>přesnost ±${Math.round(accuracy)} m`;
    geoButton.textContent='◎ Ověřit znovu';geoButton.disabled=false;
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
        const {error}=await db.from('atlas_zapisy').insert(zaznam);
        if(error){
          if(jeSitovaChyba(error))throw error;
          await frontaSmaz(klic);
          notify(error.message.includes('m od místa')?('Uschovaná návštěva nebyla přijata: '+error.message)
            :(error.code==='23505'?'Uschovaná návštěva nebyla přijata — ten den už tu jednu máš.'
            :'Uschovaná návštěva nebyla přijata: '+error.message));
          continue;
        }
        if(z.komentarText||z.fotoBlob){
          const koment={misto_id:zaznam.misto_id,autor_id:zaznam.autor_id,text:z.komentarText||'✦'};
          if(z.fotoBlob){
            const cesta=`komentare/${zaznam.misto_id}/${Date.now()}.${z.pripona||'jpg'}`;
            const {error:fe}=await db.storage.from('atlas').upload(cesta,z.fotoBlob,{contentType:z.fotoTyp||'image/jpeg'});
            if(!fe) koment.fotka=cesta;
          }
          await db.from('atlas_komentare').insert(koment);
        }
        await frontaSmaz(klic);
        notify('Uschovaná návštěva se právě odeslala 🌿');
        if(mistoData&&mistoData.id===zaznam.misto_id)nactiMisto();
            }catch(e){break}   /* síť zase vypadla — zbytek fronty počká */
    }
  }catch(_){}finally{frontaBezi=false}
}
window.addEventListener('online',zpracujFrontu);
if(window.atlasAuthReady)zpracujFrontu();
else window.addEventListener('atlas-auth-ready',zpracujFrontu,{once:true});

/* ---- odeslání návštěvy ---- */
document.querySelector('#log-form')?.addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.currentTarget;
  if(!window.vyzadujUcet||!window.vyzadujUcet())return;
  if(!mistoData){notify('Místo se ještě nenačetlo, zkus to za okamžik.');return}
  const slova=form.querySelector('textarea').value.trim();

  const db=window.atlasDb, ucet=window.atlasUcet();
  const odeslat=form.querySelector('button[type=submit]');
  const puvodni=odeslat.textContent; odeslat.disabled=true; odeslat.textContent='Ukládám…';

  const hodnota=axis=>Number(document.querySelector(`.slider-row input[data-axis="${axis}"]`).value);
  const zaznam={
    misto_id:mistoData.id,
    autor_id:ucet.id,
    text:'',
    klid:hodnota('Klid'), energie:hodnota('Energie'), mystika:hodnota('Mystika'),
    krasa:hodnota('Krása'), lecivost:hodnota('Léčivost')
  };
  if(geoFix){ zaznam.poloha=`SRID=4326;POINT(${geoFix.lng} ${geoFix.lat})`; zaznam.presnost_m=Math.round(geoFix.accuracy); }

  /* společný šťastný konec */
  const uklid=zprava=>{
    odeslat.disabled=false; odeslat.textContent=puvodni;
    closeModal(document.querySelector('#log-modal'));
    form.reset(); geoReset(); logPhotoReset();
    document.querySelectorAll('#log-modal .slider-row input[type=range]').forEach(x=>x.dispatchEvent(new Event('input')));
    notify(zprava);
  };
  const uschovej=async blob=>{
    try{
      await frontaPridej({zaznam,komentarText:slova,fotoBlob:blob||null,fotoTyp:blob?(blob.type||'image/jpeg'):null,pripona:blob?pripona:null,vytvoreno:Date.now()});
      uklid('Jsi mimo signál — návštěva je uschovaná v telefonu a odešle se sama, až se připojíš.');
    }catch(e){
      odeslat.disabled=false; odeslat.textContent=puvodni;
      notify('Návštěvu se nepodařilo uschovat. Zůstává vyplněná — zkus Uložit, až chytíš signál.');
    }
  };

  let pripona='jpg', fotoBlob=null;
  if(logPhotoFile){
    fotoBlob=logPhotoFile;
    if(window.atlasZpracujFoto){ const z=await window.atlasZpracujFoto(logPhotoFile); fotoBlob=z.blob; pripona=z.pripona; }
  }

  if(!navigator.onLine){ await uschovej(fotoBlob); return; }

  const {error}=await db.from('atlas_zapisy').insert(zaznam);
  if(error){
    if(jeSitovaChyba(error)){ await uschovej(fotoBlob); return; }
    odeslat.disabled=false; odeslat.textContent=puvodni;
    console.error(error);
    notify(error.message.includes('m od místa') ? error.message
      : (error.code==='23505' ? 'Dnešní návštěvu tu už zapsanou máš. Další můžeš přidat zase jindy.'
      : 'Návštěvu se nepodařilo uložit: '+error.message));
    return;
  }

  /* slova a fotka putují na zeď jako komentář */
  if(slova||fotoBlob){
    const koment={misto_id:mistoData.id,autor_id:ucet.id,text:slova||'✦'};
    if(fotoBlob){
      const cesta=`komentare/${mistoData.id}/${Date.now()}.${pripona}`;
      const {error:fe}=await db.storage.from('atlas').upload(cesta,fotoBlob,{contentType:fotoBlob.type||'image/jpeg'});
      if(!fe) koment.fotka=cesta;
    }
    await db.from('atlas_komentare').insert(koment);
  }
  uklid(geoFix?'Návštěva zapsána s ověřením ◎ Tvé naladění vstoupilo do DNA místa.':'Návštěva zapsána ✦ Tvé naladění vstoupilo do DNA místa.');
  nactiMisto();
});

/* ---- odeslání komentáře ---- */
const comPhotoInputs=[document.querySelector('#com-photo-cam'),document.querySelector('#com-photo-gal')].filter(Boolean);
const comPhotoPreview=document.querySelector('#com-photo-preview');
const comPhotoText=document.querySelector('#com-photo-drop .photo-text');
let comPhotoFile=null;
comPhotoInputs.forEach(input=>input.addEventListener('change',()=>{
  const file=input.files[0]; if(!file)return;
  comPhotoFile=file;
  if(comPhotoPreview.src&&comPhotoPreview.src.startsWith('blob:'))URL.revokeObjectURL(comPhotoPreview.src);
  comPhotoPreview.src=URL.createObjectURL(file); comPhotoPreview.hidden=false;
  if(comPhotoText) comPhotoText.textContent='Fotka připravena — klepni pro změnu';
  input.value='';
}));
function comPhotoReset(){comPhotoFile=null;if(!comPhotoPreview)return;if(comPhotoPreview.src&&comPhotoPreview.src.startsWith('blob:'))URL.revokeObjectURL(comPhotoPreview.src);comPhotoPreview.hidden=true;comPhotoPreview.removeAttribute('src');if(comPhotoText)comPhotoText.textContent='Přidej fotku'}

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
  const koment={misto_id:mistoData.id,autor_id:ucet.id,text:textKomentare};
  if(comPhotoFile){
    let blob=comPhotoFile, pripona='jpg';
    if(window.atlasZpracujFoto){const z=await window.atlasZpracujFoto(comPhotoFile);blob=z.blob;pripona=z.pripona}
    const cesta=`komentare/${mistoData.id}/${Date.now()}.${pripona}`;
    const {error:fe}=await db.storage.from('atlas').upload(cesta,blob,{contentType:blob.type||'image/jpeg'});
    if(fe){notify('Fotku se nepodařilo nahrát — komentář uložím bez ní.');}
    else koment.fotka=cesta;
  }
  const {error}=await db.from('atlas_komentare').insert(koment);
  odeslat.disabled=false;
  if(error){console.error(error);notify('Komentář se nepodařilo uložit: '+error.message);return}
  closeModal(document.querySelector('#comment-modal'));
  form.reset(); comPhotoReset();
  const profilK=window.atlasProfil&&window.atlasProfil();
  notify(profilK&&profilK.spravce?'Komentář je na zdi 🌿':'Děkujeme! Komentář se ukáže po schválení.');
  nactiKomentare();
});

/* ---- start ---- */
if (window.atlasAuthReady) nactiMisto();
else window.addEventListener('atlas-auth-ready', nactiMisto, {once:true});
