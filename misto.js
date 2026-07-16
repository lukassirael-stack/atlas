/* ---- modály ---- */
function openModal(id){const m=document.querySelector(id);if(!m)return;m.classList.add('open');m.setAttribute('aria-hidden','false');m.querySelector('textarea,input,button')?.focus()}
function closeModal(m){if(!m)return;m.classList.remove('open');m.setAttribute('aria-hidden','true')}
function otevriSUctem(id){if(window.vyzadujUcet&&!window.vyzadujUcet())return;openModal(id)}
document.querySelector('#open-log')?.addEventListener('click',()=>otevriSUctem('#log-modal'));
document.querySelector('#open-log-2')?.addEventListener('click',()=>otevriSUctem('#log-modal'));
document.querySelector('#open-comment')?.addEventListener('click',()=>otevriSUctem('#comment-modal'));
document.querySelector('#open-comment-2')?.addEventListener('click',()=>otevriSUctem('#comment-modal'));
document.querySelectorAll('.modal-close').forEach(button=>button.addEventListener('click',()=>closeModal(document.querySelector('#'+button.dataset.close))));
document.querySelectorAll('.modal-backdrop').forEach(backdrop=>backdrop.addEventListener('click',event=>{if(event.target===backdrop)closeModal(backdrop)}));
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.modal-backdrop.open').forEach(closeModal)});
document.querySelector('.log-more')?.addEventListener('click',()=>notify('Načítání dalších zápisů bude napojeno na databázi.'));

/* ---- poloha: zápis jen na místě ---- */
const geoCapture=document.querySelector('#geo-capture');
const geoButton=document.querySelector('#geo-get');
const geoStatus=document.querySelector('#geo-status');
let geoFix=null;
function geoReset(){geoFix=null;geoCapture?.classList.remove('ready');if(!geoStatus)return;geoStatus.className='geo-status';geoStatus.textContent='Poloha zatím nenačtena. Musíš stát přímo na místě.';geoButton.textContent='◎ Načíst mou polohu';geoButton.disabled=false}
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
    geoStatus.textContent=error.code===1?'Přístup k poloze jsi zamítl. Bez ní zápis pořídit nelze.':'Polohu se nepodařilo načíst. Jsi venku, pod otevřeným nebem?';
    geoButton.disabled=false;
  },{enableHighAccuracy:true,timeout:12000,maximumAge:0});
});

/* ---- fotka ze zápisu ---- */
const logPhotoInput=document.querySelector('#log-photo');
const logPhotoPreview=document.querySelector('#log-photo-preview');
const logPhotoText=document.querySelector('#log-photo-drop .photo-text');
logPhotoInput?.addEventListener('change',()=>{
  const file=logPhotoInput.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{logPhotoPreview.src=reader.result;logPhotoPreview.hidden=false;logPhotoText.textContent='Fotka připravena — klepni pro změnu'};
  reader.readAsDataURL(file);
});
function logPhotoReset(){if(!logPhotoPreview)return;logPhotoPreview.hidden=true;logPhotoPreview.removeAttribute('src');logPhotoText.textContent='Přidej fotku z návštěvy'}

/* ---- posuvníky DNA ---- */
document.querySelectorAll('.slider-row input[type=range]').forEach(slider=>{
  const out=slider.parentElement.querySelector('output');
  const sync=()=>{out.textContent=slider.value};
  slider.addEventListener('input',sync);sync();
});

/* ---- odeslání ---- */
document.querySelector('#log-form')?.addEventListener('submit',event=>{
  event.preventDefault();
  if(!geoFix){notify('Nejdřív načti svou polohu — zápis vzniká jen na místě.');geoButton?.focus();return}
  const dna=[...document.querySelectorAll('.slider-row input[type=range]')].map(slider=>`${slider.dataset.axis} ${slider.value}`).join(' · ');
  closeModal(document.querySelector('#log-modal'));
  event.currentTarget.reset();geoReset();logPhotoReset();
  document.querySelectorAll('.slider-row input[type=range]').forEach(slider=>slider.dispatchEvent(new Event('input')));
  notify(`Zápis uložen. Tvé vnímání (${dna}) vstoupí do DNA místa.`);
});
document.querySelector('#comment-form')?.addEventListener('submit',event=>{
  event.preventDefault();
  closeModal(document.querySelector('#comment-modal'));
  event.currentTarget.reset();
  notify('Děkujeme! Komentář se objeví po kontrole správcem.');
});
