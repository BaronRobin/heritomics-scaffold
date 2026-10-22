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

  // Mobile menu
  var menu = document.getElementById('menu');
  var openBtn = document.getElementById('menu-open');
  var closeBtn = document.getElementById('menu-close');
  function setMenu(open) {
    if (!menu) return;
    menu.hidden = !open;
    openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { closeBtn.focus(); } else { openBtn.focus(); }
  }
  if (menu) {
    openBtn.addEventListener('click', function () { setMenu(true); });
    closeBtn.addEventListener('click', function () { setMenu(false); });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { menu.hidden = true; }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });
  }

  // Filter chips (visual only)
  document.querySelectorAll('.chips[role="group"] .chip').forEach(function (chip, _, all) {
    chip.addEventListener('click', function () {
      all.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      chip.setAttribute('aria-pressed', 'true');
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
      poster.hidden = false; startBox.hidden = false;
      running.hidden = true; stopBtn.hidden = true;
      startBtn.focus();
    });
  }
})();
