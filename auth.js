/* Přihlášení do Atlasu — jednorázový kód přes Supabase Auth.
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
let profilZnamy = false;   // true = víme jistě, zda profil existuje (ne jen výpadek sítě)
const PROFIL_CACHE = 'atlas_profil_cache';

async function nactiProfil() {
  if (!db || !ucet) { profil = null; profilZnamy = true; return; }
  const { data, error } = await db.from('atlas_profily').select('id,nick,spravce').eq('id', ucet.id).maybeSingle();
  if (error) {
    /* bez signálu: nezahazovat, co víme — držet stávající profil, případně vzít mezipaměť */
    profilZnamy = false;
    if (!profil) {
      try {
        const c = JSON.parse(localStorage.getItem(PROFIL_CACHE) || 'null');
        if (c && c.id === ucet.id) profil = c;
      } catch (_) {}
    }
    return;
  }
  profil = data || null;
  profilZnamy = true;
  try {
    if (profil) localStorage.setItem(PROFIL_CACHE, JSON.stringify(profil));
    else localStorage.removeItem(PROFIL_CACHE);
  } catch (_) {}
}

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
        <p id="auth-uvod">Zadej e-mail a pošleme ti šestimístný kód. Opíšeš ho sem a jsi uvnitř — žádné heslo si pamatovat nemusíš.</p>
        <form id="auth-form">
          <div id="auth-krok-email">
            <label>Tvůj e-mail<input type="email" id="auth-email" required placeholder="tvuj@email.cz" autocomplete="email" /></label>
          </div>
          <div id="auth-krok-kod" hidden>
            <label>Kód z e-mailu<small>Šest číslic. Platí 15 minut.</small><input type="text" id="auth-kod" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" style="letter-spacing:.4em;text-align:center;font-size:1.3rem" /></label>
          </div>
          <p class="auth-status" id="auth-status" role="status"></p>
          <button class="button primary" type="submit" id="auth-send">Poslat kód</button>
        </form>
        <p class="auth-note" id="auth-pod" hidden>
          <button type="button" class="link-button" id="auth-znovu" disabled>Poslat znovu <span id="auth-cd">(60 s)</span></button>
          &nbsp;·&nbsp;
          <button type="button" class="link-button" id="auth-zmenit">Změnit e-mail</button>
        </p>
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

async function nactiSession() {
  if (!db) return;
  const { data: { session } } = await db.auth.getSession();
  ucet = session?.user || null;
  await nactiProfil();
  vykresliStav();
  if (ucet && !profil && profilZnamy) otevri('#nick-modal');
}

/* ---------- veřejná pojistka pro app.js a misto.js ---------- */
function vyzadujUcet() {
  if (!db) { notify('Přihlášení zatím není dostupné. Zkus to za chvíli.'); return false; }
  if (!ucet) { otevri('#auth-modal'); return false; }
  if (!profil) {
    if (profilZnamy) { otevri('#nick-modal'); return false; }
    /* profil se nepodařilo načíst (typicky slabý signál) — neotravovat volbou nicku */
    notify('Nedaří se ověřit tvůj účet — zkontroluj signál a zkus to znovu.');
    nactiProfil().then(vykresliStav);
    return false;
  }
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
    `<div class="um-cesty" id="um-mista-blok" hidden><span class="um-eyebrow">⊕ Moje místa</span>`+
      `<div id="um-mista-seznam" class="um-cesty-seznam"></div></div>`+
    sprava+
    `<button type="button" class="um-odhlasit" id="um-odhlasit">Odhlásit se</button>`;
  p.querySelector('#um-odhlasit')?.addEventListener('click',()=>{ p.hidden=true; odhlas(); });
  nactiMojeCesty();
  nactiMojeMista();
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

async function nactiMojeMista(){
  const blok=document.querySelector('#um-mista-blok');
  const box=document.querySelector('#um-mista-seznam');
  if(!blok || !box || !db || !ucet) return;
  try{
    const { data, error } = await db.from('atlas_mista')
      .select('nazev,slug,stav,vytvoreno')
      .eq('autor_id', ucet.id)
      .neq('stav','rozepsane')
      .order('vytvoreno',{ascending:false})
      .limit(30);
    if(error) throw error;
    if(!data || !data.length) return;   /* nic nepřidal → sekce zůstane skrytá */
    blok.hidden=false;
    box.innerHTML=data.map(m=>{
      if(m.stav==='zverejnene')
        return `<a class="um-cesta" href="/misto?m=${encodeURIComponent(m.slug)}">`+
          `<span class="umc-nazev">◎ ${escHtmlAuth(m.nazev)}</span>`+
          `<span class="umc-datum">${datumAuth(m.vytvoreno)}</span></a>`;
      const stitek=m.stav==='ceka'?'⏳ čeká na schválení':'✕ zamítnuté';
      return `<span class="um-cesta" style="cursor:default;opacity:.72">`+
        `<span class="umc-nazev">◎ ${escHtmlAuth(m.nazev)}</span>`+
        `<span class="umc-datum">${stitek}</span></span>`;
    }).join('');
  }catch(_){ /* výpadek sítě: sekci prostě neukázat */ }
}

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
  ucet = null; profil = null; profilZnamy = true;
  try { localStorage.removeItem(PROFIL_CACHE); } catch (_) {}
  vykresliStav();
  notify('Odhlášeno.');
}
document.querySelector('#odhlasit-nick')?.addEventListener('click', async () => {
  await odhlas();
  zavri(document.querySelector('#nick-modal'));
});

/* přihlášení šestimístným kódem (odolné proti předběžnému načtení odkazu robotem) */
let odeslanoNa = null;   // e-mail, na který odešel poslední kód
let znovuTimer = null;
let krokKodu = false;    // true = zobrazen krok se zadáním kódu

function autForm(zobrazitEmail) {
  krokKodu = !zobrazitEmail;
  const kEmail = document.querySelector('#auth-krok-email');
  const kKod = document.querySelector('#auth-krok-kod');
  const pod = document.querySelector('#auth-pod');
  const send = document.querySelector('#auth-send');
  const uvod = document.querySelector('#auth-uvod');
  const status = document.querySelector('#auth-status');
  if (kEmail) kEmail.hidden = krokKodu;
  if (kKod) kKod.hidden = !krokKodu;
  if (pod) pod.hidden = !krokKodu;
  if (send) send.textContent = krokKodu ? 'Přihlásit se' : 'Poslat kód';
  if (uvod) uvod.textContent = krokKodu
    ? 'Kód jsme poslali na ' + (odeslanoNa || 'tvůj e-mail') + '. Opiš ho sem — tuhle stránku nechej otevřenou.'
    : 'Zadej e-mail a pošleme ti šestimístný kód. Opíšeš ho sem a jsi uvnitř — žádné heslo si pamatovat nemusíš.';
  if (status) { status.className = 'auth-status'; status.textContent = ''; }
  if (!krokKodu) {
    clearInterval(znovuTimer);
    const kod = document.querySelector('#auth-kod');
    if (kod) kod.value = '';
  }
}

function zobrazKrokKodu(email) {
  odeslanoNa = email;
  autForm(false);
  document.querySelector('#auth-kod')?.focus();
  let zbyva = 60;
  const btn = document.querySelector('#auth-znovu');
  const cd = document.querySelector('#auth-cd');
  if (btn) btn.disabled = true;
  if (cd) cd.textContent = '(60 s)';
  clearInterval(znovuTimer);
  znovuTimer = setInterval(() => {
    zbyva--;
    if (!cd || !btn) { clearInterval(znovuTimer); return; }
    if (zbyva <= 0) { clearInterval(znovuTimer); cd.textContent = ''; btn.disabled = false; }
    else cd.textContent = '(' + zbyva + ' s)';
  }, 1000);
}

async function posliKod(email) {
  const status = document.querySelector('#auth-status');
  const send = document.querySelector('#auth-send');
  status.className = 'auth-status';
  status.textContent = 'Posílám kód…';
  if (send) send.disabled = true;
  const { error } = await db.auth.signInWithOtp({ email });
  if (send) send.disabled = false;
  if (error) {
    status.className = 'auth-status err';
    status.textContent = 'Kód se nepodařilo poslat: ' + error.message;
    return false;
  }
  zobrazKrokKodu(email);
  return true;
}

/* „Poslat znovu" */
document.querySelector('#auth-znovu')?.addEventListener('click', () => {
  if (odeslanoNa) posliKod(odeslanoNa);
});

/* „Změnit e-mail" — zpět na první krok */
document.querySelector('#auth-zmenit')?.addEventListener('click', () => {
  autForm(true);
  const input = document.querySelector('#auth-email');
  if (input && odeslanoNa) input.value = odeslanoNa;
  input?.focus();
});

/* jen číslice, po šesté se přihlásí samo */
document.querySelector('#auth-kod')?.addEventListener('input', event => {
  const cistY = event.target.value.replace(/\D/g, '').slice(0, 6);
  event.target.value = cistY;
  if (cistY.length === 6) document.querySelector('#auth-form')?.requestSubmit();
});

document.querySelector('#auth-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const status = document.querySelector('#auth-status');
  const send = document.querySelector('#auth-send');

  if (!krokKodu) {
    const email = document.querySelector('#auth-email').value.trim();
    if (!email) return;
    await posliKod(email);
    return;
  }

  const kod = document.querySelector('#auth-kod').value.replace(/\D/g, '');
  if (kod.length !== 6) {
    status.className = 'auth-status err';
    status.textContent = 'Kód má šest číslic.';
    return;
  }
  status.className = 'auth-status';
  status.textContent = 'Ověřuji…';
  send.disabled = true;

  let { error } = await db.auth.verifyOtp({ email: odeslanoNa, token: kod, type: 'email' });
  if (error) {
    /* nový účet může vyžadovat typ „signup" — zkusit i ten, ať uživatel nic neřeší */
    const druhy = await db.auth.verifyOtp({ email: odeslanoNa, token: kod, type: 'signup' });
    error = druhy.error;
  }
  send.disabled = false;

  if (error) {
    status.className = 'auth-status err';
    status.textContent = 'Kód nesedí nebo už vypršel. Zkontroluj ho, nebo si nech poslat nový.';
    const pole = document.querySelector('#auth-kod');
    if (pole) { pole.value = ''; pole.focus(); }
    return;
  }
  clearInterval(znovuTimer);
  /* zbytek (zavření modálu, volba nicku) obstará onAuthStateChange */
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

/* reakce na přihlášení */
db?.auth.onAuthStateChange(async (event, session) => {
  ucet = session?.user || null;
  await nactiProfil();
  vykresliStav();
  if (event === 'SIGNED_IN') {
    clearInterval(znovuTimer);
    autForm(true);
    zavri(document.querySelector('#auth-modal'));
    if (!profil && profilZnamy) otevri('#nick-modal');
    else if (profil) notify(`Přihlášen jako ${profil.nick}.`);
  }
});

/* návrat signálu: tiše doověřit profil, ať se stav v hlavičce srovná sám */
window.addEventListener('online', () => {
  if (ucet && !profilZnamy) nactiProfil().then(vykresliStav);
});

nactiSession().then(()=>{
  window.atlasAuthReady = true;
  window.dispatchEvent(new Event('atlas-auth-ready'));
});
