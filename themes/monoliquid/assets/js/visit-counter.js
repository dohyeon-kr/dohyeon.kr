(() => {
  const counter = document.querySelector("[data-visit-counter]");
  if (!counter) return;

  const today = counter.querySelector("[data-visit-today]");
  const total = counter.querySelector("[data-visit-total]");
  if (!today || !total) return;

  const lastIncrementKey = "visitStats:lastIncrementAt";
  const cachedStatsKey = "visitStats:cachedStats";
  const incrementTtl = 30 * 60 * 1000;
  const numberFormatter = new Intl.NumberFormat("ko-KR");

  const render = (stats) => {
    const nextToday = Number(stats?.today);
    const nextTotal = Number(stats?.total);
    if (!Number.isFinite(nextToday) || !Number.isFinite(nextTotal)) return false;

    today.textContent = numberFormatter.format(nextToday);
    total.textContent = numberFormatter.format(nextTotal);
    return true;
  };

  try {
    const cached = JSON.parse(localStorage.getItem(cachedStatsKey) || "null");
    render(cached);
  } catch {
    localStorage.removeItem(cachedStatsKey);
  }

  const lastIncrementAt = Number(localStorage.getItem(lastIncrementKey));
  const shouldIncrement =
    !Number.isFinite(lastIncrementAt) || Date.now() - lastIncrementAt > incrementTtl;

  fetch("/api/visit", {
    method: shouldIncrement ? "POST" : "GET",
    headers: { Accept: "application/json" },
  })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((stats) => {
      if (!render(stats)) throw new Error("Invalid visit statistics");
      localStorage.setItem(cachedStatsKey, JSON.stringify(stats));
      if (shouldIncrement) {
        localStorage.setItem(lastIncrementKey, String(Date.now()));
      }
    })
    .catch(() => {
      counter.dataset.unavailable = "true";
    });
})();
