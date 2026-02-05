import React from "react";

type Stats = {
    today: number;
    total: number;
};

function formatNumber(n: number) {
    return new Intl.NumberFormat("ko-KR").format(n);
}

const LAST_INCREMENT_AT_KEY = "visitStats:lastIncrementAt";
const CACHED_STATS_KEY = "visitStats:cachedStats";
const INCREMENT_TTL_MS = 30 * 60 * 1000; // 30 minutes

function readLastIncrementAt(): number | null {
    const raw = localStorage.getItem(LAST_INCREMENT_AT_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

function writeLastIncrementAt(ts: number) {
    localStorage.setItem(LAST_INCREMENT_AT_KEY, String(ts));
}

function readCachedStats(): Stats | null {
    const raw = localStorage.getItem(CACHED_STATS_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<Stats>;
        if (
            typeof parsed?.today === "number" &&
            typeof parsed?.total === "number"
        ) {
            return { today: parsed.today, total: parsed.total };
        }
        return null;
    } catch {
        return null;
    }
}

function writeCachedStats(stats: Stats) {
    localStorage.setItem(CACHED_STATS_KEY, JSON.stringify(stats));
}

export const FooterVisitStats: React.FC = () => {
    const [stats, setStats] = React.useState<Stats | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        let cancelled = false;

        const cached = readCachedStats();
        if (cached) setStats(cached);

        const run = async () => {
            try {
                const lastAt = readLastIncrementAt();
                const shouldIncrement =
                    !lastAt || Date.now() - lastAt > INCREMENT_TTL_MS;

                const res = await fetch("/api/visit", {
                    method: shouldIncrement ? "POST" : "GET",
                    headers: {
                        Accept: "application/json",
                    },
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = (await res.json()) as any;

                const next: Stats = {
                    today: Number(data?.today ?? 0),
                    total: Number(data?.total ?? 0),
                };

                if (!cancelled) {
                    setStats(next);
                    writeCachedStats(next);
                    if (shouldIncrement) writeLastIncrementAt(Date.now());
                }
            } catch (e) {
                if (!cancelled) {
                    setError("통계를 불러오지 못했습니다.");
                }
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, []);

    if (error) return <span className="text-xs text-gray-500">{error}</span>;
    if (!stats)
        return <span className="text-xs text-gray-500">Loading stats…</span>;

    return (
        <span className="text-xs text-gray-500">
            Today {formatNumber(stats.today)} / Total {formatNumber(stats.total)}
        </span>
    );
};

