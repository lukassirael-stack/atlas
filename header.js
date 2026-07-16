/* společné pro všechny stránky: toast, mobilní menu, profil */
const toast = document.querySelector('#toast');
function notify(message){if(!toast)return;toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2800)}

const menuButton=document.querySelector('.menu-button');
const mobileNav=document.querySelector('#mobile-nav');
menuButton?.addEventListener('click',()=>{
  const open=mobileNav.hidden;
  mobileNav.hidden=!open;
  menuButton.setAttribute('aria-expanded',String(open));
  menuButton.textContent=open?'✕':'☰';
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&mobileNav&&!mobileNav.hidden){mobileNav.hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.textContent='☰'}
});
mobileNav?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
  mobileNav.hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.textContent='☰';
}));
document.querySelector('.profile')?.addEventListener('click',()=>notify('Přihlášení připravujeme — brzy si budeš moct vést vlastní zápisy.'));
