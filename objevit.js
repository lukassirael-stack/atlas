/* Kompletní seznam všech míst + filtr podle země a kraje + rozbalovací mapa */

let vsechnaMista = [];
let fZeme = '__vse', fKraj = '__vse';

const grid = document.querySelector('#objevit-grid');
const pocet = document.querySelector('#objevit-pocet');
const filtrBox = document.querySelector('#objevit-filtr');
const mapaBtn = document.querySelector('#objevit-mapa-btn');
const mapaPanel = document.querySelector('#objevit-mapa-panel');

/* stav stránky (filtr + otevřená mapa) drží po dobu návštěvy —
   po návratu z detailu místa je všechno tam, kde to člověk nechal */
const STAV_KLIC = 'atlas_objevit_stav';
function stavNacti(){
  try { return JSON.parse(sessionStorage.getItem(STAV_KLIC) || 'null') || {}; } catch (_) { return {}; }
}
function stavUloz(){
  try { sessionStorage.setItem(STAV_KLIC, JSON.stringify({ z: fZeme, k: fKraj, mapa: mapaOtevrena })); } catch (_) {}
}

function dlazdice(m){
  const url = window.atlasFotoUrl(m.fotka);
  const rys = window.atlasRys(m.dna);
  const stitek = (m.stitky && m.stitky[0]) ? window.atlasStitek(m.stitky[0]) : '';
  const misto = m.kraj ? window.atlasKrajText(m.kraj) : (m.zeme || '');
  const horni = [stitek, misto].filter(Boolean).join(' · ');
  const spodek = rys ? `<b>${rys}</b>` : '<b>Nové místo</b>';
  const podnazev = m.nazev_oficialni ? `<p class="tile-podnazev" data-i18n="off">${escHtml(m.nazev_oficialni)}</p>` : '';
  return `<a class="place-tile" href="/misto?m=${m.slug}${m.fotka?`&f=${encodeURIComponent(m.fotka)}`:''}">
    <div class="tile-image"${url?` style="background-image:url(${url})"`:''}></div>
    <div class="tile-info"><span>${horni}</span><h3 data-i18n="off">${escHtml(m.nazev)}</h3>${podnazev}<p>${spodek}</p></div>
  </a>`;
}

function slovoMist(n){
  if (n === 1) return '1 místo';
  if (n >= 2 && n <= 4) return `${n} místa`;
  return `${n} míst`;
}

function tlacitko(val, label, aktivni, typ){
  const attr = typ==='kraj' ? `data-fk="${escAttr(val)}"` : `data-fz="${escAttr(val)}"`;
  const on = val===aktivni ? ' class="on"' : '';
  return `<button ${attr}${on}>${escHtml(label)}</button>`;
}

function postavFiltr(){
  const zeme = [...new Set(vsechnaMista.map(m=>m.zeme).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'cs'));
  const mistaProKraje = fZeme==='__vse' ? vsechnaMista : vsechnaMista.filter(m=>m.zeme===fZeme);
  const kraje = [...new Set(mistaProKraje.map(m=>m.kraj).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'cs'));

  let html = '';
  if (zeme.length > 1){
    html += '<div class="filtr-rada"><span class="filtr-label">Země</span>';
    html += tlacitko('__vse','Vše',fZeme);
    zeme.forEach(z => html += tlacitko(z,z,fZeme));
    html += '</div>';
  }
  if (kraje.length > 1){
    html += '<div class="filtr-rada"><span class="filtr-label">Kraj</span>';
    html += tlacitko('__vse','Všechny',fKraj,'kraj');
    kraje.forEach(k => html += tlacitko(k,k,fKraj,'kraj'));
    html += '</div>';
  }
  filtrBox.innerHTML = html;
  filtrBox.hidden = !html;
  filtrBox.querySelectorAll('[data-fz]').forEach(b => b.onclick = () => { fZeme=b.dataset.fz; fKraj='__vse'; obnov(); });
  filtrBox.querySelectorAll('[data-fk]').forEach(b => b.onclick = () => { fKraj=b.dataset.fk; obnov(); });
}

/* místa odpovídající právě zvolenému filtru */
function vybranaMista(){
  let m = vsechnaMista;
  if (fZeme !== '__vse') m = m.filter(x => x.zeme === fZeme);
  if (fKraj !== '__vse') m = m.filter(x => x.kraj === fKraj);
  return m;
}

function obnov(){
  const m = vybranaMista();

  if (!m.length){
    grid.innerHTML = `<p class="grid-prazdno">V tomto výběru zatím žádné místo není.</p>`;
  } else {
    grid.innerHTML = m.map(dlazdice).join('');
  }
  const celkem = vsechnaMista.length;
  const zobr = m.length;
  pocet.textContent = (fZeme==='__vse' && fKraj==='__vse')
    ? (celkem ? `V atlasu ${(celkem>=2 && celkem<=4)?'jsou':'je'} ${slovoMist(celkem)}` : 'Zatím tu není žádné místo')
    : `Zobrazeno ${slovoMist(zobr)} z ${celkem}`;
  postavFiltr();
  mapaZnacky();
  stavUloz();
}

/* ==== rozbalovací mapa: stejná satelitní mapa a značky jako na úvodu,
        ukazuje místa podle zvoleného filtru; knihovna se načte až při prvním otevření ==== */
let mapaOtevrena = false;
let mapa = null;
let mapaVrstva = null;
let leafletSlib = null;
let mojeNavstevy = new Set();

function nactiLeaflet(){
  if (window.L) return Promise.resolve();
  if (leafletSlib) return leafletSlib;
  leafletSlib = new Promise((hotovo, chyba) => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    s.crossOrigin = '';
    /* po mapě ještě seskupování značek; kdyby se nenačetlo, mapa běží dál s jednotlivými značkami */
    s.onload = () => {
      const sh = document.createElement('script');
      sh.src = 'markercluster.js?v=1';
      sh.onload = () => hotovo();
      sh.onerror = () => hotovo();
      document.head.appendChild(sh);
    };
    s.onerror = () => { leafletSlib = null; s.remove(); chyba(new Error('leaflet')); };
    document.head.appendChild(s);
  });
  return leafletSlib;
}

function mapaInit(){
  if (mapa) return;
  mapa = L.map('objevit-mapa', { center: [49.75, 15.5], zoom: 6, zoomControl: false, scrollWheelZoom: true });
  L.control.zoom({ position: 'bottomright' }).addTo(mapa);   // dole — nahoře se otevírá bublina místa
  const Legenda = L.Control.extend({
    options: { position: 'bottomleft' },
    onAdd: function(){
      const el = L.DomUtil.create('div', 'map-legenda');
      el.innerHTML = '<span class="ml-ceka">čeká na objevení</span><span class="ml-nav">navštíveno</span>';
      L.DomEvent.disableClickPropagation(el);
      return el;
    }
  });
  mapa.addControl(new Legenda());
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, className: 'satelit-tlum', attribution: 'Esri, Maxar, Earthstar Geographics'
  }).addTo(mapa);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, opacity: 0.9
  }).addTo(mapa);
  /* blízká místa se při oddálení spojí do kroužku s počtem */
  mapaVrstva = L.markerClusterGroup ? L.markerClusterGroup({
    maxClusterRadius: 44, showCoverageOnHover: false, spiderfyOnMaxZoom: true, zoomToBoundsOnClick: true,
    spiderLegPolylineOptions: { weight: 1.5, color: '#e8c877', opacity: .8 },
    iconCreateFunction: shluk => {
      const deti = shluk.getAllChildMarkers(), n = shluk.getChildCount();
      const vse = deti.length && deti.every(z => z.options.navstiveno);
      const d = n < 10 ? 38 : (n < 100 ? 44 : 50);
      return L.divIcon({ html: `<b>${n}</b>`, className: 'atlas-shluk' + (vse ? ' navstiveno' : ''), iconSize: [d, d] });
    }
  }) : L.layerGroup();
  mapaVrstva.addTo(mapa);
}

function bublina(m){
  const rys = window.atlasRys(m.dna);
  const stitek = (m.stitky && m.stitky[0]) ? window.atlasStitek(m.stitky[0]) : '';
  const kde = m.kraj ? window.atlasKrajText(m.kraj) : (m.zeme || '');
  const spodek = [rys ? `<b>${rys}</b>` : '<b>Nové místo</b>', escHtml(kde)].filter(Boolean).join(' · ');
  return (stitek ? `<span class="ap-stitek">${escHtml(stitek)}</span>` : '') +
    `<span class="ap-nazev" data-i18n="off">${escHtml(m.nazev)}</span>` +
    (m.nazev_oficialni ? `<span class="ap-oficialni" data-i18n="off">${escHtml(m.nazev_oficialni)}</span>` : '') +
    `<span class="ap-rys">${spodek}</span>` +
    `<a class="detail-button" href="/misto?m=${encodeURIComponent(m.slug)}${m.fotka?`&f=${encodeURIComponent(m.fotka)}`:''}">Zobrazit detail <span>→</span></a>`;
}

function mapaZnacky(){
  if (!mapa || !mapaVrstva) return;
  mapa.closePopup();
  mapaVrstva.clearLayers();
  const body = [];
  vybranaMista().forEach(m => {
    if (m.lat == null || m.lng == null) return;
    const navstiveno = mojeNavstevy.has(m.id);
    const ikona = L.divIcon({
      className: 'atlas-spendlik ' + (navstiveno ? 'navstiveno' : 'ceka'),
      html: '<i></i>', iconSize: [26,28], iconAnchor: [13,24], popupAnchor: [0,-22]
    });
    L.marker([m.lat, m.lng], { icon: ikona, title: m.nazev, navstiveno })
      .bindPopup(bublina(m), { className: 'atlas-popup', maxWidth: 270, autoPanPadding: [22,22] })
      .addTo(mapaVrstva);
    body.push([m.lat, m.lng]);
  });
  if (!mapaOtevrena) return;
  if (body.length === 1) mapa.setView(body[0], 12);
  else if (body.length > 1) mapa.fitBounds(body, { padding: [44,44], maxZoom: 12 });
}

async function nactiNavstevy(){
  const db = window.atlasDb, ucet = window.atlasUcet && window.atlasUcet();
  if (!db || !ucet) return;
  try {
    const { data, error } = await db.rpc('atlas_moje_navstevy');
    if (error || !data) return;
    mojeNavstevy = new Set(data.map(r => r.misto_id));
    mapaZnacky();
  } catch (_) {}
}

function mapaStitek(){
  if (!mapaBtn) return;
  mapaBtn.setAttribute('aria-expanded', String(mapaOtevrena));
  const t = mapaBtn.querySelector('.mp-text');
  if (t) t.textContent = mapaOtevrena ? 'Skrýt mapu' : 'Zobrazit mapu';
}

async function mapaPrepni(otevrit){
  if (!mapaBtn || !mapaPanel) return;
  mapaOtevrena = otevrit;
  mapaPanel.hidden = !otevrit;
  mapaStitek();
  stavUloz();
  if (!otevrit) return;
  let hlaska = mapaPanel.querySelector('.mapa-nacitam');
  if (!mapa && !hlaska){
    hlaska = document.createElement('p');
    hlaska.className = 'mapa-nacitam';
    hlaska.textContent = 'Načítám…';
    mapaPanel.appendChild(hlaska);
  }
  try {
    await nactiLeaflet();
  } catch (_) {
    if (hlaska) hlaska.textContent = 'Mapa se teď nenačetla. Zkus to za chvíli znovu.';
    return;
  }
  if (hlaska) hlaska.remove();
  if (!mapaOtevrena) return;          // mezitím ji člověk zase zavřel
  const prvni = !mapa;
  mapaInit();
  mapa.invalidateSize();
  mapaZnacky();
  if (prvni) nactiNavstevy();
}

if (mapaBtn) mapaBtn.addEventListener('click', () => mapaPrepni(!mapaOtevrena));

async function start(){
  if (typeof window.atlasNactiMista !== 'function'){ setTimeout(start, 100); return; }
  vsechnaMista = await window.atlasNactiMista();
  /* návrat na stránku: obnovit filtr a mapu z téhle návštěvy */
  const stav = stavNacti();
  if (stav.z && vsechnaMista.some(m => m.zeme === stav.z)) fZeme = stav.z;
  if (stav.k && vybranaMista().some(m => m.kraj === stav.k)) fKraj = stav.k;
  mapaOtevrena = !!stav.mapa;
  obnov();
  if (mapaOtevrena) mapaPrepni(true);
}

function escHtml(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML}
function escAttr(t){return (t||'').replace(/"/g,'&quot;')}

if (window.atlasAuthReady) start();
else window.addEventListener('atlas-auth-ready', start, {once:true});
