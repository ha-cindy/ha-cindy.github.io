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

  /* ---------- sparkle trail ---------- */
  var sparkleBtn = document.querySelector('[data-sparkle-toggle]');
  var sparklesOn = store('sparkles') !== 'off' && !reduceMotion && finePointer;
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1 L13.6 10.4 L23 12 L13.6 13.6 L12 23 L10.4 13.6 L1 12 L10.4 10.4 Z"></path></svg>';
  var last = 0;
  function setSparkles(on) {
    sparklesOn = on;
    store('sparkles', on ? 'on' : 'off');
    if (sparkleBtn) { sparkleBtn.textContent = '✦ sparkles: ' + (on ? 'on' : 'off'); sparkleBtn.setAttribute('aria-pressed', String(on)); }
  }
  if (sparkleBtn) {
    if (reduceMotion || !finePointer) sparkleBtn.hidden = true;
    else { setSparkles(sparklesOn); sparkleBtn.addEventListener('click', function () { setSparkles(!sparklesOn); }); }
  }
  document.addEventListener('pointermove', function (e) {
    if (!sparklesOn || e.pointerType !== 'mouse') return;
    var now = performance.now();
    if (now - last < 55) return;
    last = now;
    var s = document.createElement('span');
    s.className = 'trail' + (Math.random() < 0.18 ? ' is-red' : '');
    s.innerHTML = STAR;
    s.style.left = e.clientX + 'px';
    s.style.top = e.clientY + 'px';
    s.style.setProperty('--dx', (Math.random() * 24 - 12).toFixed(1) + 'px');
    var size = 7 + Math.random() * 8;
    s.style.width = s.style.height = size + 'px';
    document.body.appendChild(s);
    setTimeout(function () { s.remove(); }, 820);
  }, { passive: true });

  /* ---------- chip filters (portfolio, cv, art) ---------- */
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
  var countLabel = document.querySelector('[data-count-label]');
  setupFilter('[data-filter]', 'data-filter-tag', '[data-filter-grid] .card', 'data-tags', 'portfolio_filter', function (n) {
    if (countLabel) countLabel.textContent = n + (n === 1 ? ' item' : ' items');
  });
  setupFilter('[data-tl-filter]', 'data-kind', '.timeline .tl', 'data-kind', 'cv_filter');
  setupFilter('[data-art-filter]', 'data-medium', '.gallery__item', 'data-medium', 'art_filter');

  /* ---------- lightbox (art + case study slides) ---------- */
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
        print('<b>about</b>      who i am\n<b>portfolio</b>  all case studies\n<b>aim</b>        the duolingo aim collection\n<b>cv</b>         interactive cv\n<b>resume</b>     open the pdf\n<b>research</b>   research news\n<b>art</b>        the gallery\n<b>contact</b>    email + links\n<b>theme</b>      light / dark\n<b>sparkles</b>   cursor trail on / off\n<b>clear</b>      clear the screen\n<b>exit</b>       close terminal');
      },
      whoami: function () { print(esc(data.tagline || 'cindy ha')); print('seeking: ' + esc(data.seeking || '')); },
      about: function () { go('/about/', 'about'); },
      portfolio: function () { go('/portfolio/', 'portfolio'); },
      projects: function () { go('/portfolio/', 'portfolio'); },
      aim: function () { go('/portfolio/duolingo-aim/', 'duolingo aim'); },
      duolingo: function () { go('/portfolio/duolingo-aim/', 'duolingo aim'); },
      cv: function () { go('/cv/', 'cv'); },
      resume: function () { track('cv_download', { location: 'terminal' }); go('/cv.pdf', 'cv.pdf'); },
      research: function () { go('/research/', 'research'); },
      art: function () { go('/art/', 'art'); },
      home: function () { go('/', 'home'); },
      contact: function () {
        print('email: <a href="mailto:' + esc(data.email) + '" data-track="contact_click" data-track-method="terminal">' + esc(data.email) + '</a>');
        if (socials) print(socials);
      },
      theme: function () { print('theme: ' + toggleTheme()); },
      sparkles: function () {
        if (reduceMotion || !finePointer) { print('sparkles need a mouse and motion turned on.'); return; }
        setSparkles(!sparklesOn); print('sparkles: ' + (sparklesOn ? 'on ✦' : 'off'));
      },
      clear: function () { log.innerHTML = ''; },
      exit: function () { term.close(); },
      ls: function () { print('about/  portfolio/  cv/  research/  art/  cv.pdf'); },
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
