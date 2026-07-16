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
  const { data } = await db.from('atlas_profily').select('id,nick').eq('id', ucet.id).maybeSingle();
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

/* ---------- start ---------- */
vlozModaly();

document.querySelectorAll('#auth-modal .modal-close, #nick-modal .modal-close').forEach(b =>
  b.addEventListener('click', () => zavri(document.querySelector('#' + b.dataset.close))));
document.querySelectorAll('#auth-modal, #nick-modal').forEach(m =>
  m.addEventListener('click', e => { if (e.target === m) zavri(m); }));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('#auth-modal.open, #nick-modal.open').forEach(zavri);
});

/* tlačítko v hlavičce */
document.querySelector('.profile')?.addEventListener('click', () => {
  if (!db) { notify('Přihlášení připravujeme.'); return; }
  if (!ucet) { otevri('#auth-modal'); return; }
  if (!profil) { otevri('#nick-modal'); return; }
  if (confirm(`Přihlášen jako ${profil.nick}. Odhlásit se?`)) odhlas();
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
  status.className = 'auth-status ok';
  status.innerHTML = `Odkaz letí na <b>${email}</b>.<br>Otevři si schránku a klikni na něj. Tuhle stránku můžeš zavřít.`;
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
    zavri(document.querySelector('#auth-modal'));
    if (!profil) otevri('#nick-modal');
    else notify(`Přihlášen jako ${profil.nick}.`);
  }
});

nactiSession();
