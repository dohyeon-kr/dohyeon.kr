#!/usr/bin/env python3
"""Small loopback-only visitor counter compatible with the legacy Astro DB."""

from __future__ import annotations

import json
import hashlib
import hmac
import os
import re
import secrets
import signal
import sqlite3
import threading
import time
import unicodedata
import uuid
from http.client import HTTPConnection
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
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
                CREATE TABLE IF NOT EXISTS stats_post_views (
                    slug TEXT PRIMARY KEY,
                    total INTEGER NOT NULL CHECK (total >= 0),
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS anonymous_comments (
                    id TEXT PRIMARY KEY,
                    post_slug TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    body TEXT NOT NULL,
                    status TEXT NOT NULL CHECK (status IN ('visible', 'deleted')),
                    delete_token_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    deleted_at TEXT
                );
                CREATE INDEX IF NOT EXISTS anonymous_comments_post
                    ON anonymous_comments (post_slug, status, created_at);
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

    @staticmethod
    def valid_slug(slug: str) -> bool:
        return re.fullmatch(r"[A-Za-z0-9_-]{1,191}", slug) is not None

    def get_post(self, slug: str) -> dict[str, int]:
        if not self.valid_slug(slug):
            raise ValueError("invalid post slug")
        with self._connect() as connection:
            row = connection.execute(
                "SELECT total FROM stats_post_views WHERE slug = ?", (slug,)
            ).fetchone()
        return {"total": int(row[0]) if row else 0}

    def increment_post(
        self, slug: str, now: datetime | None = None
    ) -> dict[str, int]:
        if not self.valid_slug(slug):
            raise ValueError("invalid post slug")
        current = now or datetime.now(KST)
        updated_at = current.astimezone().isoformat()
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            connection.execute(
                """
                INSERT INTO stats_post_views (slug, total, updated_at)
                VALUES (?, 1, ?)
                ON CONFLICT(slug) DO UPDATE SET
                    total = total + 1,
                    updated_at = excluded.updated_at
                """,
                (slug, updated_at),
            )
            total = connection.execute(
                "SELECT total FROM stats_post_views WHERE slug = ?", (slug,)
            ).fetchone()[0]
        return {"total": int(total)}

    @staticmethod
    def normalize_comment(display_name: object, body: object) -> tuple[str, str]:
        if not isinstance(display_name, str) or not isinstance(body, str):
            raise ValueError("invalid comment")
        name = unicodedata.normalize("NFC", display_name).strip() or "익명"
        text = unicodedata.normalize("NFC", body).strip()
        if len(name) > 30 or any(ord(char) < 32 for char in name):
            raise ValueError("invalid display name")
        if not 2 <= len(text) <= 2000:
            raise ValueError("invalid comment body")
        if any(ord(char) < 32 and char not in "\n\t" for char in text):
            raise ValueError("invalid comment body")
        if len(re.findall(r"https?://", text, flags=re.IGNORECASE)) > 2:
            raise ValueError("too many links")
        return name, text

    def list_comments(self, slug: str) -> list[dict[str, str]]:
        if not self.valid_slug(slug):
            raise ValueError("invalid post slug")
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT id, display_name, body, created_at
                FROM anonymous_comments
                WHERE post_slug = ? AND status = 'visible'
                ORDER BY created_at ASC, id ASC
                """,
                (slug,),
            ).fetchall()
        return [
            {"id": row[0], "displayName": row[1], "body": row[2], "createdAt": row[3]}
            for row in rows
        ]

    def create_comment(
        self, slug: str, display_name: object, body: object
    ) -> tuple[dict[str, str], str]:
        if not self.valid_slug(slug):
            raise ValueError("invalid post slug")
        name, text = self.normalize_comment(display_name, body)
        comment_id = uuid.uuid4().hex
        delete_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(delete_token.encode()).hexdigest()
        created_at = datetime.now().astimezone().isoformat()
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO anonymous_comments
                    (id, post_slug, display_name, body, status, delete_token_hash, created_at)
                VALUES (?, ?, ?, ?, 'visible', ?, ?)
                """,
                (comment_id, slug, name, text, token_hash, created_at),
            )
        return ({"id": comment_id, "displayName": name, "body": text, "createdAt": created_at}, delete_token)

    def delete_comment(self, slug: str, comment_id: str, delete_token: object) -> bool:
        if not self.valid_slug(slug) or not re.fullmatch(r"[0-9a-f]{32}", comment_id):
            raise ValueError("invalid comment")
        if not isinstance(delete_token, str) or len(delete_token) > 128:
            return False
        with self._connect() as connection:
            row = connection.execute(
                "SELECT delete_token_hash FROM anonymous_comments WHERE id = ? AND post_slug = ? AND status = 'visible'",
                (comment_id, slug),
            ).fetchone()
            supplied = hashlib.sha256(delete_token.encode()).hexdigest()
            if row is None or not hmac.compare_digest(row[0], supplied):
                return False
            connection.execute(
                "UPDATE anonymous_comments SET status = 'deleted', display_name = '', body = '', deleted_at = ? WHERE id = ?",
                (datetime.now().astimezone().isoformat(), comment_id),
            )
        return True

    def admin_list_comments(self) -> list[dict[str, str]]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT id, post_slug, display_name, body, status, created_at,
                       COALESCE(deleted_at, '')
                FROM anonymous_comments
                ORDER BY created_at DESC, id DESC
                LIMIT 500
                """
            ).fetchall()
        return [
            {
                "id": row[0],
                "postSlug": row[1],
                "displayName": row[2],
                "body": row[3],
                "status": row[4],
                "createdAt": row[5],
                "deletedAt": row[6],
            }
            for row in rows
        ]

    def admin_delete_comment(self, comment_id: str) -> bool:
        if not re.fullmatch(r"[0-9a-f]{32}", comment_id):
            raise ValueError("invalid comment")
        with self._connect() as connection:
            cursor = connection.execute(
                """
                UPDATE anonymous_comments
                SET status = 'deleted', display_name = '', body = '', deleted_at = ?
                WHERE id = ? AND status = 'visible'
                """,
                (datetime.now().astimezone().isoformat(), comment_id),
            )
        return cursor.rowcount == 1


class CommentGuard:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._challenges: dict[str, float] = {}
        self._submissions: dict[str, list[float]] = {}

    def issue(self, client_key: str) -> str:
        token = secrets.token_urlsafe(24)
        now = time.monotonic()
        with self._lock:
            self._challenges[token] = now
            self._challenges = {key: issued_at for key, issued_at in self._challenges.items() if now - issued_at < 3600}
        return token

    def consume(self, token: object, client_key: str) -> bool:
        if not isinstance(token, str):
            return False
        now = time.monotonic()
        with self._lock:
            issued_at = self._challenges.pop(token, None)
            if issued_at is None or not 1 <= now - issued_at <= 3600:
                return False
            recent = [stamp for stamp in self._submissions.get(client_key, []) if now - stamp < 600]
            if len(recent) >= 8:
                self._submissions[client_key] = recent
                return False
            recent.append(now)
            self._submissions[client_key] = recent
        return True


class VisitServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address: tuple[str, int], store: VisitStore) -> None:
        super().__init__(address, VisitHandler)
        self.store = store
        self.comment_guard = CommentGuard()


class VisitHandler(BaseHTTPRequestHandler):
    server: VisitServer
    server_version = "VisitorCounter/1"
    sys_version = ""

    def _send_json(self, status: int, payload: object) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'none'")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(body)

    def _path(self) -> str:
        return urlsplit(self.path).path

    def _post_slug(self) -> str | None:
        prefix = "/api/visit/post/"
        path = self._path()
        if not path.startswith(prefix):
            return None
        try:
            slug = unquote(path[len(prefix) :], errors="strict")
        except UnicodeDecodeError:
            return None
        return slug if self.server.store.valid_slug(slug) else None

    def _comment_route(self) -> tuple[str, str | None] | None:
        parts = self._path().removeprefix("/api/comments/").split("/")
        if not self._path().startswith("/api/comments/") or len(parts) not in (1, 2):
            return None
        try:
            slug = unquote(parts[0], errors="strict")
        except UnicodeDecodeError:
            return None
        if not self.server.store.valid_slug(slug):
            return None
        comment_id = parts[1] if len(parts) == 2 else None
        return slug, comment_id

    def _comment_admin_id(self) -> str | None:
        prefix = "/ghost/api/comments-admin/"
        path = self._path()
        if not path.startswith(prefix):
            return None
        comment_id = path[len(prefix) :]
        return comment_id if re.fullmatch(r"[0-9a-f]{32}", comment_id) else None

    def _is_ghost_admin(self) -> bool:
        cookie = self.headers.get("Cookie")
        if not cookie or len(cookie) > 8192:
            return False
        connection = HTTPConnection("127.0.0.1", 2368, timeout=3)
        try:
            connection.request(
                "GET",
                "/ghost/api/admin/users/me/",
                headers={
                    "Cookie": cookie,
                    "Host": "blog.dohyeon.kr",
                    "X-Forwarded-Proto": "https",
                    "User-Agent": self.headers.get("User-Agent", "comment-admin"),
                },
            )
            response = connection.getresponse()
            response.read()
            return response.status == 200
        except OSError:
            return False
        finally:
            connection.close()

    def _client_key(self) -> str:
        value = f"{self.headers.get('X-Real-IP', self.client_address[0])}|{self.headers.get('User-Agent', '')}"
        return hashlib.sha256(value.encode()).hexdigest()

    def _read_json(self, limit: int = 4096) -> dict[str, object] | None:
        if self.headers.get_content_type() != "application/json":
            return None
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return None
        if not 0 < length <= limit:
            return None
        try:
            payload = json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None
        return payload if isinstance(payload, dict) else None

    def _valid_origin(self) -> bool:
        return self.headers.get("Origin") == "https://blog.dohyeon.kr"

    def do_GET(self) -> None:  # noqa: N802
        if self._path() == "/healthz":
            self._send_json(200, {"status": "ok"})
            return
        if self._path() == "/api/visit":
            self._send_json(200, self.server.store.get())
            return
        if self._path() == "/ghost/api/comments-admin":
            if not self._is_ghost_admin():
                self._send_json(401, {"error": "ghost_admin_required"})
                return
            comments = self.server.store.admin_list_comments()
            self._send_json(200, {"comments": comments, "count": len(comments)})
            return
        post_slug = self._post_slug()
        if post_slug is not None:
            self._send_json(200, self.server.store.get_post(post_slug))
            return
        comment_route = self._comment_route()
        if comment_route is not None and comment_route[1] is None:
            slug = comment_route[0]
            self._send_json(200, {"comments": self.server.store.list_comments(slug), "challenge": self.server.comment_guard.issue(self._client_key())})
            return
        self._send_json(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        comment_route = self._comment_route()
        if comment_route is not None and comment_route[1] is None:
            if not self._valid_origin():
                self._send_json(403, {"error": "invalid_origin"})
                return
            payload = self._read_json()
            if payload is None or payload.get("website"):
                self._send_json(400, {"error": "invalid_request"})
                return
            if not self.server.comment_guard.consume(payload.get("challenge"), self._client_key()):
                self._send_json(429, {"error": "retry_required"})
                return
            try:
                comment, delete_token = self.server.store.create_comment(comment_route[0], payload.get("displayName", ""), payload.get("body"))
            except ValueError:
                self._send_json(400, {"error": "invalid_comment"})
                return
            self._send_json(201, {"comment": comment, "deleteToken": delete_token})
            return
        post_slug = self._post_slug()
        if self._path() != "/api/visit" and post_slug is None:
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
        if post_slug is not None:
            self._send_json(200, self.server.store.increment_post(post_slug))
        else:
            self._send_json(200, self.server.store.increment())

    def do_DELETE(self) -> None:  # noqa: N802
        admin_comment_id = self._comment_admin_id()
        if admin_comment_id is not None:
            if not self._valid_origin() or not self._is_ghost_admin():
                self._send_json(401, {"error": "ghost_admin_required"})
                return
            if not self.server.store.admin_delete_comment(admin_comment_id):
                self._send_json(404, {"error": "comment_not_found"})
                return
            self._send_json(200, {"status": "deleted"})
            return
        comment_route = self._comment_route()
        if comment_route is None or comment_route[1] is None:
            self._send_json(404, {"error": "not_found"})
            return
        if not self._valid_origin():
            self._send_json(403, {"error": "invalid_origin"})
            return
        payload = self._read_json(512)
        if payload is None or not self.server.store.delete_comment(comment_route[0], comment_route[1], payload.get("deleteToken")):
            self._send_json(403, {"error": "invalid_delete_token"})
            return
        self._send_json(200, {"status": "deleted"})

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
