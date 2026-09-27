// Particle Breath by Limot — https://limot.dev — MIT License
// Stable surface samples: animation deforms the same particles without re-scattering them.
export function createBreathParticles(count) {
  const points = [];
  const random = (i) => {
    const x = Math.sin(i * 127.1 + 43.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const rows = Math.max(16, Math.round(Math.sqrt(count / 2)));
  for (let row = 0; row < rows; row++) {
    const latitude = -Math.PI / 2 + ((row + 0.5) / rows) * Math.PI;
    const columns = Math.max(
      6,
      Math.round(((count / rows) * Math.cos(latitude) * Math.PI) / 2),
    );
    for (let col = 0; col < columns; col++) {
      const id = points.length;
      points.push({
        u: latitude + (random(id + 1) - 0.5) * 0.012,
        v:
          ((col + row * 0.34) / columns) * Math.PI * 2 +
          (random(id + 7) - 0.5) * 0.009,
        r: 0.6 + random(id + 31) * 0.65,
        a: 0.55 + random(id + 57) * 0.45,
      });
    }
  }
  return points;
}
export function breathPoint(p, time, amplitude) {
  const u = p.u,
    v = p.v,
    cu = Math.cos(u),
    su = Math.sin(u);
  const b = time * 0.78;
  const ripple =
    amplitude *
    (0.1 * Math.sin(b + v * 1.4 + u * 2) +
      0.055 * Math.sin(v * 3 - u * 2 - b * 0.8));
  const radius =
    1 +
    0.22 * Math.cos(v * 3 + 0.45) * cu * cu +
    0.1 * Math.sin(u * 3 + v * 2) +
    ripple;
  let x = cu * Math.cos(v) * radius * 1.18;
  let y = su * radius * 0.87;
  let z = cu * Math.sin(v) * radius * 0.68;
  // A diagonal saddle fold and asymmetric lobes create the selected soft silhouette.
  y += 0.25 * Math.sin(x * 2.4 + v * 0.4) * cu;
  const twist = 0.62 * x + 0.14 * Math.sin(b * 0.7 + u) * amplitude;
  const yy = y * Math.cos(twist) - z * Math.sin(twist);
  const zz = y * Math.sin(twist) + z * Math.cos(twist);
  y = yy;
  z = zz;
  return { x: x + 0.15 * z, y: y + 0.19 * z, z };
}
export function renderParticles(ctx, w, h, time, c, points) {
  ctx.globalAlpha = 1;
  const size = (Math.min(w * 0.205, h * 0.32) * (c.scale ?? 100)) / 100;
  const t = time * (c.speed ?? 1),
    amplitude = (c.breathStrength ?? 75) / 75;
  const buckets = Array.from({ length: 12 }, () => []);
  for (const p of points) {
    const q = breathPoint(p, t, amplitude);
    const depth = Math.max(
      0,
      Math.min(11, Math.floor(((q.z + 1.25) / 2.5) * 12)),
    );
    buckets[depth].push({
      x: w / 2 + q.x * size,
      y: h / 2 + q.y * size,
      r: p.r,
      a: p.a,
    });
  }
  ctx.fillStyle = c.dotColor ?? "#e0dfd8";
  const radius = (c.particleSize ?? 1) * Math.max(0.5, size / 230);
  for (let i = 0; i < 12; i++) {
    ctx.globalAlpha = 0.2 + (i / 11) * 0.65;
    ctx.beginPath();
    for (const p of buckets[i]) {
      const r = radius * p.r;
      ctx.moveTo(p.x + r, p.y);
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  // Just a few persistent strays drift close to the breathing surface.
  for (let i = 0; i < 18; i++) {
    const angle = i * 2.39996,
      orbit = 1.34 + 0.12 * Math.sin(t * 0.24 + i);
    const x = w / 2 + Math.cos(angle) * size * orbit * 1.08,
      y = h / 2 + Math.sin(angle) * size * orbit * 0.85;
    ctx.globalAlpha = 0.2 + 0.25 * (0.5 + 0.5 * Math.sin(t * 0.5 + i));
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
