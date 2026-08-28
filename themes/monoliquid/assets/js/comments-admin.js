(() => {
    const root = document.querySelector("[data-comment-admin]");
    if (!root) return;
    const list = root.querySelector("[data-admin-list]");
    const status = root.querySelector("[data-admin-status]");
    const count = root.querySelector("[data-admin-count]");
    const showDeleted = root.querySelector("[data-show-deleted]");
    let comments = [];

    const formatDate = (value) => new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));

    const render = () => {
        const visible = comments.filter((comment) => showDeleted.checked || comment.status === "visible");
        list.replaceChildren();
        count.textContent = `표시 ${visible.length} · 전체 ${comments.length}`;
        if (!visible.length) {
            const empty = document.createElement("p");
            empty.className = "comment-empty";
            empty.textContent = "표시할 댓글이 없습니다.";
            list.append(empty);
            return;
        }
        visible.forEach((comment) => {
            const article = document.createElement("article");
            article.className = `comment-admin__item is-${comment.status}`;
            const meta = document.createElement("div");
            meta.className = "comment-item__meta";
            const info = document.createElement("span");
            info.textContent = comment.status === "deleted"
                ? `삭제됨 · ${comment.postSlug}`
                : `${comment.displayName} · ${comment.postSlug} · ${formatDate(comment.createdAt)}`;
            meta.append(info);
            if (comment.status === "visible") {
                const remove = document.createElement("button");
                remove.type = "button";
                remove.className = "comment-item__delete";
                remove.textContent = "관리자 삭제";
                remove.addEventListener("click", async () => {
                    if (!window.confirm("이 댓글을 삭제할까요? 복구할 수 없습니다.")) return;
                    remove.disabled = true;
                    const response = await fetch(`/ghost/api/comments-admin/${comment.id}`, {method: "DELETE"});
                    if (response.ok) await load();
                    else {
                        remove.disabled = false;
                        status.textContent = "삭제하지 못했습니다. 관리자 로그인을 확인해 주세요.";
                    }
                });
                meta.append(remove);
            }
            const body = document.createElement("p");
            body.className = "comment-item__body";
            body.textContent = comment.status === "deleted" ? "삭제된 댓글" : comment.body;
            const post = document.createElement("a");
            post.className = "comment-admin__post-link";
            post.href = `/${encodeURIComponent(comment.postSlug)}/`;
            post.textContent = "게시글 보기";
            article.append(meta, body, post);
            list.append(article);
        });
    };

    const load = async () => {
        status.textContent = "";
        const response = await fetch("/ghost/api/comments-admin", {headers: {Accept: "application/json"}});
        if (response.status === 401) {
            status.replaceChildren();
            status.append("Ghost 관리자 로그인이 필요합니다. ");
            const login = document.createElement("a");
            login.href = "/ghost/";
            login.textContent = "관리자 로그인";
            status.append(login);
            count.textContent = "접근 권한 없음";
            return;
        }
        if (!response.ok) {
            status.textContent = "댓글을 불러오지 못했습니다.";
            return;
        }
        const payload = await response.json();
        comments = payload.comments;
        render();
    };

    showDeleted.addEventListener("change", render);
    load();
})();
