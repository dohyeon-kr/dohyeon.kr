(() => {
    const links = document.querySelectorAll("[data-admin-edit]");
    if (!links.length) return;

    // Check the Ghost staff session, never a manually enabled local flag.
    let pending = false;
    const refresh = async () => {
        if (pending) return;
        pending = true;
        links.forEach((link) => { link.hidden = true; });
        try {
            const response = await fetch("/ghost/api/admin/users/me/?include=roles", {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
                headers: { Accept: "application/json" },
            });
            if (!response.ok) return;
            const payload = await response.json();
            const user = payload?.users?.[0];
            if (!user?.id) return;
            const roles = Array.isArray(user.roles) ? user.roles : [];
            const canUseDashboard = roles.some((role) =>
                ["Owner", "Administrator"].includes(role.name));
            links.forEach((link) => {
                link.hidden = link.hasAttribute("data-admin-dashboard")
                    ? !canUseDashboard : false;
            });
        } catch {
            // A signed-out or unavailable session keeps controls hidden.
        } finally {
            pending = false;
        }
    };

    refresh();
    // Recheck after signing in/out in another tab or returning via Back.
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") refresh();
    });
})();
