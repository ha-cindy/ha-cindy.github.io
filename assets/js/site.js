/* cindy_os: small, dependency-free interactions for ha-cindy.github.io */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  /* ---------- Google Analytics journey events ---------- */
  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-track]');
    if (!el) return;
    var params = {};
    Array.prototype.forEach.call(el.attributes, function (a) {
      if (a.name.indexOf('data-track-') === 0) params[a.name.slice(11).replace(/-/g, '_')] = a.value;
    });
    track(el.getAttribute('data-track'), params);
  });
  var caseEl = document.querySelector('[data-case-study]');
  if (caseEl) track('case_study_view', { title: caseEl.getAttribute('data-case-study') });

  /* ---------- theme toggle ---------- */
  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function toggleTheme() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store('theme', next);
    track('theme_toggle', { theme: next });
    return next;
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) { b.addEventListener('click', toggleTheme); });

  /* ---------- window minimize ---------- */
  document.querySelectorAll('[data-min]').forEach(function (b) {
    b.addEventListener('click', function () {
      var win = b.closest('.win');
      if (!win) return;
      var min = win.classList.toggle('is-min');
      b.setAttribute('aria-expanded', String(!min));
      b.setAttribute('aria-label', min ? 'Restore window' : 'Minimize window');
    });
  });

  /* ---------- live clock (Eastern time) ---------- */
  var clock = document.querySelector('[data-clock]');
  if (clock) {
    var fmt;
    try { fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }); } catch (e) { fmt = null; }
    var tick = function () { clock.textContent = fmt ? fmt.format(new Date()).toLowerCase() + ' et' : 'et'; };
    tick();
    setInterval(tick, 20000);
  }

  /* ---------- zuzu: a little cat that follows the cursor (desktop) or roams (touch) ---------- */
  var zuzuBtn = document.querySelector('[data-zuzu-toggle]');
  var zuzuOn = store('zuzu') !== 'off' && !reduceMotion;
  var CAT_WALK = '<svg class="zuzu__walk" viewBox="0 0 48 36" aria-hidden="true">' +
    '<path class="zuzu__tail" d="M10 19 C4 17 2 11 5 5" fill="none" stroke-width="3.2" stroke-linecap="round"/>' +
    '<g class="zuzu__legs zuzu__legs--a"><rect x="13" y="22" width="3.4" height="11" rx="1.7"/><rect x="31" y="22" width="3.4" height="11" rx="1.7"/></g>' +
    '<g class="zuzu__legs zuzu__legs--b"><rect x="17" y="22" width="3.4" height="11" rx="1.7"/><rect x="35" y="22" width="3.4" height="11" rx="1.7"/></g>' +
    '<ellipse cx="24" cy="20" rx="15" ry="8"/>' +
    '<circle cx="38.5" cy="12.5" r="7"/>' +
    '<path d="M33 9 L34 1.5 L38.5 6.5 Z"/><path d="M39.5 6.2 L43.8 1.6 L44.6 9.4 Z"/>' +
    '<path class="zuzu__collar" d="M33.4 17.6 Q37 20.6 41.6 18.4" fill="none" stroke-width="2.2" stroke-linecap="round"/>' +
    '<circle class="zuzu__eye" cx="41.2" cy="11.6" r="1.1"/>' +
    '</svg>';
  var CAT_SIT = '<svg class="zuzu__sit" viewBox="0 0 48 36" aria-hidden="true">' +
    '<path class="zuzu__tail" d="M33 33 C42 33 44 27 40 24" fill="none" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M14 34 C12 24 16 16 24 16 C32 16 36 24 34 34 Z"/>' +
    '<circle cx="24" cy="11" r="7"/>' +
    '<path d="M18 8 L18.6 0.8 L23 5.4 Z"/><path d="M25 5.4 L29.4 0.8 L30 8 Z"/>' +
    '<path class="zuzu__collar" d="M19.6 16.4 Q24 19 28.4 16.4" fill="none" stroke-width="2.2" stroke-linecap="round"/>' +
    '<circle class="zuzu__eye" cx="21.3" cy="10.4" r="1.05"/><circle class="zuzu__eye" cx="26.7" cy="10.4" r="1.05"/>' +
    '<rect x="18.5" y="30" width="4" height="4" rx="2"/><rect x="25.5" y="30" width="4" height="4" rx="2"/>' +
    '</svg><span class="zuzu__z" aria-hidden="true">z</span>';
  var cat = null, raf = 0, cx = -80, cy = 0, tx = -80, ty = 0, lastMove = 0, roamTimer = 0, mode = finePointer ? 'follow' : 'roam';

  function setState(st) { if (cat && cat.dataset.state !== st) cat.dataset.state = st; }
  function place() { cat.style.transform = 'translate(' + Math.round(cx - 24) + 'px,' + Math.round(cy - 30) + 'px)'; }
  function face(dx) { if (Math.abs(dx) > 0.5) cat.classList.toggle('is-left', dx < 0); }

  function followLoop() {
    var dx = tx - cx, dy = ty - cy, d = Math.hypot(dx, dy);
    if (d > 46) {
      var sp = Math.min(4.2, 1.6 + d / 90);
      cx += dx / d * sp; cy += dy / d * sp; face(dx); setState('walk');
    } else {
      setState(performance.now() - lastMove > 7000 ? 'sleep' : 'sit');
    }
    place();
    raf = requestAnimationFrame(followLoop);
  }
  function onMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    tx = e.clientX + 30; ty = e.clientY + 34; lastMove = performance.now();
    if (cx < -40) { cx = tx - 120; cy = ty; }
  }
  function roamOnce() {
    if (!zuzuOn) return;
    var w = window.innerWidth, h = window.innerHeight;
    var fromLeft = Math.random() < 0.5, stopAt = w * (0.3 + Math.random() * 0.4);
    cx = fromLeft ? -40 : w + 40; cy = h - 14 - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('padding-bottom')) || 0);
    var dir = fromLeft ? 1 : -1, paused = false, t0 = 0;
    cat.classList.toggle('is-left', !fromLeft);
    function step(ts) {
      if (!zuzuOn) return;
      if (!paused && ((dir > 0 && cx >= stopAt) || (dir < 0 && cx <= stopAt))) { paused = true; t0 = ts; setState('sit'); }
      if (paused && ts - t0 > 2600) { paused = false; stopAt = dir > 0 ? w + 60 : -60; }
      if (!paused) { cx += dir * 1.6; setState('walk'); }
      place();
      if ((dir > 0 && cx > w + 50) || (dir < 0 && cx < -50)) { roamTimer = setTimeout(roamOnce, 22000 + Math.random() * 16000); return; }
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
  }
  function startZuzu() {
    if (!cat) {
      cat = document.createElement('div');
      cat.className = 'zuzu';
      cat.setAttribute('aria-hidden', 'true');
      cat.innerHTML = CAT_WALK + CAT_SIT;
      document.body.appendChild(cat);
    }
    cat.hidden = false;
    if (mode === 'follow') {
      document.addEventListener('pointermove', onMove, { passive: true });
      lastMove = performance.now();
      raf = requestAnimationFrame(followLoop);
    } else {
      roamTimer = setTimeout(roamOnce, 3500);
    }
  }
  function stopZuzu() {
    cancelAnimationFrame(raf); clearTimeout(roamTimer);
    document.removeEventListener('pointermove', onMove);
    if (cat) { cat.hidden = true; cx = -80; }
  }
  function setZuzu(on) {
    zuzuOn = on;
    store('zuzu', on ? 'on' : 'off');
    if (zuzuBtn) { zuzuBtn.textContent = 'zuzu the cat: ' + (on ? 'on' : 'off'); zuzuBtn.setAttribute('aria-pressed', String(on)); }
    if (on) startZuzu(); else stopZuzu();
  }
  if (zuzuBtn) {
    if (reduceMotion) zuzuBtn.hidden = true;
    else zuzuBtn.addEventListener('click', function () { setZuzu(!zuzuOn); track('zuzu_toggle', { on: !zuzuOn ? 'off' : 'on' }); });
  }
  if (!reduceMotion) setZuzu(zuzuOn);

  /* ---------- card spotlight ---------- */
  if (finePointer && !reduceMotion) {
    document.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('.card');
      if (!c) return;
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* ---------- touch screens: light up the window in view ---------- */
  if (!finePointer && 'IntersectionObserver' in window) {
    var lit = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-lit', en.intersectionRatio > 0.55); });
    }, { threshold: [0, 0.55, 1] });
    document.querySelectorAll('main .win').forEach(function (w) { lit.observe(w); });
  }

  /* ---------- entrance motion (below-the-fold only, never hides the first screen) ---------- */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var targets = Array.prototype.slice.call(document.querySelectorAll('main > .win, main > section, .grid > .card, .slides > .slide-btn, .gallery > .gallery__item, .pager'));
    var vh = window.innerHeight;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (el, i) {
      if (el.getBoundingClientRect().top < vh * 0.92) return;
      el.classList.add('reveal');
      el.style.transitionDelay = ((i % 3) * 60) + 'ms';
      io.observe(el);
    });
  }

  /* ---------- chip filters (portfolio, cv) ---------- */
  function setupFilter(groupSel, attr, itemSel, itemAttr, eventName, onChange) {
    var group = document.querySelector(groupSel);
    if (!group) return;
    var buttons = group.querySelectorAll('button');
    var items = document.querySelectorAll(itemSel);
    group.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var val = b.getAttribute(attr) || '';
      buttons.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      var shown = 0;
      items.forEach(function (it) {
        var have = (it.getAttribute(itemAttr) || '').split(' ');
        var show = !val || have.indexOf(val) !== -1;
        it.classList.toggle('is-hidden', !show);
        if (show) shown++;
      });
      if (onChange) onChange(shown);
      if (val) track(eventName, { value: val });
    });
  }
  var moreBtn = document.querySelector('[data-more-chips]');
  if (moreBtn) {
    var moreLabel = moreBtn.textContent;
    moreBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var g = moreBtn.closest('[data-filter]');
      var open = g.classList.toggle('is-open');
      moreBtn.setAttribute('aria-expanded', String(open));
      moreBtn.textContent = open ? '− fewer' : moreLabel;
    });
  }
  var countLabel = document.querySelector('[data-count-label]');
  setupFilter('[data-filter]', 'data-filter-tag', '[data-filter-grid] .card', 'data-tags', 'portfolio_filter', function (n) {
    if (countLabel) countLabel.textContent = n + (n === 1 ? ' item' : ' items');
  });

  /* ---------- lightbox (case study slides) ---------- */
  var lb = document.getElementById('lightbox');
  if (lb && typeof lb.showModal === 'function') {
    var lbImg = lb.querySelector('[data-lb-img]');
    var lbCap = lb.querySelector('[data-lb-cap]');
    var lbTitle = lb.querySelector('[data-lb-title]');
    var triggers = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox-src]'));
    var idx = 0;
    var visible = function () { return triggers.filter(function (t) { return !t.classList.contains('is-hidden'); }); };
    var show = function (i) {
      var list = visible();
      if (!list.length) return;
      idx = (i + list.length) % list.length;
      var t = list[idx];
      lbImg.src = t.getAttribute('data-lightbox-src');
      lbImg.alt = t.getAttribute('data-lightbox-cap') || '';
      lbCap.textContent = (t.getAttribute('data-lightbox-cap') || '').toLowerCase();
      lbTitle.textContent = 'viewer · ' + (idx + 1) + ' / ' + list.length;
      lb.querySelector('[data-lb-prev]').hidden = lb.querySelector('[data-lb-next]').hidden = list.length < 2;
    };
    triggers.forEach(function (t) {
      t.addEventListener('click', function () {
        show(visible().indexOf(t));
        lb.showModal();
      });
    });
    lb.querySelector('[data-lb-prev]').addEventListener('click', function () { show(idx - 1); });
    lb.querySelector('[data-lb-next]').addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    var openFirst = document.querySelector('[data-open-first]');
    var first = document.querySelector('[data-first-slide]');
    if (openFirst && first) openFirst.addEventListener('click', function () { first.click(); });
  }

  /* ---------- terminal ---------- */
  var term = document.getElementById('term');
  if (term && typeof term.showModal === 'function') {
    var log = document.getElementById('term-log');
    var form = document.getElementById('term-form');
    var input = document.getElementById('term-input');
    var data = {};
    try { data = JSON.parse(document.getElementById('term-data').textContent); } catch (e) {}
    var base = (document.querySelector('link[rel="canonical"]') || {}).href ? new URL('/', location.href).pathname : '/';
    var history = [];
    var hIdx = 0;

    var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var print = function (html, cls) {
      var p = document.createElement('p');
      if (cls) p.className = cls;
      p.innerHTML = html;
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
    };
    var go = function (path, label) {
      print('opening ' + esc(label) + '…');
      setTimeout(function () { location.href = base.replace(/\/$/, '') + path; }, 280);
    };
    var socials = (data.socials || []).map(function (s) {
      return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name.toLowerCase()) + '</a>';
    }).join('  ');

    var commands = {
      help: function () {
        print('<b>about</b>      who i am\n<b>portfolio</b>  all case studies\n<b>duolingo</b>   the duolingo collection\n<b>cv</b>         interactive cv\n<b>resume</b>     open the pdf\n<b>contact</b>    email + links\n<b>theme</b>      light / dark\n<b>zuzu</b>       the cat, on / off\n<b>clear</b>      clear the screen\n<b>exit</b>       close terminal');
      },
      whoami: function () { print(esc(data.tagline || 'cindy ha')); print('seeking: ' + esc(data.seeking || '')); },
      about: function () { go('/about/', 'about'); },
      portfolio: function () { go('/portfolio/', 'portfolio'); },
      projects: function () { go('/portfolio/', 'portfolio'); },
      aim: function () { go('/portfolio/duolingo-aim/', 'duolingo'); },
      duolingo: function () { go('/portfolio/duolingo-aim/', 'duolingo'); },
      cv: function () { go('/cv/', 'cv'); },
      resume: function () { track('cv_download', { location: 'terminal' }); go('/cv.pdf', 'cv.pdf'); },
      home: function () { go('/', 'home'); },
      contact: function () {
        print('email: <a href="mailto:' + esc(data.email) + '" data-track="contact_click" data-track-method="terminal">' + esc(data.email) + '</a>');
        if (socials) print(socials);
      },
      theme: function () { print('theme: ' + toggleTheme()); },
      zuzu: function () {
        if (reduceMotion) { print('zuzu is napping (your device has reduced motion on).'); return; }
        setZuzu(!zuzuOn); print(zuzuOn ? 'zuzu: meow. (on)' : 'zuzu went to nap. (off)');
      },
      clear: function () { log.innerHTML = ''; },
      exit: function () { term.close(); },
      ls: function () { print('about/  portfolio/  cv/  cv.pdf'); },
      sudo: function (args) {
        if (/hire/.test(args)) { print('permission granted ✦ opening contact…'); commands.contact(); track('easter_egg', { command: 'sudo hire' }); }
        else print('nice try.');
      }
    };

    var openTerm = function () {
      if (term.open) return;
      term.showModal();
      setTimeout(function () { input.focus(); }, 30);
      track('terminal_open');
    };
    document.querySelectorAll('[data-term-open]').forEach(function (b) { b.addEventListener('click', openTerm); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (document.querySelector('dialog[open]')) return;
      e.preventDefault();
      openTerm();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var raw = input.value.trim();
      input.value = '';
      if (!raw) return;
      history.push(raw); hIdx = history.length;
      print('guest@cindy:~$ ' + esc(raw), 'echo');
      var parts = raw.toLowerCase().replace(/^cd\s+/, '').replace(/[\/.]+$/, '').split(/\s+/);
      var cmd = parts[0];
      if (commands.hasOwnProperty(cmd)) {
        track('terminal_command', { command: cmd });
        commands[cmd](parts.slice(1).join(' '));
      } else {
        print('command not found: ' + esc(cmd) + '. type <b>help</b>.');
      }
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp' && history.length) { hIdx = Math.max(0, hIdx - 1); input.value = history[hIdx]; e.preventDefault(); }
      if (e.key === 'ArrowDown' && history.length) { hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ''; e.preventDefault(); }
      if (e.key === 'Tab') {
        var v = input.value.toLowerCase();
        var match = Object.keys(commands).filter(function (k) { return k.indexOf(v) === 0; });
        if (v && match.length === 1) { input.value = match[0]; e.preventDefault(); }
      }
    });
  }
})();
