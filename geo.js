/* Určení kraje a země z GPS souřadnic — data z /kraje_cr.geojson a /zeme_svet.geojson */

let _kraje = null, _zeme = null, _geoPromise = null;

function nactiGeo(){
  if (_geoPromise) return _geoPromise;
  _geoPromise = (async () => {
    try {
      const [k, z] = await Promise.all([
        fetch('/kraje_cr.geojson').then(r => r.json()),
        fetch('/zeme_svet.geojson').then(r => r.json())
      ]);
      _kraje = k.features; _zeme = z.features;
    } catch (e) {
      console.warn('Geodata se nenačetla:', e);
      _kraje = []; _zeme = [];
    }
  })();
  return _geoPromise;
}

/* even-odd ray casting přes jeden prstenec */
function vRingu(lng, lat, ring){
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++){
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
/* polygon s dírami: even-odd přes všechny prstence (díra bod odečte) */
function vPolygonu(lng, lat, poly){
  let c = 0;
  for (const ring of poly) if (vRingu(lng, lat, ring)) c++;
  return c % 2 === 1;
}
function vGeom(lng, lat, geom){
  if (geom.type === 'Polygon') return vPolygonu(lng, lat, geom.coordinates);
  if (geom.type === 'MultiPolygon') return geom.coordinates.some(poly => vPolygonu(lng, lat, poly));
  return false;
}

/* vrátí {zeme, kraj} pro bod; kraje jsou seřazené dle plochy (Praha první kvůli enklávě) */
window.atlasUrciUzemi = async (lat, lng) => {
  await nactiGeo();
  for (const f of (_kraje || [])){
    if (vGeom(lng, lat, f.geometry)) return { zeme: 'Česko', kraj: f.properties.nazev };
  }
  for (const f of (_zeme || [])){
    if (vGeom(lng, lat, f.geometry)) return { zeme: f.properties.zeme, kraj: null };
  }
  return { zeme: null, kraj: null };
};

/* přednačíst na pozadí, ať je odezva při ukládání okamžitá */
if (document.readyState !== 'loading') nactiGeo();
else window.addEventListener('DOMContentLoaded', nactiGeo);
