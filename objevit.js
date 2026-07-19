/* Kompletní seznam všech zveřejněných míst */

let vsechnaMista = [];

const grid = document.querySelector('#objevit-grid');
const pocet = document.querySelector('#objevit-pocet');

function dlazdice(m){
  const url = window.atlasFotoUrl(m.fotka);
  const rys = window.atlasRys(m.dna);
  const stitek = (m.stitky && m.stitky[0]) ? window.atlasStitek(m.stitky[0]) : '';
  const spodek = rys ? `<b>${rys}</b>` : '<b>Nové místo</b>';
  return `<a class="place-tile" href="/misto?m=${m.slug}">
    <div class="tile-image"${url?` style="background-image:url(${url})"`:''}></div>
    <div class="tile-info"><span>${stitek}</span><h3>${escHtml(m.nazev)}</h3><p>${spodek}</p></div>
  </a>`;
}

function vykresli(mista){
  if (!mista.length){
    grid.innerHTML = `<p class="grid-prazdno">Zatím tu není žádné zveřejněné místo. Buď první — zanes to svoje.</p>`;
    return;
  }
  grid.innerHTML = mista.map(dlazdice).join('');
}

function slovoMist(n){
  if (n === 1) return '1 místo';
  if (n >= 2 && n <= 4) return `${n} místa`;
  return `${n} míst`;
}

async function start(){
  if (typeof window.atlasNactiMista !== 'function'){ setTimeout(start, 100); return; }
  vsechnaMista = await window.atlasNactiMista();
  pocet.textContent = vsechnaMista.length ? `V atlasu ${vsechnaMista.length===1?'je':'jsou'} ${slovoMist(vsechnaMista.length)}` : 'Zatím tu není žádné místo';
  vykresli(vsechnaMista);
}

function escHtml(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML}

if (window.atlasAuthReady) start();
else window.addEventListener('atlas-auth-ready', start, {once:true});
