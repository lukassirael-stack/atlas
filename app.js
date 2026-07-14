const places = {
  'Tisícový kámen': ['Tisícový kámen', 'Moravskoslezský kraj', 'Balvanové útvary ukryté v lese. Místní říkají, že tu člověk znovu najde vlastní směr.'],
  'Praděd': ['Praděd', 'Jeseníky', 'Nejvyšší hora Moravy s výhledem, který dokáže utišit i rozproudit mysl.'],
  'Kaple sv. Huberta': ['Kaple sv. Huberta', 'Křivoklátsko', 'Tiché místo v lesích, kde čas plyne pomaleji a každý krok má svou váhu.'],
  'Studánka U tří bříz': ['Studánka U tří bříz', 'Vysočina', 'Pramen pod třemi břízami, opředený příběhy poutníků a místních.'],
  'Pustevny': ['Pustevny', 'Beskydy', 'Horské sedlo s dřevěnými stavbami, mlhou a nezaměnitelnou atmosférou.'],
  'Hora Radhošť': ['Hora Radhošť', 'Beskydy', 'Hora legend, větru a dalekých obzorů.']
};
const toast = document.querySelector('#toast');
function notify(message){toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600)}
document.querySelectorAll('.map-pin').forEach(pin=>pin.addEventListener('click',()=>{
  const [name, region, description] = places[pin.dataset.place];
  document.querySelector('#place-name').textContent=name;
  document.querySelector('.place-content .eyebrow').textContent=region;
  document.querySelector('#place-description').textContent=description;
  notify(`Zobrazeno: ${name}`);
}));
document.querySelectorAll('.filter-row button').forEach(button=>button.addEventListener('click',()=>{
  const all=document.querySelector('.filter-row button:first-child');
  if(button===all){document.querySelectorAll('.filter-row button').forEach(item=>item.classList.remove('selected'));all.classList.add('selected')}else{all.classList.remove('selected');button.classList.toggle('selected')}
  const active=[...document.querySelectorAll('.filter-row .selected')].map(item=>item.textContent).join(', ');notify(`Aktivní filtr: ${active || 'žádný'}`);
}));
document.querySelector('#surprise').addEventListener('click',()=>{const names=Object.keys(places);document.querySelector(`.map-pin[data-place="${names[Math.floor(Math.random()*names.length)]}"]`).click()});
document.querySelector('#locate').addEventListener('click',()=>notify('Ukazujeme inspirativní místa ve vašem okolí.'));
document.querySelector('#zoom-in').addEventListener('click',()=>notify('Mapa přiblížena'));
document.querySelector('#zoom-out').addEventListener('click',()=>notify('Mapa oddálena'));
document.querySelector('#filter-toggle').addEventListener('click',()=>document.querySelector('#filters').scrollIntoView({behavior:'smooth',block:'center'}));
document.querySelector('.detail-button').addEventListener('click',()=>notify('Detail místa bude brzy k dispozici.'));
const modal=document.querySelector('#place-modal');
function openModal(){modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.querySelector('#place-form input').focus()}
function closeModal(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true')}
document.querySelector('#add-place').addEventListener('click',openModal);
document.querySelector('.topbar nav a[href="#pridat"]').addEventListener('click',event=>{event.preventDefault();openModal()});
document.querySelector('#modal-close').addEventListener('click',closeModal);
modal.addEventListener('click',event=>{if(event.target===modal)closeModal()});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModal()});
document.querySelector('#place-form').addEventListener('submit',event=>{event.preventDefault();closeModal();event.currentTarget.reset();notify('Děkujeme! Návrh místa čeká na schválení správcem.')});
document.querySelector('#dna-info').addEventListener('click',()=>notify('DNA místa je průměr hodnocení návštěvníků v jednotlivých vlastnostech.'));
const journeyFilter=document.querySelector('#journey-filter');
const categoryPanel=document.querySelector('#category-panel');
const categoryList=document.querySelector('#category-list');
function toggleCategories(show){const shouldShow=show ?? categoryPanel.hidden;categoryPanel.hidden=!shouldShow;journeyFilter.setAttribute('aria-expanded',String(shouldShow));if(shouldShow) categoryPanel.scrollIntoView({behavior:'smooth',block:'start'})}
journeyFilter.addEventListener('click',()=>toggleCategories());
document.querySelector('#panel-close').addEventListener('click',()=>toggleCategories(false));
categoryList.addEventListener('click',event=>{const item=event.target.closest('button');if(item)item.classList.toggle('chosen')});
document.querySelector('#clear-categories').addEventListener('click',()=>categoryList.querySelectorAll('.chosen').forEach(item=>item.classList.remove('chosen')));
document.querySelector('#apply-categories').addEventListener('click',()=>{const selected=[...categoryList.querySelectorAll('.chosen')].map(item=>item.dataset.category);if(!selected.length){notify('Vyberte alespoň jednu kategorii.');return}journeyFilter.querySelector('strong').textContent=selected.length===1?selected[0]:`${selected.length} vybrané kategorie`;toggleCategories(false);document.querySelector('#mapa').scrollIntoView({behavior:'smooth',block:'start'});notify(`Mapa zobrazuje: ${selected.join(', ')}`)});
