(function () {
  var header = document.querySelector('.site-header');

  if (!header) {
    return;
  }

  var lastY = Math.max(window.scrollY || 0, 0);
  var navHidden = header.classList.contains('site-header--nav-hidden');
  var scrollIntent = 0;
  var ticking = false;
  var hideStartY = 96;
  var hideDistance = 42;
  var revealDistance = 56;
  var topRevealY = 16;
  var ignoreDelta = 2;

  function setNavHidden(nextHidden) {
    if (navHidden === nextHidden) {
      return;
    }

    navHidden = nextHidden;
    scrollIntent = 0;
    header.classList.toggle('site-header--nav-hidden', navHidden);
  }

  function updateHeader() {
    var currentY = Math.max(window.scrollY || 0, 0);
    var delta = currentY - lastY;

    header.classList.toggle('site-header--compact', currentY > 24);

    if (currentY <= topRevealY) {
      setNavHidden(false);
      lastY = currentY;
      ticking = false;
      return;
    }

    if (Math.abs(delta) <= ignoreDelta) {
      lastY = currentY;
      ticking = false;
      return;
    }

    if (
      (delta > 0 && scrollIntent < 0) ||
      (delta < 0 && scrollIntent > 0)
    ) {
      scrollIntent = 0;
    }

    scrollIntent += delta;

    if (!navHidden && currentY > hideStartY && scrollIntent >= hideDistance) {
      setNavHidden(true);
    } else if (navHidden && scrollIntent <= -revealDistance) {
      setNavHidden(false);
    }

    lastY = currentY;
    ticking = false;
  }

  function requestUpdate() {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(updateHeader);
  }

  updateHeader();
  window.addEventListener('scroll', requestUpdate, {passive: true});
})();
