/* Správa míst — jen pro správce. Schválit / zamítnout / editovat / smazat. */

let jsemSpravce = false;
let aktualniStav = 'ceka';

const obsah = document.querySelector('#sprava-obsah');
const filtry = document.querySelector('#sprava-filtry');

function stavLabel(s){
  return {ceka:'čeká',zverejnene:'zveřejněno',zamitnute:'zamítnuto',rozepsane:'rozepsáno'}[s]||s;
}
function fmtDatum(iso){if(!iso)return'';const d=new Date(iso);return `${d.getDate()}. ${d.getMonth()+1}. ${d.getFullYear()}`}

async function overPristup(){
  const db=window.atlasDb, ucet=window.atlasUcet?.();
  if(!ucet){
    obsah.innerHTML = `<p class="sprava-stav">Tato stránka je jen pro správce. <button class="link-button" id="sprava-login">Přihlas se</button></p>`;
    document.querySelector('#sprava-login')?.addEventListener('click',()=>document.querySelector('.profile').click());
    return;
  }
  const prof = window.atlasProfil?.();
  const { data } = await db.from('atlas_profily').select('spravce').eq('id',ucet.id).maybeSingle();
  jsemSpravce = !!data?.spravce;
  if(!jsemSpravce){
    obsah.innerHTML = `<p class="sprava-stav">Tvůj účet nemá oprávnění správce.</p>`;
    return;
  }
  filtry.hidden = false;
  nactiMista();
}

async function nactiMista(){
  obsah.innerHTML = `<p class="sprava-stav">Načítám…</p>`;
  const db=window.atlasDb;
  const { data, error } = await db.rpc('atlas_sprava_mista', { p_stav: aktualniStav || null });
  if(error){obsah.innerHTML=`<p class="sprava-stav">Chyba: ${error.message}</p>`;return}
  if(!data || !data.length){
    obsah.innerHTML = `<p class="sprava-stav">Žádná místa v této kategorii.</p>`;
    return;
  }
  obsah.innerHTML = data.map(kartaMista).join('');
  navazAkce(data);
}

function kartaMista(m){
  const fotky = (m.fotky||[]).map(c=>window.atlasFotoUrl(c)).filter(Boolean);
  const hlavni = fotky[0];
  const stitky = (m.stitky||[]).map(k=>`<span class="chip">${window.atlasStitek(k,true)}</span>`).join('');
  const texty = [
    ['Popis',m.popis],['Přístup',m.pristup],['Hloubka',m.hloubka],
    ['Práce s místem',m.prace_s_mistem],['Nejlepší čas',m.nejlepsi_cas]
  ].filter(([,v])=>v&&v.trim()).map(([n,v])=>`<p><b>${n}:</b> ${escHtml(v)}</p>`).join('');

  let akce = '';
  if(m.stav==='ceka' || m.stav==='rozepsane'){
    akce += `<button class="btn-schvalit" data-id="${m.id}">✓ Schválit</button>`;
    akce += `<button class="btn-zamitnout" data-id="${m.id}">✕ Zamítnout</button>`;
  } else if(m.stav==='zverejnene'){
    akce += `<button class="btn-skryt" data-id="${m.id}">Stáhnout z mapy</button>`;
  } else if(m.stav==='zamitnute'){
    akce += `<button class="btn-schvalit" data-id="${m.id}">✓ Přece schválit</button>`;
  }
  akce += `<button class="btn-vzkaz" data-id="${m.id}" data-nazev="${escAttr(m.nazev)}">✉ Vzkaz autorovi</button>`;
  akce += `<button class="btn-edit" data-id="${m.id}">✎ Upravit</button>`;
  akce += `<button class="btn-smazat" data-id="${m.id}" data-nazev="${escAttr(m.nazev)}">🗑 Smazat</button>`;

  const mapaOdkaz = `https://www.google.com/maps?q=${m.lat},${m.lng}`;

  return `<article class="sprava-karta" data-id="${m.id}">
    <div class="sk-foto">${hlavni?`<img src="${hlavni}" alt="" />`:'<div class="sk-nofoto">bez fotky</div>'}${fotky.length>1?`<span class="sk-pocet">${fotky.length} fotek</span>`:''}</div>
    <div class="sk-telo">
      <div class="sk-hlava">
        <div><span class="sk-stav sk-${m.stav}">${stavLabel(m.stav)}</span> <h3>${escHtml(m.nazev)}</h3></div>
        <time>${fmtDatum(m.vytvoreno)}</time>
      </div>
      <p class="sk-meta">${m.autor_nick?`autor <b>${escHtml(m.autor_nick)}</b> · `:''}<a href="${mapaOdkaz}" target="_blank" rel="noopener">${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}</a>${m.presnost_m?` · ±${Math.round(m.presnost_m)} m`:''}</p>
      <div class="sk-chips">${stitky}</div>
      <div class="sk-texty">${texty||'<p class="sk-prazdno">Bez popisu.</p>'}</div>
      <div class="sk-akce">${akce}</div>
    </div>
  </article>`;
}

function navazAkce(data){
  const db=window.atlasDb;
  const mapaData = Object.fromEntries(data.map(m=>[m.id,m]));

  document.querySelectorAll('.btn-schvalit').forEach(b=>b.addEventListener('click',async()=>{
    b.disabled=true;
    const {error}=await db.rpc('atlas_sprava_stav',{p_id:b.dataset.id,p_stav:'zverejnene'});
    if(error){notify('Chyba: '+error.message);b.disabled=false;return}
    notify('Místo zveřejněno.');nactiMista();
  }));

  document.querySelectorAll('.btn-zamitnout').forEach(b=>b.addEventListener('click',async()=>{
    const duvod=prompt('Důvod zamítnutí (nepovinné, uvidí ho autor):','');
    if(duvod===null)return;
    b.disabled=true;
    const {error}=await db.rpc('atlas_sprava_stav',{p_id:b.dataset.id,p_stav:'zamitnute',p_duvod:duvod||null});
    if(error){notify('Chyba: '+error.message);b.disabled=false;return}
    notify('Místo zamítnuto.');nactiMista();
  }));

  document.querySelectorAll('.btn-skryt').forEach(b=>b.addEventListener('click',async()=>{
    if(!confirm('Stáhnout místo z mapy? Vrátí se do stavu „čeká".'))return;
    b.disabled=true;
    const {error}=await db.rpc('atlas_sprava_stav',{p_id:b.dataset.id,p_stav:'ceka'});
    if(error){notify('Chyba: '+error.message);b.disabled=false;return}
    notify('Místo staženo z mapy.');nactiMista();
  }));

  document.querySelectorAll('.btn-smazat').forEach(b=>b.addEventListener('click',async()=>{
    if(!confirm(`Nevratně smazat „${b.dataset.nazev}"? Zmizí i všechny jeho zápisy a fotky.`))return;
    b.disabled=true;
    const {error}=await db.from('atlas_mista').delete().eq('id',b.dataset.id);
    if(error){notify('Chyba: '+error.message);b.disabled=false;return}
    notify('Místo smazáno.');nactiMista();
  }));

  document.querySelectorAll('.btn-vzkaz').forEach(b=>b.addEventListener('click',async()=>{
    const text=prompt(`Vzkaz autorovi místa „${b.dataset.nazev}" (uvidí ho u sebe ve zvonečku):`,'');
    if(text===null)return;
    if(!text.trim()){notify('Vzkaz je prázdný.');return}
    b.disabled=true;
    const {error}=await db.rpc('atlas_posli_vzkaz',{p_misto_id:b.dataset.id,p_text:text.trim()});
    b.disabled=false;
    if(error){notify('Chyba: '+error.message);return}
    notify('Vzkaz odeslán autorovi. ✉');
  }));

  document.querySelectorAll('.btn-edit').forEach(b=>b.addEventListener('click',()=>otevriEdit(mapaData[b.dataset.id])));
}

/* ---- editace ---- */
function otevriEdit(m){
  document.querySelector('#edit-id').value=m.id;
  document.querySelector('#edit-nazev-h').textContent=`Upravit: ${m.nazev}`;
  document.querySelector('#edit-nazev').value=m.nazev||'';
  document.querySelector('#edit-popis').value=m.popis||'';
  document.querySelector('#edit-pristup').value=m.pristup||'';
  document.querySelector('#edit-hloubka').value=m.hloubka||'';
  document.querySelector('#edit-prace').value=m.prace_s_mistem||'';
  document.querySelector('#edit-cas').value=m.nejlepsi_cas||'';
  const mod=document.querySelector('#edit-modal');
  mod.classList.add('open');mod.setAttribute('aria-hidden','false');
  document.querySelector('#edit-nazev').focus();
}
function zavriEdit(){const m=document.querySelector('#edit-modal');m.classList.remove('open');m.setAttribute('aria-hidden','true')}
document.querySelectorAll('#edit-modal .modal-close').forEach(b=>b.addEventListener('click',zavriEdit));
document.querySelector('#edit-modal')?.addEventListener('click',e=>{if(e.target.id==='edit-modal')zavriEdit()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')zavriEdit()});

document.querySelector('#edit-form')?.addEventListener('submit',async event=>{
  event.preventDefault();
  const db=window.atlasDb;
  const id=document.querySelector('#edit-id').value;
  const val=id2=>{const v=document.querySelector(id2).value.trim();return v||null};
  const odeslat=event.currentTarget.querySelector('button[type=submit]');
  odeslat.disabled=true;
  const {error}=await db.from('atlas_mista').update({
    nazev:document.querySelector('#edit-nazev').value.trim(),
    popis:val('#edit-popis'),
    pristup:val('#edit-pristup'),
    hloubka:val('#edit-hloubka'),
    prace_s_mistem:val('#edit-prace'),
    nejlepsi_cas:val('#edit-cas')
  }).eq('id',id);
  odeslat.disabled=false;
  if(error){notify('Uložení selhalo: '+error.message);return}
  zavriEdit();notify('Změny uloženy.');nactiMista();
});

/* ---- filtry ---- */
filtry?.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
  filtry.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');
  aktualniStav=b.dataset.stav;
  nactiMista();
}));

function escHtml(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML}
function escAttr(t){return (t||'').replace(/"/g,'&quot;')}

/* ---- start ---- */
if (window.atlasAuthReady) overPristup();
else window.addEventListener('atlas-auth-ready', overPristup, {once:true});
