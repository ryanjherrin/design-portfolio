/* ============================================
   BLOOM CYCLE — Scroll-Driven Narrative Portfolio
   ============================================ */

(function () {
  'use strict';

  // --- Utilities ---
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  function lerpColor(a, b, t) {
    // a, b are [r, g, b] arrays, t is 0–1
    return [
      Math.round(lerp(a[0], b[0], t)),
      Math.round(lerp(a[1], b[1], t)),
      Math.round(lerp(a[2], b[2], t)),
    ];
  }

  function rgbToString(rgb) {
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }

  // --- Color Palette Keyframes ---
  // progress: [background, foreground, accent]
  const colorStops = [
    { at: 0.00, bg: [10, 10, 10],    fg: [232, 224, 212], accent: [90, 62, 40]  },  // black
    { at: 0.12, bg: [30, 20, 12],    fg: [210, 195, 175], accent: [120, 80, 45]  }, // deep brown
    { at: 0.35, bg: [18, 35, 18],    fg: [200, 210, 185], accent: [74, 122, 69]  }, // forest green
    { at: 0.55, bg: [25, 42, 22],    fg: [230, 220, 190], accent: [160, 140, 60]  }, // green-gold transition
    { at: 0.65, bg: [38, 32, 18],    fg: [240, 225, 190], accent: [212, 168, 83]  }, // warm gold
    { at: 0.85, bg: [25, 22, 16],    fg: [200, 185, 160], accent: [160, 130, 70]  }, // muted ochre
    { at: 1.00, bg: [8, 8, 8],       fg: [150, 140, 125], accent: [80, 60, 40]   },  // fade to black
  ];

  // --- State ---
  let scrollProgress = 0;
  let smoothProgress = 0;
  let ticking = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Scroll Engine ---
  function getScrollProgress() {
    const scrollY = window.scrollY || window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    return docHeight > 0 ? clamp(scrollY / docHeight, 0, 1) : 0;
  }

  function onScroll() {
    scrollProgress = getScrollProgress();
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(tick);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // --- Main Tick ---
  function tick() {
    // Lerp for smoothness (skip lerp if reduced motion)
    if (reducedMotion) {
      smoothProgress = scrollProgress;
    } else {
      smoothProgress = lerp(smoothProgress, scrollProgress, 0.08);
      // Snap if close enough
      if (Math.abs(smoothProgress - scrollProgress) < 0.0001) {
        smoothProgress = scrollProgress;
      }
    }

    updateColors(smoothProgress);
    updateSVG(smoothProgress);
    updateText(smoothProgress);
    updateNav(smoothProgress);

    // Continue animation if still interpolating
    if (Math.abs(smoothProgress - scrollProgress) > 0.0001) {
      requestAnimationFrame(tick);
    } else {
      ticking = false;
    }
  }

  // --- Color Interpolation ---
  function interpolateColorSet(progress) {
    // Find the two stops we're between
    let i = 0;
    for (; i < colorStops.length - 1; i++) {
      if (progress <= colorStops[i + 1].at) break;
    }
    const a = colorStops[i];
    const b = colorStops[Math.min(i + 1, colorStops.length - 1)];
    const range = b.at - a.at;
    const t = range > 0 ? clamp((progress - a.at) / range, 0, 1) : 0;

    return {
      bg: lerpColor(a.bg, b.bg, t),
      fg: lerpColor(a.fg, b.fg, t),
      accent: lerpColor(a.accent, b.accent, t),
    };
  }

  function updateColors(progress) {
    const colors = interpolateColorSet(progress);
    const root = document.documentElement;
    root.style.setProperty('--bg', rgbToString(colors.bg));
    root.style.setProperty('--fg', rgbToString(colors.fg));
    root.style.setProperty('--accent', rgbToString(colors.accent));
    document.body.style.background = rgbToString(colors.bg);
    document.body.style.color = rgbToString(colors.fg);
  }

  // --- SVG Controller ---
  const svgElements = {
    roots: [],
    stem: null,
    branches: [],
    leaves: [],
    petals: [],
    seed: null,
    seedGlow: null,
    flowerCenter: null,
  };

  function cacheSVGElements() {
    svgElements.roots = [...document.querySelectorAll('.draw-path.root')];
    svgElements.stem = document.querySelector('.draw-path.stem');
    svgElements.branches = [...document.querySelectorAll('.draw-path.branch')];
    svgElements.leaves = [...document.querySelectorAll('.leaf')];
    svgElements.petals = [...document.querySelectorAll('.draw-path.petal')];
    svgElements.seed = document.querySelector('.svg-seed');
    svgElements.seedGlow = document.querySelector('.seed-pulse');
    svgElements.flowerCenter = document.querySelector('.flower-center');
  }

  function updateSVG(progress) {
    // --- Seed visibility: visible in Acts I-II, fades during III ---
    if (svgElements.seed) {
      const seedOpacity = progress < 0.35 ? 1 : clamp(1 - (progress - 0.35) / 0.1, 0, 1);
      svgElements.seed.style.opacity = seedOpacity;
    }

    // --- Seed glow pulse intensity: strongest in dormancy ---
    if (svgElements.seedGlow) {
      const glowScale = progress < 0.12 ? 1 : clamp(1 - (progress - 0.12) / 0.15, 0, 1);
      svgElements.seedGlow.style.opacity = glowScale * 0.7;
    }

    // --- Roots: draw during 0.10–0.30 ---
    svgElements.roots.forEach((path, i) => {
      const stagger = i * 0.03;
      const rootStart = 0.10 + stagger;
      const rootEnd = 0.30 + stagger;
      const t = clamp((progress - rootStart) / (rootEnd - rootStart), 0, 1);
      path.style.strokeDashoffset = 1 - t;
      // Color shift: brown → darker as it grows
      const colors = interpolateColorSet(progress);
      path.style.stroke = rgbToString(colors.accent);
    });

    // --- Stem: draw during 0.15–0.50 ---
    if (svgElements.stem) {
      const stemT = clamp((progress - 0.15) / 0.35, 0, 1);
      svgElements.stem.style.strokeDashoffset = 1 - stemT;
      // Stem color follows accent → greenish
      const colors = interpolateColorSet(progress);
      const stemGreen = lerpColor(colors.accent, [61, 90, 58], clamp(stemT, 0, 1));
      svgElements.stem.style.stroke = rgbToString(stemGreen);
    }

    // --- Branches: draw during 0.30–0.60, staggered ---
    svgElements.branches.forEach((path, i) => {
      const stagger = i * 0.035;
      const brStart = 0.30 + stagger;
      const brEnd = 0.50 + stagger;
      const t = clamp((progress - brStart) / (brEnd - brStart), 0, 1);
      path.style.strokeDashoffset = 1 - t;
    });

    // --- Leaves: scale in during 0.38–0.62, staggered ---
    svgElements.leaves.forEach((leaf, i) => {
      const stagger = i * 0.015;
      const leafStart = 0.38 + stagger;
      const leafEnd = 0.50 + stagger;
      const t = clamp((progress - leafStart) / (leafEnd - leafStart), 0, 1);
      const eased = t * (2 - t); // ease-out quad
      leaf.style.transform = `scale(${eased})`;
      leaf.style.opacity = eased * 0.7;
    });

    // --- Petals: draw during 0.55–0.75 ---
    svgElements.petals.forEach((path, i) => {
      const stagger = i * 0.025;
      const pStart = 0.55 + stagger;
      const pEnd = 0.72 + stagger;
      const t = clamp((progress - pStart) / (pEnd - pStart), 0, 1);
      path.style.strokeDashoffset = 1 - t;
    });

    // --- Flower center: fade in at peak ---
    if (svgElements.flowerCenter) {
      const fcT = clamp((progress - 0.65) / 0.1, 0, 1);
      svgElements.flowerCenter.style.opacity = fcT;
    }

    // --- Act V Return: fade everything down ---
    if (progress > 0.85) {
      const fadeT = clamp((progress - 0.85) / 0.15, 0, 1);
      const fadeOpacity = 1 - fadeT * 0.7;
      document.querySelector('.bloom-svg').style.opacity = fadeOpacity;
    } else {
      document.querySelector('.bloom-svg').style.opacity = 1;
    }
  }

  // --- Text Controller ---
  const textElements = [];
  const projectNodes = [];

  function cacheTextElements() {
    document.querySelectorAll('.bloom-text').forEach((el) => {
      textElements.push({
        el,
        show: parseFloat(el.dataset.show),
        hide: parseFloat(el.dataset.hide),
      });
    });
    document.querySelectorAll('.project-node').forEach((el) => {
      projectNodes.push({
        el,
        show: parseFloat(el.dataset.show),
        hide: parseFloat(el.dataset.hide),
      });
    });
  }

  function updateText(progress) {
    textElements.forEach(({ el, show, hide }) => {
      const visible = progress >= show && progress <= hide;
      el.setAttribute('data-visible', visible ? 'true' : 'false');
    });
    projectNodes.forEach(({ el, show, hide }) => {
      const visible = progress >= show && progress <= hide;
      el.setAttribute('data-visible', visible ? 'true' : 'false');
    });
  }

  // --- Nav ---
  function updateNav(progress) {
    const bar = document.querySelector('.nav__progress-bar');
    if (bar) {
      bar.style.width = `${progress * 100}%`;
    }
  }

  // --- Canvas Particle System ---
  let canvas, ctx;
  let particles = [];
  const isMobile = window.innerWidth < 768;
  const PARTICLE_COUNT = isMobile ? 25 : 50;

  function initParticles() {
    canvas = document.querySelector('.particles');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resizeCanvas();
    createParticles();
    if (!reducedMotion) {
      animateParticles();
    }
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.3 + 0.1,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function getParticleStyle(progress) {
    // Phase-based particle behavior
    if (progress < 0.12) {
      // Dormancy: tiny, dim, slow dust motes
      return { sizeMultiplier: 0.5, opacityMultiplier: 0.3, drift: 'slow', color: [150, 140, 125] };
    } else if (progress < 0.35) {
      // Germination: warm soil particles, low
      return { sizeMultiplier: 0.8, opacityMultiplier: 0.5, drift: 'warm', color: [120, 80, 45] };
    } else if (progress < 0.65) {
      // Bloom: luminous spores, upward drift
      return { sizeMultiplier: 1.0, opacityMultiplier: 0.7, drift: 'up', color: [74, 122, 69] };
    } else if (progress < 0.85) {
      // Radiance: golden pollen, lateral float
      return { sizeMultiplier: 1.2, opacityMultiplier: 0.8, drift: 'lateral', color: [212, 168, 83] };
    } else {
      // Return: falling petals, downward + sinusoidal
      return { sizeMultiplier: 1.5, opacityMultiplier: 0.5, drift: 'fall', color: [160, 130, 70] };
    }
  }

  function animateParticles() {
    if (!ctx || reducedMotion) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const style = getParticleStyle(smoothProgress);
    const time = performance.now() * 0.001;

    particles.forEach((p) => {
      // Update position based on drift mode
      switch (style.drift) {
        case 'slow':
          p.x += p.speedX * 0.3;
          p.y += p.speedY * 0.3;
          break;
        case 'warm':
          p.x += p.speedX * 0.5;
          p.y += Math.abs(p.speedY) * 0.2; // drift downward slightly
          break;
        case 'up':
          p.x += Math.sin(time + p.phase) * 0.3;
          p.y -= Math.abs(p.speedY) * 0.5 + 0.15;
          break;
        case 'lateral':
          p.x += p.speedX * 0.8 + Math.sin(time * 0.5 + p.phase) * 0.4;
          p.y += Math.sin(time * 0.3 + p.phase) * 0.15;
          break;
        case 'fall':
          p.x += Math.sin(time * 0.7 + p.phase) * 0.6;
          p.y += Math.abs(p.speedY) * 0.6 + 0.3;
          break;
      }

      // Wrap around screen edges
      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = canvas.height + 10;
      if (p.y > canvas.height + 10) p.y = -10;

      // Draw
      const size = p.size * style.sizeMultiplier;
      const alpha = p.opacity * style.opacityMultiplier;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${style.color[0]}, ${style.color[1]}, ${style.color[2]}, ${alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(animateParticles);
  }

  // --- Resize Handler ---
  function onResize() {
    resizeCanvas();
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 150);
  });

  // --- Init ---
  function init() {
    cacheSVGElements();
    cacheTextElements();
    initParticles();

    // Initial state
    scrollProgress = getScrollProgress();
    smoothProgress = scrollProgress;
    updateColors(smoothProgress);
    updateSVG(smoothProgress);
    updateText(smoothProgress);
    updateNav(smoothProgress);

    // Ensure animation loop starts if page is already scrolled
    if (scrollProgress > 0) {
      requestAnimationFrame(tick);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
