/* Osobní deník — soukromé zápisy přihlášeného uživatele (tabulka atlas_denik) */

const loginBox = document.querySelector('#denik-login');
const appBox   = document.querySelector('#denik-app');
const form     = document.querySelector('#denik-form');
const vstupNadpis = document.querySelector('#denik-nadpis');
const vstupText   = document.querySelector('#denik-text');
const seznam   = document.querySelector('#denik-list');
const pocet    = document.querySelector('#denik-pocet');

let zapisy = [];

function escHtml(t){const d=document.createElement('div');d.textContent=t==null?'':t;return d.innerHTML}

function datum(iso){
  try{
    return new Date(iso).toLocaleString('cs-CZ',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
  }catch{ return ''; }
}

function slovoZapisu(n){
  if(n===1) return '1 zápis';
  if(n>=2 && n<=4) return `${n} zápisy`;
  return `${n} zápisů`;
}

function kartaHtml(z){
  const nadpis = z.nadpis && z.nadpis.trim() ? `<h3>${escHtml(z.nadpis)}</h3>` : '';
  return `<article class="denik-zapis" data-id="${z.id}">
    <time>${datum(z.vytvoreno)}</time>
    ${nadpis}
    <div class="telo">${escHtml(z.text)}</div>
    <div class="denik-edit">
      <input class="e-nadpis" type="text" maxlength="120" placeholder="Nadpis — nepovinné" value="${escHtml(z.nadpis||'')}" />
      <textarea class="e-text"></textarea>
      <div class="akce"><button type="button" class="denik-btn ulozit-edit">Uložit</button><button type="button" class="denik-btn ghost zrusit-edit">Zrušit</button></div>
    </div>
    <div class="akce hlavni"><button type="button" class="upravit">Upravit</button><button type="button" class="smazat">Smazat</button></div>
  </article>`;
}

function vykresli(){
  if(!zapisy.length){
    seznam.innerHTML = `<p class="denik-prazdno">Tvůj deník je zatím prázdný. Napiš první zápis výše. 🌿</p>`;
    pocet.textContent = '';
    return;
  }
  pocet.textContent = `Máš ${slovoZapisu(zapisy.length)}`;
  seznam.innerHTML = zapisy.map(kartaHtml).join('');
  // naplnit textarey (bezpečně, přes value)
  zapisy.forEach(z=>{
    const el = seznam.querySelector(`[data-id="${z.id}"] .e-text`);
    if(el) el.value = z.text;
  });
}

async function nacti(){
  const db = window.atlasDb;
  const { data, error } = await db.from('atlas_denik').select('*').order('vytvoreno',{ascending:false});
  if(error){ notify('Zápisy se nepodařilo načíst.'); console.error(error); return; }
  zapisy = data || [];
  vykresli();
}

// nový zápis
form?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const text = vstupText.value.trim();
  if(!text){ notify('Napiš aspoň pár slov.'); vstupText.focus(); return; }
  const nadpis = vstupNadpis.value.trim() || null;
  const ucet = window.atlasUcet?.();
  if(!ucet){ notify('Nejsi přihlášený.'); return; }

  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true;
  const { data, error } = await window.atlasDb.from('atlas_denik')
    .insert({ autor_id: ucet.id, nadpis, text })
    .select('*').single();
  btn.disabled = false;

  if(error){ notify('Zápis se nepodařilo uložit.'); console.error(error); return; }
  zapisy.unshift(data);
  vstupNadpis.value=''; vstupText.value='';
  vykresli();
  notify('Zapsáno 🌿');
});

// akce nad zápisy (delegace)
seznam?.addEventListener('click', async (e)=>{
  const clanek = e.target.closest('.denik-zapis');
  if(!clanek) return;
  const id = clanek.dataset.id;

  if(e.target.classList.contains('upravit')){
    clanek.classList.add('edit');
    clanek.querySelector('.e-text')?.focus();
    return;
  }
  if(e.target.classList.contains('zrusit-edit')){
    clanek.classList.remove('edit');
    // vrátit původní hodnoty
    const z = zapisy.find(x=>x.id===id);
    if(z){ clanek.querySelector('.e-nadpis').value=z.nadpis||''; clanek.querySelector('.e-text').value=z.text; }
    return;
  }
  if(e.target.classList.contains('ulozit-edit')){
    const novyText = clanek.querySelector('.e-text').value.trim();
    if(!novyText){ notify('Zápis nemůže být prázdný.'); return; }
    const novyNadpis = clanek.querySelector('.e-nadpis').value.trim() || null;
    e.target.disabled = true;
    const { data, error } = await window.atlasDb.from('atlas_denik')
      .update({ nadpis: novyNadpis, text: novyText, upraveno: new Date().toISOString() })
      .eq('id', id).select('*').single();
    e.target.disabled = false;
    if(error){ notify('Úpravu se nepodařilo uložit.'); console.error(error); return; }
    const i = zapisy.findIndex(x=>x.id===id);
    if(i>-1) zapisy[i] = data;
    vykresli();
    notify('Uloženo');
    return;
  }
  if(e.target.classList.contains('smazat')){
    if(!confirm('Opravdu smazat tento zápis? Nejde to vrátit.')) return;
    const { error } = await window.atlasDb.from('atlas_denik').delete().eq('id', id);
    if(error){ notify('Smazání se nepodařilo.'); console.error(error); return; }
    zapisy = zapisy.filter(x=>x.id!==id);
    vykresli();
    notify('Zápis smazán');
  }
});

// přihlásit se z výzvy → otevře přihlašovací modál (tlačítko profilu v hlavičce)
document.querySelector('#denik-prihlasit')?.addEventListener('click', ()=>{
  document.querySelector('.profile')?.click();
});

// start po inicializaci session
function start(){
  const ucet = window.atlasUcet?.();
  if(ucet){
    loginBox.hidden = true;
    appBox.hidden = false;
    nacti();
  } else {
    loginBox.hidden = false;
    appBox.hidden = true;
  }
}

if(window.atlasAuthReady) start();
else window.addEventListener('atlas-auth-ready', start, {once:true});
