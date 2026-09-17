(function () {
  var root = document.querySelector('[data-project-promo]');
  if (!root) return;

  var slides = Array.from(root.querySelectorAll('[data-project-promo-slide]'));
  var toggle = root.querySelector('[data-project-promo-toggle]');
  var position = root.querySelector('[data-project-promo-position]');
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var duration = 5000;
  var active = 0;
  var timer = 0;
  var manualPaused = motion.matches;
  var hovering = false;
  var focused = false;
  var visible = !document.hidden;

  if (slides.length < 2) return;

  function stop() {
    window.clearTimeout(timer);
    timer = 0;
  }

  function canPlay() {
    return !manualPaused && !hovering && !focused && visible;
  }

  function updateToggle() {
    if (!toggle) return;
    var paused = manualPaused;
    toggle.textContent = paused ? '▶' : 'Ⅱ';
    toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
    toggle.setAttribute(
      'aria-label',
      paused ? '프로젝트 배너 자동 전환 재생' : '프로젝트 배너 자동 전환 일시정지'
    );
  }

  function render(index) {
    active = index;
    slides.forEach(function (slide, slideIndex) {
      var isActive = slideIndex === active;
      slide.classList.toggle('is-active', isActive);
      slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      slide.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    if (position) {
      position.textContent = String(active + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    }
  }

  function schedule() {
    stop();
    if (!canPlay()) return;
    timer = window.setTimeout(function () {
      render((active + 1) % slides.length);
      schedule();
    }, duration);
  }

  root.addEventListener('pointerenter', function () {
    hovering = true;
    stop();
  });

  root.addEventListener('pointerleave', function () {
    hovering = false;
    schedule();
  });

  root.addEventListener('focusin', function () {
    focused = true;
    stop();
  });

  root.addEventListener('focusout', function (event) {
    if (root.contains(event.relatedTarget)) return;
    focused = false;
    schedule();
  });

  if (toggle) {
    toggle.addEventListener('click', function () {
      manualPaused = !manualPaused;
      updateToggle();
      schedule();
    });
  }

  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    schedule();
  });

  function handleMotionChange(event) {
    if (event.matches) {
      manualPaused = true;
      updateToggle();
      stop();
    }
  }

  if (typeof motion.addEventListener === 'function') {
    motion.addEventListener('change', handleMotionChange);
  } else if (typeof motion.addListener === 'function') {
    motion.addListener(handleMotionChange);
  }

  render(0);
  updateToggle();
  schedule();
})();
