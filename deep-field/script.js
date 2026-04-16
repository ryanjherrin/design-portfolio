/* ============================================
   Deep Field — Script
   ============================================ */

(function () {
  'use strict';

  // ---- State ----
  const state = {
    phase: 'landing', // landing | gallery | overlay
    activeIndex: 0,
    transitioning: false,
    detailOpen: false,
    overlayOpen: null,
    orbCardOpen: null,
    caseStudyOpen: null,
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
  const caseStudyModal = $('#caseStudy');

  // ---- Constants ----
  const TRANSITION_MS = 800;
  const PARTICLE_COUNT = window.innerWidth < 768 ? 30 : 60;
  const EASE = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // ---- Project Colors ----
  const projectColors = projects.map((p) => p.dataset.color);

  // ---- Particles ----
  let particles = [];
  let warpDirection = 0; // -1 left, 1 right, 0 none
  let warpStrength = 0;

  function createParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random(), // 0 = far, 1 = near
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
  let currentColor = { r: 106, g: 5, b: 114 }; // initial project color
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

    // Depth fog / vignette tinted by current project color
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.width * 0.1,
      canvas.width / 2, canvas.height / 2, canvas.width * 0.7
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, 0.06)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Lerp current color toward target
    currentColor = lerpColor(currentColor, targetColor, 0.02);

    // Decay warp
    warpStrength *= 0.96;

    // Mouse parallax offsets
    const mx = (state.mouseX / canvas.width - 0.5) * 2;
    const my = (state.mouseY / canvas.height - 0.5) * 2;

    for (const p of particles) {
      // Drift
      p.x += p.baseSpeed * (0.3 + p.z * 0.7);
      p.y += Math.sin(p.x * 0.005) * 0.2;

      // Warp effect during transitions
      p.x += warpDirection * warpStrength * (0.5 + p.z) * 3;

      // Mouse parallax (desktop only)
      const parallaxScale = p.z * 12;
      const drawX = p.x + mx * parallaxScale;
      const drawY = p.y + my * parallaxScale;

      // Wrap
      if (p.x > canvas.width + 10) p.x = -10;
      if (p.x < -10) p.x = canvas.width + 10;

      // Size by depth
      const size = p.size * (0.4 + p.z * 0.8);

      // Color: white with slight warm tint for near particles
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
    if (state.phase === 'landing') return;

    // Close anything open
    closeOrbCard();
    if (state.overlayOpen) closeOverlay();
    if (state.detailOpen) {
      // Force-reset detail without animation for a clean return
      var project = projects[state.activeIndex];
      var preview = project.querySelector('.project__preview');
      project.classList.remove('is-detail', 'is-detail-closing');
      projectsContainer.classList.remove('has-detail');
      preview.style.transition = '';
      preview.style.position = '';
      preview.style.left = '';
      preview.style.top = '';
      preview.style.width = '';
      preview.style.height = '';
      preview.style.right = '';
      preview.style.transform = '';
      preview.style.borderRadius = '';
      preview.style.inset = '';
      state.detailOpen = false;
    }

    // Hide gallery
    projects.forEach((p) => p.classList.remove('is-active', 'is-leaving', 'is-entering'));
    projectsContainer.classList.remove('is-active');
    state.transitioning = false;
    state.activeIndex = 0;

    // Show landing
    landing.classList.remove('is-exiting', 'is-hidden');
    state.phase = 'landing';
  }

  // ---- Show Project ----
  function showProject(index, direction) {
    const current = projects[state.activeIndex];
    const next = projects[index];

    // Update color target
    targetColor = hexToRgb(projectColors[index]);

    // Update CSS custom property for glow
    document.documentElement.style.setProperty('--project-color', projectColors[index]);
    const c = hexToRgb(projectColors[index]);
    document.documentElement.style.setProperty('--project-glow', `rgba(${c.r}, ${c.g}, ${c.b}, 0.15)`);

    // Update counter
    counterCurrent.textContent = String(index + 1).padStart(2, '0');

    if (direction === 'none') {
      // Instant show (first load)
      next.classList.add('is-active');
      state.activeIndex = index;
      return;
    }

    state.transitioning = true;

    // Trigger warp on particles
    warpDirection = direction === 'next' ? 1 : -1;
    warpStrength = 5;

    // Animate out current
    current.classList.remove('is-active');
    current.classList.add('is-leaving');

    // Animate in next
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
    if (state.transitioning || state.phase !== 'gallery' || state.detailOpen) return;
    const next = (state.activeIndex + 1) % projects.length;
    showProject(next, 'next');
  }

  function goPrev() {
    if (state.transitioning || state.phase !== 'gallery' || state.detailOpen) return;
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

  // ---- Detail View ----
  function openDetail() {
    if (state.detailOpen || state.phase !== 'gallery') return;
    state.detailOpen = true;

    var project = projects[state.activeIndex];

    // Add classes — CSS handles the fade transitions
    project.classList.add('is-detail');
    projectsContainer.classList.add('has-detail');
  }

  function closeDetail() {
    if (!state.detailOpen) return;

    var project = projects[state.activeIndex];

    // Fade out detail content
    project.classList.add('is-detail-closing');

    setTimeout(function () {
      project.classList.remove('is-detail', 'is-detail-closing');
      projectsContainer.classList.remove('has-detail');
      state.detailOpen = false;
    }, 500);
  }

  function switchDetail(targetIndex) {
    if (!state.detailOpen || targetIndex === state.activeIndex) return;

    var current = projects[state.activeIndex];
    var next = projects[targetIndex];

    // Instant swap — remove old, show new
    current.classList.remove('is-detail', 'is-detail-closing');

    state.activeIndex = targetIndex;
    projects.forEach(function (p, i) {
      p.classList.toggle('is-active', i === targetIndex);
    });

    // Update color/glow/counter
    var color = projectColors[targetIndex];
    document.documentElement.style.setProperty('--project-color', color);
    var c = hexToRgb(color);
    targetColor = c;
    document.documentElement.style.setProperty('--project-glow', 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.15)');
    counterCurrent.textContent = String(targetIndex + 1).padStart(2, '0');

    // Open new detail — skip the animation delay
    next.classList.add('is-detail');
    var detailEl = next.querySelector('.project__detail');
    if (detailEl) {
      detailEl.scrollTop = 0;
      detailEl.style.animationDelay = '0ms';
      // Reset after animation completes
      setTimeout(function () { detailEl.style.animationDelay = ''; }, 500);
    }
  }

  // ---- Orb Content ----
  const ORB_CONTENT = {
    photo: {
      title: 'That\u2019s Me',
      body: '<img src="https://placehold.co/360x240/0a0a0c/e8e6e1?text=RH" alt="Ryan Herrin"><p>AI-focused Product Designer. Head of Product Design at Belva.</p>',
    },
    story: {
      title: 'My Story',
      body: '<p>I\u2019ve spent the past year and a half as Head of Product Design at Belva, building LawGoat from scratch \u2014 an AI-powered legal platform that helps attorneys communicate with clients, analyze documents, and automate their workflows. I designed the entire system end-to-end, from research to shipped product, including building the design system using Figma MCP. I\u2019m drawn to the intersection of AI and complex software \u2014 where good design makes powerful tools feel simple.</p>',
    },
    tools: {
      title: 'Tools & Tech',
      body: '<div class="orb-pills"><span class="orb-pill">Figma</span><span class="orb-pill">Figma MCP</span><span class="orb-pill">Design Systems</span><span class="orb-pill">Prototyping</span><span class="orb-pill">HTML / CSS / JS</span><span class="orb-pill">AI Product Design</span><span class="orb-pill">User Research</span><span class="orb-pill">Framer</span></div>',
    },
    fact: {
      title: 'Fun Fact',
      body: '<p>I once redesigned an entire restaurant menu the night before their grand opening because the original designer ghosted. Printed at 3 AM at a 24-hour copy shop. The owner still sends me free tacos every year as a thank-you.</p>',
    },
    quote: {
      title: 'Favorite Quote',
      body: '<blockquote>\u201CThe details are not the details. They make the design.\u201D<cite>\u2014 Charles Eames</cite></blockquote>',
    },
    hobby: {
      title: 'After Hours',
      body: '<p>When I\u2019m not pushing pixels, I\u2019m usually outside with a telescope and a camera. Astrophotography is my reset button \u2014 there\u2019s something humbling about spending three hours tracking a nebula only to realize your lens cap was on for the first twenty minutes. I\u2019ve been chasing the Milky Way across Texas hill country for five years now.</p>',
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

  // ---- Case Study Modal ----
  const CASE_STUDIES = {
    'lawgoat-design-system': {
      title: 'Design System',
      accent: '#3b82f6',
      desc: 'Built a complete component library from scratch using Figma MCP — buttons, inputs, tables, modals, toasts, and more — then shipped every component to production with zero drift between design and code.',
      challenge: 'LawGoat was being built from scratch with no existing design language. The engineering team was already writing UI code, so every day without a system meant more inconsistency to clean up later. I needed a way to design and ship components fast enough to stay ahead of development.',
      solution: 'Used Figma MCP to build components directly in Figma through Claude, then translated each one to React using Claude CLI within Cursor. Every component went through the full GitHub PR process — branch, review, merge. This kept design and code perfectly in sync from day one.',
      tools: ['Figma MCP', 'Claude CLI', 'Cursor', 'React', 'GitHub'],
      images: [
        { src: 'https://placehold.co/800x500/0a0a14/3b82f6?text=Design+System', alt: 'Design system overview' },
        { src: 'https://placehold.co/800x500/0a0a14/3b82f6?text=Components', alt: 'Component library' },
      ],
    },
    'lawgoat-ai-chat': {
      title: 'AI Chat UX',
      accent: '#3b82f6',
      desc: 'Designed the conversational AI interface where attorneys query case law, analyze uploaded documents, and receive AI-generated legal insights in real time.',
      challenge: 'Attorneys don\'t trust black-box AI. They need to see sources, understand reasoning, and verify citations before relying on any output. A generic chatbot UI would\'ve been immediately dismissed by our target users.',
      solution: 'Designed a chat experience that surfaces inline citations, expandable source previews, and confidence indicators alongside every AI response. Iterated through user testing with practicing attorneys to nail the trust signals. Built the frontend using Claude CLI in Cursor, shipping through GitHub PRs.',
      tools: ['Figma', 'Claude CLI', 'Cursor', 'React', 'GitHub'],
      images: [
        { src: 'https://placehold.co/800x500/0a0a14/3b82f6?text=AI+Chat', alt: 'AI chat interface' },
      ],
    },
    'lawgoat-case-mgmt': {
      title: 'Case Management',
      accent: '#3b82f6',
      desc: 'Owned the full end-to-end case workflow from client intake to resolution — status tracking, document tagging, task assignment, and deadline management.',
      challenge: 'Legal workflows are non-linear and vary wildly between practice areas. A rigid pipeline would break for half our users. I needed a system flexible enough for different workflows while still providing structure and accountability.',
      solution: 'Designed a kanban-style board with configurable stages per practice area, automated task assignment based on case status changes, and a document tagging system that links files to specific case milestones. Shipped the entire feature end-to-end using Claude CLI within Cursor.',
      tools: ['Figma', 'Claude CLI', 'Cursor', 'React', 'GitHub'],
      images: [
        { src: 'https://placehold.co/800x500/0a0a14/3b82f6?text=Case+Management', alt: 'Case management board' },
        { src: 'https://placehold.co/800x500/0a0a14/3b82f6?text=Client+Intake', alt: 'Client intake flow' },
        { src: 'https://placehold.co/800x500/0a0a14/3b82f6?text=Document+Tags', alt: 'Document tagging system' },
      ],
    },
    'vmware-dashboard': {
      title: 'Multi-Cloud Dashboard',
      accent: '#00b7c3',
      desc: 'Unified AWS, Azure, and GCP monitoring into a single view, reducing context-switching for enterprise teams managing hundreds of instances across providers.',
      challenge: 'Enterprise teams were jumping between 3+ cloud consoles to get a full picture of their infrastructure. Each provider uses different terminology, metrics, and mental models — making it nearly impossible to compare apples to apples.',
      solution: 'Created a normalized data model that maps each provider\'s concepts to a shared vocabulary, then designed a dashboard that surfaces the 5 most critical metrics per provider in a scannable grid. Progressive disclosure lets teams drill into provider-specific details without leaving the unified view.',
      tools: ['Figma', 'Sketch', 'VMware Design System', 'Usability Testing'],
      images: [
        { src: 'https://placehold.co/800x500/0a0a14/00b7c3?text=Cloud+Dashboard', alt: 'Multi-cloud dashboard' },
        { src: 'https://placehold.co/800x500/0a0a14/00b7c3?text=Provider+View', alt: 'Provider detail view' },
      ],
    },
    'vmware-tables': {
      title: 'Data-Dense Tables',
      accent: '#00b7c3',
      desc: 'Redesigned deployment tables with inline actions, real-time status badges, and smart filtering to handle 1000+ rows without cognitive overload.',
      challenge: 'The existing tables showed every possible column by default, with no hierarchy or grouping. Users managing 500+ deployments couldn\'t find what they needed without resorting to browser Ctrl+F. Performance also degraded badly past 200 rows.',
      solution: 'Introduced a smart-default column set with customizable views, inline status badges with color-coded severity, and a faceted filter system that narrows results as you type. Added virtualized rendering so 1000+ rows perform identically to 50.',
      tools: ['Figma', 'VMware Clarity', 'User Research', 'A/B Testing'],
      images: [
        { src: 'https://placehold.co/800x500/0a0a14/00b7c3?text=Data+Tables', alt: 'Data-dense table design' },
        { src: 'https://placehold.co/800x500/0a0a14/00b7c3?text=Smart+Filters', alt: 'Faceted filter system' },
      ],
    },
    'vmware-alerts': {
      title: 'Alert System',
      accent: '#00b7c3',
      desc: 'Designed a priority-based alert pipeline with severity tiers, intelligent auto-grouping, and one-click remediation actions.',
      challenge: 'The old alert system treated everything as equal priority. Teams were drowning in noise — hundreds of low-severity alerts burying the critical ones. Alert fatigue meant real incidents were being missed.',
      solution: 'Designed a 4-tier severity system with auto-grouping that collapses related alerts into a single actionable item. Critical alerts surface with one-click remediation buttons — "scale up", "restart", "rollback" — so teams can act in seconds instead of minutes.',
      tools: ['Figma', 'VMware Clarity', 'Stakeholder Interviews'],
      images: [
        { src: 'https://placehold.co/800x500/0a0a14/00b7c3?text=Alert+Pipeline', alt: 'Alert severity tiers' },
        { src: 'https://placehold.co/800x500/0a0a14/00b7c3?text=Auto+Grouping', alt: 'Alert auto-grouping' },
      ],
    },
    'currents-thermal': {
      title: 'Thermal Mapping',
      accent: '#00d4aa',
      desc: 'Designed interactive heat maps that visualize ocean temperature anomalies with zoom, pan, and time-scrubbing across global ocean regions.',
      challenge: 'Scientific thermal data is inherently complex — thousands of data points across time and geography. Most existing tools render it as static images that scientists can\'t interact with or explore dynamically.',
      solution: 'Built a WebGL-powered map layer that renders temperature gradients in real time with smooth zoom and pan. Added a time-scrubbing slider that animates temperature changes across months, making temporal patterns immediately visible.',
      tools: ['D3.js', 'WebGL', 'Canvas API', 'Figma'],
      images: [
        { src: 'https://placehold.co/800x500/0a0a14/00d4aa?text=Thermal+Map', alt: 'Thermal heat map' },
        { src: 'https://placehold.co/800x500/0a0a14/00d4aa?text=Time+Scrubber', alt: 'Time-scrubbing control' },
      ],
    },
    'currents-storytelling': {
      title: 'Data Storytelling',
      accent: '#00d4aa',
      desc: 'Turned raw scientific datasets into editorial-quality narratives with annotated charts, contextual callouts, and guided scroll-driven sequences.',
      challenge: 'Raw ocean data is meaningless to non-scientists. Charts alone don\'t convey why temperature changes matter or what the implications are. The platform needed to make complex science accessible without dumbing it down.',
      solution: 'Designed guided scroll sequences that pair data visualizations with narrative text — as users scroll, charts animate to highlight key data points while callouts explain significance. Each story follows a "what, so what, now what" structure.',
      tools: ['D3.js', 'ScrollTrigger', 'Figma', 'Editorial Design'],
      images: [
        { src: 'https://placehold.co/800x500/0a0a14/00d4aa?text=Scroll+Story', alt: 'Scroll-driven narrative' },
        { src: 'https://placehold.co/800x500/0a0a14/00d4aa?text=Annotated+Charts', alt: 'Annotated data charts' },
      ],
    },
    'currents-feeds': {
      title: 'Real-Time Feeds',
      accent: '#00d4aa',
      desc: 'Built live data panels streaming current speed, direction, and temperature with smooth number transitions and sparkline history charts.',
      challenge: 'Live data that updates every few seconds creates visual noise — numbers jumping around make it hard to spot meaningful changes versus normal fluctuation.',
      solution: 'Used animated number transitions that smoothly interpolate between values, paired with inline sparklines showing the last 24 hours of history. This gives instant context for whether a current reading is normal, trending up, or anomalous.',
      tools: ['D3.js', 'WebSockets', 'Canvas API', 'Figma'],
      images: [
        { src: 'https://placehold.co/800x500/0a0a14/00d4aa?text=Live+Feeds', alt: 'Real-time data panels' },
        { src: 'https://placehold.co/800x500/0a0a14/00d4aa?text=Sparklines', alt: 'Sparkline history charts' },
      ],
    },
    'ms95-desktop': {
      title: 'Desktop Metaphor',
      accent: '#008080',
      desc: 'Preserved the iconic Windows 95 spatial model — desktop icons, draggable windows, taskbar — rebuilt entirely with modern CSS Grid, flexbox, and JavaScript.',
      challenge: 'Win95\'s window management relied on absolute positioning and pixel-based layouts that don\'t translate to modern responsive design. Recreating the spatial "feel" without the original constraints required rethinking every interaction.',
      solution: 'Used CSS Grid for the desktop icon layout with drag-and-drop via pointer events. Windows use CSS transforms for dragging and resizing with snap-to-edge behavior. The taskbar is a sticky flexbox strip that dynamically reflects open windows.',
      tools: ['CSS Grid', 'Flexbox', 'Vanilla JS', 'Figma'],
      images: [
        { src: 'https://placehold.co/800x500/0a0a14/008080?text=Desktop+UI', alt: 'Desktop metaphor UI' },
        { src: 'https://placehold.co/800x500/0a0a14/008080?text=Window+Mgmt', alt: 'Window management' },
      ],
    },
    'ms95-start-menu': {
      title: 'Start Menu',
      accent: '#008080',
      desc: 'Reimagined the classic Start menu with contemporary typography, smooth animations, and nested navigation while preserving the original information hierarchy.',
      challenge: 'The original Start menu was a rigid cascading flyout — hover to reveal, with zero animation. Recreating that UX pattern with modern expectations for animation and responsiveness while keeping it recognizable was a tightrope walk.',
      solution: 'Built a slide-up panel with staggered entrance animations per menu item. Nested submenus animate in from the side with a subtle blur transition. Used the original menu hierarchy (Programs > Accessories, etc.) but with modern type scales and spacing.',
      tools: ['CSS Animations', 'Figma', 'Typography', 'Vanilla JS'],
      images: [
        { src: 'https://placehold.co/800x500/0a0a14/008080?text=Start+Menu', alt: 'Reimagined Start menu' },
        { src: 'https://placehold.co/800x500/0a0a14/008080?text=Nested+Nav', alt: 'Nested navigation' },
      ],
    },
    'ms95-tokens': {
      title: 'Design Tokens',
      accent: '#008080',
      desc: 'Created a teal-accent token system that maps the original Windows 95 color palette to modern dark-mode equivalents with consistent spacing and type scales.',
      challenge: 'Win95\'s palette was designed for CRT monitors and light-mode only. The iconic grays, teals, and navy blues look muddy on modern displays, especially in dark mode. Needed a system that feels authentically retro without looking dated.',
      solution: 'Extracted the original 16-color palette and created modern HSL equivalents optimized for OLED and LCD. Built a token system with semantic naming (surface, accent, muted) so components reference roles instead of raw colors. Spacing follows an 8px grid scaled from the original 4px Win95 grid.',
      tools: ['Design Tokens', 'CSS Custom Properties', 'Figma Variables'],
      images: [
        { src: 'https://placehold.co/800x500/0a0a14/008080?text=Token+System', alt: 'Design token system' },
        { src: 'https://placehold.co/800x500/0a0a14/008080?text=Color+Palette', alt: 'Color palette mapping' },
      ],
    },
  };

  function openCaseStudy(key) {
    if (!caseStudyModal) return;
    var cs = CASE_STUDIES[key];
    if (!cs) return;

    var iconEl = $('#caseStudyIcon');
    // Find the card that triggered this to copy its icon
    var card = document.querySelector('[data-casestudy="' + key + '"]');
    if (card && iconEl) {
      var visual = card.querySelector('.feature-card__visual');
      iconEl.style.background = visual ? visual.style.background : 'rgba(232,230,225,0.05)';
      iconEl.innerHTML = visual ? visual.innerHTML : '';
    }

    $('#caseStudyTitle').textContent = cs.title;
    $('#caseStudyDesc').textContent = cs.desc;
    $('#caseStudyChallenge').textContent = cs.challenge;
    $('#caseStudySolution').textContent = cs.solution;

    renderCaseStudyImages(key);

    caseStudyModal.classList.add('is-open');
    state.caseStudyOpen = key;
  }

  function closeCaseStudy() {
    if (!caseStudyModal) return;
    caseStudyModal.classList.remove('is-open');
    state.caseStudyOpen = null;
  }

  // ---- Lightbox ----
  var lightboxEl = $('#lightbox');
  var lightboxImageEl = $('#lightboxImage');
  var lightboxPrevBtn = $('#lightboxPrev');
  var lightboxNextBtn = $('#lightboxNext');
  var lightboxCloseBtn = $('#lightboxClose');

  function updateLightboxImage() {
    var img = state.lightboxImages[state.lightboxIndex];
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

  // Render single spotlight thumbnail on feature cards that have images
  function renderFeatureCardThumbnails() {
    $$('.feature-card[data-casestudy]').forEach(function (card) {
      var key = card.dataset.casestudy;
      var cs = CASE_STUDIES[key];
      if (!cs || !cs.images || !cs.images.length) return;

      var thumb = document.createElement('div');
      thumb.className = 'feature-card__thumb';

      var img = document.createElement('img');
      img.src = cs.images[0].src;
      img.alt = cs.images[0].alt || '';
      img.loading = 'lazy';
      thumb.appendChild(img);

      // Insert thumbnail after the visual icon
      var visual = card.querySelector('.feature-card__visual');
      if (visual) {
        visual.insertAdjacentElement('afterend', thumb);
      } else {
        card.prepend(thumb);
      }
    });
  }

  // Place up to 2 images into the case study modal slots
  function renderCaseStudyImages(key) {
    var slot1 = $('#caseStudyImage1');
    var slot2 = $('#caseStudyImage2');
    var cs = CASE_STUDIES[key];
    var images = (cs && cs.images) || [];

    [slot1, slot2].forEach(function (slot, slotIndex) {
      if (!slot) return;
      slot.innerHTML = '';
      var imgData = images[slotIndex];
      if (!imgData) {
        slot.style.display = 'none';
        return;
      }
      slot.style.display = '';

      var wrap = document.createElement('div');
      wrap.className = 'case-study__gallery-item';

      var img = document.createElement('img');
      img.src = imgData.src;
      img.alt = imgData.alt || '';
      img.loading = 'lazy';
      wrap.appendChild(img);

      wrap.addEventListener('click', function (e) {
        e.stopPropagation();
        openLightbox(images, slotIndex);
      });

      slot.appendChild(wrap);
    });
  }

  // Lightbox event listeners
  if (lightboxEl) {
    if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
    if (lightboxPrevBtn) lightboxPrevBtn.addEventListener('click', lightboxGoPrev);
    if (lightboxNextBtn) lightboxNextBtn.addEventListener('click', lightboxGoNext);

    // Close when clicking anywhere outside the image or controls
    lightboxEl.addEventListener('click', function (e) {
      if (e.target.closest('.lightbox__image, .lightbox__arrow, .lightbox__close')) return;
      closeLightbox();
    });
  }

  // ---- Event Listeners ----
  enterBtn.addEventListener('click', enterGallery);

  // Logo and Home nav → go back to landing
  const navLogo = $('#navLogo');
  const navHome = $('#navHome');
  if (navLogo) navLogo.addEventListener('click', (e) => { e.preventDefault(); goHome(); });
  if (navHome) navHome.addEventListener('click', goHome);

  nextArrow.addEventListener('click', goNext);
  prevArrow.addEventListener('click', goPrev);

  // Nav overlay triggers
  $$('[data-overlay]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openOverlay(btn.dataset.overlay);
    });
  });

  // Overlay close buttons
  $$('[data-close]').forEach((btn) => {
    btn.addEventListener('click', closeOverlay);
  });

  // Orb clicks
  $$('.orb').forEach((orb) => {
    orb.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = orb.dataset.orb;
      if (key) openOrbCard(key);
    });
  });

  // Orb card close button
  if (orbCard) {
    const closeBtn = orbCard.querySelector('.orb-card__close');
    if (closeBtn) closeBtn.addEventListener('click', closeOrbCard);

    const backdrop = orbCard.querySelector('.orb-card__backdrop');
    if (backdrop) backdrop.addEventListener('click', closeOrbCard);
  }

  // Detail view: "View Project" buttons
  $$('.project__link').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDetail();
    });
  });

  // Detail view: back buttons
  $$('.project__detail-back').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDetail();
    });
  });

  // Other Projects nav → switch detail
  $$('.detail-other__item[data-goto]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      switchDetail(parseInt(btn.dataset.goto, 10));
    });
  });

  // Feature card clicks → open case study
  $$('.feature-card[data-casestudy]').forEach((card) => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      openCaseStudy(card.dataset.casestudy);
    });
  });

  // Case study close
  if (caseStudyModal) {
    var csClose = caseStudyModal.querySelector('.case-study__close');
    if (csClose) csClose.addEventListener('click', closeCaseStudy);

    var csBackdrop = caseStudyModal.querySelector('.case-study__backdrop');
    if (csBackdrop) csBackdrop.addEventListener('click', closeCaseStudy);
  }

  // Keyboard
  document.addEventListener('keydown', (e) => {
    // Escape: lightbox → case study → orb card → detail → overlay
    if (e.key === 'Escape') {
      if (state.lightboxOpen) {
        closeLightbox();
        return;
      }
      if (state.caseStudyOpen) {
        closeCaseStudy();
        return;
      }
      if (state.orbCardOpen) {
        closeOrbCard();
        return;
      }
      if (state.detailOpen) {
        closeDetail();
        return;
      }
      if (state.overlayOpen) {
        closeOverlay();
        return;
      }
      return;
    }

    // Arrow keys: lightbox navigation takes priority
    if (state.lightboxOpen) {
      if (e.key === 'ArrowRight') { lightboxGoNext(); return; }
      if (e.key === 'ArrowLeft') { lightboxGoPrev(); return; }
      return;
    }

    if (state.overlayOpen || state.detailOpen) return;

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
        if (state.phase === 'landing') enterGallery();
        else if (state.phase === 'gallery') openDetail();
        break;
    }
  });

  // Mouse tracking (desktop parallax + orb parallax)
  document.addEventListener('mousemove', (e) => {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;

    // Orb container parallax
    if (orbContainer && window.innerWidth > 768) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      orbContainer.style.setProperty('--parallax-x', (dx * 12) + 'px');
      orbContainer.style.setProperty('--parallax-y', (dy * 8) + 'px');
    }
  });

  // Touch swipe support
  let touchStartX = 0;
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (state.detailOpen) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }, { passive: true });

  // Resize
  window.addEventListener('resize', resizeCanvas);

  // ---- Custom scroll indicator ----
  (function () {
    var thumb = document.createElement('div');
    thumb.className = 'scroll-thumb';
    document.body.appendChild(thumb);

    var hideTimer = null;

    function update(el) {
      var sh = el.scrollHeight;
      var ch = el.clientHeight;
      if (sh <= ch) { thumb.classList.remove('is-visible'); return; }

      var rect = el.getBoundingClientRect();
      var radius = parseFloat(getComputedStyle(el).borderRadius) || 0;
      var inset = Math.max(radius, 8);
      var trackTop = rect.top + inset;
      var trackBottom = rect.bottom - inset;
      var trackH = trackBottom - trackTop;

      var ratio = ch / sh;
      var thumbH = Math.max(ratio * trackH, 24);
      var scrollFrac = el.scrollTop / (sh - ch);
      var top = trackTop + scrollFrac * (trackH - thumbH);

      thumb.style.top = top + 'px';
      thumb.style.height = thumbH + 'px';
      thumb.style.right = (window.innerWidth - rect.right + 6) + 'px';
      thumb.classList.add('is-visible');

      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        thumb.classList.remove('is-visible');
      }, 800);
    }

    document.addEventListener('scroll', function (e) {
      var el = e.target;
      if (el === document || el === document.documentElement) return;
      if (el.matches('.orb-card__panel, .project__detail, .case-study__panel')) {
        update(el);
      }
    }, true);
  })();

  // ---- Init ----
  renderFeatureCardThumbnails();
  resizeCanvas();
  drawParticles();
})();
