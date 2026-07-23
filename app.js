/* ==== ATLAS: místa z databáze ==== */
let atlasMista = [];
let atlasVybrane = null;

function kartaZobraz(m){
  atlasVybrane = m;
  document.querySelector('#place-name').textContent = m.nazev;
  document.querySelector('#place-souradnice').textContent = window.atlasSouradnice(m.lat, m.lng);
  document.querySelector('#place-description').textContent = m.popis_kratky || '';
  document.querySelector('#place-tags').innerHTML =
    (m.stitky||[]).map(k=>`<span>${window.atlasStitek(k,true)}</span>`).join('');
  const dnaEl = document.querySelector('#place-dna');
  const rys = window.atlasRys(m.dna);
  if (rys){
    dnaEl.querySelector('b').textContent = rys;
    dnaEl.querySelector('span').textContent = 'nejsilnější rys';
    dnaEl.querySelector('small').textContent = `${m.dna.zapisu} ${m.dna.zapisu===1?'zápis':m.dna.zapisu<5?'zápisy':'zápisů'}`;
  } else {
    dnaEl.querySelector('b').textContent = 'Zatím bez zápisů';
    dnaEl.querySelector('span').textContent = 'buď první';
    dnaEl.querySelector('small').textContent = '';
  }
  const obraz = document.querySelector('#place-image');
  const url = window.atlasFotoUrl(m.fotka);
  if (url){ obraz.style.backgroundImage=`url(${url})`; obraz.classList.add('ma-foto'); }
  else { obraz.style.backgroundImage=''; obraz.classList.remove('ma-foto'); }
  const detail = document.querySelector('#place-detail');
  if (detail) detail.href = `/misto?m=${m.slug}${m.fotka?`&f=${encodeURIComponent(m.fotka)}`:''}`;
  document.querySelector('#place-card')?.classList.add('show');
}

function dlazdiceVykresli(){
  const grid = document.querySelector('.place-grid');
  if (!grid) return;
  if (!atlasMista.length){
    grid.innerHTML = `<p class="grid-prazdno">Zatím tu není žádné zveřejněné místo. Buď první — zanes to svoje.</p>`;
    return;
  }
  grid.innerHTML = atlasMista.slice(0,6).map(m=>{
    const url = window.atlasFotoUrl(m.fotka);
    const rys = window.atlasRys(m.dna);
    const kraj = (m.stitky&&m.stitky[0]) ? window.atlasStitek(m.stitky[0]) : '';
    const spodek = rys ? `<b>${rys}</b>` : '<b>Nové místo</b>';
    return `<a class="place-tile" href="/misto?m=${m.slug}${m.fotka?`&f=${encodeURIComponent(m.fotka)}`:''}">
      <div class="tile-image"${url?` style="background-image:url(${url})"`:''}></div>
      <div class="tile-info"><span>${kraj}</span><h3>${m.nazev}</h3><p>${spodek}</p></div>
    </a>`;
  }).join('');
}

/* ==== Leaflet mapa (satelit) ==== */
let atlasMap = null;
let atlasZnacky = [];
let mojePoloha = null;
let locateBtn = null;
let mojeNavstevy = new Set();   // misto_id míst, která mám navštívená (mám u nich zápis)
const znackaIkona = L.divIcon({
  className: 'atlas-znacka',
  html: '<span>✦</span>',
  iconSize: [34,34],
  iconAnchor: [17,17]
});
const navstivenaIkona = L.divIcon({
  className: 'atlas-znacka navstiveno',
  html: '<span>★</span>',
  iconSize: [34,34],
  iconAnchor: [17,17]
});

function mapaInit(){
  if (atlasMap || !document.querySelector('#atlas-map')) return;
  atlasMap = L.map('atlas-map', {
    center: [49.75, 15.5],   // střed ČR
    zoom: 7,
    zoomControl: false,
    scrollWheelZoom: true,
    attributionControl: true
  });
  L.control.zoom({ position: 'topright' }).addTo(atlasMap);
  // kruhové tlačítko "Najít mě" hned pod ovládáním zoomu
  // (jako Leaflet control → správná vrstva, nekoliduje se zoomem a klik se neztrácí)
  const NajitControl = L.Control.extend({
    options: { position: 'topright' },
    onAdd: function(){
      const wrap = L.DomUtil.create('div', 'leaflet-bar locate-bar');
      const btn = L.DomUtil.create('a', 'locate-fab', wrap);
      btn.href = '#';
      btn.innerHTML = '◎';
      btn.title = 'Najít mou polohu';
      btn.setAttribute('role','button');
      btn.setAttribute('aria-label','Najít mou polohu');
      locateBtn = btn;
      L.DomEvent.disableClickPropagation(wrap);
      L.DomEvent.on(btn, 'click', L.DomEvent.stop);
      L.DomEvent.on(btn, 'click', najdiPolohu);
      return wrap;
    }
  });
  atlasMap.addControl(new NajitControl());
  // satelit — Esri World Imagery, zdarma bez klíče
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Esri, Maxar, Earthstar Geographics'
  }).addTo(atlasMap);
  // jemné popisky obcí a cest přes satelit
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, opacity: 0.9
  }).addTo(atlasMap);
}

function znackyVykresli(){
  if (!atlasMap) return;
  atlasZnacky.forEach(z=>z.remove());
  atlasZnacky = [];
  const body = [];
  atlasMista.forEach(m=>{
    if (m.lat==null || m.lng==null) return;
    const ikona = mojeNavstevy.has(m.id) ? navstivenaIkona : znackaIkona;
    const znacka = L.marker([m.lat, m.lng], {icon: ikona, title: m.nazev}).addTo(atlasMap);
    znacka.on('click', ()=>{ kartaZobraz(m); atlasMap.panTo([m.lat, m.lng]); });
    atlasZnacky.push(znacka);
    body.push([m.lat, m.lng]);
  });
  // srovnat pohled na všechna místa
  if (body.length === 1){ atlasMap.setView(body[0], 12); }
  else if (body.length > 1){ atlasMap.fitBounds(body, {padding:[50,50], maxZoom:12}); }
}

async function atlasStart(){
  if (typeof window.atlasNactiMista !== 'function'){
    setTimeout(atlasStart, 100);
    return;
  }
  mapaInit();
  atlasMista = await window.atlasNactiMista();
  dlazdiceVykresli();
  znackyVykresli();
  if (atlasMista.length){
    /* místo dne — výloha se každý den protočí na další místo v pořadí */
    const den = Math.floor(Date.now()/86400000);
    const dnesni = atlasMista[den % atlasMista.length];
    posledniLos = dnesni.slug;
    kartaZobraz(dnesni);
  }
}
if (window.atlasAuthReady) atlasStart();
else window.addEventListener('atlas-auth-ready', atlasStart, {once:true});

document.querySelector('#card-close')?.addEventListener('click',()=>{
  document.querySelector('#place-card')?.classList.remove('show');
});

document.querySelectorAll('.filter-row button').forEach(button=>button.addEventListener('click',()=>{
  const all=document.querySelector('.filter-row button:first-child');
  if(button===all){document.querySelectorAll('.filter-row button').forEach(item=>item.classList.remove('selected'));all.classList.add('selected')}else{all.classList.remove('selected');button.classList.toggle('selected')}
  const active=[...document.querySelectorAll('.filter-row .selected')].map(item=>item.textContent).join(', ');notify(`Aktivní filtr: ${active || 'žádný'}`);
}));
let posledniLos = null;
document.querySelector('#surprise')?.addEventListener('click',()=>{
  if(!atlasMista.length){notify('Zatím tu není žádné místo. Buď první!');return}
  let kandidati = atlasMista;
  if (atlasMista.length > 1 && posledniLos) kandidati = atlasMista.filter(x=>x.slug!==posledniLos);
  const m=kandidati[Math.floor(Math.random()*kandidati.length)];
  posledniLos = m.slug;
  notify(`✦ Atlas tě volá: ${m.nazev}`);
  const karta=document.querySelector('#place-card');
  karta?.classList.remove('show');
  setTimeout(()=>{
    kartaZobraz(m);
    if(atlasMap && m.lat!=null) atlasMap.flyTo([m.lat,m.lng],13,{duration:.9});
  },200);
  document.querySelector('#mapa')?.scrollIntoView({behavior:'smooth'});
});
function najdiPolohu(){
  if(!navigator.geolocation){ notify('Tvůj prohlížeč polohu nepodporuje.'); return; }
  document.querySelector('#place-card')?.classList.remove('show'); // náhled místa pryč, ať nezakrývá polohu
  notify('Hledám tvou polohu…');
  if(locateBtn) locateBtn.classList.add('hledam');
  navigator.geolocation.getCurrentPosition(function(p){
    if(locateBtn) locateBtn.classList.remove('hledam');
    const ll = [p.coords.latitude, p.coords.longitude];
    if(atlasMap){
      atlasMap.flyTo(ll, 13, { duration: 1.1 });
      if(mojePoloha){ mojePoloha.setLatLng(ll); }
      else {
        mojePoloha = L.circleMarker(ll, {
          radius: 8, weight: 3, color: '#ffffff',
          fillColor: '#7fd99a', fillOpacity: .95
        }).addTo(atlasMap);
        mojePoloha.bindPopup('Tady jsi ty 🌿');
      }
    }
    notify('Jsi tady 🌿');
  }, function(err){
    if(locateBtn) locateBtn.classList.remove('hledam');
    let m = 'Polohu se nepodařilo načíst.';
    if(err && err.code === 1) m = 'Přístup k poloze je zakázaný — povol ho v nastavení prohlížeče.';
    else if(err && err.code === 3) m = 'Hledání polohy trvá moc dlouho. Zkus to prosím znovu.';
    notify(m);
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
}
document.querySelector('#filter-toggle')?.addEventListener('click',()=>document.querySelector('#filters').scrollIntoView({behavior:'smooth',block:'center'}));
const modal=document.querySelector('#place-modal');
function openModal(){modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.querySelector('#place-form input[type="text"]').focus()}
function closeModal(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true')}
document.querySelector('#add-place')?.addEventListener('click',()=>{if(window.vyzadujUcet&&!window.vyzadujUcet())return;openModal()});
document.querySelectorAll('a[href="#pridat"]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();if(window.vyzadujUcet&&!window.vyzadujUcet())return;openModal()}));
if(location.hash==='#pridat')setTimeout(()=>{if(!window.vyzadujUcet||window.vyzadujUcet())openModal()},600);
document.querySelector('#modal-close')?.addEventListener('click',closeModal);
modal?.addEventListener('click',event=>{if(event.target===modal)closeModal()});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModal()});
const geoCapture=document.querySelector('#geo-capture');
const geoButton=document.querySelector('#geo-get');
const geoStatus=document.querySelector('#geo-status');
let geoFix=null;
function geoChybaText(err){
  if(/FBAN|FBAV|FB_IAB|Instagram/i.test(navigator.userAgent))
    return 'Prohlížeč uvnitř aplikace (Facebook, Instagram…) polohu neumí. Otevři Atlas přes menu ⋮ v běžném prohlížeči — bez polohy místo zanést nelze.';
  if(err&&err.code===1)
    return 'Přístup k poloze je zablokovaný. Klepni na ikonu vedle adresy → Oprávnění → Poloha → Povolit a stránku obnov. Bez polohy místo zanést nelze.';
  if(err&&err.code===3)
    return 'Hledání polohy trvá moc dlouho. Zkus to prosím znovu.';
  return 'Polohu se nepodařilo načíst. Máš v telefonu zapnutou polohu (GPS)? Jsi venku, pod otevřeným nebem?';
}
function geoReset(){geoFix=null;geoCapture.classList.remove('ready');geoStatus.className='geo-status';geoStatus.textContent='Poloha zatím nenačtena. Musíš stát přímo na místě.';geoButton.textContent='◎ Načíst mou polohu';geoButton.disabled=false}
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
const tagPicker=document.querySelector('#tag-picker');
tagPicker?.addEventListener('click',event=>{
  const chip=event.target.closest('button');
  if(!chip)return;
  if(!chip.classList.contains('on')&&tagPicker.querySelectorAll('.on').length>=3){notify('Vyber nejvýš tři štítky — ať zůstane jasné, čím místo je.');return}
  chip.classList.toggle('on');
});
const photoInputs=[document.querySelector('#place-photo-cam'),document.querySelector('#place-photo-gal')].filter(Boolean);
const photoGrid=document.querySelector('#photo-grid');
const photoText=document.querySelector('#photo-drop .photo-text');
const MAX_PHOTOS=6;
let photos=[];  // File objekty
function renderPhotos(){
  if(!photoGrid)return;
  photoGrid.querySelectorAll('img').forEach(i=>{if(i.src&&i.src.startsWith('blob:'))URL.revokeObjectURL(i.src)});
  photoGrid.innerHTML='';
  photoGrid.hidden=!photos.length;
  photos.forEach((file,index)=>{
    const figure=document.createElement('figure');
    figure.className='photo-thumb'+(index===0?' main':'');
    const image=document.createElement('img');image.src=URL.createObjectURL(file);image.alt='';
    const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Odebrat fotku');
    remove.addEventListener('click',()=>{photos.splice(index,1);renderPhotos()});
    figure.append(image,remove);photoGrid.appendChild(figure);
  });
  if(photoText) photoText.textContent=photos.length?`${photos.length} z ${MAX_PHOTOS} fotek — přidej další`:'Přidej fotky místa';
}
function pridejFotky(files){
  const room=MAX_PHOTOS-photos.length;
  if(!room){notify(`Víc než ${MAX_PHOTOS} fotek zatím nepřijmeme.`);return}
  if(files.length>room)notify(`Vejde se ještě ${room} — přidávám prvních ${room}.`);
  files.slice(0,room).forEach(file=>photos.push(file));
  renderPhotos();
}
photoInputs.forEach(input=>input.addEventListener('change',()=>{
  pridejFotky([...input.files]);
  input.value='';
}));
function formReset(){
  geoReset();
  photos=[];renderPhotos();
  tagPicker.querySelectorAll('.on').forEach(chip=>chip.classList.remove('on'));
}
async function nahrajFotky(mistoId){
  const db=window.atlasDb, ucet=window.atlasUcet?.();
  const cesty=[];
  for(let index=0;index<photos.length;index++){
    let blob=photos[index], pripona='jpg';
    if(window.atlasZpracujFoto){ const z=await window.atlasZpracujFoto(photos[index]); blob=z.blob; pripona=z.pripona; }
    const cesta=`mista/${mistoId}/${Date.now()}-${index}.${pripona}`;
    const {error}=await db.storage.from('atlas').upload(cesta,blob,{contentType:blob.type,upsert:false});
    if(error){console.error('Fotka se nenahrála:',error);continue}
    cesty.push({misto_id:mistoId,autor_id:ucet.id,cesta,poradi:index});
  }
  if(cesty.length)await db.from('atlas_fotky').insert(cesty);
  return cesty.length;
}

document.querySelector('#place-form')?.addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.currentTarget;
  if(!geoFix){notify('Nejdřív načti svou polohu — místo lze zanést jen přímo na místě.');geoButton?.focus();return}
  if(!photos.length){notify('Přidej aspoň jednu fotku — ať ostatní vidí, kam jdou.');return}
  if(!tagPicker.querySelector('.on')){notify('Vyber alespoň jeden štítek místa.');return}
  const nazev=document.querySelector('#misto-nazev').value.trim();
  if(!nazev){notify('Dej místu jméno.');return}
  if(!window.vyzadujUcet||!window.vyzadujUcet())return;

  const db=window.atlasDb, ucet=window.atlasUcet();

  /* první naladění je součást zrodu místa — bez pár slov prožitku místo neodejde */
  const zapisText=document.querySelector('#misto-zapis')?.value.trim();
  if(!zapisText){
    notify('Napiš pár slov o tom, co tu prožíváš — každé místo se rodí se svým prvním zápisem.');
    document.querySelector('#misto-zapis')?.focus();
    return;
  }

  const odeslat=form.querySelector('button[type=submit]');
  const puvodni=odeslat.textContent;
  odeslat.disabled=true;odeslat.textContent='Ukládám…';

  const stitky=[...tagPicker.querySelectorAll('.on')].map(chip=>chip.dataset.tag);
  const hodnota=id=>{const el=document.querySelector(id);return el&&el.value.trim()?el.value.trim():null};

  // určit kraj a zemi z GPS (v prohlížeči)
  let uzemi={zeme:null,kraj:null};
  try{ if(window.atlasUrciUzemi) uzemi=await window.atlasUrciUzemi(geoFix.lat, geoFix.lng); }catch(e){ console.warn('Území se nepodařilo určit:',e); }

  const {data:misto,error}=await db.from('atlas_mista').insert({
    autor_id:ucet.id,
    nazev:nazev,
    poloha:`SRID=4326;POINT(${geoFix.lng} ${geoFix.lat})`,
    presnost_m:Math.round(geoFix.accuracy),
    stitky,
    stav:'ceka',
    zeme:uzemi.zeme,
    kraj:uzemi.kraj,
    popis:hodnota('#misto-popis')
  }).select('id,slug,nazev').single();

  if(error){
    odeslat.disabled=false;odeslat.textContent=puvodni;
    console.error(error);
    notify('Místo se nepodařilo uložit: '+error.message);
    return;
  }

  odeslat.textContent='Nahrávám fotky…';
  const nahrano=await nahrajFotky(misto.id);

  // první návštěva s DNA (zakladatel stojí na místě → ověřený bonus) + prožitek jako komentář
  let prvniZapis=false;
  {
    const dna=k=>Number(document.querySelector(`#misto-dna input[data-k="${k}"]`).value);
    const {error:zErr}=await db.from('atlas_zapisy').insert({
      misto_id:mistoId, autor_id:ucet.id, text:'',
      poloha:`SRID=4326;POINT(${geoFix.lng} ${geoFix.lat})`, presnost_m:Math.round(geoFix.accuracy),
      klid:dna('klid'), energie:dna('energie'), mystika:dna('mystika'), krasa:dna('krasa'), lecivost:dna('lecivost')
    });
    if(zErr) console.warn('První návštěva se nezaložila:', zErr.message);
    else prvniZapis=true;
    const {error:kErr}=await db.from('atlas_komentare').insert({misto_id:mistoId, autor_id:ucet.id, text:zapisText});
    if(kErr) console.warn('Prožitek se nezaložil:', kErr.message);
  }

  odeslat.disabled=false;odeslat.textContent=puvodni;

  closeModal();form.reset();formReset();
  document.querySelectorAll('#misto-dna .slider-row').forEach(radek=>{radek.querySelector('output').textContent=radek.querySelector('input').value});
  notify(`Děkujeme! „${misto.nazev}" (${nahrano} ${sklon(nahrano,['fotka','fotky','fotek'])}${prvniZapis?' + tvá první návštěva':''}) čeká na schválení.`);
});
/* posuvníky DNA ve formuláři místa: živé číslo vedle osy */
document.querySelector('#misto-dna')?.addEventListener('input',e=>{
  if(e.target.type==='range') e.target.closest('.slider-row').querySelector('output').textContent=e.target.value;
});
const journeyFilter=document.querySelector('#journey-filter');
const categoryPanel=document.querySelector('#category-panel');
const categoryList=document.querySelector('#category-list');
function toggleCategories(show){const shouldShow=show ?? categoryPanel.hidden;categoryPanel.hidden=!shouldShow;journeyFilter.setAttribute('aria-expanded',String(shouldShow));if(shouldShow) categoryPanel.scrollIntoView({behavior:'smooth',block:'start'})}
journeyFilter?.addEventListener('click',()=>toggleCategories());
document.querySelector('#panel-close')?.addEventListener('click',()=>toggleCategories(false));
categoryList?.addEventListener('click',event=>{const item=event.target.closest('button');if(item)item.classList.toggle('chosen')});
document.querySelector('#clear-categories')?.addEventListener('click',()=>categoryList.querySelectorAll('.chosen').forEach(item=>item.classList.remove('chosen')));
document.querySelector('#apply-categories')?.addEventListener('click',()=>{const selected=[...categoryList.querySelectorAll('.chosen')].map(item=>item.dataset.category);if(!selected.length){notify('Vyberte alespoň jednu kategorii.');return}journeyFilter.querySelector('strong').textContent=selected.length===1?selected[0]:`${selected.length} vybrané kategorie`;toggleCategories(false);document.querySelector('#mapa').scrollIntoView({behavior:'smooth',block:'start'});notify(`Mapa zobrazuje: ${selected.join(', ')}`)});

/* ---- instalace aplikace na plochu (PWA) ---- */
let _installPrompt=null;
window.addEventListener('beforeinstallprompt',(e)=>{
  e.preventDefault();
  _installPrompt=e;
  const akce=document.querySelector('.header-actions');
  if(!akce||document.querySelector('#install-btn'))return;
  const btn=document.createElement('button');
  btn.id='install-btn';btn.type='button';btn.className='install-btn';
  btn.innerHTML='<span class="ii">📲</span><span class="il">Nainstalovat</span>';
  btn.addEventListener('click',async()=>{
    if(!_installPrompt)return;
    _installPrompt.prompt();
    const {outcome}=await _installPrompt.userChoice;
    if(outcome==='accepted')btn.remove();
    _installPrompt=null;
  });
  akce.insertBefore(btn,akce.firstChild);
});
window.addEventListener('appinstalled',()=>document.querySelector('#install-btn')?.remove());

/* ==== Komunita: živý puls Atlasu ==== */
function sklon(n, tvary){ // tvary: ['místo','místa','míst']
  if(n===1) return tvary[0];
  if(n>=2 && n<=4) return tvary[1];
  return tvary[2];
}
function pulsKdy(iso){
  const d=new Date(iso), teď=new Date();
  const dnu=Math.floor((teď-d)/86400000);
  if(dnu<=0) return 'dnes';
  if(dnu===1) return 'včera';
  if(dnu<7) return `před ${dnu} dny`;
  return `${d.getDate()}. ${d.getMonth()+1}. ${d.getFullYear()}`;
}
async function nactiPuls(){
  const feed=document.querySelector('#puls-feed');
  if(!feed) return;
  const db=window.atlasDb;
  let p=null;
  try{
    if(db){ const r=await db.rpc('atlas_komunita_puls'); if(!r.error) p=r.data; }
  }catch(_){}
  if(!p){ feed.innerHTML='<p class="puls-nacitam">Puls se teď nepodařilo nahmatat — zkus to prosím za chvíli.</p>'; return; }

  const esc=t=>{const d=document.createElement('div');d.textContent=t||'';return d.innerHTML};
  document.querySelector('#puls-mista').textContent=p.mista;
  document.querySelector('#puls-mista-l').textContent=sklon(p.mista,['místo na mapě','místa na mapě','míst na mapě']);
  document.querySelector('#puls-zapisy').textContent=p.zapisy;
  document.querySelector('#puls-zapisy-l').textContent=sklon(p.zapisy,['zápis z cest','zápisy z cest','zápisů z cest']);
  document.querySelector('#puls-poutnici').textContent=p.poutnici;
  document.querySelector('#puls-poutnici-l').textContent=sklon(p.poutnici,['poutník','poutníci','poutníků']);

  if(!p.posledni || !p.posledni.length){
    feed.innerHTML=`<div class="puls-vyzva">
      <p><b>Zatím tu vládne ticho před úsvitem.</b></p>
      <p>Buď první, kdo do Atlasu vloží svůj hlas — navštiv místo, procíť ho a zanech zápis. Každé svědectví utváří DNA místa a rozeznívá mapu pro ostatní.</p>
      <a class="button primary" href="#mapa">Otevřít mapu ✦</a>
    </div>`;
    return;
  }
  feed.innerHTML=p.posledni.map(z=>`
    <a class="puls-zapis" href="/misto?m=${encodeURIComponent(z.slug)}">
      <p class="pz-hlava"><b>${esc(z.nick||'poutník')}</b> <span>✦</span> ${esc(z.misto)}</p>
      <p class="pz-text">„${esc(z.uryvek)}${z.zkraceno?'…':''}"</p>
      <p class="pz-kdy">${pulsKdy(z.vytvoreno)}</p>
    </a>`).join('');
}
if(window.atlasAuthReady) nactiPuls();
window.addEventListener('atlas-auth-ready', nactiPuls);

/* ==== navštívená místa: odlišit značkou na mapě ==== */
async function nactiNavstevy(){
  const db = window.atlasDb, ucet = window.atlasUcet?.();
  if(!db || !ucet){ mojeNavstevy = new Set(); return; }
  try{
    const { data, error } = await db.rpc('atlas_moje_navstevy');
    if(error) return;
    mojeNavstevy = new Set((data||[]).map(r=>r.misto_id));
    if(atlasMap && atlasMista && atlasMista.length) znackyVykresli();
  }catch(_){}
}
if(window.atlasAuthReady) nactiNavstevy();
window.addEventListener('atlas-auth-ready', nactiNavstevy);
