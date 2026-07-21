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
  const ucet=window.atlasUcet&&window.atlasUcet(), profil=window.atlasProfil&&window.
