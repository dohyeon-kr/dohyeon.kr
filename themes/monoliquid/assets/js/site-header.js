(function () {
  var header = document.querySelector('.site-header');

  if (!header) {
    return;
  }

  var nav = header.querySelector('.site-nav');

  if (!nav) {
    return;
  }

  var lastY = Math.max(window.scrollY || 0, 0);
  var navHidden = header.classList.contains('site-header--nav-hidden');
  var directionStartY = lastY;
  var direction = 0;
  var ticking = false;
  var compact = header.classList.contains('site-header--compact');
  var navTransitioning = false;
  var navTransitionTimer;
  var hideStartY = 96;
  var hideDistance = 48;
  var revealDistance = 32;
  var topRevealY = 16;
  var compactStartY = 56;
  var compactEndY = 12;
  var directionDelta = 0.5;

  function setCompact(nextCompact) {
    if (compact === nextCompact) {
      return;
    }

    compact = nextCompact;
    header.classList.toggle('site-header--compact', compact);
  }

  function setNavHidden(nextHidden) {
    if (navHidden === nextHidden || navTransitioning) {
      return;
    }

    navHidden = nextHidden;
    navTransitioning = true;
    direction = 0;
    header.classList.toggle('site-header--nav-hidden', navHidden);
    window.clearTimeout(navTransitionTimer);
    navTransitionTimer = window.setTimeout(finishNavTransition, 360);
  }

  function finishNavTransition() {
    if (!navTransitioning) {
      return;
    }

    navTransitioning = false;
    lastY = Math.max(window.scrollY || 0, 0);
    directionStartY = lastY;
    direction = 0;
    requestUpdate();
  }

  function updateHeader() {
    var currentY = Math.max(window.scrollY || 0, 0);
    var delta = currentY - lastY;

    if (!compact && currentY >= compactStartY) {
      setCompact(true);
    } else if (compact && currentY <= compactEndY) {
      setCompact(false);
    }

    if (currentY <= topRevealY) {
      if (navHidden && !navTransitioning) {
        setNavHidden(false);
      }
      direction = 0;
      directionStartY = currentY;
      lastY = currentY;
      ticking = false;
      return;
    }

    if (navTransitioning || Math.abs(delta) < directionDelta) {
      lastY = currentY;
      ticking = false;
      return;
    }

    var nextDirection = delta > 0 ? 1 : -1;

    if (nextDirection !== direction) {
      direction = nextDirection;
      directionStartY = lastY;
    }

    var directionDistance = currentY - directionStartY;

    if (!navHidden && currentY > hideStartY && directionDistance >= hideDistance) {
      setNavHidden(true);
    } else if (navHidden && directionDistance <= -revealDistance) {
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

  header.addEventListener('transitionend', function (event) {
    if (event.target !== nav || event.propertyName !== 'transform') {
      return;
    }

    window.clearTimeout(navTransitionTimer);
    finishNavTransition();
  });

  updateHeader();
  window.addEventListener('scroll', requestUpdate, {passive: true});
})();
