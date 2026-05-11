/* ============================================
   Case Study Page — Shared Script
   Reads the project color from <html data-project-color="#rrggbb">.
   ============================================ */

(function () {
  'use strict';

  const colorHex = document.documentElement.dataset.projectColor || '#3b82f6';

  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m
      ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
      : { r: 59, g: 130, b: 246 };
  }

  const projectColor = hexToRgb(colorHex);

  document.documentElement.style.setProperty('--project-color', colorHex);
  document.documentElement.style.setProperty(
    '--project-glow',
    `rgba(${projectColor.r}, ${projectColor.g}, ${projectColor.b}, 0.18)`
  );

  const canvas = document.getElementById('void');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const PARTICLE_COUNT = window.innerWidth < 768 ? 30 : 60;
  let particles = [];
  let mouseX = 0;
  let mouseY = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (particles.length === 0) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random(),
          baseSpeed: 0.1 + Math.random() * 0.3,
          size: 0.5 + Math.random() * 1.5,
          opacity: 0.2 + Math.random() * 0.5,
        });
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.width * 0.1,
      canvas.width / 2, canvas.height / 2, canvas.width * 0.7
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, `rgba(${projectColor.r}, ${projectColor.g}, ${projectColor.b}, 0.06)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const mx = (mouseX / canvas.width - 0.5) * 2;
    const my = (mouseY / canvas.height - 0.5) * 2;

    for (const p of particles) {
      p.x += p.baseSpeed * (0.3 + p.z * 0.7);
      p.y += Math.sin(p.x * 0.005) * 0.2;
      const parallaxScale = p.z * 12;
      const drawX = p.x + mx * parallaxScale;
      const drawY = p.y + my * parallaxScale;
      if (p.x > canvas.width + 10) p.x = -10;
      const size = p.size * (0.4 + p.z * 0.8);
      const warmth = p.z > 0.7 ? 30 : 0;
      ctx.beginPath();
      ctx.arc(drawX, drawY, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${232 + warmth}, ${230 + warmth * 0.6}, ${225}, ${p.opacity * (0.3 + p.z * 0.7)})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
  window.addEventListener('resize', resize);
  resize();
  draw();
})();
