(() => {
    const button = document.querySelector("[data-back-to-top]");
    if (!button) return;

    const threshold = 480;
    let ticking = false;

    const update = () => {
        const visible = window.scrollY >= threshold;
        button.hidden = false;
        button.classList.toggle("is-visible", visible);
        button.setAttribute("aria-hidden", visible ? "false" : "true");
        button.tabIndex = visible ? 0 : -1;
        ticking = false;
    };

    window.addEventListener("scroll", () => {
        if (!ticking) {
            window.requestAnimationFrame(update);
            ticking = true;
        }
    }, {passive: true});

    button.addEventListener("click", () => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({top: 0, behavior: reduceMotion ? "auto" : "smooth"});
    });

    update();
})();
