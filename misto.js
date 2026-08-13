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

/* světelný sloup čaker: koruna nahoře, kořen dole; sytost bodu = podíl návštěv,
   které čakru vnímaly. Ukáže se až s prvním hlasem — prázdný sloup by mátl. */
function vykresliCakry(m){
  const sloup=document.querySelector('#cakra-sloup'), pater=document.querySelector('#cakra-pater'), note=document.querySelector('#cakra-note');
  if(!sloup||!pater||!window.ATLAS_CAKRY) return;
  const hlasu = m && m.cakry_hlasu ? m.cakry_hlasu : 0;
  if(!hlasu){ sloup.hidden=true; return; }
  const pocty = m.cakry || [0,0,0,0,0,0,0];
  sloup.hidden=false;
  pater.innerHTML=[...window.ATLAS_CAKRY].reverse().map(k=>{
    const n=pocty[k.c-1]||0, podil=n/hlasu;
    return `<div class="cakra-radek" style="--ck:${k.barva};--sila:${podil.toFixed(3)}"><i></i><span>${k.nazev}</span><b>${n?Math.round(podil*100)+' %':'–'}</b></div>`;
  }).join('');
  note.textContent=`Uvedlo ${hlasu} z ${m.zapisu} ${m.zapisu===1?'návštěvy':'návštěv'}.`;
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
  const tt = k => (window.t ? window.t(k) : k);
  document.title = `${m.nazev} — ${tt('Atlas energetických míst')}`;

  document.querySelector('#place-nazev').textContent = m.nazev;

  /* oficiální název jako podnázev pod hlavním (prefix se překládá, jméno ne) */
  {
    const h1 = document.querySelector('#place-nazev');
    const stary = h1.nextElementSibling;
    if (stary && stary.classList.contains('place-podnazev')) stary.remove();
    if (m.nazev_oficialni) h1.insertAdjacentHTML('afterend',
      '<p class="place-podnazev" data-i18n="off">' + tt('na mapách') + ' ' + escHtml(m.nazev_oficialni) + '</p>');
  }
  document.querySelector('#place-souradnice').textContent = window.atlasSouradnice(m.lat, m.lng);
  document.querySelector('#place-tags').innerHTML =
    (m.stitky||[]).map(k=>`<span>${window.atlasStitek(k)}</span>`).join('');

  const rys = window.atlasRys(m.zapisu ? m : null);
  const metaCasti = [];
  if (m.zapisu) metaCasti.push(`<b>${m.zapisu} ${m.zapisu===1?'návštěva':m.zapisu<5?'návštěvy':'návštěv'}</b>`);
  if (rys) metaCasti.push(`nejsilnější rys <b>${rys}</b>`);
  if (m.autor_nick) metaCasti.push(`přidal <span data-i18n="off">${escHtml(m.autor_nick)}</span>`);
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
  const vypraveni = (m.popis||'').trim();
  textEl.innerHTML = vypraveni
    ? `<section class="place-section"><p class="eyebrow">O místě</p>${
        vypraveni.split(/\n\s*\n/).map(o=>`<p data-i18n="off">${escHtml(o.trim()).replace(/\n/g,'<br />')}</p>`).join('')
      }</section>`
    : '<section class="place-section"><p>U tohoto místa zatím není žádný popis.</p></section>';

  vykresliRadar(m.zapisu ? m : null);
  const note = document.querySelector('#dna-note');
  if (m.zapisu) note.innerHTML = `Průměr z <b>${m.zapisu} ${m.zapisu===1?'návštěvy':'návštěv'}</b> poutníků.`;
  else note.textContent = 'Zatím bez návštěv — DNA se objeví s první zapsanou návštěvou.';
  vykresliCakry(m);

  await nactiFotky(m.autor_id, fotkyPromise);

  nactiKomentare();
  nactiMojeNavstevy();
  nastavUpravuMista();
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
  const smiRadit = jeSpravce || jeAutor;   /* řadit a přidávat smí autor místa a správce; svou fotku smaže i ten, kdo ji nahrál */

  // galerie zobraz jen když je víc fotek, nebo když smí správce/autor spravovat
  const grid = document.querySelector('#galerie-grid');
  const sekce = document.querySelector('#place-galerie');
  if (!grid || !sekce) return;
  const mamTuFotku = !!(ucet && fotky.some(f=>f.autor_id===ucet.id));
  if (fotky.length < 2 && !smiRadit && !mamTuFotku) return;   /* poutníkovi se galerie ukáže až od dvou fotek; autor a správce ji vidí vždy (kvůli dlaždici ➕) */

  sekce.hidden = false;
  grid.innerHTML = fotky.map((f,i)=>{
    const url = window.atlasFotoUrl(f.cesta) || '';
    const hlavni = i===0;
    /* koš rovnou na dlaždici — tam ho člověk hledá dřív než v otevřené fotce */
    const smiSmazat = jeSpravce || !!(ucet && f.autor_id && ucet.id === f.autor_id);
    return `<figure class="galerie-item${hlavni?' je-hlavni':''}" data-lb="${i}" style="cursor:zoom-in">
      <img src="${url}" alt="Fotka místa" loading="lazy" />
      ${hlavni ? '<span class="foto-odznak">Hlavní</span>' : ''}
      ${smiSmazat ? `<button type="button" class="galerie-smaz" data-smaz-foto="${i}" title="Smazat fotku" aria-label="Smazat fotku">🗑</button>` : ''}
    </figure>`;
  }).join('');
  grid.querySelectorAll('[data-lb]').forEach(el=>{
    el.addEventListener('click',()=>otevriLightbox(fotky, Number(el.dataset.lb), smiRadit, autorId));
  });
  grid.querySelectorAll('[data-smaz-foto]').forEach(b=>b.addEventListener('click',event=>{
    event.stopPropagation();          /* klepnutí na koš neotevírá fotku */
    smazFoto(fotky[Number(b.dataset.smazFoto)], autorId);
  }));

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
  const ucet=window.atlasUcet&&window.atlasUcet();
  const spravce=!!(profil&&profil.spravce);
  const mojeFotka=!!(ucet&&f.autor_id&&ucet.id===f.autor_id);
  akce.hidden=!(lbSmi||mojeFotka||(lbZKomentare&&spravce));
  akce.querySelector('.lb-hlavni').hidden=lbZKomentare||(lbIndex===0)||!lbSmi;
  akce.querySelector('.lb-smaz').hidden=lbZKomentare||!(spravce||mojeFotka);   /* svou fotku smaže i poutník */
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
    return `<li class="log-item comment" data-koment="${k.id}"><div class="log-head"><span class="log-nick" data-i18n="off">${escHtml(nick)}</span>${odznak}<time>${fmtDatum(k.vytvoreno)}</time></div><p class="koment-text" data-i18n="off">${escHtml(k.text)}</p>${foto}${upr}</li>`;
  }).join('');
  box.querySelectorAll('.koment-foto').forEach(img=>{
    img.addEventListener('click',()=>otevriLightbox([{id:null,cesta:img.dataset.cesta}],0,false,mistoData.autor_id,true));
  });
  if(ucet||profil) box.querySelectorAll('[data-edit-koment]').forEach(b=>{
    const k=data.find(x=>String(x.id)===b.dataset.editKoment);
    b.addEventListener('click',()=>otevriEditKoment(k));
  });
}

/* ---- úprava místa: smí autor a správce (poloha, štítky a stav jsou zmrazené v DB) ---- */
function nastavUpravuMista(){
  const btn=document.querySelector('#open-edit-place');
  if(!btn||!mistoData) return;
  const ucet=window.atlasUcet&&window.atlasUcet();
  const profil=window.atlasProfil&&window.atlasProfil();
  const smi=!!(profil&&profil.spravce) || !!(ucet&&ucet.id===mistoData.autor_id);
  btn.hidden=!smi;
}
const epTagy=document.querySelector('#ep-tagy');
epTagy?.addEventListener('click',event=>{
  const chip=event.target.closest('button');
  if(!chip)return;
  if(!chip.classList.contains('on')&&epTagy.querySelectorAll('.on').length>=3){notify('Vyber nejvýš tři štítky — ať zůstane jasné, čím místo je.');return}
  chip.classList.toggle('on');
});
document.querySelector('#open-edit-place')?.addEventListener('click',()=>{
  if(!mistoData) return;
  const dej=(id,hodnota)=>{const el=document.querySelector(id); if(el) el.value=hodnota||''};
  dej('#ep-nazev',mistoData.nazev);
  dej('#ep-nazev-oficialni',mistoData.nazev_oficialni);
  dej('#ep-popis',mistoData.popis);
  const vybrane=new Set(mistoData.stitky||[]);
  epTagy?.querySelectorAll('button').forEach(chip=>chip.classList.toggle('on', vybrane.has(chip.dataset.tag)));
  openModal('#edit-place-modal');
});
document.querySelector('#edit-place-form')?.addEventListener('submit',async event=>{
  event.preventDefault();
  const db=window.atlasDb;
  const nazev=document.querySelector('#ep-nazev').value.trim();
  if(!nazev){notify('Název nemůže zůstat prázdný.');return}
  const stitky=[...(epTagy?epTagy.querySelectorAll('.on'):[])].map(chip=>chip.dataset.tag);
  if(epTagy&&!stitky.length){notify('Vyber alespoň jeden štítek místa.');return}
  const btn=event.currentTarget.querySelector('button[type=submit]');
  btn.disabled=true; const puvodni=btn.textContent; btn.textContent='Ukládám…';
  const {data:ulozeno,error}=await db.from('atlas_mista').update({
    nazev,
    nazev_oficialni:document.querySelector('#ep-nazev-oficialni').value.trim()||null,
    popis:document.querySelector('#ep-popis').value.trim()||null,
    stitky
  }).eq('id',mistoData.id).select('id');
  btn.disabled=false; btn.textContent=puvodni;
  if(error){notify('Uložení se nepodařilo: '+error.message);return}
  if(!ulozeno||!ulozeno.length){notify('Změny se neuložily — nemáš k nim oprávnění, nebo vypršelo přihlášení.');return}
  closeModal(document.querySelector('#edit-place-modal'));
  notify('Místo upraveno 🌿');
  nactiMisto();
});

/* ---- tvé návštěvy: přehled pod akcemi a úprava naladění (pět os DNA) ---- */
async function nactiMojeNavstevy(){
  const box=document.querySelector('#moje-navstevy');
  if(!box) return;
  const db=window.atlasDb, ucet=window.atlasUcet&&window.atlasUcet();
  if(!db||!ucet||!mistoData){ box.hidden=true; return; }
  const { data, error } = await db.from('atlas_zapisy')
    .select('id,vytvoreno,vzdalenost_m,klid,energie,mystika,krasa,lecivost,cakry')
    .eq('misto_id', mistoData.id).eq('autor_id', ucet.id)
    .order('vytvoreno',{ascending:false}).limit(20);
  if(error||!data||!data.length){ box.hidden=true; mamOvereno=false; nastavGeoKrok(); return; }
  mamOvereno = data.some(z=>z.vzdalenost_m!=null);
  nastavGeoKrok();
  box.hidden=false;
  const posledni=fmtDatum(data[0].vytvoreno);
  const shrnuti = data.length===1
    ? posledni
    : `${data.length}× · <span class="mn-slovo">naposledy</span> ${posledni}`;
  const odznak  = mamOvereno ? ' <span class="log-badge">◎ ověřeno</span>' : '';
  box.innerHTML =
    '<div class="mn-box">'+
      `<button type="button" class="mn-souhrn" aria-expanded="false" aria-controls="mn-detail">`+
        `<span class="mn-titul">★ ${data.length===1?'Tvá návštěva':'Tvé návštěvy'}</span>`+
        `<span class="mn-shrnuti">${shrnuti}</span>${odznak}`+
        `<span class="mn-sipka" aria-hidden="true">▾</span>`+
      `</button>`+
      `<div class="mn-detail" id="mn-detail" hidden>`+
        data.map(z=>
          `<span class="mn-radek">${fmtDatum(z.vytvoreno)}`+
            (z.vzdalenost_m!=null?' <span class="log-badge">◎ ověřeno na místě</span>':'')+
            `<button type="button" class="mn-upravit" data-zapis="${z.id}">✎ Upravit naladění</button>`+
            `<button type="button" class="mn-smazat" data-smaz="${z.id}" title="Smazat návštěvu" aria-label="Smazat návštěvu">🗑</button>`+
          `</span>`).join('')+
      `</div>`+
    '</div>';
  const souhrn=box.querySelector('.mn-souhrn'), detail=box.querySelector('.mn-detail');
  souhrn.addEventListener('click',()=>{
    const otevreno = souhrn.getAttribute('aria-expanded')==='true';
    souhrn.setAttribute('aria-expanded', String(!otevreno));
    detail.hidden = otevreno;
  });
  box.querySelectorAll('[data-zapis]').forEach(b=>{
    const z=data.find(x=>String(x.id)===b.dataset.zapis);
    b.addEventListener('click',()=>otevriEditZapis(z));
  });
  box.querySelectorAll('[data-smaz]').forEach(b=>b.addEventListener('click',async()=>{
    if(!confirm('Smazat tuhle návštěvu? Její naladění odejde z DNA místa.'))return;
    b.disabled=true;
    const {data:smazano,error:chyba}=await db.from('atlas_zapisy').delete().eq('id',b.dataset.smaz).select('id');
    if(chyba||!smazano||!smazano.length){notify('Návštěvu se nepodařilo smazat'+(chyba?': '+chyba.message:'.'));b.disabled=false;return}
    notify('Návštěva smazána.');
    nactiMisto();
  }));
}
function otevriEditZapis(z){
  const m=document.querySelector('#edit-log-modal'); if(!m||!z) return;
  m.querySelectorAll('#edit-log-dna input[type=range]').forEach(r=>{
    r.value=z[r.dataset.k]; r.closest('.slider-row').querySelector('output').textContent=r.value;
  });
  window.atlasCakraNastav&&window.atlasCakraNastav(document.querySelector('#edit-log-cakry'), z.cakry);
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
  dna.cakry=window.atlasCakraVyber?window.atlasCakraVyber(document.querySelector('#edit-log-cakry')):null;
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
document.querySelector('#open-comment')?.addEventListener('click',()=>otevriSUctem('#comment-modal'));
document.querySelector('#open-comment-2')?.addEventListener('click',()=>otevriSUctem('#comment-modal'));
document.querySelectorAll('.modal-close').forEach(button=>button.addEventListener('click',()=>closeModal(document.querySelector('#'+button.dataset.close))));
document.querySelectorAll('.modal-backdrop').forEach(backdrop=>backdrop.addEventListener('click',event=>{if(event.target===backdrop)closeModal(backdrop)}));
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.modal-backdrop.open').forEach(closeModal)});

/* ---- poloha ---- */
const geoCapture=document.querySelector('#geo-capture');
const geoButton=document.querySelector('#geo-get');
const geoStatus=document.querySelector('#geo-status');
const geoHotovoText=document.querySelector('#geo-hotovo');
let geoFix=null;
let mamOvereno=false;   // odznak ◎ u tohoto místa už mám — ověřovat znovu nejde

/* krok 3 se u už ověřeného místa promění v prosté konstatování */
function nastavGeoKrok(){
  if(!geoCapture||!geoButton)return;
  geoButton.hidden=mamOvereno;
  if(geoStatus) geoStatus.hidden=mamOvereno;
  if(geoHotovoText) geoHotovoText.hidden=!mamOvereno;
  geoCapture.classList.toggle('ready', mamOvereno || !!geoFix);
}
/* Dvoufázové hledání polohy.
   1) přesně z GNSS (enableHighAccuracy) — venku, s výhledem na oblohu
   2) když to nevyjde, hrubě ze sítě (Wi-Fi + BTS) — funguje i uvnitř budov a na počítači
   Zamítnuté oprávnění (kód 1) druhý pokus přeskakuje, nemá smysl. */
/* Trpělivé hledání polohy.
   getCurrentPosition vezme první fix, co dorazí — často hrubý odhad ze sítě.
   watchPosition místo toho poslouchá dál: přesnost se s přibývajícími družicemi
   zlepšuje (±500 m → ±80 m → ±6 m). Držíme nejlepší dosažený fix.
     cilM   — jakmile je fix takhle přesný, končíme dřív, nemá smysl čekat
     prahM  — horší než tohle nepřijmeme vůbec (chyba s kódem 4)
     limitMs— dokdy nejdéle hledáme */
window.atlasSledujPolohu = window.atlasSledujPolohu || function(n){
  const cil = n.cilM || 20, prah = n.prahM || 100, limit = n.limitMs || 35000;
  const krok = n.krok || function(){};
  if(!navigator.geolocation){ n.chyba({code:0}); return function(){}; }

  let nej = null, id = null, casovac = null, dobehlo = false;
  const zacatek = Date.now();

  const stop = function(){
    if(dobehlo) return;
    dobehlo = true;
    if(id !== null) navigator.geolocation.clearWatch(id);
    if(casovac) clearTimeout(casovac);
  };
  const dokonci = function(){
    stop();
    if(nej && nej.coords.accuracy <= prah) n.hotovo(nej);
    else n.chyba({ code:4, nejlepsi: nej ? nej.coords.accuracy : null });
  };

  casovac = setTimeout(dokonci, limit);
  id = navigator.geolocation.watchPosition(function(p){
    if(dobehlo) return;
    if(!nej || p.coords.accuracy < nej.coords.accuracy) nej = p;
    krok(nej.coords.accuracy, Math.round((Date.now() - zacatek) / 1000));
    if(nej.coords.accuracy <= cil){ stop(); n.hotovo(nej); }
  }, function(e){
    if(dobehlo) return;
    if(e && e.code === 1){ stop(); n.chyba(e); return; }
    /* kód 2/3 během sledování ignorujeme — družice se můžou chytit později,
       o konci rozhodne časovač */
  }, { enableHighAccuracy:true, timeout:limit, maximumAge:0 });

  return stop;
};

window.atlasNajdiPolohu = window.atlasNajdiPolohu || function(hotovo, chyba){
  if(!navigator.geolocation){ chyba({code:0}); return; }
  navigator.geolocation.getCurrentPosition(hotovo, prvni=>{
    if(prvni && prvni.code === 1){ chyba(prvni); return; }
    navigator.geolocation.getCurrentPosition(hotovo, chyba,
      { enableHighAccuracy:false, timeout:20000, maximumAge:120000 });
  }, { enableHighAccuracy:true, timeout:15000, maximumAge:0 });
};

/* hrubší fix než ±50 m na odznak ◎ nestačí — Wi-Fi trilaterace by uznala i souseda */
const GEO_MAX_PRESNOST = 50;

function geoChybaText(err){
  if(err&&err.code===4)
    return err.nejlepsi
      ? `Nejlepší poloha byla za půl minuty jen ±${Math.round(err.nejlepsi)} m, potřebujeme ±50 m. Vypadá to, že jsi uvnitř budovy — beton a střecha družicový signál nepustí. Vyjdi prosím ven pod otevřené nebe a zkus to znovu.`
      : 'Poloha se za půl minuty vůbec nenačetla. Vypadá to, že jsi uvnitř budovy — vyjdi prosím ven pod otevřené nebe a zkus to znovu.';
  if(/FBAN|FBAV|FB_IAB|Instagram/i.test(navigator.userAgent))
    return 'Prohlížeč uvnitř aplikace (Facebook, Instagram…) polohu neumí. Návštěvu můžeš uložit i bez ověření.';
  if(err&&err.code===1)
    return 'Přístup k poloze je zablokovaný — povol ho přes ikonu vedle adresy. Návštěvu ale můžeš uložit i bez ověření.';
  if(!window.isSecureContext)
    return 'Stránka neběží přes zabezpečené spojení, prohlížeč proto polohu nepovolí.';
  if(err&&err.code===0)
    return 'Tvůj prohlížeč polohu nepodporuje.';
  if(err&&err.code===2)
    return 'Zařízení polohu nedokáže určit. Na telefonu zapni polohu (GPS), na počítači bývá poloha často nedostupná úplně.';
  if(err&&err.code===3)
    return 'Hledání polohy trvá moc dlouho. Zkus to prosím znovu.';
  return 'Polohu se nepodařilo načíst. Máš v telefonu zapnutou polohu (GPS)?';
}
function geoVychozi(){
  if(!geoButton)return;
  geoButton.textContent='◎ Ověřit, že tu stojím';
  geoButton.classList.remove('hotovo');
  geoButton.removeAttribute('title');
  geoButton.disabled=false;
}
function geoHotovo(){
  if(!geoButton)return;
  geoButton.textContent='✓ Ověřeno na místě';
  geoButton.classList.add('hotovo');
  geoButton.title='Načíst polohu znovu';
  geoButton.disabled=false;
}
function geoReset(){
  geoFix=null;
  geoCapture?.classList.remove('ready');
  if(geoStatus){ geoStatus.className='geo-status'; geoStatus.textContent='Nepovinné — ověřená návštěva získá odznak ◎ ověřeno na místě.'; }
  geoVychozi(); nastavGeoKrok();
}
geoButton?.addEventListener('click',()=>{
  if(mamOvereno)return;   /* odznak je jednorázový — tlačítko už není vidět */
  if(!navigator.geolocation){geoStatus.className='geo-status err';geoStatus.textContent='Tvůj prohlížeč polohu nepodporuje.';return}
  geoStatus.className='geo-status';geoStatus.textContent='Hledám tvou polohu…';
  geoButton.textContent='◎ Hledám polohu…';geoButton.classList.remove('hotovo');geoButton.disabled=true;
  window.atlasSledujPolohu({
    cilM:25, prahM:GEO_MAX_PRESNOST, limitMs:35000,
    krok:(presnost,sekund)=>{
      geoButton.textContent=`◎ Hledám… ${sekund} s`;
      geoStatus.className='geo-status';
      geoStatus.innerHTML=`Zatím ±${Math.round(presnost)} m — zpřesňuji…`;
    },
    hotovo:position=>{
    const{latitude,longitude,accuracy}=position.coords;
    geoFix={lat:latitude,lng:longitude,accuracy};
    geoCapture.classList.add('ready');
    geoStatus.className='geo-status ok';
    geoStatus.innerHTML=`<b>${latitude.toFixed(5)} N, ${longitude.toFixed(5)} E</b><br>přesnost ±${Math.round(accuracy)} m<br><span>Návštěva ponese odznak ◎ ověřeno na místě.</span>`;
    geoHotovo();
  },chyba:error=>{
    geoStatus.className='geo-status err';
    geoStatus.textContent=geoChybaText(error);
    /* nepovedlo se znovu, ale předchozí ověření pořád platí */
    if(geoFix) geoHotovo(); else geoVychozi();
  }});
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

/* ---- čakrové řady (nepovinný výběr) ---- */
window.atlasCakraRada&&window.atlasCakraRada(document.querySelector('#log-cakry'));
window.atlasCakraRada&&window.atlasCakraRada(document.querySelector('#edit-log-cakry'));

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
  const {error:se}=await db.storage.from('atlas').remove([f.cesta]);
  if(se) console.warn('Fotka smazána z galerie, soubor v úložišti zůstal:', se.message);
  notify('Fotka smazána.');
  await nactiFotky(autorId);
}

/* ---- offline fronta zápisů ----
   Bez signálu se zápis (včetně fotky a polohy z místa) uschová v telefonu
   a odešle se sám, jakmile se síť vrátí. Poloha i časové razítko jsou z okamžiku návštěvy. */
function frontaDb(){
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
          notify(error.code==='23505'?'Uschovaná návštěva nebyla přijata — tohle místo už máš ověřené.'
            :'Uschovaná návštěva nebyla přijata: '+error.message);
          continue;
        }
        if(z.komentarText||z.fotoBlob){
          const koment={misto_id:zaznam.misto_id,autor_id:zaznam.autor_id,text:z.komentarText||'✦',lang:z.lang||'cs'};
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
    krasa:hodnota('Krása'), lecivost:hodnota('Léčivost'),
    lang:window.atlasJazyk()
  };
  const cakryVyber=window.atlasCakraVyber?window.atlasCakraVyber(document.querySelector('#log-cakry')):null;
  if(cakryVyber) zaznam.cakry=cakryVyber;
  if(geoFix){ zaznam.poloha=`SRID=4326;POINT(${geoFix.lng} ${geoFix.lat})`; zaznam.presnost_m=Math.round(geoFix.accuracy); }

  /* společný šťastný konec */
  const uklid=zprava=>{
    odeslat.disabled=false; odeslat.textContent=puvodni;
    closeModal(document.querySelector('#log-modal'));
    form.reset(); geoReset(); logPhotoReset();
    window.atlasCakraNastav&&window.atlasCakraNastav(document.querySelector('#log-cakry'),null);
    document.querySelectorAll('#log-modal .slider-row input[type=range]').forEach(x=>x.dispatchEvent(new Event('input')));
    if(window.atlasKoncepty) window.atlasKoncepty.smaz('navsteva:'+mistoData.id).then(konceptProuzek).catch(()=>{});
    notify(zprava);
  };
  const uschovej=async blob=>{
    try{
      await frontaPridej({zaznam,komentarText:slova,lang:window.atlasJazyk(),fotoBlob:blob||null,fotoTyp:blob?(blob.type||'image/jpeg'):null,pripona:blob?pripona:null,vytvoreno:Date.now()});
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
    notify(/m od místa|už máš ověřené/.test(error.message) ? error.message
      : (error.code==='23505' ? 'Tohle místo už máš ověřené. Další návštěvu zapiš bez ověřování polohy.'
      : 'Návštěvu se nepodařilo uložit: '+error.message));
    return;
  }

  /* slova a fotka putují na zeď jako komentář */
  if(slova||fotoBlob){
    const koment={misto_id:mistoData.id,autor_id:ucet.id,text:slova||'✦',lang:window.atlasJazyk()};
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
  const koment={misto_id:mistoData.id,autor_id:ucet.id,text:textKomentare,lang:window.atlasJazyk()};
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

/* ---- rozepsaný zápis (koncept): uschovat teď, dopsat později ----
   Uloží se text, fotka, čakry, posuvníky i sejmutá poloha — do tohoto zařízení.
   Poloha z místa zůstává platná: ◎ ověření dostaneš, i když text dopíšeš doma. */
function konceptProuzek(){
  if(!window.atlasKonceptyProuzek||!mistoData)return;
  window.atlasKonceptyProuzek({jenMisto:mistoData.id, onOtevrit:obnovKoncept});
}
async function ulozKoncept(){
  if(!mistoData||!window.atlasKoncepty){notify('Místo se ještě nenačetlo, zkus to za okamžik.');return}
  const dna={}; document.querySelectorAll('#log-modal .slider-row input[type=range]').forEach(r=>{dna[r.dataset.axis]=Number(r.value)});
  const k={
    typ:'navsteva', misto_id:mistoData.id, slug:SLUG, nazev:mistoData.nazev,
    text:document.querySelector('#log-form textarea').value,
    dna, cakry:window.atlasCakraVyber?window.atlasCakraVyber(document.querySelector('#log-cakry')):null,
    geoFix: geoFix?{...geoFix}:null,
    fotoBlob: logPhotoFile||null, fotoTyp: logPhotoFile?(logPhotoFile.type||'image/jpeg'):null
  };
  try{ await window.atlasKoncepty.uloz('navsteva:'+mistoData.id, k); }
  catch(e){ notify('Zápis se nepodařilo uschovat: '+(e&&e.message||e)); return; }
  closeModal(document.querySelector('#log-modal'));
  document.querySelector('#log-form').reset(); geoReset(); logPhotoReset();
  window.atlasCakraNastav&&window.atlasCakraNastav(document.querySelector('#log-cakry'),null);
  document.querySelectorAll('#log-modal .slider-row input[type=range]').forEach(x=>x.dispatchEvent(new Event('input')));
  notify('Zápis uschován ✎ Najdeš ho nahoře na stránce, až budeš chtít dopsat.');
  konceptProuzek();
}
document.querySelector('#log-later')?.addEventListener('click',ulozKoncept);

function obnovKoncept(k){
  if(!k) return;
  if(window.vyzadujUcet&&!window.vyzadujUcet())return;
  const form=document.querySelector('#log-form');
  form.querySelector('textarea').value=k.text||'';
  document.querySelectorAll('#log-modal .slider-row input[type=range]').forEach(r=>{
    if(k.dna&&k.dna[r.dataset.axis]!=null){ r.value=k.dna[r.dataset.axis]; r.dispatchEvent(new Event('input')); }
  });
  window.atlasCakraNastav&&window.atlasCakraNastav(document.querySelector('#log-cakry'), k.cakry);
  if(k.fotoBlob){
    logPhotoFile=k.fotoBlob;
    if(logPhotoPreview.src&&logPhotoPreview.src.startsWith('blob:'))URL.revokeObjectURL(logPhotoPreview.src);
    logPhotoPreview.src=URL.createObjectURL(k.fotoBlob);
    logPhotoPreview.hidden=false;
    if(logPhotoText) logPhotoText.textContent='Fotka připravena — klepni pro změnu';
  }
  if(k.geoFix&&!mamOvereno){
    geoFix={...k.geoFix};
    geoCapture&&geoCapture.classList.add('ready');
    if(geoStatus){
      geoStatus.className='geo-status ok';
      geoStatus.innerHTML=`<b>${geoFix.lat.toFixed(5)} N, ${geoFix.lng.toFixed(5)} E</b><br>přesnost ±${Math.round(geoFix.accuracy)} m<br><span>Poloha sejmutá na místě — ◎ ověření platí.</span>`;
    }
    geoHotovo(); nastavGeoKrok();
  }
  openModal('#log-modal');
}
async function startKoncept(){
  if(!mistoData||!window.atlasKoncepty) return;
  konceptProuzek();
  if(new URLSearchParams(location.search).get('koncept')==='otevrit'){
    try{ const k=await window.atlasKoncepty.nacti('navsteva:'+mistoData.id); if(k) obnovKoncept(k); }catch(_){}
  }
}

/* ---- start ---- */
function mistoStart(){ nactiMisto().then(startKoncept); }
if (window.atlasAuthReady) mistoStart();
else window.addEventListener('atlas-auth-ready', mistoStart, {once:true});
