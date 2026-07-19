/* Kompletní seznam všech míst + filtr podle země a kraje */

let vsechnaMista = [];
let fZeme = '__vse', fKraj = '__vse';

const grid = document.querySelector('#objevit-grid');
const pocet = document.querySelector('#objevit-pocet');
const filtrBox = document.querySelector('#objevit-filtr');

function dlazdice(m){
  const url = window.atlasFotoUrl(m.fotka);
  const rys = window.atlasRys(m.dna);
  const stitek = (m.stitky && m.stitky[0]) ? window.atlasStitek(m.stitky[0]) : '';
  const misto = m.kraj || m.zeme || '';
  const horni = [stitek, misto].filter(Boolean).join(' · ');
  const spodek = rys ? `<b>${rys}</b>` : '<b>Nové místo</b>';
  return `<a class="place-tile" href="/misto?m=${m.slug}">
    <div class="tile-image"${url?` style="background-image:url(${url})"`:''}></div>
    <div class="tile-info"><span>${horni}</span><h3>${escHtml(m.nazev)}</h3><p>${spodek}</p></div>
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

function obnov(){
  let m = vsechnaMista;
  if (fZeme !== '__vse') m = m.filter(x => x.zeme === fZeme);
  if (fKraj !== '__vse') m = m.filter(x => x.kraj === fKraj);

  if (!m.length){
    grid.innerHTML = `<p class="grid-prazdno">V tomto výběru zatím žádné místo není.</p>`;
  } else {
    grid.innerHTML = m.map(dlazdice).join('');
  }
  const celkem = vsechnaMista.length;
  const zobr = m.length;
  pocet.textContent = (fZeme==='__vse' && fKraj==='__vse')
    ? (celkem ? `V atlasu ${celkem===1?'je':'jsou'} ${slovoMist(celkem)}` : 'Zatím tu není žádné místo')
    : `Zobrazeno ${slovoMist(zobr)} z ${celkem}`;
  postavFiltr();
}

async function start(){
  if (typeof window.atlasNactiMista !== 'function'){ setTimeout(start, 100); return; }
  vsechnaMista = await window.atlasNactiMista();
  obnov();
}

function escHtml(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML}
function escAttr(t){return (t||'').replace(/"/g,'&quot;')}

if (window.atlasAuthReady) start();
else window.addEventListener('atlas-auth-ready', start, {once:true});
