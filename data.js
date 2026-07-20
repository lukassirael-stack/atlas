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
