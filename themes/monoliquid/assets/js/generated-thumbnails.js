(() => {
  const removeMissingThumbnail = (image) => {
    const container = image.closest("[data-generated-thumbnail]");
    if (!container) return;
    const cardBody = container.closest(".post-card__body");
    if (cardBody) cardBody.classList.add("post-card__body--without-media");
    container.remove();
  };

  document.addEventListener(
    "error",
    (event) => {
      const image = event.target;
      if (image instanceof HTMLImageElement && image.matches("[data-generated-thumbnail] img")) {
        removeMissingThumbnail(image);
      }
    },
    true,
  );

  document.querySelectorAll("[data-generated-thumbnail] img").forEach((image) => {
    if (image.complete && image.naturalWidth === 0) removeMissingThumbnail(image);
  });
})();
