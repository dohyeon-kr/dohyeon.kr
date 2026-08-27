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
