/* společné pro všechny stránky: toast, mobilní menu, service worker */
const toast = document.querySelector('#toast');
function notify(message){if(!toast)return;toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2800)}

/* ---- mobilní menu ---- */
/* menu přesunout VEN z hlavičky přímo do <body>:
   topbar má backdrop-filter, který připnutým potomkům mění vztažný bod
   a na mobilech způsobuje chyby vykreslování — mimo hlavičku je menu nezávislé */
(function(){
  const nav=document.getElementById('mobile-nav');
  if(nav && nav.parentElement !== document.body) document.body.appendChild(nav);
})();

function zavriMenu(){
  const nav=document.getElementById('mobile-nav');
  if(!nav)return;
  nav.hidden=true;
  const b=document.querySelector('.menu-button');
  if(b){b.setAttribute('aria-expanded','false');b.textContent='☰';}
}
/* delegace na celý dokument — funguje bez ohledu na překreslení hlavičky */
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

/* PWA: registrace service workeru */
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('/sw.js').catch(err=>console.warn('SW se nepodařilo zaregistrovat:',err));
  });
}
