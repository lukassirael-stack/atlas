/* Přihlášení do Atlasu — magic link přes Supabase Auth.
   Číst může kdokoli. Účet je potřeba až na psaní. */

const ATLAS_URL = 'https://myybuesoourgpbouwwst.supabase.co';
const ATLAS_KEY = 'sb_publishable_v9E-GhERgU5JCvE0D-l65A_QB2S2yux';

const db = window.supabase
  ? window.supabase.createClient(ATLAS_URL, ATLAS_KEY, {
      auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: true }
    })
  : null;

let ucet = null;      // auth.users
let profil = null;    // atlas_profily (nick)

/* ---------- modály se vkládají samy, ať je nemusí mít každá stránka ---------- */
function vlozModaly() {
  if (document.querySelector('#auth-modal')) return;
  const box = document.createElement('div');
  box.innerHTML = `
    <div class="modal-backdrop" id="auth-modal" aria-hidden="true">
      <section class="add-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button class="modal-close" data-close="auth-modal" aria-label="Zavřít">×</button>
        <p class="eyebrow">Komunitní atlas</p>
        <h2 id="auth-title">Přihlas se</h2>
        <p>Zadej e-mail a pošleme ti odkaz. Klikneš na něj a jsi uvnitř — žádné heslo si pamatovat nemusíš.</p>
        <form id="auth-form">
          <label>Tvůj e-mail<input type="email" id="auth-email" required placeholder="tvuj@email.cz" autocomplete="email" /></label>
          <p class="auth-status" id="auth-status" role="status"></p>
          <button class="button primary" type="submit" id="auth-send">Poslat odkaz</button>
        </form>
        <p class="auth-note">Procházet Atlas můžeš i bez účtu. Přihlášení potřebuješ, až budeš chtít zanést místo, zapsat návštěvu nebo komentovat.</p>
      </section>
    </div>
    <div class="modal-backdrop" id="nick-modal" aria-hidden="true">
      <section class="add-modal" role="dialog" aria-modal="true" aria-labelledby="nick-title">
        <button class="modal-close" data-close="nick-modal" aria-label="Zavřít">×</button>
        <p class="eyebrow">Poslední krok</p>
        <h2 id="nick-title">Zvol si nick</h2>
        <p>Pod ním se budou zobrazovat tvoje zápisy a komentáře. Skutečné jméno uvádět nemusíš.</p>
        <form id="nick-form">
          <label>Nick<small>3–24 znaků, písmena, číslice, tečka, pomlčka nebo podtržítko.</small><input type="text" id="nick-input" required minlength="3" maxlength="24" placeholder="např. tichá_voda" autocomplete="off" /></label>
          <p class="auth-status" id="nick-status" role="status"></p>
          <button class="button primary" type="submit" id="nick-save">Uložit a pokračovat</button>
        </form>
        <p class="auth-note"><button type="button" class="link-button" id="odhlasit-nick">Odhlásit se</button></p>
      </section>
    </div>`;
  document.body.append(...box.children);
}

function otevri(id) {
  const m = document.querySelector(id);
  if (!m) return;
  m.classList.add('open');
  m.setAttribute('aria-hidden', 'false');
  m.querySelector('input')?.focus();
}
function zavri(m) {
  if (!m) return;
  m.classList.remove('open');
  m.setAttribute('aria-hidden', 'true');
}

/* ---------- stav v hlavičce ---------- */
function vykresliStav() {
  const button = document.querySelector('.profile');
  if (!button) return;
  if (profil) {
    button.textContent = profil.nick;
    button.setAttribute('aria-label', 'Můj účet');
    button.classList.add('prihlasen');
  } else if (ucet) {
    button.textContent = 'Zvol nick';
    button.classList.add('prihlasen');
  } else {
    button.textContent = 'Přihlásit';
    button.classList.remove('prihlasen');
  }
}

async function nactiProfil() {
  if (!db || !ucet) { profil = null; return; }
  const { data } = await db.from('atlas_profily').select('id,nick,spravce').eq('id', ucet.id).maybeSingle();
  profil = data || null;
}

async function nactiSession() {
  if (!db) return;
  const { data: { session } } = await db.auth.getSession();
  ucet = session?.user || null;
  await nactiProfil();
  vykresliStav();
  if (ucet && !profil) otevri('#nick-modal');
}

/* ---------- veřejná pojistka pro app.js a misto.js ---------- */
function vyzadujUcet() {
  if (!db) { notify('Přihlášení zatím není dostupné. Zkus to za chvíli.'); return false; }
  if (!ucet) { otevri('#auth-modal'); return false; }
  if (!profil) { otevri('#nick-modal'); return false; }
  return true;
}
window.vyzadujUcet = vyzadujUcet;
window.atlasDb = db;
window.atlasUcet = () => ucet;
window.atlasProfil = () => profil;

/* ---------- start ---------- */
vlozModaly();

document.querySelectorAll('#auth-modal .modal-close, #nick-modal .modal-close').forEach(b =>
  b.addEventListener('click', () => zavri(document.querySelector('#' + b.dataset.close))));
document.querySelectorAll('#auth-modal, #nick-modal').forEach(m =>
  m.addEventListener('click', e => { if (e.target === m) zavri(m); }));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('#auth-modal.open, #nick-modal.open').forEach(zavri);
});

/* tlačítko v hlavičce → účtové menu */
function escHtmlAuth(t){const d=document.createElement('div');d.textContent=t||'';return d.innerHTML;}
function vlozUctoveMenu(){
  if(document.querySelector('#ucet-menu')) return;
  const p=document.createElement('div');
  p.className='ucet-menu'; p.id='ucet-menu'; p.hidden=true;
  document.body.appendChild(p);
  document.addEventListener('click',e=>{
    if(!p.hidden && !e.target.closest('#ucet-menu') && !e.target.closest('.profile')) p.hidden=true;
  });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') p.hidden=true; });
}
function vykresliUctoveMenu(){
  const p=document.querySelector('#ucet-menu');
  if(!p || !profil) return;
  const sprava = profil.spravce
    ? `<a class="um-akce" href="/sprava">🗺 Správa Atlasu <span>›</span></a>` : '';
  p.innerHTML =
    `<div class="um-hlava"><span class="um-eyebrow">Přihlášen jako</span><b>${escHtmlAuth(profil.nick)}</b></div>`+
    `<div class="um-cesty"><span class="um-eyebrow">🧭 Moje cesty</span>`+
      `<div id="um-cesty-seznam" class="um-cesty-seznam"><p class="um-cesty-nacitam">Načítám…</p></div></div>`+
    sprava+
    `<button type="button" class="um-odhlasit" id="um-odhlasit">Odhlásit se</button>`;
  p.querySelector('#um-odhlasit')?.addEventListener('click',()=>{ p.hidden=true; odhlas(); });
  nactiMojeCesty();
}

function datumAuth(iso){
  if(!iso) return '';
  const d=new Date(iso);
  return `${d.getDate()}. ${d.getMonth()+1}. ${d.getFullYear()}`;
}

async function nactiMojeCesty(){
  const box=document.querySelector('#um-cesty-seznam');
  if(!box || !db) return;
  try{
    const { data, error } = await db.rpc('atlas_moje_navstevy');
    if(error) throw error;
    if(!data || !data.length){
      box.innerHTML = '<p class="um-cesty-prazdno">Zatím nikde zápis nemáš. Vydej se na cestu a zanech svou stopu. 🌿</p>';
      return;
    }
    box.innerHTML = data.map(m=>
      `<a class="um-cesta" href="/misto?m=${encodeURIComponent(m.slug)}">`+
        `<span class="umc-nazev">★ ${escHtmlAuth(m.nazev)}</span>`+
        `<span class="umc-datum">${datumAuth(m.naposledy)}${m.pocet>1?` · ${m.pocet}×`:''}</span>`+
      `</a>`).join('');
  }catch(_){
    box.innerHTML = '<p class="um-cesty-prazdno">Cesty se teď nepodařilo načíst.</p>';
  }
}
vlozUctoveMenu();

document.querySelector('.profile')?.addEventListener('click', () => {
  if (!db) { notify('Přihlášení připravujeme.'); return; }
  if (!ucet) { otevri('#auth-modal'); return; }
  if (!profil) { otevri('#nick-modal'); return; }
  const p=document.querySelector('#ucet-menu');
  const otevrit=p.hidden;
  if(otevrit) vykresliUctoveMenu();
  p.hidden=!otevrit;
});

async function odhlas() {
  await db.auth.signOut();
  ucet = null; profil = null;
  vykresliStav();
  notify('Odhlášeno.');
}
document.querySelector('#odhlasit-nick')?.addEventListener('click', async () => {
  await odhlas();
  zavri(document.querySelector('#nick-modal'));
});

/* poslání magic linku */
let odeslanoNa = null;   // e-mail, na který odešel poslední odkaz
let znovuTimer = null;

/* přepnout modál mezi formulářem a stavem „odesláno" */
function autForm(zobrazit) {
  const label = document.querySelector('#auth-form label');
  const send = document.querySelector('#auth-send');
  const status = document.querySelector('#auth-status');
  if (label) label.hidden = !zobrazit;
  if (send) send.hidden = !zobrazit;
  if (zobrazit && status) { status.className = 'auth-status'; status.textContent = ''; status.style.textAlign = ''; }
}

function zobrazOdeslano(email) {
  odeslanoNa = email;
  autForm(false);
  const status = document.querySelector('#auth-status');
  if (!status) return;
  status.className = 'auth-status ok';
  status.style.textAlign = 'center';
  status.innerHTML =
    '<span style="display:block;font-size:2rem;line-height:1;margin:.4rem 0 .6rem">✉️</span>' +
    '<b style="display:block;font-size:1.05rem;margin-bottom:.4rem">Odkaz je na cestě</b>' +
    '<span>Poslali jsme ho na </span><b>' + escHtmlAuth(email) + '</b><span>.</span><br>' +
    '<span>Otevři si schránku a klikni na něj. Tuhle stránku můžeš klidně zavřít.</span><br>' +
    '<button type="button" class="link-button" id="auth-znovu" disabled style="margin-top:.7rem">Poslat znovu <span id="auth-cd">(60 s)</span></button>';
  let zbyva = 60;
  clearInterval(znovuTimer);
  znovuTimer = setInterval(() => {
    zbyva--;
    const cd = document.querySelector('#auth-cd');
    const btn = document.querySelector('#auth-znovu');
    if (!cd || !btn) { clearInterval(znovuTimer); return; }
    if (zbyva <= 0) { clearInterval(znovuTimer); cd.textContent = ''; btn.disabled = false; }
    else cd.textContent = '(' + zbyva + ' s)';
  }, 1000);
}

/* „Poslat znovu" vrátí formulář s předvyplněným e-mailem (jde ho i změnit) */
document.querySelector('#auth-status')?.addEventListener('click', e => {
  if (!e.target.closest('#auth-znovu')) return;
  clearInterval(znovuTimer);
  autForm(true);
  const input = document.querySelector('#auth-email');
  if (input && odeslanoNa) input.value = odeslanoNa;
  input?.focus();
});

document.querySelector('#auth-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const email = document.querySelector('#auth-email').value.trim();
  const status = document.querySelector('#auth-status');
  const send = document.querySelector('#auth-send');
  status.className = 'auth-status';
  status.textContent = 'Posílám odkaz…';
  send.disabled = true;
  const { error } = await db.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname }
  });
  send.disabled = false;
  if (error) {
    status.className = 'auth-status err';
    status.textContent = 'Odkaz se nepodařilo poslat: ' + error.message;
    return;
  }
  zobrazOdeslano(email);
});

/* volba nicku */
let nickTimer = null;
document.querySelector('#nick-input')?.addEventListener('input', event => {
  const nick = event.target.value.trim();
  const status = document.querySelector('#nick-status');
  clearTimeout(nickTimer);
  if (nick.length < 3) { status.className = 'auth-status'; status.textContent = ''; return; }
  status.className = 'auth-status';
  status.textContent = 'Kontroluji…';
  nickTimer = setTimeout(async () => {
    const { data, error } = await db.rpc('atlas_nick_volny', { p_nick: nick });
    if (error) { status.className = 'auth-status'; status.textContent = ''; return; }
    status.className = 'auth-status ' + (data ? 'ok' : 'err');
    status.textContent = data ? `„${nick}" je volný.` : `„${nick}" už někdo má. Zkus jiný.`;
  }, 400);
});

document.querySelector('#nick-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const nick = document.querySelector('#nick-input').value.trim();
  const status = document.querySelector('#nick-status');
  const save = document.querySelector('#nick-save');
  save.disabled = true;
  const { error } = await db.from('atlas_profily').insert({ id: ucet.id, nick });
  save.disabled = false;
  if (error) {
    status.className = 'auth-status err';
    status.textContent = error.code === '23505'
      ? 'Tenhle nick už někdo má. Zkus jiný.'
      : 'Nick se nepodařilo uložit: ' + error.message;
    return;
  }
  await nactiProfil();
  vykresliStav();
  zavri(document.querySelector('#nick-modal'));
  notify(`Vítej v Atlasu, ${nick}. Teď můžeš zanášet místa i zapisovat návštěvy.`);
});

/* reakce na návrat z magic linku */
db?.auth.onAuthStateChange(async (event, session) => {
  ucet = session?.user || null;
  await nactiProfil();
  vykresliStav();
  if (event === 'SIGNED_IN') {
    clearInterval(znovuTimer);
    autForm(true);
    zavri(document.querySelector('#auth-modal'));
    if (!profil) otevri('#nick-modal');
    else notify(`Přihlášen jako ${profil.nick}.`);
  }
});

nactiSession().then(()=>{
  window.atlasAuthReady = true;
  window.dispatchEvent(new Event('atlas-auth-ready'));
});
