/*!
 * Bright Bots Academy — UI interactions
 * Header state, mobile nav, scroll reveals, counters, parallax, tilt.
 * All motion respects prefers-reduced-motion.
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- Footer year ---------- */
  var yearEl = $('#year');
  if (yearEl) { yearEl.textContent = String(new Date().getFullYear()); }

  /* ---------- Sticky header + floating CTA ---------- */
  var header = $('#site-header');
  var fab = $('.wa-fab');

  function onScrollState() {
    var y = window.scrollY || window.pageYOffset;
    if (header) { header.classList.toggle('is-scrolled', y > 14); }
    if (fab) { fab.classList.toggle('is-visible', y > 420); }
  }

  /* ---------- Mobile navigation ---------- */
  var burger = $('#burger');
  var mobileNav = $('#mobile-nav');
  var navOpen = false;

  function setNav(open) {
    if (!burger || !mobileNav) { return; }
    navOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mobileNav.hidden = !open;
    document.body.classList.toggle('nav-open', open);
  }

  if (burger && mobileNav) {
    burger.addEventListener('click', function () { setNav(!navOpen); });

    mobileNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { setNav(false); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navOpen) {
        setNav(false);
        burger.focus();
      }
    });

    var desktop = window.matchMedia('(min-width: 1081px)');
    var onDesktop = function (e) { if (e.matches && navOpen) { setNav(false); } };
    if (desktop.addEventListener) { desktop.addEventListener('change', onDesktop); }
    else if (desktop.addListener) { desktop.addListener(onDesktop); }
  }

  /* ---------- Scroll reveals ---------- */
  var revealEls = $$('.reveal');

  function showAll() {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  if (reduceMotion || !('IntersectionObserver' in window)) {
    showAll();
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- Animated counters ---------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    if (reduceMotion) { el.textContent = String(target); return; }

    var duration = 1500;
    var started = null;
    el.textContent = '0';

    function frame(ts) {
      if (started === null) { started = ts; }
      var p = Math.min(1, (ts - started) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) { window.requestAnimationFrame(frame); }
    }
    window.requestAnimationFrame(frame);
  }

  var statsGrid = $('.stats__grid');
  if (statsGrid) {
    var counters = $$('[data-count]', statsGrid);
    if ('IntersectionObserver' in window && !reduceMotion) {
      var countObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) { return; }
          counters.forEach(animateCount);
          countObserver.disconnect();
        });
      }, { threshold: 0.4 });
      countObserver.observe(statsGrid);
    }
  }

  /* ---------- Parallax ---------- */
  var parallaxEls = $$('[data-parallax]');
  var ticking = false;

  function updateParallax() {
    var vh = window.innerHeight;
    var y = window.scrollY || window.pageYOffset;

    parallaxEls.forEach(function (el) {
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0;
      var value;

      if (el.closest('.bg-decor')) {
        // Fixed decorative layer: drift with the page.
        value = Math.max(-260, Math.min(260, -y * speed));
      } else {
        // Content elements: lag behind the scroll.
        var rect = el.getBoundingClientRect();
        var offset = rect.top + rect.height / 2 - vh / 2;
        value = -offset * speed;
      }
      el.style.setProperty('--par', value.toFixed(1) + 'px');
    });
  }

  function requestParallax() {
    if (ticking || reduceMotion) { return; }
    ticking = true;
    window.requestAnimationFrame(function () {
      updateParallax();
      ticking = false;
    });
  }

  /* ---------- Pointer tilt on the hero visual ---------- */
  var tiltEl = $('[data-tilt]');
  var tiltZone = tiltEl ? tiltEl.closest('.hero__visual') : null;
  var depthEls = tiltZone ? $$('[data-depth]', tiltZone) : [];

  if (tiltEl && tiltZone && !reduceMotion && !coarsePointer) {
    var resetTilt = function () {
      tiltEl.style.setProperty('--rx', '0deg');
      tiltEl.style.setProperty('--ry', '0deg');
      depthEls.forEach(function (el) {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      });
    };

    tiltZone.addEventListener('pointermove', function (e) {
      var rect = tiltEl.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width - 0.5;
      var py = (e.clientY - rect.top) / rect.height - 0.5;

      tiltEl.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg');
      tiltEl.style.setProperty('--rx', (-py * 9).toFixed(2) + 'deg');

      depthEls.forEach(function (el) {
        var depth = parseFloat(el.getAttribute('data-depth')) || 0;
        el.style.setProperty('--mx', (px * depth).toFixed(1) + 'px');
        el.style.setProperty('--my', (py * depth).toFixed(1) + 'px');
      });
    }, { passive: true });

    tiltZone.addEventListener('pointerleave', resetTilt);
  }

  /* ---------- Unified scroll loop ---------- */
  function onScroll() {
    onScrollState();
    requestParallax();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    requestParallax();
  }, { passive: true });

  onScrollState();
  updateParallax();

  /* ---------- Theme toggle (light / dark) ---------- */
  var rootEl = document.documentElement;
  var themeToggles = $$('[data-theme-toggle]');
  var themeColorMeta = document.querySelector('meta[name="theme-color"]');
  var THEME_COLOR = { light: '#eefad9', dark: '#0c1712' };

  function currentTheme() {
    return rootEl.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function storedTheme() {
    try {
      var v = localStorage.getItem('theme');
      return (v === 'dark' || v === 'light') ? v : null;
    } catch (e) { return null; }
  }

  function syncThemeControls(theme) {
    var isDark = theme === 'dark';
    var action = isDark ? 'Switch to light theme' : 'Switch to dark theme';
    themeToggles.forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(isDark));
      btn.setAttribute('aria-label', action);
      btn.setAttribute('title', action);
      var label = btn.querySelector('.theme-toggle__label');
      if (label) { label.textContent = isDark ? 'Light theme' : 'Dark theme'; }
    });
    if (themeColorMeta) { themeColorMeta.setAttribute('content', THEME_COLOR[theme]); }
  }

  function applyTheme(theme, persist) {
    rootEl.setAttribute('data-theme', theme);
    rootEl.style.colorScheme = theme;
    if (persist) {
      try { localStorage.setItem('theme', theme); } catch (e) { /* storage blocked */ }
    }
    syncThemeControls(theme);
  }

  if (themeToggles.length) {
    syncThemeControls(currentTheme());

    themeToggles.forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
      });
    });

    // Keep following the OS preference until the visitor makes an explicit choice.
    var darkMedia = window.matchMedia('(prefers-color-scheme: dark)');
    var onSystemTheme = function (e) {
      if (!storedTheme()) { applyTheme(e.matches ? 'dark' : 'light', false); }
    };
    if (darkMedia.addEventListener) { darkMedia.addEventListener('change', onSystemTheme); }
    else if (darkMedia.addListener) { darkMedia.addListener(onSystemTheme); }
  }

  /* ---------- Placeholder helper (?dev=1) ---------- */
  if (/[?&]dev=1\b/.test(window.location.search)) {
    document.body.classList.add('dev-mode');
    var placeholders = $$('[data-placeholder]');
    if (window.console && console.info) {
      console.info('[dev] Placeholders on this page: ' + placeholders.length +
        ' — see README.md for the replacement checklist.');
    }
  }
})();
