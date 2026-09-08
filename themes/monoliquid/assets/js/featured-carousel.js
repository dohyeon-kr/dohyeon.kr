(function () {
  var section = document.querySelector('[data-featured-carousel]');
  if (!section) return;
  var track = section.querySelector('.featured-carousel__track');
  var pool = section.querySelector('[data-featured-candidates]');
  var status = section.querySelector('.featured-carousel__status');
  var candidates = Array.from(pool.content.querySelectorAll('[data-featured-slug]'));
  function initialize() {
  var slides = Array.from(track.children);
  if (!slides.length) return;
  var previous = section.querySelector('[data-featured-prev]');
  var next = section.querySelector('[data-featured-next]');
  var play = section.querySelector('[data-featured-play]');
  var position = section.querySelector('[data-featured-position]');
  var progress = section.querySelector('.featured-carousel__progress span');
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var active = 0, elapsed = 0, lastTime = 0, frame = 0;
  var paused = motion.matches, hovering = false, visible = true;
  var duration = 5000;
  function update() {
    var left = track.getBoundingClientRect().left;
    var prior = active;
    active = slides.reduce(function (best, slide, index) {
      return Math.abs(slide.getBoundingClientRect().left - left) < Math.abs(slides[best].getBoundingClientRect().left - left) ? index : best;
    }, 0);
    if (prior !== active) elapsed = 0;
    previous.disabled = active === 0;
    next.disabled = active === slides.length - 1;
    position.textContent = String(active + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    slides.forEach(function (slide, index) { slide.tabIndex = index === active ? 0 : -1; });
  }
  function go(index) {
    elapsed = 0;
    var target = slides[Math.max(0, Math.min(slides.length - 1, index))];
    track.scrollBy({left: target.getBoundingClientRect().left - track.getBoundingClientRect().left, behavior: motion.matches ? 'instant' : 'smooth'});
  }
  function tick(now) {
    if (lastTime) elapsed += now - lastTime;
    lastTime = now;
    if (elapsed >= duration) go((active + 1) % slides.length);
    progress.style.transform = 'scaleX(' + Math.min(elapsed / duration, 1) + ')';
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    lastTime = 0;
    play.textContent = paused ? '▶' : 'Ⅱ';
    play.setAttribute('aria-label', paused ? '자동 재생 시작' : '자동 재생 일시정지');
    play.setAttribute('aria-pressed', String(paused));
    if (!paused && !hovering && visible && !document.hidden && !section.contains(document.activeElement) && slides.length > 1) frame = requestAnimationFrame(tick);
  }
  previous.addEventListener('click', function () { go(active - 1); });
  next.addEventListener('click', function () { go(active + 1); });
  play.addEventListener('click', function () { paused = !paused; sync(); });
  track.addEventListener('keydown', function (event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    // Keep focus on the viewport when moving away from a focused slide link.
    track.focus({preventScroll: true});
    go(active + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  track.addEventListener('scroll', update, {passive: true});
  track.addEventListener('pointerdown', function () { elapsed = 0; }, {passive: true});
  section.addEventListener('mouseenter', function () { hovering = true; sync(); });
  section.addEventListener('mouseleave', function () { hovering = false; sync(); });
  section.addEventListener('focusin', sync);
  section.addEventListener('focusout', function () { setTimeout(sync, 0); });
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', function () { paused = motion.matches; sync(); });
  window.addEventListener('pagehide', function () { cancelAnimationFrame(frame); });
  window.addEventListener('pageshow', sync);
  if (window.ResizeObserver) new ResizeObserver(update).observe(track);
  if (window.IntersectionObserver) new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; sync(); }).observe(section);
  section.querySelector('.featured-carousel__controls').hidden = slides.length < 2;
  section.classList.add('is-ready');
  update();
  sync();
  }
  if (!candidates.length) {
    status.textContent = '집계할 공개 글이 없습니다.';
    return;
  }
  fetch('/api/visit/featured', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'same-origin',
    body: JSON.stringify({slugs: candidates.map(function (slide) { return slide.dataset.featuredSlug; })})
  }).then(function (response) {
    if (!response.ok) throw new Error('Ranking unavailable');
    return response.json();
  }).then(function (data) {
    if (!Array.isArray(data.posts)) throw new Error('Invalid ranking');
    data.posts.slice(0, 3).forEach(function (post) {
      var source = candidates.find(function (slide) { return slide.dataset.featuredSlug === post.slug; });
      if (!source || !Number.isFinite(post.views) || post.views <= 0) return;
      var slide = source.cloneNode(true);
      slide.querySelector('[data-featured-views]').textContent = '최근 7일 조회수 ' + post.views.toLocaleString('ko-KR');
      var image = slide.querySelector('img');
      if (image) {
        image.loading = track.children.length ? 'lazy' : 'eager';
        image.addEventListener('error', function () { image.remove(); }, {once: true});
      }
      track.appendChild(slide);
    });
    if (!track.children.length) {
      status.textContent = '최근 7일간 집계된 조회수가 없습니다.';
      return;
    }
    status.hidden = true;
    track.hidden = false;
    section.title = data.start + ' ~ ' + data.end + ' (한국 시간, 오늘 포함)';
    initialize();
  }).catch(function () {
    status.textContent = '인기 글을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.';
  });
})();

