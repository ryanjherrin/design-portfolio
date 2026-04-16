/* ============================================
   DESIGN PORTFOLIO — Script
   Noir Kinetic Editorial
   ============================================ */

(function () {
  'use strict';

  // --- Utilities ---
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const lerp = (a, b, t) => a + (b - a) * t;

  // --- State ---
  const mouse = { x: 0, y: 0 };
  const cursorPos = { x: 0, y: 0 };
  const followerPos = { x: 0, y: 0 };
  const detailState = { open: false, project: null, savedRect: null };

  // --- Text Splitting ---
  function splitText(el) {
    const text = el.textContent;
    el.innerHTML = '';
    [...text].forEach((char, i) => {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.transitionDelay = `${i * 0.04}s`;
      el.appendChild(span);
    });
  }

  function initTextSplitting() {
    $$('[data-split]').forEach(splitText);
    $$('[data-split-preload]').forEach(splitText);
  }

  // --- Preloader ---
  function initPreloader() {
    const preloader = $('.preloader');
    const counter = $('.preloader__count');
    const barInner = $('.preloader__bar-inner');
    const preloaderName = $('.preloader__name');

    let count = 0;
    const duration = 2000;
    const startTime = performance.now();

    // Reveal preloader text
    requestAnimationFrame(() => {
      preloader.classList.add('is-active');
      if (preloaderName) preloaderName.classList.add('is-revealed');
    });

    function updateCounter(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Eased progress (ease-in-out cubic)
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      count = Math.floor(eased * 100);
      counter.textContent = count;
      barInner.style.width = `${eased * 100}%`;

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        counter.textContent = '100';
        barInner.style.width = '100%';
        setTimeout(finishPreloader, 400);
      }
    }

    requestAnimationFrame(updateCounter);

    function finishPreloader() {
      preloader.classList.add('is-done');

      // Trigger hero animations after preloader exits
      setTimeout(() => {
        revealHero();
        showNav();
      }, 600);

      // Remove preloader from DOM after animation
      setTimeout(() => {
        preloader.style.display = 'none';
      }, 1600);
    }
  }

  // --- Hero Reveal ---
  function revealHero() {
    const heroLines = $$('.hero__line-inner');
    heroLines.forEach((line, i) => {
      setTimeout(() => {
        line.classList.add('is-revealed');
      }, i * 200);
    });

    // Reveal subtitle and other hero elements
    const heroAnimated = $$('.hero [data-animate]');
    heroAnimated.forEach((el) => {
      const delay = parseFloat(el.dataset.delay || 0) * 1000;
      setTimeout(() => {
        el.classList.add('is-visible');
      }, delay);
    });
  }

  // --- Navigation ---
  function showNav() {
    const nav = $('[data-nav]');
    if (nav) nav.classList.add('is-visible');
  }

  // --- Custom Cursor ---
  function initCursor() {
    const cursor = $('.cursor');
    const follower = $('.cursor-follower');
    if (!cursor || !follower) return;

    let animating = false;
    let hasMoved = false;
    const mq = window.matchMedia('(max-width: 768px)');

    document.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (!hasMoved) {
        hasMoved = true;
        cursorPos.x = mouse.x;
        cursorPos.y = mouse.y;
        followerPos.x = mouse.x;
        followerPos.y = mouse.y;
        if (!mq.matches) document.body.classList.add('cursor-active');
      }
    });

    // Hover detection
    const interactiveElements = 'a, button, [data-magnetic], .project';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactiveElements)) {
        document.body.classList.add('cursor-hover');
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(interactiveElements)) {
        document.body.classList.remove('cursor-hover');
      }
    });

    function animateCursor() {
      if (mq.matches) {
        animating = false;
        document.body.classList.remove('cursor-active');
        return;
      }

      cursorPos.x = lerp(cursorPos.x, mouse.x, 0.2);
      cursorPos.y = lerp(cursorPos.y, mouse.y, 0.2);
      followerPos.x = lerp(followerPos.x, mouse.x, 0.08);
      followerPos.y = lerp(followerPos.y, mouse.y, 0.08);

      cursor.style.left = `${cursorPos.x}px`;
      cursor.style.top = `${cursorPos.y}px`;
      follower.style.left = `${followerPos.x}px`;
      follower.style.top = `${followerPos.y}px`;

      requestAnimationFrame(animateCursor);
    }

    function startIfDesktop() {
      if (!mq.matches && !animating) {
        animating = true;
        if (hasMoved) document.body.classList.add('cursor-active');
        animateCursor();
      }
    }

    mq.addEventListener('change', startIfDesktop);
    startIfDesktop();
  }

  // --- Scroll Animations ---
  function initScrollAnimations() {
    const observerOptions = {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = parseFloat(el.dataset.delay || 0) * 1000;

          setTimeout(() => {
            el.classList.add('is-visible');
          }, delay);

          observer.unobserve(el);
        }
      });
    }, observerOptions);

    // Observe all animated elements NOT inside .hero (hero is handled by preloader)
    $$('[data-animate]').forEach((el) => {
      if (!el.closest('.hero')) {
        observer.observe(el);
      }
    });
  }

  // --- Magnetic Effect ---
  function initMagnetic() {
    if (window.matchMedia('(max-width: 768px)').matches) return;

    $$('[data-magnetic]').forEach((el) => {
      const strength = 0.3;

      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        el.style.transform = 'translate(0, 0)';
        setTimeout(() => {
          el.style.transition = '';
        }, 500);
      });
    });
  }

  // --- Parallax on Scroll ---
  function initParallax() {
    const projects = $$('.project__image-inner');

    function updateParallax() {
      projects.forEach((img) => {
        const rect = img.getBoundingClientRect();
        const windowH = window.innerHeight;

        if (rect.top < windowH && rect.bottom > 0) {
          const progress = (rect.top + rect.height / 2 - windowH / 2) / windowH;
          const y = progress * -30;
          img.style.transform = `scale(1.05) translateY(${y}px)`;
        }
      });
      requestAnimationFrame(updateParallax);
    }

    updateParallax();
  }

  // --- Smooth Anchor Scrolling ---
  function initSmoothScroll() {
    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // --- Project Hover Tilt ---
  function initProjectTilt() {
    if (window.matchMedia('(max-width: 768px)').matches) return;

    $$('.project').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        if (detailState.open) return;
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        const rotateX = y * -4;
        const rotateY = x * 4;

        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        card.style.transition = 'transform 0.1s ease';
      });

      card.addEventListener('mouseleave', () => {
        if (detailState.open) return;
        card.style.transform = 'perspective(800px) rotateX(0) rotateY(0)';
        card.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      });
    });
  }

  // --- Project Detail View ---
  function openDetail(project) {
    if (detailState.open) return;

    const image = project.querySelector('.project__image');
    const rect = image.getBoundingClientRect();
    const work = project.closest('.work');
    const grid = project.closest('.work__grid');

    // Lock grid height to prevent reflow
    grid.style.minHeight = grid.offsetHeight + 'px';

    // Reset any tilt transform on the card
    project.style.transform = '';
    project.style.transition = '';

    // Save state
    detailState.open = true;
    detailState.project = project;
    detailState.savedRect = rect;

    // Add classes
    project.classList.add('is-detail');
    work.classList.add('has-detail');
    document.body.style.overflow = 'hidden';

    // FLIP: position image at its original grid location, then animate to fullscreen
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scaleX = rect.width / vw;
    const scaleY = rect.height / vh;
    const translateX = rect.left + rect.width / 2 - vw / 2;
    const translateY = rect.top + rect.height / 2 - vh / 2;

    image.style.transition = 'none';
    image.style.transform = 'translate(' + translateX + 'px, ' + translateY + 'px) scale(' + scaleX + ', ' + scaleY + ')';
    image.style.borderRadius = '8px';

    // Force reflow then animate
    image.offsetHeight;
    image.style.transition = 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 700ms cubic-bezier(0.16, 1, 0.3, 1)';
    image.style.transform = 'translate(0, 0) scale(1)';
    image.style.borderRadius = '0';
  }

  function closeDetail() {
    if (!detailState.open || !detailState.project) return;

    var project = detailState.project;
    var image = project.querySelector('.project__image');
    var work = project.closest('.work');
    var grid = project.closest('.work__grid');
    var rect = detailState.savedRect;

    // Start closing: fade out detail content
    project.classList.add('is-detail-closing');

    // Animate image back to original grid position
    if (rect) {
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var scaleX = rect.width / vw;
      var scaleY = rect.height / vh;
      var translateX = rect.left + rect.width / 2 - vw / 2;
      var translateY = rect.top + rect.height / 2 - vh / 2;

      image.style.transition = 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 600ms cubic-bezier(0.16, 1, 0.3, 1)';
      image.style.transform = 'translate(' + translateX + 'px, ' + translateY + 'px) scale(' + scaleX + ', ' + scaleY + ')';
      image.style.borderRadius = '8px';
    }

    setTimeout(function () {
      project.classList.remove('is-detail', 'is-detail-closing');
      work.classList.remove('has-detail');
      image.style.transition = '';
      image.style.transform = '';
      image.style.borderRadius = '';
      grid.style.minHeight = '';
      document.body.style.overflow = '';
      detailState.open = false;
      detailState.project = null;
      detailState.savedRect = null;
    }, 650);
  }

  function initDetailView() {
    // Wire clicks on project cards — image area or button opens detail
    $$('.project').forEach(function (project) {
      project.addEventListener('click', function (e) {
        // Don't open if clicking inside detail panel (back button, links, etc.)
        if (e.target.closest('.project__detail')) return;
        if (detailState.open) return;
        e.preventDefault();
        openDetail(project);
      });
    });

    // Wire back buttons
    $$('.project__detail-back').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeDetail();
      });
    });

    // Escape key closes detail
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && detailState.open) {
        e.preventDefault();
        e.stopPropagation();
        closeDetail();
      }
    });

    // Block touch swipe when detail is open
    document.addEventListener('touchmove', function (e) {
      if (detailState.open) {
        // Allow scrolling inside detail panel
        var detail = e.target.closest('.project__detail');
        if (!detail) e.preventDefault();
      }
    }, { passive: false });
  }

  // --- Init ---
  function init() {
    initTextSplitting();
    initPreloader();
    initCursor();
    initScrollAnimations();
    initMagnetic();
    initParallax();
    initSmoothScroll();
    initProjectTilt();
    initDetailView();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
