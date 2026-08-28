(() => {
    const key = "dlog:admin-tools";
    const url = new URL(window.location.href);
    const requested = url.searchParams.get("admin-tools");

    if (requested === "1") localStorage.setItem(key, "enabled");
    if (requested === "0") localStorage.removeItem(key);
    if (requested !== null) {
        url.searchParams.delete("admin-tools");
        history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }

    if (localStorage.getItem(key) === "enabled") {
        document.querySelectorAll("[data-admin-edit]").forEach((link) => {
            link.hidden = false;
        });
    }
})();
