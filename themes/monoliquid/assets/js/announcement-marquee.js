(function () {
  var root = document.querySelector('[data-site-announcement-marquee]');
  var track = document.querySelector('[data-site-announcement-track]');

  if (!root || !track || !window.fetch) {
    return;
  }

  function textFromHtml(rawText) {
    var parser = document.createElement('div');
    parser.innerHTML = rawText;

    return (parser.textContent || parser.innerText || rawText).trim();
  }

  function normalizeAnnouncementEntry(entry) {
    var rawText = '';

    if (typeof entry === 'string') {
      rawText = entry;
    } else if (entry && typeof entry.announcement === 'string') {
      rawText = entry.announcement;
    }

    return rawText ? textFromHtml(rawText) : '';
  }

  function normalizeAnnouncements(payload) {
    var announcement = payload && payload.announcement;
    var entries = Array.isArray(announcement) ? announcement : [announcement];
    var texts = [];

    entries.forEach(function (entry) {
      var text = normalizeAnnouncementEntry(entry);

      if (text) {
        texts.push(text);
      }
    });

    return texts;
  }

  function renderAnnouncements(texts) {
    var repeatCount = Math.max(2, Math.ceil(12 / texts.length));

    track.textContent = '';

    for (var index = 0; index < repeatCount; index += 1) {
      texts.forEach(function (text) {
        var item = document.createElement('span');
        item.textContent = text;
        track.appendChild(item);
      });
    }
  }

  function storageKey(text) {
    return 'monoliquid:announcement-session-dismissed:' + encodeURIComponent(text);
  }

  function isDismissed(text) {
    try {
      return window.sessionStorage.getItem(storageKey(text)) === 'true';
    } catch (error) {
      return false;
    }
  }

  function dismiss(text) {
    root.hidden = true;

    try {
      window.sessionStorage.setItem(storageKey(text), 'true');
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
      var texts = normalizeAnnouncements(payload);
      var dismissValue = texts.join(' | ');

      if (!texts.length) {
        return;
      }

      if (isDismissed(dismissValue)) {
        return;
      }

      renderAnnouncements(texts);

      root.setAttribute('aria-label', dismissValue);
      root.setAttribute('role', 'button');
      root.setAttribute('tabindex', '0');
      root.hidden = false;

      root.addEventListener('click', function () {
        dismiss(dismissValue);
      });

      root.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          dismiss(dismissValue);
        }
      });
    })
    .catch(function () {
      root.hidden = true;
    });
})();
