/* Zpracování fotek před nahráním: zmenšení, komprese do WebP, srovnání otočení dle EXIF.
   Z 8MB fotky z mobilu udělá ~200-350 kB, jednotný formát, správně otočenou. */

window.atlasZpracujFoto = async (file, maxStrana = 1600, kvalita = 0.82) => {
  // originál jako pojistka, kdyby zpracování selhalo (např. HEIC v prohlížeči bez podpory)
  try {
    let bitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      bitmap = await createImageBitmap(file);
    }

    let w = bitmap.width, h = bitmap.height;
    const scale = Math.min(1, maxStrana / Math.max(w, h));
    w = Math.round(w * scale);
    h = Math.round(h * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close && bitmap.close();

    // WebP; kdyby prohlížeč neuměl, JPEG
    let blob = await new Promise(res => canvas.toBlob(res, 'image/webp', kvalita));
    if (!blob || blob.type !== 'image/webp') {
      blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', kvalita));
    }
    if (blob && blob.size < file.size) {
      return { blob, pripona: blob.type === 'image/webp' ? 'webp' : 'jpg' };
    }
    // pokud by výsledek byl větší než originál (malá fotka), nahraj originál
    const p = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    return { blob: file, pripona: p };
  } catch (e) {
    console.warn('Fotku se nepodařilo zpracovat, nahrávám originál:', e);
    const p = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    return { blob: file, pripona: p };
  }
};
