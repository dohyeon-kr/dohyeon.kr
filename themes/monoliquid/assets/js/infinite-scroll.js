(function () {
  var grid = document.querySelector('.post-grid');
  var pagination = document.querySelector('.pagination');

  if (
    !grid ||
    !pagination ||
    !window.fetch ||
    !window.DOMParser ||
    !window.IntersectionObserver
  ) {
    return;
  }

  var nextLink = pagination.querySelector('.older-posts');

  if (!nextLink) {
    return;
  }

  var nextUrl = nextLink.href;
  var requestedUrls = {};
  var loading = false;
  var sentinel = document.createElement('div');

  sentinel.className = 'infinite-scroll-sentinel';
  sentinel.setAttribute('role', 'status');
  sentinel.setAttribute('aria-live', 'polite');
  sentinel.textContent = 'Scroll to load more';
  pagination.insertAdjacentElement('afterend', sentinel);
  pagination.classList.add('is-infinite-scroll-hidden');

  function restorePagination() {
    pagination.classList.remove('is-infinite-scroll-hidden');
    sentinel.remove();
  }

  function finish() {
    observer.disconnect();
    sentinel.textContent = 'All posts loaded';
  }

  function loadMore() {
    if (loading || !nextUrl) {
      return;
    }

    if (requestedUrls[nextUrl]) {
      finish();
      return;
    }

    loading = true;
    requestedUrls[nextUrl] = true;
    sentinel.textContent = 'Loading more posts';

    fetch(nextUrl, {
      credentials: 'same-origin',
      headers: {
        Accept: 'text/html'
      }
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Unable to load the next page');
        }

        return response.text();
      })
      .then(function (html) {
        var documentFromNextPage = new window.DOMParser().parseFromString(
          html,
          'text/html'
        );
        var cards = documentFromNextPage.querySelectorAll(
          '.post-grid article.post-card'
        );
        var followingLink = documentFromNextPage.querySelector(
          '.pagination .older-posts'
        );
        var followingPath = followingLink
          ? followingLink.getAttribute('href')
          : '';

        if (!cards.length) {
          finish();
          return;
        }

        cards.forEach(function (card) {
          grid.appendChild(document.importNode(card, true));
        });

        nextUrl = followingPath ? new URL(followingPath, nextUrl).href : '';
        sentinel.textContent = nextUrl ? 'Scroll to load more' : 'All posts loaded';

        if (!nextUrl) {
          finish();
        }
      })
      .catch(function () {
        observer.disconnect();
        restorePagination();
      })
      .finally(function () {
        loading = false;
      });
  }

  var observer = new window.IntersectionObserver(
    function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) {
        loadMore();
      }
    },
    {rootMargin: '600px 0px'}
  );

  observer.observe(sentinel);
})();
