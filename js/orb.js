// Dario som «nærvær»: en svevende kule av punkter bundet sammen med linjer,
// slik AI-assistenter ofte vises. Den puster rolig i hvile og reagerer på
// lydnivået når Dario snakker (settNivaa 0–1). Ren canvas, ingen avhengigheter.

const PUNKTER = 260;
const NABO = 0.36; // maks avstand (på enhetskula) for at to punkter kobles

// Jevnt fordelte punkter på en kule (Fibonacci-spiral).
function kulepunkter(n) {
  const gyllen = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const v = gyllen * i;
    return { x: Math.cos(v) * r, y, z: Math.sin(v) * r, fase: Math.random() * Math.PI * 2 };
  });
}

// Kula er stiv, så nabolistene kan regnes ut én gang.
function naboer(p) {
  const par = [];
  for (let i = 0; i < p.length; i++) {
    for (let j = i + 1; j < p.length; j++) {
      const d = Math.hypot(p[i].x - p[j].x, p[i].y - p[j].y, p[i].z - p[j].z);
      if (d < NABO) par.push([i, j, d]);
    }
  }
  return par;
}

export function lagOrb(canvas) {
  const ctx = canvas.getContext('2d');
  const punkter = kulepunkter(PUNKTER);
  const par = naboer(punkter);
  const rolig = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const farge = getComputedStyle(document.documentElement);
  const vann = farge.getPropertyValue('--vann').trim() || '#52bdc6';
  const blaa = farge.getPropertyValue('--bd-blaa-lys').trim() || '#0a74b5';
  let mal = 0;     // ønsket nivå (fra lyd)
  let nivaa = 0;   // utjevnet nivå
  let stoppet = false;
  const proj = new Array(PUNKTER);

  function tegn(tid) {
    if (stoppet || !canvas.isConnected) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const b = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(b * dpr)) { canvas.width = Math.round(b * dpr); canvas.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, b, h);

    const t = rolig ? 0 : tid / 1000;
    nivaa += (mal - nivaa) * 0.18;
    const R = Math.min(b, h) * 0.37 * (1 + nivaa * 0.12 + Math.sin(t * 1.3) * 0.015);
    const cx = b / 2;
    const cy = h / 2;
    const ay = t * 0.25;
    const ax = Math.sin(t * 0.17) * 0.35 + 0.25;
    const [sy, cy2, sx, cx2] = [Math.sin(ay), Math.cos(ay), Math.sin(ax), Math.cos(ax)];

    // indre glød
    const glod = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
    glod.addColorStop(0, `rgba(82, 189, 198, ${0.18 + nivaa * 0.35})`);
    glod.addColorStop(0.55, 'rgba(0, 87, 141, 0.12)');
    glod.addColorStop(1, 'rgba(0, 87, 141, 0)');
    ctx.fillStyle = glod;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2); ctx.fill();

    for (let i = 0; i < PUNKTER; i++) {
      const p = punkter[i];
      // hvert punkt dirrer litt utover, mer når Dario snakker
      const utslag = 1 + Math.sin(t * 2.1 + p.fase) * (0.025 + nivaa * 0.16);
      let x = p.x * utslag, y = p.y * utslag, z = p.z * utslag;
      [x, z] = [x * cy2 - z * sy, x * sy + z * cy2];
      [y, z] = [y * cx2 - z * sx, y * sx + z * cx2];
      const perspektiv = 2.6 / (2.6 - z);
      proj[i] = { x: cx + x * R * perspektiv, y: cy + y * R * perspektiv, z };
    }

    ctx.lineWidth = 0.9;
    for (const [i, j, d] of par) {
      const a = proj[i], c = proj[j];
      const dybde = ((a.z + c.z) / 2 + 1) / 2; // 0 bak, 1 foran
      const alfa = (1 - d / NABO) * (0.18 + dybde * 0.8) * (0.85 + nivaa * 0.6);
      ctx.strokeStyle = dybde > 0.5 ? vann : blaa;
      ctx.globalAlpha = Math.min(1, alfa);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
    }
    for (let i = 0; i < PUNKTER; i++) {
      const p = proj[i];
      const dybde = (p.z + 1) / 2;
      ctx.globalAlpha = 0.25 + dybde * 0.75;
      ctx.fillStyle = dybde > 0.7 ? '#e6fbff' : vann;
      ctx.beginPath(); ctx.arc(p.x, p.y, 0.6 + dybde * 1.6 + nivaa * dybde, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!rolig) requestAnimationFrame(tegn);
  }
  requestAnimationFrame(tegn);

  return {
    settNivaa(x) {
      mal = Math.max(0, Math.min(1, x));
      if (rolig) requestAnimationFrame(tegn);
    },
    stopp() { stoppet = true; },
  };
}
