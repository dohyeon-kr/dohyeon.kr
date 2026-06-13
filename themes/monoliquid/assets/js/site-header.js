(function () {
  var header = document.querySelector('.site-header');

  if (!header) {
    return;
  }

  var lastY = window.scrollY || 0;
  var ticking = false;

  function updateHeader() {
    var currentY = Math.max(window.scrollY || 0, 0);
    var delta = currentY - lastY;

    header.classList.toggle('site-header--compact', currentY > 24);

    if (currentY <= 8 || delta < -4) {
      header.classList.remove('site-header--nav-hidden');
    } else if (currentY > 80 && delta > 4) {
      header.classList.add('site-header--nav-hidden');
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
