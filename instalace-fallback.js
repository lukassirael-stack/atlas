/* =====================================================================
   Atlas energetických míst — „Přidat na plochu" pro prohlížeče bez PWA instalace
   (Seznam prohlížeč, Firefox na PC…)
   ---------------------------------------------------------------------
   NASAZENÍ:
   1) Soubor nahrát do kořene repa atlas.
   2) Do index.html před </body> přidat:
      <script src="instalace-fallback.js" defer></script>
   3) V sw.js zvýšit verzi cache (atlas-v25 → atlas-v26)
      a přidat './instalace-fallback.js' do precache pole.
   ---------------------------------------------------------------------
   CHOVÁNÍ:
   – Běží-li appka jako nainstalovaná (standalone), nedělá nic.
   – Na iPhonu/iPadu nedělá nic — Atlas tam má vlastní nápovědu
     (Sdílet → Přidat na plochu), dvě pilulky nechceme.
   – Vystřelí-li beforeinstallprompt (Chrome/Edge/Samsung), nechá práci
     stávajícímu nativnímu tlačítku Atlasu a schová se.
   – Jinak po 2,5 s zobrazí pilulku „Přidat na plochu" a po kliknutí
     průvodce podle prohlížeče:
       · PC (Seznam, Firefox…) → stažení zástupce (.url / .webloc)
       · Android (Seznam aj.)  → tlačítko „Otevřít v Chromu" + postup
   ===================================================================== */
(function () {
  'use strict';

  var APP_URL   = 'https://atlas.oaza-adamanthea.cz/';
  var SOUBOR    = 'Atlas';           // název staženého zástupce (bez přípony)
  var ZPOZDENI  = 2500;              // ms — čekání na beforeinstallprompt
  var KLIC_SKRYT = 'atlas_pill_skryt';

  /* ---------- prostředí ---------- */
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
        || window.navigator.standalone === true;
  if (standalone) return;

  var ua        = navigator.userAgent;
  var jeIOS     = /iPhone|iPad|iPod/i.test(ua)
        || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if (jeIOS) return;                 // iOS řeší vlastní nápověda Atlasu

  try { if (sessionStorage.getItem(KLIC_SKRYT)) return; } catch (e) {}

  var jeSeznam  = /SznProhlizec/i.test(ua);
  var jeAndroid = /Android/i.test(ua);
  var jeMac     = /Macintosh/i.test(ua);

  var nativniExistuje = false;

  window.addEventListener('beforeinstallprompt', function () {
    nativniExistuje = true;          // nativní cesta existuje → fallback mlčí
    odstranPill();
  });

  poNacteni(function () { setTimeout(zobrazPill, ZPOZDENI); });

  /* ================= UI ================= */

  function zobrazPill() {
    if (nativniExistuje) return;
    if (document.getElementById('ainst-pill')) return;
    vlozStyly();

    var pill = document.createElement('button');
    pill.id = 'ainst-pill';
    pill.className = 'ainst-pill';
    pill.setAttribute('aria-label', 'Přidat Atlas na plochu');
    pill.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
      '<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4.4"/><path d="M12 8.2v7.6M8.2 12h7.6"/></svg>' +
      '<span>Přidat na plochu</span>' +
      '<span class="ainst-zavrit" role="button" aria-label="Skrýt" title="Skrýt">✕</span>';

    pill.addEventListener('click', function (ev) {
      if (ev.target.classList.contains('ainst-zavrit')) {
        try { sessionStorage.setItem(KLIC_SKRYT, '1'); } catch (e) {}
        odstranPill();
        return;
      }
      otevriPruvodce();
    });

    document.body.appendChild(pill);
  }

  function otevriPruvodce() {
    if (document.getElementById('ainst-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'ainst-overlay';
    overlay.className = 'ainst-overlay';

    var karta = document.createElement('div');
    karta.className = 'ainst-karta';
    karta.setAttribute('role', 'dialog');
    karta.setAttribute('aria-modal', 'true');
    karta.setAttribute('aria-label', 'Přidání Atlasu na plochu');

    karta.innerHTML =
      '<button class="ainst-x" aria-label="Zavřít">✕</button>' +
      '<h2>Atlas míst na vaší ploše</h2>' +
      '<hr class="ainst-zlata">' +
      obsahPodleProhlizece() +
      '<hr class="ainst-odd">' +
      '<div class="ainst-adresa"><code>' + APP_URL.replace(/\/$/, '') + '</code>' +
      '<button type="button" id="ainst-kopir">Zkopírovat</button></div>';

    overlay.appendChild(karta);
    document.body.appendChild(overlay);

    /* události */
    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay) zavriPruvodce();
    });
    karta.querySelector('.ainst-x').addEventListener('click', zavriPruvodce);
    document.addEventListener('keydown', escZavrit);

    var kop = document.getElementById('ainst-kopir');
    kop.addEventListener('click', function () { kopirujAdresu(kop); });

    var zast = document.getElementById('ainst-zastupce');
    if (zast) zast.addEventListener('click', stahniZastupce);
  }

  function obsahPodleProhlizece() {
    /* --- Android ------------------------------------------------------ */
    if (jeAndroid) {
      var intent = 'intent://' + APP_URL.replace(/^https?:\/\//, '') +
        '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' +
        encodeURIComponent(APP_URL) + ';end';
      return '<p>' + (jeSeznam ? 'Prohlížeč Seznam instalaci aplikací neumí. ' : '') +
        'Nejrychlejší cesta vede přes Chrome:</p>' +
        '<a class="ainst-btn" href="' + intent + '">Otevřít v Chromu</a>' +
        '<ol class="ainst-kroky">' +
        '<li>V Chromu klepněte na menu <b>⋮</b> vpravo nahoře.</li>' +
        '<li>Zvolte <b>Přidat na plochu</b> a potvrďte <b>Instalovat</b>.</li></ol>';
    }

    /* --- Počítač (Seznam, Firefox…) ----------------------------------- */
    return '<p>' + (jeSeznam ? 'Prohlížeč Seznam neumí aplikace instalovat přímo — zástupce na ploše ale zvládne totéž. '
                             : 'Tento prohlížeč neumí aplikace instalovat přímo — zástupce na ploše ale zvládne totéž. ') +
      'Atlas pak spustíte jedním klikem.</p>' +
      '<button type="button" id="ainst-zastupce" class="ainst-btn">Stáhnout zástupce na plochu</button>' +
      '<ol class="ainst-kroky">' +
      '<li>Soubor <b>uložte na plochu</b> (nebo ho tam přetáhněte ze složky Stažené).</li>' +
      '<li>Pokud se prohlížeč zeptá, zvolte <b>Ponechat / Uložit</b>.</li>' +
      '<li>Ikona na ploše od teď otevírá Atlas.</li></ol>' +
      '<p class="ainst-pozn">Chcete plnou aplikaci ve vlastním okně? Otevřete tuto adresu v <b>Chromu</b> nebo <b>Edgi</b> a klikněte na ikonku instalace vpravo v adresním řádku.</p>';
  }

  /* ================= akce ================= */

  function stahniZastupce() {
    var obsah, pripona, typ;
    if (jeMac) {
      obsah = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
        '<plist version="1.0"><dict><key>URL</key><string>' + APP_URL + '</string></dict></plist>';
      pripona = '.webloc'; typ = 'application/xml';
    } else {
      obsah = '[InternetShortcut]\r\nURL=' + APP_URL + '\r\n';
      pripona = '.url'; typ = 'text/plain';
    }
    var blob = new Blob([obsah], { type: typ });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = SOUBOR + pripona;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  function kopirujAdresu(btn) {
    function hotovo() {
      btn.textContent = 'Zkopírováno ✓';
      setTimeout(function () { btn.textContent = 'Zkopírovat'; }, 2200);
    }
    function nouzove() {
      var i = document.createElement('input');
      i.value = APP_URL; document.body.appendChild(i); i.select();
      try { document.execCommand('copy'); hotovo(); } catch (e) {}
      i.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(APP_URL).then(hotovo, nouzove);
    } else { nouzove(); }
  }

  /* ================= pomocné ================= */

  function zavriPruvodce() {
    var o = document.getElementById('ainst-overlay');
    if (o) o.remove();
    document.removeEventListener('keydown', escZavrit);
  }
  function escZavrit(e) { if (e.key === 'Escape') zavriPruvodce(); }
  function odstranPill() {
    var p = document.getElementById('ainst-pill');
    if (p) p.remove();
  }
  function poNacteni(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function vlozStyly() {
    if (document.getElementById('ainst-styl')) return;
    var s = document.createElement('style');
    s.id = 'ainst-styl';
    s.textContent =
      '.ainst-pill{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:9990;display:flex;align-items:center;gap:8px;padding:11px 15px 11px 14px;background:#16241d;color:#fbf7ef;border:1px solid #c9a14a;border-radius:999px;font:500 15px/1 "Jost",system-ui,sans-serif;letter-spacing:.02em;box-shadow:0 6px 24px rgba(5,12,9,.45);cursor:pointer;opacity:0;transform:translateY(8px);animation:ainst-in .5s ease .15s forwards}' +
      '@keyframes ainst-in{to{opacity:1;transform:none}}' +
      '@media (prefers-reduced-motion:reduce){.ainst-pill{animation:none;opacity:1;transform:none}}' +
      '.ainst-pill svg{width:17px;height:17px;color:#c9a14a}' +
      '.ainst-pill:hover{border-color:#e0be6f}' +
      '.ainst-pill:focus-visible,.ainst-btn:focus-visible,.ainst-x:focus-visible{outline:2px solid #c9a14a;outline-offset:2px}' +
      '.ainst-zavrit{margin-left:4px;padding:2px 4px;color:rgba(251,247,239,.6);font-size:14px;line-height:1}' +
      '.ainst-zavrit:hover{color:#fbf7ef}' +
      '.ainst-overlay{position:fixed;inset:0;z-index:9991;background:rgba(6,13,10,.66);display:flex;align-items:flex-end;justify-content:center;padding:16px}' +
      '@media (min-width:560px){.ainst-overlay{align-items:center}}' +
      '.ainst-karta{position:relative;width:100%;max-width:440px;max-height:86vh;overflow:auto;background:#fbf7ef;color:#16241d;border:1px solid rgba(201,161,74,.35);border-radius:18px;padding:26px 24px 22px;box-shadow:0 24px 64px rgba(0,0,0,.4);font-family:"Jost",system-ui,sans-serif}' +
      '.ainst-karta h2{margin:0;font:600 20px/1.3 "Cinzel",serif;letter-spacing:.03em;padding-right:28px}' +
      '.ainst-zlata{width:44px;height:2px;background:#c9a14a;border:0;margin:10px 0 14px}' +
      '.ainst-karta p{margin:0 0 12px;font-size:15px;line-height:1.55}' +
      '.ainst-kroky{margin:0 0 14px;padding-left:20px;font-size:15px;line-height:1.6}' +
      '.ainst-kroky li{margin-bottom:6px}' +
      '.ainst-btn{display:block;width:100%;box-sizing:border-box;padding:12px 16px;margin:0 0 14px;background:#16241d;color:#fbf7ef;border:1px solid #c9a14a;border-radius:12px;font:500 15px "Jost",system-ui,sans-serif;letter-spacing:.02em;text-align:center;text-decoration:none;cursor:pointer}' +
      '.ainst-btn:hover{background:#1a3128}' +
      '.ainst-odd{border:0;border-top:1px solid rgba(16,33,26,.14);margin:16px 0 14px}' +
      '.ainst-pozn{font-size:13.5px;color:rgba(16,33,26,.72)}' +
      '.ainst-adresa{display:flex;gap:8px}' +
      '.ainst-adresa code{flex:1;display:flex;align-items:center;padding:9px 12px;background:rgba(16,33,26,.05);border:1px solid rgba(16,33,26,.12);border-radius:10px;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.ainst-adresa button{padding:9px 13px;background:#c9a14a;color:#16241d;border:0;border-radius:10px;font:600 13.5px "Jost",system-ui,sans-serif;cursor:pointer;white-space:nowrap}' +
      '.ainst-adresa button:hover{background:#d7b160}' +
      '.ainst-x{position:absolute;top:14px;right:14px;padding:4px 7px;background:none;border:0;color:rgba(16,33,26,.55);font-size:16px;line-height:1;cursor:pointer;border-radius:8px}' +
      '.ainst-x:hover{color:#16241d}';
    document.head.appendChild(s);
  }
})();
