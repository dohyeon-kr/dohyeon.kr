#!/usr/bin/env python3
"""Small loopback-only visitor counter compatible with the legacy Astro DB."""

from __future__ import annotations

import json
import os
import signal
import sqlite3
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo


KST = ZoneInfo("Asia/Seoul")


class VisitStore:
    def __init__(self, database_path: Path) -> None:
        self.database_path = database_path
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path, timeout=5)
        connection.execute("PRAGMA busy_timeout = 5000")
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute("PRAGMA journal_mode = WAL")
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS stats_total (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    total INTEGER NOT NULL CHECK (total >= 0),
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS stats_daily (
                    day TEXT PRIMARY KEY,
                    total INTEGER NOT NULL CHECK (total >= 0),
                    updated_at TEXT NOT NULL
                );
                """
            )
            connection.execute(
                """
                INSERT OR IGNORE INTO stats_total (id, total, updated_at)
                VALUES (1, 0, ?)
                """,
                (datetime.now().astimezone().isoformat(),),
            )

    @staticmethod
    def _day(now: datetime | None = None) -> str:
        current = now or datetime.now(KST)
        return current.astimezone(KST).date().isoformat()

    def get(self, now: datetime | None = None) -> dict[str, int]:
        day = self._day(now)
        with self._connect() as connection:
            total_row = connection.execute(
                "SELECT total FROM stats_total WHERE id = 1"
            ).fetchone()
            today_row = connection.execute(
                "SELECT total FROM stats_daily WHERE day = ?", (day,)
            ).fetchone()
        return {
            "today": int(today_row[0]) if today_row else 0,
            "total": int(total_row[0]) if total_row else 0,
        }

    def increment(self, now: datetime | None = None) -> dict[str, int]:
        current = now or datetime.now(KST)
        day = self._day(current)
        updated_at = current.astimezone().isoformat()

        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            connection.execute(
                """
                UPDATE stats_total
                SET total = total + 1, updated_at = ?
                WHERE id = 1
                """,
                (updated_at,),
            )
            connection.execute(
                """
                INSERT INTO stats_daily (day, total, updated_at)
                VALUES (?, 1, ?)
                ON CONFLICT(day) DO UPDATE SET
                    total = total + 1,
                    updated_at = excluded.updated_at
                """,
                (day, updated_at),
            )
            total = connection.execute(
                "SELECT total FROM stats_total WHERE id = 1"
            ).fetchone()[0]
            today = connection.execute(
                "SELECT total FROM stats_daily WHERE day = ?", (day,)
            ).fetchone()[0]
        return {"today": int(today), "total": int(total)}


class VisitServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address: tuple[str, int], store: VisitStore) -> None:
        super().__init__(address, VisitHandler)
        self.store = store


class VisitHandler(BaseHTTPRequestHandler):
    server: VisitServer
    server_version = "VisitorCounter/1"
    sys_version = ""

    def _send_json(self, status: int, payload: dict[str, int | str]) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'none'")
        self.end_headers()
        self.wfile.write(body)

    def _path(self) -> str:
        return urlsplit(self.path).path

    def do_GET(self) -> None:  # noqa: N802
        if self._path() == "/healthz":
            self._send_json(200, {"status": "ok"})
            return
        if self._path() == "/api/visit":
            self._send_json(200, self.server.store.get())
            return
        self._send_json(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        if self._path() != "/api/visit":
            self._send_json(404, {"error": "not_found"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send_json(400, {"error": "invalid_content_length"})
            return
        if content_length > 1024:
            self._send_json(413, {"error": "payload_too_large"})
            return
        if content_length:
            self.rfile.read(content_length)
        self._send_json(200, self.server.store.increment())

    def log_message(self, message: str, *args: object) -> None:
        print(f"visitor-counter: {self.address_string()} {message % args}", flush=True)


def main() -> None:
    host = os.environ.get("VISIT_COUNTER_HOST", "127.0.0.1")
    if host != "127.0.0.1":
        raise SystemExit("VISIT_COUNTER_HOST must be 127.0.0.1")

    port = int(os.environ.get("VISIT_COUNTER_PORT", "2370"))
    database_path = Path(
        os.environ.get("VISIT_COUNTER_DB", "/var/lib/dohyeon-kr/visits.sqlite")
    )
    server = VisitServer((host, port), VisitStore(database_path))
    def stop(_signum: int, _frame: object) -> None:
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
