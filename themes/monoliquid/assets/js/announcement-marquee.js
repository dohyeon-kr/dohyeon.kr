(function () {
  var root = document.querySelector('[data-site-announcement-marquee]');
  var track = document.querySelector('[data-site-announcement-track]');

  if (!root || !track || !window.fetch) {
    return;
  }

  fetch('/members/api/announcement/', {
    headers: {
      Accept: 'application/json'
    }
  })
    .then(function (response) {
      return response.ok ? response.json() : null;
    })
    .then(function (payload) {
      var announcement = payload && payload.announcement && payload.announcement[0];
      var text = announcement && announcement.announcement;

      if (!text || !text.trim()) {
        return;
      }

      track.textContent = '';

      for (var index = 0; index < 12; index += 1) {
        var item = document.createElement('span');
        item.textContent = text.trim();
        track.appendChild(item);
      }

      root.setAttribute('aria-label', text.trim());
      root.hidden = false;
    })
    .catch(function () {
      root.hidden = true;
    });
})();
