/* Sdílené čtení dat Atlasu z databáze. Používá klienta z auth.js (window.atlasDb). */

const ATLAS_STITKY = {
  klid:     {emoji:'🌿', nazev:'Klid a regenerace'},
  energie:  {emoji:'⚡', nazev:'Síla a energie'},
  srdce:    {emoji:'❤️', nazev:'Místo srdce'},
  leciva:   {emoji:'🔥', nazev:'Léčivá místa'},
  prameny:  {emoji:'💧', nazev:'Léčivé prameny'},
  stromy:   {emoji:'🌳', nazev:'Posvátné stromy'},
  megality: {emoji:'🪨', nazev:'Megality a posvátné skály'},
  hory:     {emoji:'⛰️', nazev:'Hory a posvátné vrcholy'},
  mohyly:   {emoji:'🔺', nazev:'Pyramidy a mohyly'},
  meditace: {emoji:'🧘', nazev:'Meditační místa'},
  portaly:  {emoji:'✨', nazev:'Portály'},
  magie:    {emoji:'🔮', nazev:'Magická a rituální místa'},
  historie: {emoji:'🏛', nazev:'Historická a posvátná místa'},
  pohanska: {emoji:'🌙', nazev:'Pohanská a keltská místa'},
  kontakt:  {emoji:'👁', nazev:'Kontaktní místa'},
  stinova:  {emoji:'🌑', nazev:'Stínová místa'},
  vyhledy:  {emoji:'🌅', nazev:'Výhledy a krajinné scenérie'},
  anomalie: {emoji:'🌀', nazev:'Anomálie a záhady'},
};
window.ATLAS_STITKY = ATLAS_STITKY;

/* štítek s emoji: 'megality' → '🪨 Megality a posvátné skály' */
window.atlasStitek = (kod, kratky=false) => {
  const s = ATLAS_STITKY[kod];
  if (!s) return kod;
  return kratky ? `${s.emoji} ${s.nazev.split(' ')[0]}` : `${s.emoji} ${s.nazev}`;
};

/* veřejná URL fotky ze Storage — čistá konkatenace, funguje hned (bez čekání na klienta) */
window.atlasFotoUrl = (cesta) => {
  if (!cesta) return null;
  return 'https://myybuesoourgpbouwwst.supabase.co/storage/v1/object/public/atlas/' + cesta;
};

/* pět os DNA → nejsilnější rys jako '{Osa} {hodnota} %' */
window.atlasRys = (dna) => {
  if (!dna || !dna.zapisu) return null;
  const osy = [['Klid',dna.klid],['Energie',dna.energie],['Mystika',dna.mystika],['Krása',dna.krasa],['Léčivost',dna.lecivost]];
  osy.sort((a,b)=>b[1]-a[1]);
  return `${osy[0][0]} ${osy[0][1]} %`;
};

/* kraj z hrubých souřadnic — hover popisek u dlaždice bez reverzního geokódování */
window.atlasSouradnice = (lat, lng) =>
  `${lat.toFixed(4)} N, ${lng.toFixed(4)} E`;

/* body souboru míst: [{nazev, lat, lng}] — bezpečně i pro starší data */
window.atlasBody = m => (Array.isArray(m && m.body) ? m.body : [])
  .filter(b => b && isFinite(b.lat) && isFinite(b.lng))
  .map(b => ({ nazev: b.nazev || '', lat: Number(b.lat), lng: Number(b.lng) }));

/* „soubor 3 míst" — počet bodů včetně hlavního */
window.atlasSouborText = n => (window.atlasLang === 'en' ? `set of ${n} places` : `soubor ${n} míst`);

/* načte zveřejněná místa přes RPC (souřadnice už rozložené) */
window.atlasNactiMista = async () => {
  const db = window.atlasDb;
  if (!db) return [];
  const { data, error } = await db.rpc('atlas_mista_verejna');
  if (error) { console.error('Načtení míst selhalo:', error); return []; }
  return (data||[]).map(m => ({
    ...m,
    dna: m.zapisu ? {zapisu:m.zapisu, klid:m.klid, energie:m.energie, mystika:m.mystika, krasa:m.krasa, lecivost:m.lecivost} : null
  }));
};

/* Jazyk, ve kterém člověk právě píše — ukládá se k obsahu, aby šlo později
   nabídnout překlad jen tam, kde se liší od jazyka čtenáře. */
window.atlasJazyk = () => (window.atlasLang === 'en' ? 'en' : 'cs');

/* ---- čakry: 1 = kořenová … 7 = korunní ----
   Barvy jsou zemité, ztlumené k paletě Atlasu — kanonická duha by tu řvala. */
window.ATLAS_CAKRY = [
  {c:1, nazev:'Kořenová',       barva:'#8a3a2e'},
  {c:2, nazev:'Sakrální',       barva:'#b06a35'},
  {c:3, nazev:'Solární plexus', barva:'#c9a14a'},
  {c:4, nazev:'Srdeční',        barva:'#5f7d54'},
  {c:5, nazev:'Krční',          barva:'#4e7d8a'},
  {c:6, nazev:'Třetí oko',      barva:'#5b5a80'},
  {c:7, nazev:'Korunní',        barva:'#8a6d9c'},
];

/* vytvoří řadu čakrových čipů (nepovinný výběr, klidně víc najednou) */
window.atlasCakraRada = (el) => {
  if(!el || el.dataset.hotovo) return;
  el.dataset.hotovo = '1';
  el.innerHTML = window.ATLAS_CAKRY.map(k =>
    `<button type="button" data-c="${k.c}" style="--ck:${k.barva}"><i></i>${k.nazev}</button>`).join('');
  el.addEventListener('click', e => {
    const b = e.target.closest('button');
    if(b) b.classList.toggle('on');
  });
};
/* přečte výběr: pole čísel 1–7, prázdný výběr → null */
window.atlasCakraVyber = (el) => {
  if(!el) return null;
  const v = [...el.querySelectorAll('.on')].map(b => Number(b.dataset.c));
  return v.length ? v : null;
};
/* nastaví výběr podle pole čísel (obnovení konceptu, editace naladění) */
window.atlasCakraNastav = (el, pole) => {
  if(!el) return;
  const sada = new Set(pole || []);
  el.querySelectorAll('button').forEach(b => b.classList.toggle('on', sada.has(Number(b.dataset.c))));
};

/* ---- rozsah místa: jak daleko místo sahá ----
   Ovlivňuje toleranci ◎ ověření (rozsah + 120 m + přesnost fixu, max 100 m)
   a kruh na mapě u okolí/krajiny. Bod je výchozí a nikde se nevypisuje. */
window.ATLAS_ROZSAHY = [
  { m:30,  znak:'◉', nazev:'Bod',     popis:'strom, kámen, pramen, kaplička' },
  { m:100, znak:'◎', nazev:'Okolí',   popis:'háj, louka, skalka, vrchol' },
  { m:400, znak:'○', nazev:'Krajina', popis:'kopec, údolí, meandr' }
];
/* stupeň pro libovolné číslo metrů (nejbližší nižší) */
window.atlasRozsahStupen = (m) => {
  const n = Number(m) || 30;
  let s = window.ATLAS_ROZSAHY[0];
  for (const r of window.ATLAS_ROZSAHY) if (n >= r.m) s = r;
  return s;
};
/* text pro detail a kartu: „◎ okolí ~100 m" */
window.atlasRozsahText = (m) => {
  const s = window.atlasRozsahStupen(m);
  return `${s.znak} ${s.nazev.toLowerCase()} ~${s.m} m`;
};
/* vykreslí řadu tří přepínačů (jednovýběr) do prázdného kontejneru */
window.atlasRozsahRada = (el, vychozi) => {
  if(!el || el.dataset.hotovo) return;
  el.dataset.hotovo = '1';
  el.setAttribute('role','radiogroup');
  el.innerHTML = window.ATLAS_ROZSAHY.map(r =>
    `<button type="button" role="radio" data-m="${r.m}" aria-checked="false"><b>${r.znak} ${r.nazev}</b><small>${r.popis}</small></button>`).join('');
  el.addEventListener('click', e => {
    const b = e.target.closest('button');
    if(b) window.atlasRozsahNastav(el, Number(b.dataset.m));
  });
  window.atlasRozsahNastav(el, vychozi);
};
/* přečte výběr v metrech (bez výběru → 30 = bod) */
window.atlasRozsahVyber = (el) => {
  const b = el && el.querySelector('.on');
  return b ? Number(b.dataset.m) : 30;
};
/* nastaví výběr podle metrů (obnovení konceptu, editace místa) */
window.atlasRozsahNastav = (el, m) => {
  if(!el) return;
  const s = window.atlasRozsahStupen(m);
  el.querySelectorAll('button').forEach(b => {
    const on = Number(b.dataset.m) === s.m;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
};
