(() => {
  // This enhancement is loaded only by the /ghost/ HTML shell. Ghost owns the
  // sidebar and may replace it during login, navigation, or responsive changes.
  const marker = 'data-dlog-dashboard-shortcut';
  const attach = () => {
    const dashboard = document.querySelector('nav a[href="#/dashboard/"]');
    const row = dashboard?.closest('li');
    const list = row?.parentElement;
    if (!row || !list || list.tagName !== 'UL' || list.querySelector(`[${marker}]`)) return;

    const item = document.createElement('li');
    item.setAttribute(marker, '');
    const link = document.createElement('a');
    link.className = 'dlog-dashboard-shortcut';
    link.href = '/ghost/dashboard/';
    link.title = '방문·조회 통계, 댓글 관리, SEO 점검';
    const label = document.createElement('span');
    label.textContent = 'DLOG 대시보드';
    const arrow = document.createElement('span');
    arrow.textContent = '↗';
    arrow.setAttribute('aria-hidden', 'true');
    link.append(label, arrow);
    item.append(link);
    row.after(item);
  };

  let frame = 0;
  const observer = new MutationObserver(() => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      attach();
    });
  });
  attach();
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('pagehide', () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    frame = 0;
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      attach();
      observer.observe(document.body, { childList: true, subtree: true });
    }
  });
})();
