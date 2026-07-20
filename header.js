/* společné pro všechny stránky: toast, mobilní menu, service worker */
const toast = document.querySelector('#toast');
function notify(message){if(!toast)return;toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2800)}

/* ---- mobilní menu ---- */
function zavriMenu(){
  const nav=document.getElementById('mobile-nav');
  if(!nav)return;
  nav.hidden=true;
  const b=document.querySelector('.menu-button');
  if(b){b.setAttribute('aria-expanded','false');b.textContent='☰';}
}
/* delegace na celý dokument — funguje i po překreslení hlavičky, bez ohledu na časování */
document.addEventListener('click',function(e){
  const btn=e.target.closest('.menu-button');
  if(btn){
    e.preventDefault();
    const nav=document.getElementById('mobile-nav');
    if(nav){
      const otevrit=nav.hidden;
      nav.hidden=!otevrit;
      btn.setAttribute('aria-expanded',String(otevrit));
      btn.textContent=otevrit?'✕':'☰';
    }
    return;
  }
  if(e.target.closest('#mobile-nav a')) zavriMenu();
});
document.addEventListener('keydown',function(e){ if(e.key==='Escape') zavriMenu(); });

/* pojistka: hamburger musí být klikatelný nad ostatními prvky hlavičky */
(function(){ const b=document.querySelector('.menu-button'); if(b){ b.style.position='relative'; b.style.zIndex='1002'; } })();

/* PWA: registrace service workeru */
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('/sw.js').catch(err=>console.warn('SW se nepodařilo zaregistrovat:',err));
  });
}
