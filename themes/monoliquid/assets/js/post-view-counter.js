(() => {
  const counter = document.querySelector("[data-post-view-counter]");
  const slug = counter?.dataset.postSlug;
  if (!counter || !slug) return;

  const lastIncrementKey = `postViewStats:${slug}:lastIncrementAt`;
  const cachedTotalKey = `postViewStats:${slug}:cachedTotal`;
  const incrementTtl = 30 * 60 * 1000;
  const numberFormatter = new Intl.NumberFormat("ko-KR");
  const readStorage = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const writeStorage = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // The counter still works when storage is unavailable.
    }
  };
  const render = (value) => {
    const total = Number(value);
    if (!Number.isFinite(total)) return false;
    counter.textContent = `조회수 ${numberFormatter.format(total)}`;
    return true;
  };

  const cachedTotal = readStorage(cachedTotalKey);
  if (cachedTotal !== null) render(cachedTotal);

  const lastIncrementAt = Number(readStorage(lastIncrementKey));
  const shouldIncrement =
    !Number.isFinite(lastIncrementAt) || Date.now() - lastIncrementAt > incrementTtl;

  fetch(`/api/visit/post/${encodeURIComponent(slug)}`, {
    method: shouldIncrement ? "POST" : "GET",
    headers: { Accept: "application/json" },
  })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((stats) => {
      if (!render(stats?.total)) throw new Error("Invalid post view statistics");
      writeStorage(cachedTotalKey, String(stats.total));
      if (shouldIncrement) {
        writeStorage(lastIncrementKey, String(Date.now()));
      }
    })
    .catch(() => {
      counter.dataset.unavailable = "true";
    });
})();


// Listing counters only read totals; opening a list must never record a view.
(() => {
  const selector = "[data-post-list-view-counter]";
  const initialized = new WeakSet();
  const requests = new Map();
  const formatter = new Intl.NumberFormat("ko-KR");

  const load = (counter) => {
    const slug = counter.dataset.postSlug;
    if (!slug) return;
    if (!requests.has(slug)) {
      requests.set(slug, fetch(`/api/visit/post/${encodeURIComponent(slug)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      }).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      }).then((stats) => {
        if (typeof stats?.total !== "number" ||
            !Number.isSafeInteger(stats.total) || stats.total < 0) {
          throw new Error("Invalid post view statistics");
        }
        return stats.total;
      }));
    }
    requests.get(slug).then((total) => {
      counter.textContent = `조회수 ${formatter.format(total)}`;
    }).catch(() => {
      counter.dataset.unavailable = "true";
      counter.title = "조회수를 불러오지 못했습니다";
    });
  };

  const visibility = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          visibility.unobserve(entry.target);
          load(entry.target);
        });
      }, { rootMargin: "200px 0px" })
    : null;

  const initialize = (root) => {
    const counters = root.matches?.(selector) ? [root] : root.querySelectorAll(selector);
    counters.forEach((counter) => {
      if (initialized.has(counter)) return;
      initialized.add(counter);
      if (visibility) visibility.observe(counter);
      else load(counter);
    });
  };

  initialize(document);
  // Infinite scrolling inserts new cards into the existing grid.
  document.querySelectorAll(".post-grid").forEach((grid) => {
    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) initialize(node);
        });
      });
    }).observe(grid, { childList: true, subtree: true });
  });
})();
