/* ============================================
   Deep Field — Script
   ============================================ */

(function () {
  'use strict';

  // ---- State ----
  const state = {
    phase: 'landing', // landing | gallery
    activeIndex: 0,
    transitioning: false,
    overlayOpen: null,
    orbCardOpen: null,
    lightboxOpen: false,
    lightboxImages: [],
    lightboxIndex: 0,
    mouseX: 0,
    mouseY: 0,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };

  // ---- DOM ----
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const canvas = $('#void');
  const ctx = canvas.getContext('2d');
  const landing = $('#landing');
  const enterBtn = $('#enterBtn');
  const projectsContainer = $('#projects');
  const projects = $$('.project');
  const prevArrow = $('#prevArrow');
  const nextArrow = $('#nextArrow');
  const counterCurrent = $('.projects__counter-current');
  const nav = $('#nav');
  const orbContainer = $('#orbs');
  const orbCard = $('#orbCard');

  // ---- Constants ----
  const TRANSITION_MS = 800;
  const PARTICLE_COUNT = window.innerWidth < 768 ? 30 : 60;
  const EASE = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // ---- Project Colors ----
  const projectColors = projects.map((p) => p.dataset.color);

  // ---- Particles ----
  let particles = [];
  let warpDirection = 0;
  let warpStrength = 0;

  function createParticles() {
    particles = [];
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

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (particles.length === 0) createParticles();
  }

  // ---- Particle Animation ----
  let currentColor = { r: 106, g: 5, b: 114 };
  let targetColor = { r: 106, g: 5, b: 114 };

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 106, g: 5, b: 114 };
  }

  function lerpColor(a, b, t) {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t),
    };
  }

  function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.width * 0.1,
      canvas.width / 2, canvas.height / 2, canvas.width * 0.7
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, 0.06)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    currentColor = lerpColor(currentColor, targetColor, 0.02);
    warpStrength *= 0.96;

    const mx = (state.mouseX / canvas.width - 0.5) * 2;
    const my = (state.mouseY / canvas.height - 0.5) * 2;

    for (const p of particles) {
      p.x += p.baseSpeed * (0.3 + p.z * 0.7);
      p.y += Math.sin(p.x * 0.005) * 0.2;
      p.x += warpDirection * warpStrength * (0.5 + p.z) * 3;

      const parallaxScale = p.z * 12;
      const drawX = p.x + mx * parallaxScale;
      const drawY = p.y + my * parallaxScale;

      if (p.x > canvas.width + 10) p.x = -10;
      if (p.x < -10) p.x = canvas.width + 10;

      const size = p.size * (0.4 + p.z * 0.8);
      const warmth = p.z > 0.7 ? 30 : 0;
      ctx.beginPath();
      ctx.arc(drawX, drawY, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${232 + warmth}, ${230 + warmth * 0.6}, ${225}, ${p.opacity * (0.3 + p.z * 0.7)})`;
      ctx.fill();
    }

    requestAnimationFrame(drawParticles);
  }

  // ---- Enter Gallery ----
  function enterGallery() {
    if (state.phase !== 'landing') return;
    closeOrbCard();
    state.phase = 'gallery';

    landing.classList.add('is-exiting');
    setTimeout(() => {
      landing.classList.add('is-hidden');
      projectsContainer.classList.add('is-active');
      showProject(0, 'none');
    }, 600);
  }

  // ---- Go Home (back to landing) ----
  function goHome() {
    if (state.overlayOpen) closeOverlay();
    closeOrbCard();
    if (state.phase === 'landing') return;

    projects.forEach((p) => p.classList.remove('is-active', 'is-leaving', 'is-entering'));
    projectsContainer.classList.remove('is-active');
    state.transitioning = false;
    state.activeIndex = 0;

    landing.classList.remove('is-exiting', 'is-hidden');
    state.phase = 'landing';

    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  // ---- Show Project ----
  function showProject(index, direction) {
    const current = projects[state.activeIndex];
    const next = projects[index];

    targetColor = hexToRgb(projectColors[index]);

    document.documentElement.style.setProperty('--project-color', projectColors[index]);
    const c = hexToRgb(projectColors[index]);
    document.documentElement.style.setProperty('--project-glow', `rgba(${c.r}, ${c.g}, ${c.b}, 0.15)`);

    counterCurrent.textContent = String(index + 1).padStart(2, '0');

    if (direction === 'none') {
      next.classList.add('is-active');
      state.activeIndex = index;
      return;
    }

    state.transitioning = true;
    warpDirection = direction === 'next' ? 1 : -1;
    warpStrength = 5;

    current.classList.remove('is-active');
    current.classList.add('is-leaving');
    next.classList.add('is-entering');

    setTimeout(() => {
      current.classList.remove('is-leaving');
      next.classList.remove('is-entering');
      next.classList.add('is-active');
      state.activeIndex = index;
      state.transitioning = false;
    }, TRANSITION_MS);
  }

  // ---- Navigate ----
  function goNext() {
    if (state.transitioning || state.phase !== 'gallery') return;
    const next = (state.activeIndex + 1) % projects.length;
    showProject(next, 'next');
  }

  function goPrev() {
    if (state.transitioning || state.phase !== 'gallery') return;
    const prev = (state.activeIndex - 1 + projects.length) % projects.length;
    showProject(prev, 'prev');
  }

  // ---- Overlays ----
  function openOverlay(id) {
    if (state.overlayOpen) closeOverlay();
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.add('is-open');
    state.overlayOpen = id;
  }

  function closeOverlay() {
    if (!state.overlayOpen) return;
    const overlay = document.getElementById(state.overlayOpen);
    if (overlay) overlay.classList.remove('is-open');
    state.overlayOpen = null;
  }

  // ---- Orb Content ----
  const ORB_CONTENT = {
    photo: {
      title: 'That’s Me',
      body: '<img src="images/ryan-headshot.jpeg" alt="Ryan Herrin"><p>AI-focused Product Designer. Head of Product Design at Belva.</p>',
    },
    story: {
      title: 'My Story',
      body: '<p>I’ve spent the past year and a half as Head of Product Design at Belva, building LawGoat from scratch — an AI-powered legal platform that helps attorneys communicate with clients, analyze documents, and automate their workflows. I designed the entire system end-to-end, from research to shipped product. I’m drawn to the intersection of AI and complex software — where good design makes powerful tools feel simple.</p>',
    },
    tools: {
      title: 'Tools & Tech',
      body: '<div class="orb-pills"><span class="orb-pill">Figma</span><span class="orb-pill">Design Systems</span><span class="orb-pill">Cursor</span><span class="orb-pill">Claude</span><span class="orb-pill">HTMX</span><span class="orb-pill">Tailwind</span><span class="orb-pill">Python</span><span class="orb-pill">AI Product Design</span><span class="orb-pill">User Research</span><span class="orb-pill">Prototyping</span></div>',
    },
    fact: {
      title: 'Fun Fact',
      body: '<p>I once redesigned an entire restaurant menu the night before their grand opening because the original designer ghosted. Printed at 3 AM at a 24-hour copy shop. The owner still sends me free tacos every year as a thank-you.</p>',
    },
    quote: {
      title: 'Favorite Quote',
      body: '<blockquote>“The details are not the details. They make the design.”<cite>— Charles Eames</cite></blockquote>',
    },
    hobby: {
      title: 'After Hours',
      body: '<p>When I’m not pushing pixels, I’m usually outside with a telescope and a camera. Astrophotography is my reset button — there’s something humbling about spending three hours tracking a nebula only to realize your lens cap was on for the first twenty minutes. I’ve been chasing the Milky Way across Texas hill country for five years now.</p>',
    },
  };

  // ---- Orb Card ----
  function openOrbCard(key) {
    if (!orbCard) return;
    const content = ORB_CONTENT[key];
    if (!content) return;

    orbCard.querySelector('.orb-card__title').textContent = content.title;
    orbCard.querySelector('.orb-card__body').innerHTML = content.body;
    orbCard.classList.add('is-open');
    state.orbCardOpen = key;
  }

  function closeOrbCard() {
    if (!orbCard) return;
    orbCard.classList.remove('is-open');
    state.orbCardOpen = null;
  }

  // ---- Lightbox ----
  const lightboxEl = $('#lightbox');
  const lightboxImageEl = $('#lightboxImage');
  const lightboxPrevBtn = $('#lightboxPrev');
  const lightboxNextBtn = $('#lightboxNext');
  const lightboxCloseBtn = $('#lightboxClose');

  function updateLightboxImage() {
    const img = state.lightboxImages[state.lightboxIndex];
    if (!img) return;
    lightboxImageEl.src = img.src;
    lightboxImageEl.alt = img.alt || '';
  }

  function openLightbox(images, index) {
    if (!lightboxEl || !images || !images.length) return;
    state.lightboxImages = images;
    state.lightboxIndex = index || 0;
    state.lightboxOpen = true;
    updateLightboxImage();
    lightboxEl.classList.add('is-open');
    lightboxEl.classList.toggle('lightbox--single', images.length <= 1);
  }

  function closeLightbox() {
    if (!lightboxEl) return;
    lightboxEl.classList.remove('is-open');
    state.lightboxOpen = false;
    state.lightboxImages = [];
    state.lightboxIndex = 0;
  }

  function lightboxGoNext() {
    if (!state.lightboxOpen || state.lightboxImages.length <= 1) return;
    state.lightboxIndex = (state.lightboxIndex + 1) % state.lightboxImages.length;
    updateLightboxImage();
  }

  function lightboxGoPrev() {
    if (!state.lightboxOpen || state.lightboxImages.length <= 1) return;
    state.lightboxIndex = (state.lightboxIndex - 1 + state.lightboxImages.length) % state.lightboxImages.length;
    updateLightboxImage();
  }

  if (lightboxEl) {
    if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
    if (lightboxPrevBtn) lightboxPrevBtn.addEventListener('click', lightboxGoPrev);
    if (lightboxNextBtn) lightboxNextBtn.addEventListener('click', lightboxGoNext);

    lightboxEl.addEventListener('click', (e) => {
      if (e.target.closest('.lightbox__image, .lightbox__arrow, .lightbox__close')) return;
      closeLightbox();
    });
  }

  // ---- Deep link from #<slug> on case study pages ----
  function jumpToProjectFromHash() {
    const slug = window.location.hash.replace(/^#/, '');
    if (!slug) return false;
    const idx = projects.findIndex((p) => {
      const btn = p.querySelector('.project__link[data-case-study]');
      return btn && btn.dataset.caseStudy === slug + '.html';
    });
    if (idx < 0) return false;

    // Skip the landing animation
    state.phase = 'gallery';
    landing.classList.add('is-exiting', 'is-hidden');
    projectsContainer.classList.add('is-active');
    showProject(idx, 'none');
    return true;
  }

  // ---- Event Listeners ----
  enterBtn.addEventListener('click', enterGallery);

  const navLogo = $('#navLogo');
  const navHome = $('#navHome');
  if (navLogo) navLogo.addEventListener('click', (e) => { e.preventDefault(); goHome(); });
  if (navHome) navHome.addEventListener('click', goHome);

  nextArrow.addEventListener('click', goNext);
  prevArrow.addEventListener('click', goPrev);

  $$('[data-overlay]').forEach((btn) => {
    btn.addEventListener('click', () => openOverlay(btn.dataset.overlay));
  });

  $$('[data-close]').forEach((btn) => {
    btn.addEventListener('click', closeOverlay);
  });

  $$('.orb').forEach((orb) => {
    orb.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = orb.dataset.orb;
      if (key) openOrbCard(key);
    });
  });

  if (orbCard) {
    const closeBtn = orbCard.querySelector('.orb-card__close');
    if (closeBtn) closeBtn.addEventListener('click', closeOrbCard);

    const backdrop = orbCard.querySelector('.orb-card__backdrop');
    if (backdrop) backdrop.addEventListener('click', closeOrbCard);
  }

  // "View Project" buttons → navigate to case study page
  $$('.project__link[data-case-study]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = btn.dataset.caseStudy;
    });
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.lightboxOpen) { closeLightbox(); return; }
      if (state.orbCardOpen) { closeOrbCard(); return; }
      if (state.overlayOpen) { closeOverlay(); return; }
      return;
    }

    if (state.lightboxOpen) {
      if (e.key === 'ArrowRight') { lightboxGoNext(); return; }
      if (e.key === 'ArrowLeft') { lightboxGoPrev(); return; }
      return;
    }

    if (state.overlayOpen) return;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        goNext();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        goPrev();
        break;
      case 'Enter':
        if (state.phase === 'landing') {
          enterGallery();
        } else if (state.phase === 'gallery') {
          const btn = projects[state.activeIndex] && projects[state.activeIndex].querySelector('.project__link[data-case-study]');
          if (btn) window.location.href = btn.dataset.caseStudy;
        }
        break;
    }
  });

  // Mouse tracking
  document.addEventListener('mousemove', (e) => {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;

    if (orbContainer && window.innerWidth > 768) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      orbContainer.style.setProperty('--parallax-x', (dx * 12) + 'px');
      orbContainer.style.setProperty('--parallax-y', (dy * 8) + 'px');
    }
  });

  // Wheel scroll → project navigation (gallery only)
  let lastWheelTime = 0;
  document.addEventListener('wheel', (e) => {
    if (state.phase !== 'gallery' || state.overlayOpen || state.orbCardOpen || state.lightboxOpen) return;
    if (Math.abs(e.deltaY) < 8) return;
    const now = Date.now();
    if (now - lastWheelTime < TRANSITION_MS) return;
    lastWheelTime = now;
    if (e.deltaY > 0) goNext();
    else goPrev();
  }, { passive: true });

  // Touch swipe
  let touchStartX = 0;
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }, { passive: true });

  window.addEventListener('resize', resizeCanvas);

  // ---- Custom scroll indicator ----
  (function () {
    const thumb = document.createElement('div');
    thumb.className = 'scroll-thumb';
    document.body.appendChild(thumb);

    let hideTimer = null;

    function update(el) {
      const sh = el.scrollHeight;
      const ch = el.clientHeight;
      if (sh <= ch) { thumb.classList.remove('is-visible'); return; }

      const rect = el.getBoundingClientRect();
      const radius = parseFloat(getComputedStyle(el).borderRadius) || 0;
      const inset = Math.max(radius, 8);
      const trackTop = rect.top + inset;
      const trackBottom = rect.bottom - inset;
      const trackH = trackBottom - trackTop;

      const ratio = ch / sh;
      const thumbH = Math.max(ratio * trackH, 24);
      const scrollFrac = el.scrollTop / (sh - ch);
      const top = trackTop + scrollFrac * (trackH - thumbH);

      thumb.style.top = top + 'px';
      thumb.style.height = thumbH + 'px';
      thumb.style.right = (window.innerWidth - rect.right + 6) + 'px';
      thumb.classList.add('is-visible');

      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => thumb.classList.remove('is-visible'), 800);
    }

    document.addEventListener('scroll', (e) => {
      const el = e.target;
      if (el === document || el === document.documentElement) return;
      if (el.matches('.orb-card__panel')) {
        update(el);
      }
    }, true);
  })();

  // ---- Init ----
  resizeCanvas();
  drawParticles();
  jumpToProjectFromHash();
})();
