/* Profil místa — data z databáze podle ?m=slug */

const SLUG = new URLSearchParams(location.search).get('m');
let mistoData = null;

/* rychlé hero: cestu fotky předává odkaz z mapy/dlaždic (?f=...) — stahování začne okamžitě,
   často už je obrázek v mezipaměti z náhledové karty; skutečná data ho pak případně tiše opraví */
const FOTKA_Z_ODKAZU = new URLSearchParams(location.search).get('f');
let heroCesta = null;
if (FOTKA_Z_ODKAZU && /^[\w\-./]+$/.test(FOTKA_Z_ODKAZU)) {
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
  img.onload = ()=>{ el.style.backgroundImage = `url(${url})`; el.classList.add('zjevena'); };
  img.onerror = ()=>{ el.classList.add('zjevena'); };
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
    return `<figure class="galerie-item${hlavni?' je-hlavni':''}">
      <img src="${url}" alt="Fotka místa" loading="lazy" />
      ${hlavni ? '<span class="foto-odznak">Hlavní</span>' : ''}
      ${(smiRadit && !hlavni) ? `<button type="button" class="foto-hlavni-btn" data-id="${f.id}">Nastavit jako hlavní</button>` : ''}
    </figure>`;
  }).join('');

  if (smiRadit) {
    grid.querySelectorAll('.foto-hlavni-btn').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        btn.disabled = true; btn.textContent = 'Měním…';
        const { error } = await db.rpc('atlas_foto_hlavni', { p_foto_id: btn.dataset.id });
        if (error) { btn.disabled=false; btn.textContent='Nastavit jako hlavní'; notify('Nepodařilo se: '+error.message); return; }
        notify('Hlavní fotka změněna 🌿');
        await nactiFotky(autorId);
      });
    });
  }
}

async function nactiZapisy(){
  const db=window.atlasDb, box=document.querySelector('#log-list');
  const { data } = await db.from('atlas_zapisy')
    .select('id,autor_id,text,klid,energie,mystika,krasa,lecivost,vytvoren,atlas_profily(nick)')
    .eq('misto_id', mistoData.id).order('vytvoren',{ascending:false}).limit(50);
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
    const z=data.find(x=>x.id===b.dataset.editZapis);
    b.addEventListener('click',()=>otevriEditZapis(z));
  });
}

async function nactiKomentare(){
  const db=window.atlasDb, box=document.querySelector('#comment-list');
  const { data } = await db.from('atlas_komentare')
    .select('id,autor_id,text,vytvoren,atlas_profily(nick)')
    .eq('misto_id', mistoData.id).eq('stav','zverejneny').order('vytvoren',{ascending:false}).limit(50);
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
    const k=data.find(x=>x.id===b.dataset.editKoment);
    b.addEventListener('click',()=>otevriEditKoment(k));
  });
}

/* ---- editace zápisu (text + DNA) ---- */
function otevriEditZapis(z){
  const m=document.querySelector('#edit-log-modal'); if(!m) return;
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
  const {error}=await db.from('atlas_zapisy').update({text,klid:dna.klid,energie:dna.energie,mystika:dna.mystika,krasa:dna.krasa,lecivost:dna.lecivost}).eq('id',m.dataset.id);
  btn.disabled=false; btn.textContent=p;
  if(error){notify('Úprava se nepodařila: '+error.message);return}
  closeModal(m); notify('Zápis upraven 🌿'); nactiZapisy();
}); 

/* ---- editace komentáře (text) ---- */
function otevriEditKoment(k){
  const m=document.querySelector('#edit-comment-modal'); if(!m) return;
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
  const {error}=await db.from('atlas_komentare').update({text}).eq('id',m.dataset.id);
  btn.disabled=false; btn.textContent=p;
  if(error){notify('Úprava se nepodařila: '+error.message);return}
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
  logPhotoPreview.src=URL.createObjectURL(file);
  logPhotoPreview.hidden=false;
  if(logPhotoText) logPhotoText.textContent='Fotka připravena — klepni pro změnu';
  input.value='';
}));
function logPhotoReset(){logPhotoFile=null;if(!logPhotoPreview)return;logPhotoPreview.hidden=true;logPhotoPreview.removeAttribute('src');if(logPhotoText)logPhotoText.textContent='Přidej fotku z návštěvy'}

/* ---- posuvníky DNA ---- */
document.querySelectorAll('.slider-row input[type=range]').forEach(slider=>{
  const out=slider.parentElement.querySelector('output');
  const sync=()=>{out.textContent=slider.value};
  slider.addEventListener('input',sync);sync();
});

/* ---- odeslání zápisu ---- */
document.querySelector('#log-form')?.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!geoFix){notify('Nejdřív načti svou polohu — zápis vzniká jen na místě.');geoButton?.focus();return}
  if(!window.vyzadujUcet||!window.vyzadujUcet())return;
  if(!mistoData){notify('Místo se ještě nenačetlo, zkus to za okamžik.');return}

  const db=window.atlasDb, ucet=window.atlasUcet();
  const odeslat=event.currentTarget.querySelector('button[type=submit]');
  const puvodni=odeslat.textContent; odeslat.disabled=true; odeslat.textContent='Ukládám…';

  const hodnota=axis=>Number(document.querySelector(`.slider-row input[data-axis="${axis}"]`).value);
  const zaznam={
    misto_id:mistoData.id,
    autor_id:ucet.id,
    text:event.currentTarget.querySelector('textarea').value.trim(),
    poloha:`SRID=4326;POINT(${geoFix.lng} ${geoFix.lat})`,
    presnost_m:Math.round(geoFix.accuracy),
    klid:hodnota('Klid'), energie:hodnota('Energie'), mystika:hodnota('Mystika'),
    krasa:hodnota('Krása'), lecivost:hodnota('Léčivost')
  };

  if(logPhotoFile){
    let blob=logPhotoFile, pripona='jpg';
    if(window.atlasZpracujFoto){ const z=await window.atlasZpracujFoto(logPhotoFile); blob=z.blob; pripona=z.pripona; }
    const cesta=`zapisy/${mistoData.id}/${Date.now()}.${pripona}`;
    const {error:fe}=await db.storage.from('atlas').upload(cesta,blob,{contentType:blob.type});
    if(!fe) zaznam.fotka=cesta;
  }

  const {error}=await db.from('atlas_zapisy').insert(zaznam);
  odeslat.disabled=false; odeslat.textContent=puvodni;

  if(error){
    console.error(error);
    notify(error.message.includes('m od místa') ? error.message
      : (error.code==='23505' ? 'Z tohoto místa už dnes zápis máš. Přijď zas jindy.'
      : 'Zápis se nepodařilo uložit: '+error.message));
    return;
  }
  closeModal(document.querySelector('#log-modal'));
  event.currentTarget.reset(); geoReset(); logPhotoReset();
  document.querySelectorAll('.slider-row input[type=range]').forEach(s=>s.dispatchEvent(new Event('input')));
  notify('Zápis uložen. Tvé vnímání vstoupilo do DNA místa.');
  nactiMisto();
});

/* ---- odeslání komentáře ---- */
document.querySelector('#comment-form')?.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!window.vyzadujUcet||!window.vyzadujUcet())return;
  if(!mistoData){notify('Místo se ještě nenačetlo, zkus to za okamžik.');return}

  const db=window.atlasDb, ucet=window.atlasUcet();
  const odeslat=event.currentTarget.querySelector('button[type=submit]');
  odeslat.disabled=true;
  const {error}=await db.from('atlas_komentare').insert({
    misto_id:mistoData.id, autor_id:ucet.id,
    text:event.currentTarget.querySelector('textarea').value.trim()
  });
  odeslat.disabled=false;
  if(error){console.error(error);notify('Komentář se nepodařilo uložit: '+error.message);return}
  closeModal(document.querySelector('#comment-modal'));
  event.currentTarget.reset();
  notify('Děkujeme! Komentář je zveřejněn.');
  nactiKomentare();
});

/* ---- start ---- */
if (window.atlasAuthReady) nactiMisto();
else window.addEventListener('atlas-auth-ready', nactiMisto, {once:true});
