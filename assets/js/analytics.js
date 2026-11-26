/*!
 * Analytics for Bright Bots Academy
 * ------------------------------------------------------------------
 * Tracks every WhatsApp CTA click (plus phone and directions clicks)
 * and reports it as a GA4 event / GTM dataLayer event.
 *
 * Works in two modes:
 *   1) GA4 direct  -> set ga4MeasurementId below (e.g. "G-ABC123XYZ")
 *   2) GTM         -> set gtmContainerId below and create an "GA4 Event"
 *                     tag for the "whatsapp_click" trigger inside GTM.
 * Both can be left empty in development: events still land in
 * window.dataLayer and can be inspected with ?ga_debug=1
 *
 * Canonical conversion event: `whatsapp_click`
 */
(function () {
  'use strict';

  var CONFIG = Object.assign(
    {
      ga4MeasurementId: 'G-XXXXXXXXXX', // <-- replace with your GA4 ID
      gtmContainerId: '',               // <-- optional: GTM-XXXXXXX
      debug: false
    },
    window.SITE_ANALYTICS_CONFIG || {}
  );

  var isPlaceholder = function (id) { return !id || /X{4,}/i.test(id); };
  var debug = !!CONFIG.debug || /[?&]ga_debug=1\b/.test(window.location.search);

  var ga4On = !isPlaceholder(CONFIG.ga4MeasurementId);
  var gtmOn = !isPlaceholder(CONFIG.gtmContainerId);

  /* ---- dataLayer bootstrap ---------------------------------------- */
  window.dataLayer = window.dataLayer || [];
  var dataLayer = window.dataLayer;

  // gtag command queue (used only when GA4 is enabled)
  window.gtag = window.gtag || function () { dataLayer.push(arguments); };

  function injectScript(src, attrs) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    Object.keys(attrs || {}).forEach(function (k) { s.setAttribute(k, attrs[k]); });
    document.head.appendChild(s);
    return s;
  }

  /* ---- load configured tags --------------------------------------- */
  if (gtmOn) {
    dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    injectScript('https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(CONFIG.gtmContainerId));
  }

  if (ga4On) {
    injectScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CONFIG.ga4MeasurementId));
    window.gtag('js', new Date());
    window.gtag('config', CONFIG.ga4MeasurementId, { send_page_view: true });
  }

  /* ---- core tracking ---------------------------------------------- */
  var lastKey = '';
  var lastTs = 0;

  function pageContext() {
    return {
      page_location: window.location.href,
      page_path: window.location.pathname + window.location.search,
      page_title: document.title
    };
  }

  /**
   * Send an event to GTM (always) and GA4 (when configured).
   * @param {string} name  event name, e.g. "whatsapp_click"
   * @param {object} params
   */
  function track(name, params) {
    params = params || {};

    // Ignore accidental double clicks on the same CTA
    var key = name + '|' + (params.link_location || '') + '|' +
      (params.link_url || '') + '|' + (params.percent_scrolled || '');
    var now = Date.now();
    if (key === lastKey && now - lastTs < 600) { return; }
    lastKey = key;
    lastTs = now;

    var payload = Object.assign({ event: name }, params);

    // GTM picks this up (create a Custom Event trigger for it)
    dataLayer.push(payload);

    // GA4 direct (gtag.js)
    if (ga4On) { window.gtag('event', name, params); }

    if (debug) {
      console.info('%c[analytics] ' + name, 'color:#128c7e;font-weight:700', params);
    }
  }

  function linkLabel(el) {
    return (el.getAttribute('aria-label') || el.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
  }

  function trackWhatsApp(el) {
    track('whatsapp_click', Object.assign({
      link_location: el.getAttribute('data-wa') || 'unknown',
      link_text: linkLabel(el),
      link_url: el.href,
      contact_method: 'whatsapp'
    }, pageContext()));
  }

  /* ---- click delegation ------------------------------------------- */
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!target || typeof target.closest !== 'function') { return; }

    var wa = target.closest('[data-wa]');
    if (wa) { trackWhatsApp(wa); return; }

    var tel = target.closest('a[href^="tel:"]');
    if (tel) {
      track('phone_click', Object.assign({
        link_location: tel.getAttribute('data-location') || 'unknown',
        link_url: tel.href,
        contact_method: 'phone'
      }, pageContext()));
      return;
    }

    var dir = target.closest('[data-track="directions"]');
    if (dir) {
      track('directions_click', Object.assign({
        link_location: dir.getAttribute('data-location') || 'location',
        link_url: dir.href
      }, pageContext()));
    }
  }, { passive: true });

  /* ---- scroll depth ------------------------------------------------ */
  var depths = [25, 50, 75, 100];
  var fired = {};
  var scrollQueued = false;

  function measureDepth() {
    scrollQueued = false;
    var doc = document.documentElement;
    var scrollable = doc.scrollHeight - window.innerHeight;
    if (scrollable <= 0) { return; }
    var percent = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
    depths.forEach(function (d) {
      if (percent >= d && !fired[d]) {
        fired[d] = true;
        track('scroll_depth', Object.assign({ percent_scrolled: d }, pageContext()));
      }
    });
  }

  window.addEventListener('scroll', function () {
    if (scrollQueued) { return; }
    scrollQueued = true;
    window.requestAnimationFrame(measureDepth);
  }, { passive: true });

  /* ---- public API -------------------------------------------------- */
  window.SiteAnalytics = {
    track: function (name, params) { track(name, params); },
    trackWhatsAppClick: trackWhatsApp,
    isEnabled: function () { return ga4On || gtmOn; },
    config: CONFIG,
    version: '1.0.0'
  };

  if (debug) {
    console.info(
      '%c[analytics] ready',
      'color:#128c7e;font-weight:700',
      ga4On ? 'GA4: ' + CONFIG.ga4MeasurementId : 'GA4: not configured (dataLayer only)',
      gtmOn ? 'GTM: ' + CONFIG.gtmContainerId : 'GTM: not configured'
    );
  }
})();
