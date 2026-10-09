(() => {
  if (!document.body.classList.contains("page-home")) return;

  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (prefersReduced) return;

  const canvas = document.querySelector(".home-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  let w = 0,
    h = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  // On size le canvas sur son parent direct : .home-hero
  const parent =
    canvas.closest(".home-hero") || canvas.parentElement || document.body;

  function resize() {
    const rect = parent.getBoundingClientRect();
    const nw = Math.max(1, Math.floor(rect.width));
    const nh = Math.max(1, Math.floor(rect.height));

    // Evite le cas 300x150 (canvas par défaut) si le layout n'est pas prêt
    if (nw < 50 || nh < 50) return;

    w = nw;
    h = nh;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Resize robuste : au prochain frame + au load
  requestAnimationFrame(() => {
    resize();
    requestAnimationFrame(resize);
  });
  window.addEventListener("load", () => {
    resize();
    setTimeout(resize, 80);
  });

  // ResizeObserver pour suivre les changements de taille du hero
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(() => resize());
    ro.observe(parent);
  } else {
    window.addEventListener("resize", resize, { passive: true });
  }

  // -------- Particules brume (subtil)
  const TAU = Math.PI * 2;
  const dots = [];
  let COUNT = 160;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function reseed() {
    // recalcul densité avec la taille actuelle
    COUNT = Math.round(Math.min(220, Math.max(120, (w * h) / 12000)));
    dots.length = 0;

    for (let i = 0; i < COUNT; i++) {
      const x = rand(0, w);
      const y = rand(0, h);
      const bias = rand(0, 1);
      const bx = bias < 0.55 ? rand(w * 0.35, w) : x;

      dots.push({
        x: bx,
        y,
        r: rand(1.0, 2.8),
        a: rand(0.03, 0.08),
        sp: rand(0.08, 0.22),
        ph: rand(0, TAU),
        tw: rand(0.002, 0.009),
        drift: rand(-0.2, 0.2),
      });
    }
  }

  // reseed quand on a une taille correcte
  const waitSeed = () => {
    if (w < 50 || h < 50) {
      requestAnimationFrame(waitSeed);
      return;
    }
    reseed();
  };
  waitSeed();

  let t0 = performance.now();

  function step(now) {
    // si pas encore seed (taille pas prête), on attend
    if (dots.length === 0) {
      requestAnimationFrame(step);
      return;
    }

    const dt = Math.min(0.033, (now - t0) / 1000);
    t0 = now;
    const t = now * 0.001;

    ctx.clearRect(0, 0, w, h);

    // haze violet léger
    const g = ctx.createRadialGradient(
      w * 0.62,
      h * 0.58,
      0,
      w * 0.62,
      h * 0.58,
      Math.max(w, h) * 0.85,
    );
    g.addColorStop(0, "rgba(182,76,255,0.075)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    for (const p of dots) {
      p.ph += p.tw;
      const vx = Math.cos(p.ph) * p.sp + p.drift * 0.15;
      const vy = Math.sin(p.ph * 0.9) * p.sp * 0.8;

      p.x += vx * (dt * 60);
      p.y += vy * (dt * 60);

      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;

      const edgeX = Math.min(p.x, w - p.x) / (w * 0.18);
      const edgeY = Math.min(p.y, h - p.y) / (h * 0.18);
      const edge = Math.max(0, Math.min(1, Math.min(edgeX, edgeY)));

      const twinkle = 0.88 + 0.12 * Math.sin(t + p.ph);
      const alpha = p.a * edge * twinkle;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fillStyle = `rgba(233,233,239,${alpha})`;
      ctx.fill();
    }

    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
})();
