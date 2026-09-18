(() => {
  const selector = "[data-post-engagement][data-post-slug]";
  const cache = new Map();
  const pending = new Set();
  const initialized = new WeakSet();
  const formatter = new Intl.NumberFormat("ko-KR");
  let scheduled = false;

  const storageGet = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const storageSet = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Engagement remains usable when storage is unavailable.
    }
  };

  const createVisitorId = () => {
    if (crypto?.randomUUID) {
      return "browser_" + crypto.randomUUID().replaceAll("-", "");
    }
    if (crypto?.getRandomValues) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return "browser_" + Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    return "browser_" + Date.now().toString(36) + Math.random().toString(36).slice(2).padEnd(16, "0");
  };

  const visitorId = (() => {
    const stored = storageGet("postEngagement:visitorId");
    if (stored && /^[A-Za-z0-9_-]{16,128}$/.test(stored)) return stored;
    const created = createVisitorId();
    storageSet("postEngagement:visitorId", created);
    return created;
  })();

  const likedKey = (slug) => `postEngagement:liked:${slug}`;
  const isLiked = (slug) => storageGet(likedKey(slug)) === "1";

  const setText = (root, name, value) => {
    const node = root.querySelector(`[data-engagement-${name}]`);
    if (node) node.textContent = formatter.format(value);
  };

  const applyLikeState = (root, liked) => {
    const button = root.querySelector("[data-like-button]");
    if (!button) return;
    button.classList.toggle("is-liked", liked);
    button.setAttribute("aria-pressed", liked ? "true" : "false");
  };

  const renderRoot = (root, stats) => {
    setText(root, "views", stats.views);
    setText(root, "comments", stats.comments);
    setText(root, "likes", stats.likes);
    setText(root, "shares", stats.shares);
    applyLikeState(root, isLiked(root.dataset.postSlug));
    root.querySelectorAll("[data-like-button], [data-share-button]").forEach((button) => {
      button.disabled = false;
    });
    root.removeAttribute("aria-busy");
  };

  const renderSlug = (slug) => {
    const stats = cache.get(slug);
    if (!stats) return;
    document.querySelectorAll(selector).forEach((root) => {
      if (root.dataset.postSlug === slug) renderRoot(root, stats);
    });
  };

  const updateCount = (slug, name, total) => {
    const current = cache.get(slug) || {views: 0, comments: 0, likes: 0, shares: 0};
    cache.set(slug, {...current, [name]: total});
    renderSlug(slug);
  };

  const loadPending = () => {
    scheduled = false;
    const slugs = Array.from(pending);
    pending.clear();
    if (!slugs.length) return;

    const params = new URLSearchParams({slugs: slugs.join(",")});
    fetch(`/api/visit/engagement?${params.toString()}`, {
      credentials: "same-origin",
      headers: {Accept: "application/json"},
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        const posts = payload?.posts;
        if (!posts || typeof posts !== "object") throw new Error("Invalid engagement response");
        slugs.forEach((slug) => {
          const stats = posts[slug];
          if (
            !stats ||
            !["views", "comments", "likes", "shares"].every(
              (key) => Number.isSafeInteger(stats[key]) && stats[key] >= 0
            )
          ) {
            return;
          }
          cache.set(slug, stats);
          renderSlug(slug);
        });
      })
      .catch(() => {
        document.querySelectorAll(selector).forEach((root) => {
          if (!slugs.includes(root.dataset.postSlug)) return;
          root.removeAttribute("aria-busy");
          root.querySelectorAll("[data-like-button], [data-share-button]").forEach((button) => {
            button.disabled = false;
          });
        });
      });
  };

  const queue = (slug) => {
    if (cache.has(slug)) {
      renderSlug(slug);
      return;
    }
    pending.add(slug);
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(loadPending);
  };

  const copyUrl = async (url) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return;
    }
    const input = document.createElement("textarea");
    input.value = url;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    if (!copied) throw new Error("Copy unavailable");
  };

  const setShareStatus = (root, message) => {
    const status = root.querySelector("[data-share-status]");
    if (!status) return;
    status.textContent = message;
    window.setTimeout(() => {
      if (status.textContent === message) status.textContent = "";
    }, 2400);
  };

  const bindActions = (root) => {
    if (initialized.has(root)) return;
    initialized.add(root);

    const slug = root.dataset.postSlug;
    const likeButton = root.querySelector("[data-like-button]");
    const shareButton = root.querySelector("[data-share-button]");

    applyLikeState(root, isLiked(slug));

    if (likeButton) {
      likeButton.addEventListener("click", async () => {
        const liked = likeButton.getAttribute("aria-pressed") !== "true";
        likeButton.disabled = true;
        try {
          const response = await fetch(`/api/visit/post/${encodeURIComponent(slug)}/like`, {
            method: "POST",
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({visitorId, liked}),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const result = await response.json();
          if (!Number.isSafeInteger(result?.total) || result.total < 0 || result.liked !== liked) {
            throw new Error("Invalid like response");
          }
          storageSet(likedKey(slug), liked ? "1" : "0");
          updateCount(slug, "likes", result.total);
          document.querySelectorAll(selector).forEach((candidate) => {
            if (candidate.dataset.postSlug === slug) applyLikeState(candidate, liked);
          });
        } catch {
          // Keep the previous state when the request fails.
        } finally {
          likeButton.disabled = false;
        }
      });
    }

    if (shareButton) {
      shareButton.addEventListener("click", async () => {
        const title = root.dataset.postTitle || document.title;
        const url = window.location.href;
        shareButton.disabled = true;
        let copied = false;
        try {
          if (navigator.share) {
            try {
              await navigator.share({title, url});
            } catch (error) {
              if (error?.name === "AbortError") return;
              await copyUrl(url);
              copied = true;
            }
          } else {
            await copyUrl(url);
            copied = true;
          }

          const response = await fetch(`/api/visit/post/${encodeURIComponent(slug)}/share`, {
            method: "POST",
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: "{}",
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const result = await response.json();
          if (!Number.isSafeInteger(result?.total) || result.total < 0) {
            throw new Error("Invalid share response");
          }
          updateCount(slug, "shares", result.total);
          setShareStatus(root, copied ? "링크를 복사했습니다." : "공유했습니다.");
        } catch {
          if (copied) setShareStatus(root, "링크를 복사했습니다.");
        } finally {
          shareButton.disabled = false;
        }
      });
    }
  };

  const discover = (node) => {
    if (!(node instanceof Element || node instanceof Document)) return;
    const roots = node.matches?.(selector)
      ? [node]
      : Array.from(node.querySelectorAll?.(selector) || []);

    roots.forEach((root) => {
      const slug = root.dataset.postSlug;
      if (!slug) return;
      root.setAttribute("aria-busy", "true");
      bindActions(root);
      if (cache.has(slug)) renderRoot(root, cache.get(slug));
      else queue(slug);
    });
  };

  discover(document);

  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => discover(node));
    });
  }).observe(document.body, {childList: true, subtree: true});
})();
