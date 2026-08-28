(() => {
    const root = document.querySelector("[data-anonymous-comments]");
    if (!root) return;

    const slug = root.dataset.postSlug;
    const endpoint = `/api/comments/${encodeURIComponent(slug)}`;
    const list = root.querySelector("[data-comment-list]");
    const count = root.querySelector("[data-comment-count]");
    const form = root.querySelector("[data-comment-form]");
    const status = root.querySelector("[data-comment-status]");
    const submit = form.querySelector('button[type="submit"]');
    let challenge = "";

    const tokenKey = (id) => `dlog:comment-delete:${id}`;
    const formatDate = (value) => new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));

    const render = (comments) => {
        list.replaceChildren();
        count.textContent = String(comments.length);
        if (!comments.length) {
            const empty = document.createElement("p");
            empty.className = "comment-empty";
            empty.textContent = "첫 댓글을 남겨보세요.";
            list.append(empty);
            return;
        }
        comments.forEach((comment) => {
            const article = document.createElement("article");
            article.className = "comment-item";
            const meta = document.createElement("div");
            meta.className = "comment-item__meta";
            const author = document.createElement("strong");
            author.textContent = comment.displayName;
            const date = document.createElement("time");
            date.dateTime = comment.createdAt;
            date.textContent = formatDate(comment.createdAt);
            meta.append(author, date);
            const body = document.createElement("p");
            body.className = "comment-item__body";
            body.textContent = comment.body;
            const deleteToken = localStorage.getItem(tokenKey(comment.id));
            if (deleteToken) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "comment-item__delete";
                button.textContent = "삭제";
                button.addEventListener("click", async () => {
                    if (!window.confirm("이 댓글을 삭제할까요?")) return;
                    button.disabled = true;
                    const response = await fetch(`${endpoint}/${comment.id}`, {
                        method: "DELETE",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({deleteToken}),
                    });
                    if (response.ok) {
                        localStorage.removeItem(tokenKey(comment.id));
                        await load();
                    } else {
                        button.disabled = false;
                        status.textContent = "댓글을 삭제하지 못했습니다.";
                    }
                });
                meta.append(button);
            }
            article.append(meta, body);
            list.append(article);
        });
    };

    const load = async () => {
        try {
            const response = await fetch(endpoint, {headers: {"Accept": "application/json"}});
            if (!response.ok) throw new Error("load failed");
            const payload = await response.json();
            challenge = payload.challenge;
            render(payload.comments);
            status.textContent = "";
            window.setTimeout(() => { submit.disabled = false; }, 1000);
        } catch {
            status.textContent = "댓글을 불러오지 못했습니다.";
        }
    };

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        submit.disabled = true;
        status.textContent = "댓글을 등록하는 중…";
        const values = new FormData(form);
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                displayName: values.get("displayName"),
                body: values.get("body"),
                website: values.get("website"),
                challenge,
            }),
        });
        if (response.ok) {
            const payload = await response.json();
            localStorage.setItem(tokenKey(payload.comment.id), payload.deleteToken);
            form.reset();
            status.textContent = "댓글이 등록되었습니다.";
            await load();
        } else {
            status.textContent = response.status === 429 ? "잠시 기다린 뒤 다시 시도해 주세요." : "댓글 내용을 확인해 주세요.";
            await load();
        }
    });

    load();
})();
