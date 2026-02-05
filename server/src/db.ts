import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getKstDateId } from "./kst.js";

export type VisitStats = {
    today: number;
    total: number;
};

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getDbPath(): string {
    // 기본은 server/data/visits.sqlite
    return (
        process.env.DB_PATH ??
        path.join(process.cwd(), "data", "visits.sqlite")
    );
}

const dbPath = getDbPath();
ensureDir(path.dirname(dbPath));

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

export function initSchema() {
    // #region agent log
    try {
        const exists = fs.existsSync(dbPath);
        const stat = exists ? fs.statSync(dbPath) : null;
        console.log("[visit-stats][db] initSchema", {
            dbPath,
            cwd: process.cwd(),
            exists,
            size: stat?.size ?? null,
            mtimeMs: stat?.mtimeMs ?? null,
        });
    } catch (e) {
        console.log("[visit-stats][db] initSchema log failed", {
            dbPath,
            cwd: process.cwd(),
        });
    }
    // #endregion

    db.exec(`
CREATE TABLE IF NOT EXISTS stats_total (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  total INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stats_daily (
  day TEXT PRIMARY KEY,
  total INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
    `.trim());

    const row = db
        .prepare("SELECT total FROM stats_total WHERE id = 1")
        .get() as { total: number } | undefined;
    if (!row) {
        db.prepare(
            "INSERT INTO stats_total (id, total, updated_at) VALUES (1, 0, ?)"
        ).run(new Date().toISOString());
    }

    // #region agent log
    try {
        const after = db
            .prepare("SELECT total, updated_at FROM stats_total WHERE id = 1")
            .get() as { total: number; updated_at: string } | undefined;
        console.log("[visit-stats][db] schemaReady", {
            dbPath,
            total: after?.total ?? null,
            updatedAt: after?.updated_at ?? null,
        });
    } catch (e) {
        console.log("[visit-stats][db] schemaReady log failed", { dbPath });
    }
    // #endregion
}

export function getVisitStats(now = new Date()): VisitStats {
    const day = getKstDateId(now);

    const totalRow = db
        .prepare("SELECT total FROM stats_total WHERE id = 1")
        .get() as { total: number } | undefined;
    const dailyRow = db
        .prepare("SELECT total FROM stats_daily WHERE day = ?")
        .get(day) as { total: number } | undefined;

    return {
        total: totalRow?.total ?? 0,
        today: dailyRow?.total ?? 0,
    };
}

const incrementTx = db.transaction((nowIso: string, day: string) => {
    db.prepare(
        "UPDATE stats_total SET total = total + 1, updated_at = ? WHERE id = 1"
    ).run(nowIso);

    db.prepare(
        `
INSERT INTO stats_daily (day, total, updated_at)
VALUES (?, 1, ?)
ON CONFLICT(day) DO UPDATE SET total = total + 1, updated_at = excluded.updated_at
    `.trim()
    ).run(day, nowIso);

    const totalRow = db
        .prepare("SELECT total FROM stats_total WHERE id = 1")
        .get() as { total: number } | undefined;
    const dailyRow = db
        .prepare("SELECT total FROM stats_daily WHERE day = ?")
        .get(day) as { total: number } | undefined;

    return {
        total: totalRow?.total ?? 0,
        today: dailyRow?.total ?? 0,
    } satisfies VisitStats;
});

export function incrementVisit(now = new Date()): VisitStats {
    const nowIso = now.toISOString();
    const day = getKstDateId(now);
    return incrementTx(nowIso, day);
}

