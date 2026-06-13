(function () {
  var root = document.querySelector('[data-site-announcement-marquee]');
  var track = document.querySelector('[data-site-announcement-track]');

  if (!root || !track || !window.fetch) {
    return;
  }

  function storageKey(text) {
    return 'monoliquid:announcement-dismissed:' + encodeURIComponent(text);
  }

  function isDismissed(text) {
    try {
      return window.localStorage.getItem(storageKey(text)) === 'true';
    } catch (error) {
      return false;
    }
  }

  function dismiss(text) {
    root.hidden = true;

    try {
      window.localStorage.setItem(storageKey(text), 'true');
    } catch (error) {
      return;
    }
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

      text = text.trim();

      if (isDismissed(text)) {
        return;
      }

      track.textContent = '';

      for (var index = 0; index < 12; index += 1) {
        var item = document.createElement('span');
        item.textContent = text;
        track.appendChild(item);
      }

      root.setAttribute('aria-label', text);
      root.setAttribute('role', 'button');
      root.setAttribute('tabindex', '0');
      root.hidden = false;

      root.addEventListener('click', function () {
        dismiss(text);
      });

      root.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          dismiss(text);
        }
      });
    })
    .catch(function () {
      root.hidden = true;
    });
})();
