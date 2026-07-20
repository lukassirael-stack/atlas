/* společné pro všechny stránky: toast, mobilní menu, service worker */
const toast = document.querySelector('#toast');
function notify(message){if(!toast)return;toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2800)}

/* ---- mobilní menu ---- */
/* menu i překryv přesunout VEN z hlavičky přímo do <body>:
   topbar má backdrop-filter, který připnutým potomkům mění vztažný bod
   a na mobilech způsobuje chyby vykreslování — mimo hlavičku jsou nezávislé */
(function(){
  const nav=document.getElementById('mobile-nav');
  if(!nav) return;
  if(nav.parentElement !== document.body) document.body.appendChild(nav);
  if(!document.querySelector('.nav-overlay')){
    const ov=document.createElement('div');
    ov.className='nav-overlay';
    ov.hidden=true;
    ov.addEventListener('click', zavriMenu);
    document.body.appendChild(ov);
  }
  /* zvýraznit položku aktuální stránky (funguje s .html i bez) */
  const norm=s=>(s.replace(/\/+$/,'').replace(/\.html$/,'')||'/');
  const cesta=norm(location.pathname);
  nav.querySelectorAll('a').forEach(a=>{
    const href=a.getAttribute('href')||'';
    if(href.startsWith('/') && norm(href)===cesta) a.classList.add('aktivni');
  });
})();

function nastavMenu(otevrit){
  const nav=document.getElementById('mobile-nav');
  const ov=document.querySelector('.nav-overlay');
  const b=document.querySelector('.menu-button');
  if(nav) nav.hidden=!otevrit;
  if(ov) ov.hidden=!otevrit;
  if(b){b.setAttribute('aria-expanded',String(otevrit));b.textContent=otevrit?'✕':'☰';}
}
function zavriMenu(){ nastavMenu(false); }

/* delegace na celý dokument — funguje bez ohledu na překreslení hlavičky */
document.addEventListener('click',function(e){
  const btn=e.target.closest('.menu-button');
  if(btn){
    e.preventDefault();
    const nav=document.getElementById('mobile-nav');
    nastavMenu(nav ? nav.hidden : true);
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
