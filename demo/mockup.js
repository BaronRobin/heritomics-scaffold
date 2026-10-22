// Mockup interactions. Reference only, not production code.
(function () {
  var root = document.documentElement;

  // Font mode switch (mockup toolbar)
  var fontSel = document.getElementById('font-mode');
  if (fontSel) {
    fontSel.addEventListener('change', function () { root.setAttribute('data-fonts', fontSel.value); });
    // Brand fonts are local-only (license): offer them only when they actually load
    var brandOpt = fontSel.querySelector('option[value="brand"]');
    if (brandOpt && document.fonts) {
      brandOpt.disabled = true;
      document.fonts.load('800 1em Stratos').then(function (f) { brandOpt.disabled = f.length === 0; }, function () {});
    }
  }

  // Key color switch (experience page, mockup toolbar)
  var colorSel = document.getElementById('key-color');
  if (colorSel) {
    colorSel.addEventListener('change', function () {
      document.querySelectorAll('[data-key-surface]').forEach(function (el) {
        el.classList.remove('s-yellow', 's-blue', 's-green');
        el.classList.add(colorSel.value);
      });
    });
  }

  // Mobile menu: a modal dialog that keeps focus inside while open
  var menu = document.getElementById('menu');
  var openBtn = document.getElementById('menu-open');
  var closeBtn = document.getElementById('menu-close');
  function setMenu(open, returnFocus) {
    menu.hidden = !open;
    openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { closeBtn.focus(); } else if (returnFocus) { openBtn.focus(); }
  }
  if (menu) {
    openBtn.addEventListener('click', function () { setMenu(true); });
    closeBtn.addEventListener('click', function () { setMenu(false, true); });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false, false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) setMenu(false, true); });
    menu.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var items = menu.querySelectorAll('a[href], button');
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  // Format filter (home): show matching cards and announce the result
  var status = document.getElementById('filter-status');
  var cards = document.querySelectorAll('.card[data-format]');
  document.querySelectorAll('.chips[role="group"] .chip').forEach(function (chip, _, all) {
    chip.addEventListener('click', function () {
      all.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      chip.setAttribute('aria-pressed', 'true');
      var filter = chip.getAttribute('data-filter'), shown = 0;
      cards.forEach(function (card) {
        var match = filter === 'alle' || card.getAttribute('data-format') === filter;
        card.hidden = !match;
        if (match) shown++;
      });
      if (status) {
        status.textContent = shown === 0 ? 'Noch keine Erlebnisse in diesem Format.'
          : shown + (shown === 1 ? ' Erlebnis' : ' Erlebnisse') + ' angezeigt.';
      }
    });
  });

  // Stage: poster → running → poster
  var poster = document.getElementById('stage-poster');
  var running = document.getElementById('stage-running');
  var startBox = document.getElementById('stage-start');
  var stopBtn = document.getElementById('stage-stop');
  var startBtn = document.getElementById('stage-start-btn');
  if (poster && running) {
    startBtn.addEventListener('click', function () {
      poster.hidden = true; startBox.hidden = true;
      running.hidden = false; stopBtn.hidden = false;
      stopBtn.focus();
    });
    stopBtn.addEventListener('click', function () {
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
      poster.hidden = false; startBox.hidden = false;
      running.hidden = true; stopBtn.hidden = true;
      startBtn.focus();
    });
    // Fullscreen is optional: hide the button where the browser refuses it
    var fsBtn = running.querySelector('.fs');
    if (fsBtn) {
      if (!document.fullscreenEnabled) fsBtn.hidden = true;
      fsBtn.addEventListener('click', function () {
        if (document.fullscreenElement) { document.exitFullscreen().catch(function () {}); return; }
        running.requestFullscreen().catch(function () { fsBtn.hidden = true; });
      });
    }
  }

  // Depth navigation: mark the level currently on screen
  var depthLinks = document.querySelectorAll('.depth a');
  if (depthLinks.length && 'IntersectionObserver' in window) {
    var mark = function (id) {
      depthLinks.forEach(function (a) {
        if (a.getAttribute('href') === '#' + id) { a.setAttribute('aria-current', 'location'); } else { a.removeAttribute('aria-current'); }
      });
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) mark(en.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    depthLinks.forEach(function (a) {
      var section = document.getElementById(a.getAttribute('href').slice(1));
      if (section) io.observe(section);
    });
  }
})();
