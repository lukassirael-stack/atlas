const places = {
  'Tisícový kámen': {region:'Moravskoslezský kraj · 49.7123 N, 18.4576 E', popis:'Balvanové útvary ukryté v lese. Místní říkají, že tu člověk znovu najde vlastní směr.', rys:'Krása 99 %', zapisy:128, stitky:['🪨 Megalit','🌿 Klid','✨ Portál']},
  'Praděd': {region:'Jeseníky · 50.0833 N, 17.2333 E', popis:'Nejvyšší hora Moravy s výhledem, který dokáže utišit i rozproudit mysl.', rys:'Energie 92 %', zapisy:214, stitky:['🌅 Výhled','⚡ Energie','🏛 Historie']},
  'Kaple sv. Huberta': {region:'Křivoklátsko · 50.0361 N, 13.8722 E', popis:'Tiché místo v lesích, kde čas plyne pomaleji a každý krok má svou váhu.', rys:'Klid 94 %', zapisy:87, stitky:['🏛 Historie','🌿 Klid','🧘 Meditace']},
  'Studánka U tří bříz': {region:'Vysočina · 49.4500 N, 15.5833 E', popis:'Pramen pod třemi břízami, opředený příběhy poutníků a místních.', rys:'Léčivost 91 %', zapisy:63, stitky:['💧 Pramen','🔥 Léčivé','🌳 Stromy']},
  'Pustevny': {region:'Beskydy · 49.4906 N, 18.2494 E', popis:'Horské sedlo s dřevěnými stavbami, mlhou a nezaměnitelnou atmosférou.', rys:'Mystika 88 %', zapisy:156, stitky:['🌙 Pohanské','🌅 Výhled','🔮 Magie']},
  'Hora Radhošť': {region:'Beskydy · 49.4589 N, 18.2464 E', popis:'Hora legend, větru a dalekých obzorů.', rys:'Síla 95 %', zapisy:198, stitky:['⚡ Energie','🌙 Keltské','🌅 Výhled']}
};
const toast = document.querySelector('#toast');
function notify(message){toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600)}
document.querySelectorAll('.map-pin').forEach(pin=>pin.addEventListener('click',()=>{
  const name=pin.dataset.place, place=places[name];
  document.querySelector('#place-name').textContent=name;
  document.querySelector('.place-content .eyebrow').textContent=place.region;
  document.querySelector('#place-description').textContent=place.popis;
  document.querySelector('.place-content .tags').innerHTML=place.stitky.map(tag=>`<span>${tag}</span>`).join('');
  document.querySelector('#place-dna b').textContent=place.rys;
  document.querySelector('#place-dna small').textContent=`${place.zapisy} zápisů`;
  notify(`Zobrazeno: ${name}`);
}));
document.querySelectorAll('.filter-row button').forEach(button=>button.addEventListener('click',()=>{
  const all=document.querySelector('.filter-row button:first-child');
  if(button===all){document.querySelectorAll('.filter-row button').forEach(item=>item.classList.remove('selected'));all.classList.add('selected')}else{all.classList.remove('selected');button.classList.toggle('selected')}
  const active=[...document.querySelectorAll('.filter-row .selected')].map(item=>item.textContent).join(', ');notify(`Aktivní filtr: ${active || 'žádný'}`);
}));
document.querySelector('#surprise')?.addEventListener('click',()=>{const names=Object.keys(places);document.querySelector(`.map-pin[data-place="${names[Math.floor(Math.random()*names.length)]}"]`).click()});
document.querySelector('#locate')?.addEventListener('click',()=>notify('Ukazujeme inspirativní místa ve vašem okolí.'));
document.querySelector('#zoom-in')?.addEventListener('click',()=>notify('Mapa přiblížena'));
document.querySelector('#zoom-out')?.addEventListener('click',()=>notify('Mapa oddálena'));
document.querySelector('#filter-toggle')?.addEventListener('click',()=>document.querySelector('#filters').scrollIntoView({behavior:'smooth',block:'center'}));
const modal=document.querySelector('#place-modal');
function openModal(){modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.querySelector('#place-form input[type="text"]').focus()}
function closeModal(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true')}
document.querySelector('#add-place')?.addEventListener('click',openModal);
document.querySelectorAll('a[href="#pridat"]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();openModal()}));
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
const photoInput=document.querySelector('#place-photo');
const photoPreview=document.querySelector('#photo-preview');
const photoText=document.querySelector('#photo-drop .photo-text');
photoInput?.addEventListener('change',()=>{
  const file=photoInput.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{photoPreview.src=reader.result;photoPreview.hidden=false;photoText.textContent='Fotka připravena — klepni pro změnu'};
  reader.readAsDataURL(file);
});
function formReset(){
  geoReset();
  photoPreview.hidden=true;photoPreview.removeAttribute('src');photoText.textContent='Vyfoť místo';
  tagPicker.querySelectorAll('.on').forEach(chip=>chip.classList.remove('on'));
}
document.querySelector('#place-form')?.addEventListener('submit',event=>{
  event.preventDefault();
  if(!geoFix){notify('Nejdřív načti svou polohu — místo lze zanést jen přímo na místě.');geoButton.focus();return}
  if(!photoInput.files.length){notify('Přidej fotku místa — je to důkaz, že jsi tu byl.');return}
  if(!tagPicker.querySelector('.on')){notify('Vyber alespoň jeden štítek místa.');return}
  const tags=[...tagPicker.querySelectorAll('.on')].map(chip=>chip.dataset.tag);
  closeModal();event.currentTarget.reset();formReset();
  notify(`Děkujeme! Návrh místa (${tags.length===1?tags[0]:tags.length+' štítky'}) čeká na schválení.`);
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
