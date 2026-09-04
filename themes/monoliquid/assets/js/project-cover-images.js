(() => {
  const coverByUrl = new Map([
    ["https://2024-djcoupon.archive.brand04.solutions/", "dongjak-2024.webp"],
    ["https://2024-djcoupon.archive.brand04.solutions/relay", "dongjak-relay.webp"],
    ["https://maebong.archive.brand04.solutions/", "maebong.webp"],
    ["https://sscampus-admin.archive.brand04.solutions/", "sscampus-admin.webp"],
    ["https://sscampus-app.archive.brand04.solutions/", "sscampus-app.webp"],
    ["https://2024-dogokmrf.archive.brand04.solutions/", "dogok.webp"],
    ["https://galaxys25event.archive.brand04.solutions/", "galaxy-s25.webp"],
    ["https://munseoun.archive.brand04.solutions/", "munseoun.webp"],
    ["https://uplus-victory.archive.brand04.solutions/", "uplus-victory.webp"],
    ["https://kisti-svc.archive.brand04.solutions/", "kisti-svc.webp"],
    ["https://nosmoking.archive.brand04.solutions/", "nosmoking-2021.webp"],
    ["https://nosmoking-2022.archive.brand04.solutions/", "nosmoking-2022.webp"],
    ["https://nosmoking-2023.archive.brand04.solutions/", "nosmoking-2023.webp"],
    ["https://kakaododont.archive.brand04.solutions/", "kakao-dodont.webp"],
    ["https://poc.dohyeon.kr/", "poc-publisher.webp"],
  ]);

  const normalizeUrl = (href) => {
    const url = new URL(href, window.location.origin);
    url.search = "";
    url.hash = "";
    return url.href;
  };

  document.querySelectorAll("#archiveGrid .card[href]").forEach((card) => {
    const cover = coverByUrl.get(normalizeUrl(card.href));
    if (!cover || card.dataset.hasThumb === "true") return;

    card.style.setProperty(
      "--thumb-image",
      `url("/assets/images/project-covers/${cover}")`,
    );
    card.dataset.hasThumb = "true";
    card.dataset.previewSource = "live-site";
  });
})();
