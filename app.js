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
  if (detail) detail.href = `/misto?m=${m.slug}`;
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
    return `<a class="place-tile" href="/misto?m=${m.slug}">
      <div class="tile-image"${url?` style="background-image:url(${url})"`:''}></div>
      <div class="tile-info"><span>${kraj}</span><h3>${m.nazev}</h3><p>${spodek}</p></div>
    </a>`;
  }).join('');
}

/* ==== Leaflet mapa (satelit) ==== */
let atlasMap = null;
let atlasZnacky = [];
const znackaIkona = L.divIcon({
  className: 'atlas-znacka',
  html: '<span>✦</span>',
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
    const znacka = L.marker([m.lat, m.lng], {icon: znackaIkona, title: m.nazev}).addTo(atlasMap);
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
  if (atlasMista.length) kartaZobraz(atlasMista[0]);
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
document.querySelector('#surprise')?.addEventListener('click',()=>{
  if(!atlasMista.length){notify('Zatím tu není žádné místo. Buď první!');return}
  const m=atlasMista[Math.floor(Math.random()*atlasMista.length)];
  kartaZobraz(m);
  if(atlasMap && m.lat!=null) atlasMap.setView([m.lat,m.lng],13);
  document.querySelector('#mapa')?.scrollIntoView({behavior:'smooth'});
});
document.querySelector('#locate')?.addEventListener('click',()=>{
  if(!navigator.geolocation){notify('Tvůj prohlížeč polohu nepodporuje.');return}
  notify('Hledám tvou polohu…');
  navigator.geolocation.getCurrentPosition(p=>{
    if(atlasMap) atlasMap.setView([p.coords.latitude,p.coords.longitude],12);
  },()=>notify('Polohu se nepodařilo načíst.'),{enableHighAccuracy:true,timeout:10000});
});
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
    geoStatus.textContent=error.code===1?'Přístup k poloze jsi zamítl. Bez ní místo zanést nelze.':'Polohu se nepodařilo načíst. Jsi venku, pod otevřeným nebem?';
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
  if(!geoFix){notify('Nejdřív načti svou polohu — místo lze zanést jen přímo na místě.');geoButton?.focus();return}
  if(!photos.length){notify('Přidej aspoň jednu fotku — ať ostatní vidí, kam jdou.');return}
  if(!tagPicker.querySelector('.on')){notify('Vyber alespoň jeden štítek místa.');return}
  if(!window.vyzadujUcet||!window.vyzadujUcet())return;

  const db=window.atlasDb, ucet=window.atlasUcet();
  const odeslat=event.currentTarget.querySelector('button[type=submit]');
  const puvodni=odeslat.textContent;
  odeslat.disabled=true;odeslat.textContent='Ukládám…';

  const stitky=[...tagPicker.querySelectorAll('.on')].map(chip=>chip.dataset.tag);
  const hodnota=id=>{const el=document.querySelector(id);return el&&el.value.trim()?el.value.trim():null};

  // určit kraj a zemi z GPS (v prohlížeči)
  let uzemi={zeme:null,kraj:null};
  try{ if(window.atlasUrciUzemi) uzemi=await window.atlasUrciUzemi(geoFix.lat, geoFix.lng); }catch(e){ console.warn('Území se nepodařilo určit:',e); }

  const {data:misto,error}=await db.from('atlas_mista').insert({
    autor_id:ucet.id,
    nazev:document.querySelector('#misto-nazev').value.trim(),
    poloha:`SRID=4326;POINT(${geoFix.lng} ${geoFix.lat})`,
    presnost_m:Math.round(geoFix.accuracy),
    stitky,
    stav:'ceka',
    zeme:uzemi.zeme,
    kraj:uzemi.kraj,
    popis:hodnota('#misto-popis'),
    pristup:hodnota('#misto-pristup'),
    hloubka:hodnota('#misto-hloubka'),
    prace_s_mistem:hodnota('#misto-prace'),
    nejlepsi_cas:hodnota('#misto-cas')
  }).select('id,slug,nazev').single();

  if(error){
    odeslat.disabled=false;odeslat.textContent=puvodni;
    console.error(error);
    notify('Místo se nepodařilo uložit: '+error.message);
    return;
  }

  odeslat.textContent='Nahrávám fotky…';
  const nahrano=await nahrajFotky(misto.id);
  odeslat.disabled=false;odeslat.textContent=puvodni;

  closeModal();event.currentTarget.reset();formReset();
  notify(`Děkujeme! „${misto.nazev}" (${nahrano} ${nahrano===1?'fotka':'fotky'}) čeká na schválení.`);
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
  btn.id='install-btn';btn.type='button';btn.textContent='📲 Nainstalovat';
  btn.style.cssText='display:inline-flex;align-items:center;gap:6px;border:1px solid #c9a14a;background:linear-gradient(135deg,#e8c56a,#c9a14a);color:#16241d;border-radius:99px;padding:8px 16px;font:600 13px Jost,sans-serif;cursor:pointer;margin-right:8px;white-space:nowrap';
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
