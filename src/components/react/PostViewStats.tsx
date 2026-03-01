import React from "react";

function formatNumber(n: number) {
    return new Intl.NumberFormat("ko-KR").format(n);
}

const INCREMENT_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getStorageKeys(slug: string) {
    return {
        lastIncrementAt: `visitStats:post:${slug}:lastIncrementAt`,
        cachedTotal: `visitStats:post:${slug}:cachedTotal`,
    };
}

function readLastIncrementAt(slug: string): number | null {
    const keys = getStorageKeys(slug);
    const raw = localStorage.getItem(keys.lastIncrementAt);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

function writeLastIncrementAt(slug: string, ts: number) {
    const keys = getStorageKeys(slug);
    localStorage.setItem(keys.lastIncrementAt, String(ts));
}

function readCachedTotal(slug: string): number | null {
    const keys = getStorageKeys(slug);
    const raw = localStorage.getItem(keys.cachedTotal);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

function writeCachedTotal(slug: string, total: number) {
    const keys = getStorageKeys(slug);
    localStorage.setItem(keys.cachedTotal, String(total));
}

interface Props {
    slug: string;
}

export const PostViewStats: React.FC<Props> = ({ slug }) => {
    const [total, setTotal] = React.useState<number | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!slug) return;
        let cancelled = false;

        const cached = readCachedTotal(slug);
        if (cached !== null) setTotal(cached);

        const run = async () => {
            try {
                const lastAt = readLastIncrementAt(slug);
                const shouldIncrement =
                    !lastAt || Date.now() - lastAt > INCREMENT_TTL_MS;

                const res = await fetch(`/api/visit/post/${encodeURIComponent(slug)}`, {
                    method: shouldIncrement ? "POST" : "GET",
                    headers: {
                        Accept: "application/json",
                    },
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = (await res.json()) as { total?: number };

                const nextTotal = Number(data?.total ?? 0);

                if (!cancelled) {
                    setTotal(nextTotal);
                    writeCachedTotal(slug, nextTotal);
                    if (shouldIncrement) writeLastIncrementAt(slug, Date.now());
                }
            } catch (e) {
                if (!cancelled) {
                    setError("—");
                }
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [slug]);

    if (error) return <span className="text-xs text-gray-500">{error}</span>;
    if (total === null)
        return <span className="text-xs text-gray-500">—</span>;

    return (
        <span className="text-xs text-gray-500">
            조회 {formatNumber(total)}회
        </span>
    );
};
