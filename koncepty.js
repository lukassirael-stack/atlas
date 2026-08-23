/* Rozepsané zápisy (koncepty) — uschované v zařízení, dokončí se později.
   Sdílí IndexedDB 'atlas-fronta' s offline frontou: verze 2 přidává sklad 'koncepty'.
   Klíče: 'navsteva:<misto_id>' (rozepsaná návštěva — jedna na místo)
          'misto:<čas>'         (rozepsané nové místo — může jich být víc najednou).
   Starý jediný klíč 'misto' se při prvním otevření sám přejmenuje na 'misto:<čas>'.
   Koncept žije v zařízení, kde vznikl — mezi telefonem a počítačem se nepřenáší. */
(function(){
  'use strict';

  function otevri(){
    return new Promise((res,rej)=>{
      const r = indexedDB.open('atlas-fronta', 2);
      r.onupgradeneeded = () => {
        const d = r.result;
        if(!d.objectStoreNames.contains('zapisy'))   d.createObjectStore('zapisy',{autoIncrement:true});
        if(!d.objectStoreNames.contains('koncepty')) d.createObjectStore('koncepty');
      };
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
      r.onblocked = () => rej(new Error('Jiná záložka Atlasu drží starou databázi — zavři ji a zkus to znovu.'));
    });
  }
  function krok(rezim, prace){
    return otevri().then(d => new Promise((res,rej)=>{
      const t = d.transaction('koncepty', rezim);
      const vysledek = prace(t.objectStore('koncepty'));
      t.oncomplete = () => res(vysledek && 'result' in vysledek ? vysledek.result : undefined);
      t.onerror = () => rej(t.error);
    }));
  }

  /* Jednorázová migrace: starý jediný klíč 'misto' → 'misto:<čas>'.
     Běží jednou za načtení stránky, před prvním použitím skladu. */
  let _migrace = null;
  function migrace(){
    if(_migrace) return _migrace;
    _migrace = otevri().then(d => new Promise((res,rej)=>{
      const t = d.transaction('koncepty', 'readwrite');
      const s = t.objectStore('koncepty');
      const g = s.get('misto');
      g.onsuccess = () => {
        const k = g.result;
        if(k){ s.put(k, 'misto:' + (k.ulozeno || Date.now())); s.delete('misto'); }
      };
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error);
    })).catch(() => {});   // nezdařená migrace nesmí zablokovat zbytek
    return _migrace;
  }

  const API = {
    uloz:  (klic, data) => migrace().then(() => krok('readwrite', s => s.put({...data, ulozeno: Date.now()}, klic))),
    nacti: (klic)       => migrace().then(() => krok('readonly',  s => s.get(klic))),
    smaz:  (klic)       => migrace().then(() => krok('readwrite', s => s.delete(klic))),
    /* nový klíč pro další rozepsané místo */
    novyKlicMista: () => 'misto:' + Date.now(),
    jeMisto: (klic) => typeof klic === 'string' && klic.split(':')[0] === 'misto',
    /* všechny koncepty, nejnovější první */
    vsechny(){
      return migrace().then(otevri).then(d => new Promise((res,rej)=>{
        const req = d.transaction('koncepty','readonly').objectStore('koncepty').openCursor();
        const out = [];
        req.onsuccess = () => { const c = req.result; if(c){ out.push({klic:c.key, k:c.value}); c.continue(); } else res(out); };
        req.onerror = () => rej(req.error);
      })).then(out => out.sort((a,b) => ((b.k && b.k.ulozeno) || 0) - ((a.k && a.k.ulozeno) || 0)));
    }
  };
  window.atlasKoncepty = API;

  /* ---- zlatý proužek „Máš rozepsaný zápis" ---- */
  function styl(){
    if(document.getElementById('koncept-styl')) return;
    const s = document.createElement('style'); s.id = 'koncept-styl';
    s.textContent =
      '.koncept-pruh{max-width:1160px;margin:14px auto 0;padding:0 clamp(16px,4vw,32px);display:grid;gap:8px}'+
      '.koncept-item{display:flex;align-items:center;gap:10px;background:linear-gradient(120deg,rgba(201,161,74,.16),rgba(201,161,74,.06));'+
        'border:1px solid rgba(201,161,74,.55);border-radius:12px;padding:10px 12px 10px 14px;color:var(--cream,#fbf7ef);'+
        'font:500 14px "Jost",sans-serif;letter-spacing:.02em}'+
      '.koncept-item a{color:inherit;text-decoration:none;display:flex;align-items:center;gap:8px;flex:1;min-width:0}'+
      '.koncept-item a:hover b{color:var(--gold,#c9a14a)}'+
      '.koncept-item .ki-znak{color:var(--gold,#c9a14a);font-size:16px;flex:none}'+
      '.koncept-item b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
      '.koncept-item .ki-dal{color:var(--gold,#c9a14a);white-space:nowrap;flex:none}'+
      '.koncept-item .ki-kdy{color:rgba(251,247,239,.55);font-size:12px;white-space:nowrap;flex:none}'+
      '.koncept-zahod{flex:none;width:30px;height:30px;border-radius:50%;border:1px solid rgba(201,161,74,.4);'+
        'background:transparent;color:rgba(251,247,239,.6);font:400 16px/1 sans-serif;cursor:pointer}'+
      '.koncept-zahod:hover{border-color:#b5442d;color:#ffd9cf}'+
      '@media(max-width:560px){.koncept-item .ki-kdy{display:none}}';
    document.head.appendChild(s);
  }
  function kdyText(ts){
    const dnu = Math.floor((Date.now()-ts)/86400000);
    const t = k => (window.t ? window.t(k) : k);
    if(dnu <= 0) return t('rozepsáno dnes');
    if(dnu === 1) return t('rozepsáno včera');
    return t('rozepsáno') + ' ' + new Date(ts).toLocaleDateString('cs-CZ');
  }

  /* Vykreslí proužek pod hlavičkou.
     filtr: {jenMisto:<uuid>, onOtevrit:fn(k,klic)}   — na stránce místa (jen tamní koncept, klik otevře modal)
            {onOtevritMisto:fn(k,klic)}               — na úvodce (koncept nového místa se otevře bez reloadu)
            {}                                        — kdekoli jinde (odkazy vedou na příslušné stránky)
     Návrat: počet zobrazených konceptů. */
  window.atlasKonceptyProuzek = async function(filtr){
    filtr = filtr || {};
    let vse = [];
    try { vse = await API.vsechny(); } catch(e){ return 0; }
    if(filtr.jenMisto) vse = vse.filter(x => x.klic === 'navsteva:' + filtr.jenMisto);
    if(!vse.length){ document.querySelector('.koncept-pruh')?.remove(); return 0; }
    styl();
    const t = k => (window.t ? window.t(k) : k);
    let pruh = document.querySelector('.koncept-pruh');
    if(!pruh){
      pruh = document.createElement('div');
      pruh.className = 'koncept-pruh';
      const kotva = document.querySelector('.topbar');
      if(kotva) kotva.insertAdjacentElement('afterend', pruh);
      else document.body.prepend(pruh);
    }
    pruh.innerHTML = vse.map(({klic, k}) => {
      const nazev = (k.nazev && k.nazev.trim()) ? k.nazev : '…';
      const popisek = k.typ === 'misto' ? t('Rozepsané nové místo:') : t('Rozepsaný zápis:');
      const primo = (k.typ === 'misto' && filtr.onOtevritMisto) || (k.typ !== 'misto' && filtr.onOtevrit);
      const cil = k.typ === 'misto'
        ? '/?koncept=' + encodeURIComponent(klic)
        : `/misto?m=${encodeURIComponent(k.slug||'')}&koncept=otevrit`;
      return `<div class="koncept-item" data-klic="${klic}">
        <a href="${primo ? '#' : cil}" data-primo="${primo?'1':''}"><span class="ki-znak">✎</span> ${popisek} <b data-i18n="off">${nazev.replace(/</g,'&lt;')}</b>
        <span class="ki-dal">${t('dokončit')} ›</span><span class="ki-kdy">${kdyText(k.ulozeno)}</span></a>
        <button type="button" class="koncept-zahod" title="${t('Zahodit koncept')}" aria-label="${t('Zahodit koncept')}">×</button>
      </div>`;
    }).join('');
    pruh.querySelectorAll('a[data-primo="1"]').forEach(a => a.addEventListener('click', async e => {
      e.preventDefault();
      const klic = e.currentTarget.closest('.koncept-item').dataset.klic;
      const zaznam = vse.find(x => x.klic === klic);
      if(!zaznam) return;
      if(zaznam.k.typ === 'misto' && filtr.onOtevritMisto) filtr.onOtevritMisto(zaznam.k, klic);
      else if(filtr.onOtevrit) filtr.onOtevrit(zaznam.k, klic);
    }));
    pruh.querySelectorAll('.koncept-zahod').forEach(b => b.addEventListener('click', async e => {
      const item = e.currentTarget.closest('.koncept-item');
      const otazka = t('Zahodit rozepsaný zápis? Uložený text i fotka zmizí.');
      if(!confirm(otazka)) return;
      await API.smaz(item.dataset.klic);
      window.atlasKonceptyProuzek(filtr);
      if(typeof notify === 'function') notify(t('Koncept zahozen.'));
    }));
    return vse.length;
  };

  /* mimo stránku místa se proužek ukáže sám (deník, objevit, nápověda…);
     úvodka a stránka místa si ho hned poté překreslí s vlastními callbacky */
  if(!location.pathname.startsWith('/misto')){
    const auto = () => { window.atlasKonceptyProuzek({}); };
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
    else auto();
  }
})();
