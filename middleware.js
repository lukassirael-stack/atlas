/* Náhled sdíleného místa.
   Když odkaz na místo (/misto?m=…) načítá robot sociální sítě nebo chatu (Facebook, Messenger, WhatsApp,
   Telegram, X, Slack, iMessage…), dostane malou stránku s názvem, popisem a fotkou právě toho místa —
   podle ní se vykreslí náhled odkazu. Lidé a vyhledávače dostávají stránku místa beze změny.
   Ruční kontrola náhledu: /misto?m=<slug>&nahled=1 */

const WEB = 'https://atlas.oaza-adamanthea.cz';
const SUPA = 'https://myybuesoourgpbouwwst.supabase.co';
const KLIC = 'sb_publishable_v9E-GhERgU5JCvE0D-l65A_QB2S2yux';   // veřejný klíč, stejný jako v auth.js
const ROBOT = /facebookexternalhit|facebot|facebookcatalog|meta-external|whatsapp|twitterbot|telegrambot|slackbot|slack-imgproxy|discordbot|linkedinbot|pinterest|skypeuripreview|viber|line-poker|vkshare|redditbot|embedly|iframely|mastodon|bluesky|snapchat|tumblr|bitlybot/i;

export const config = { matcher: '/misto' };

/* pokračovat k běžné stránce místa */
const dal = () => new Response(null, { headers: { 'x-middleware-next': '1' } });

const esc = t => String(t == null ? '' : t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function zkrat(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const kus = t.slice(0, max);
  const mezera = kus.lastIndexOf(' ');
  return (mezera > max * 0.6 ? kus.slice(0, mezera) : kus).replace(/[\s,;:–—-]+$/, '') + '…';
}

async function rpc(nazev, slug, signal) {
  const r = await fetch(`${SUPA}/rest/v1/rpc/${nazev}`, {
    method: 'POST',
    headers: { apikey: KLIC, Authorization: `Bearer ${KLIC}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_slug: slug }),
    signal
  });
  if (!r.ok) return null;
  const data = await r.json();
  return Array.isArray(data) ? data : null;
}

export default async function middleware(request) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('m');
    if (!slug || !/^[a-z0-9-]{1,140}$/.test(slug)) return dal();
    const rucne = url.searchParams.get('nahled') === '1';
    if (!rucne && !ROBOT.test(request.headers.get('user-agent') || '')) return dal();

    const ac = new AbortController();
    const strop = setTimeout(() => ac.abort(), 3500);
    let detail = null, fotky = null;
    try {
      [detail, fotky] = await Promise.all([
        rpc('atlas_misto_detail', slug, ac.signal),
        rpc('atlas_misto_fotky', slug, ac.signal).catch(() => null)
      ]);
    } finally { clearTimeout(strop); }
    const m = detail && detail[0];
    if (!m || !m.nazev) return dal();

    const adresa = `${WEB}/misto?m=${encodeURIComponent(slug)}`;
    const kde = m.kraj ? (m.kraj === 'Praha' ? 'Praha' : (m.kraj === 'Vysočina' ? 'Kraj Vysočina' : `${m.kraj} kraj`)) : (m.zeme || '');
    const titulek = `${m.nazev} — Atlas energetických míst`;
    const popis = zkrat(m.popis, 220) ||
      `Posvátné a energetické místo${kde ? ` · ${kde}` : ''}. Objevuj, prožívej, sdílej.`;
    const cesta = fotky && fotky[0] && /^[\w\-./]+$/.test(fotky[0].cesta || '') ? fotky[0].cesta : null;
    const obrazek = cesta
      ? `${SUPA}/storage/v1/render/image/public/atlas/${cesta}?width=1200&height=630&resize=cover&quality=80`
      : `${WEB}/img/og-image.jpg`;

    const html = `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulek)}</title>
<meta name="description" content="${esc(popis)}">
<link rel="canonical" href="${esc(adresa)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Atlas energetických míst">
<meta property="og:title" content="${esc(m.nazev)}">
<meta property="og:description" content="${esc(popis)}">
<meta property="og:url" content="${esc(adresa)}">
<meta property="og:image" content="${esc(obrazek)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(m.nazev)}">
<meta property="og:locale" content="cs_CZ">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(m.nazev)}">
<meta name="twitter:description" content="${esc(popis)}">
<meta name="twitter:image" content="${esc(obrazek)}">
</head>
<body>
<h1>${esc(m.nazev)}</h1>
${m.nazev_oficialni ? `<p><em>${esc(m.nazev_oficialni)}</em></p>` : ''}
${kde ? `<p>${esc(kde)}</p>` : ''}
<p>${esc(popis)}</p>
<p><img src="${esc(obrazek)}" alt="${esc(m.nazev)}" width="1200" height="630" style="max-width:100%;height:auto"></p>
<p><a href="${esc(adresa)}">Otevřít místo v Atlasu energetických míst</a></p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400',
        'x-atlas-nahled': '1'
      }
    });
  } catch (e) {
    return dal();   // při jakékoli potíži dostane každý běžnou stránku místa
  }
}
