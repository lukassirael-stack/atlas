/* Atlas energetických míst — spolehlivý skok na kotvy (#mapa, #komunita, …)
   Problém: obsah nad kotvou (dlaždice míst, mapa, fotky) se dopočítá až po startu
   plynulého skoku → prohlížeč dosedne na starou pozici a "netrefí se".
   Řešení: po skoku se ještě ~4 s hlídá, jestli se cíl neposunul, a dorovná se.
   Ruší se při jakémkoli doteku / kolečku / klávese, aby nebojoval s uživatelem. */
(function () {
  'use strict';

  /* kotvy, které si řeší jiné skripty (modaly) — nesaháme na ně */
  var VYJIMKY = ['#', '#pridat', '#prihlaseni', '#odhlasit'];

  var hlidac = null, odpojit = null;

  function cil(hash) {
    if (!hash || VYJIMKY.indexOf(hash) !== -1) return null;
    try { return document.querySelector(hash); } catch (e) { return null; }
  }

  function pozice(el) {
    var odsazeni = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    return Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - odsazeni);
  }

  function stop() {
    if (hlidac) { clearInterval(hlidac); hlidac = null; }
    if (odpojit) { odpojit(); odpojit = null; }
  }

  function skoc(el) {
    stop();

    var zrus = function () { stop(); };
    window.addEventListener('wheel', zrus, { passive: true });
    window.addEventListener('touchstart', zrus, { passive: true });
    window.addEventListener('keydown', zrus);
    odpojit = function () {
      window.removeEventListener('wheel', zrus);
      window.removeEventListener('touchstart', zrus);
      window.removeEventListener('keydown', zrus);
    };

    var kam = pozice(el);
    window.scrollTo({ top: kam, behavior: 'smooth' });

    var konec = Date.now() + 4000;
    hlidac = setInterval(function () {
      if (!document.body.contains(el) || Date.now() > konec) { stop(); return; }
      var nova = pozice(el);
      /* dorovnáváme jen když se posunul CÍL (doučetl se obsah nad ním),
         ne během vlastní animace — jinak bychom si ji přerušili */
      if (Math.abs(nova - kam) > 4) {
        kam = nova;
        window.scrollTo({ top: kam, behavior: 'smooth' });
      }
    }, 250);
  }

  /* kliknutí na odkaz s kotvou (desktop nav, mobilní menu, patička, tlačítka) */
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;

    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;

    var href = a.getAttribute('href') || '';
    var i = href.indexOf('#');
    if (i === -1) return;

    var hash = href.slice(i);
    var cesta = href.slice(0, i);
    /* jen kotvy na aktuální stránce ("#komunita" nebo "/#komunita" na homepage) */
    if (cesta && cesta !== location.pathname && cesta !== '/' + location.pathname.replace(/^\//, '')) return;
    if (cesta === '/' && location.pathname !== '/' && location.pathname !== '/index.html') return;

    var el = cil(hash);
    if (!el) return;

    e.preventDefault();
    if (location.hash !== hash) history.replaceState(null, '', hash);
    skoc(el);
  }, false);

  /* příchod z jiné stránky s kotvou v adrese (/#komunita) */
  function poNacteni() {
    var el = cil(location.hash);
    if (el) setTimeout(function () { skoc(el); }, 60);
  }
  if (document.readyState === 'complete') poNacteni();
  else window.addEventListener('load', poNacteni);

  window.addEventListener('hashchange', function () {
    var el = cil(location.hash);
    if (el) skoc(el);
  });
})();
