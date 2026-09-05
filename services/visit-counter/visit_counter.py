#!/usr/bin/env python3
"""Small loopback-only visitor counter compatible with the legacy Astro DB."""

from __future__ import annotations

import json
import base64
import subprocess
import tempfile
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from contextlib import contextmanager
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
from datetime import datetime, date, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit, parse_qs, quote, urlencode
from zoneinfo import ZoneInfo


KST = ZoneInfo("Asia/Seoul")


class VisitStore:
    def __init__(self, database_path: Path) -> None:
        self.database_path = database_path
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    @contextmanager
    def _connect(self):
        connection = sqlite3.connect(self.database_path, timeout=5)
        connection.execute("PRAGMA busy_timeout = 5000")
        try:
            with connection:
                yield connection
        finally:
            connection.close()

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
                CREATE TABLE IF NOT EXISTS stats_post_daily (
                    day TEXT NOT NULL, slug TEXT NOT NULL, total INTEGER NOT NULL,
                    PRIMARY KEY (day, slug)
                );
                CREATE TABLE IF NOT EXISTS dashboard_meta (
                    key TEXT PRIMARY KEY, value TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS comment_moderation (
                    comment_id TEXT PRIMARY KEY REFERENCES anonymous_comments(id),
                    hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1))
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
                "INSERT OR IGNORE INTO dashboard_meta VALUES ('post_daily_since', ?)",
                (datetime.now(KST).isoformat(),),
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
            connection.execute(
                "INSERT INTO stats_post_daily VALUES (?, ?, 1) "
                "ON CONFLICT(day, slug) DO UPDATE SET total = total + 1",
                (self._day(current), slug),
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
                AND NOT EXISTS (SELECT 1 FROM comment_moderation m WHERE m.comment_id = anonymous_comments.id AND m.hidden = 1)
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

    def admin_list_comments(self, limit: int = 500, offset: int = 0) -> list[dict[str, str]]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT id, post_slug, display_name, body, status, created_at,
                       COALESCE(deleted_at, ''),
                       COALESCE((SELECT hidden FROM comment_moderation WHERE comment_id = anonymous_comments.id), 0)
                FROM anonymous_comments
                ORDER BY created_at DESC, id DESC
                LIMIT ? OFFSET ?
                """, (limit, offset)
            ).fetchall()
        return [
            {
                "id": row[0],
                "postSlug": row[1],
                "displayName": row[2],
                "body": row[3],
                "status": "hidden" if row[4] == "visible" and row[7] else row[4],
                "createdAt": row[5],
                "deletedAt": row[6],
            }
            for row in rows
        ]

    def moderate_comment(self, comment_id: str, hidden: bool) -> bool:
        if not re.fullmatch(r"[0-9a-f]{32}", comment_id):
            raise ValueError("invalid comment")
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute("SELECT status FROM anonymous_comments WHERE id = ?", (comment_id,)).fetchone()
            if not row or row[0] != "visible":
                return False
            connection.execute(
                "INSERT INTO comment_moderation VALUES (?, ?) ON CONFLICT(comment_id) DO UPDATE SET hidden = excluded.hidden",
                (comment_id, int(hidden)),
            )
        return True

    def dashboard(self, start: str, end: str, slug: str | None = None) -> dict:
        if slug is not None and not self.valid_slug(slug):
            raise ValueError("invalid slug")
        first, last = date.fromisoformat(start), date.fromisoformat(end)
        if first > last or (last - first).days > 365 or last > datetime.now(KST).date():
            raise ValueError("invalid date range")
        length = (last - first).days + 1
        previous_start = (first - timedelta(days=length)).isoformat()
        with self._connect() as connection:
            visits = dict(connection.execute("SELECT day, total FROM stats_daily WHERE day BETWEEN ? AND ?", (previous_start, end)))
            views = dict(connection.execute("SELECT day, SUM(total) FROM stats_post_daily WHERE day BETWEEN ? AND ? GROUP BY day", (previous_start, end)))
            if slug is not None:
                views = dict(connection.execute("SELECT day, total FROM stats_post_daily WHERE day BETWEEN ? AND ? AND slug = ?", (previous_start, end, slug)))
            since = connection.execute("SELECT value FROM dashboard_meta WHERE key = 'post_daily_since'").fetchone()[0]
            visits_since = connection.execute("SELECT MIN(day) FROM stats_daily").fetchone()[0]
            posts = connection.execute(
                "SELECT p.slug, p.total, "
                "COALESCE(SUM(CASE WHEN d.day BETWEEN ? AND ? THEN d.total ELSE 0 END), 0), "
                "COALESCE(SUM(CASE WHEN d.day >= ? AND d.day < ? THEN d.total ELSE 0 END), 0) "
                "FROM stats_post_views p LEFT JOIN stats_post_daily d ON d.slug = p.slug AND d.day >= ? "
                "GROUP BY p.slug ORDER BY 3 DESC, p.slug", (start, end, previous_start, start, previous_start)
            ).fetchall()
            comments = dict(connection.execute(
                "SELECT CASE WHEN status = 'deleted' THEN 'deleted' WHEN COALESCE(m.hidden, 0) = 1 THEN 'hidden' ELSE 'visible' END, COUNT(*) "
                "FROM anonymous_comments c LEFT JOIN comment_moderation m ON m.comment_id = c.id GROUP BY 1"
            ))
        def point(day):
            key = day.isoformat()
            return {"day": key, "visits": visits.get(key, 0) if visits_since and key >= visits_since else None,
                    "views": views.get(key, 0) if key >= since[:10] else None}
        current = [point(first + timedelta(days=i)) for i in range(length)]
        previous = [point(first - timedelta(days=length) + timedelta(days=i)) for i in range(length)]
        return {"start": start, "end": end, "daily": current, "previous": previous,
                "posts": [{"slug": r[0], "lifetime": r[1], "views": r[2] if end >= since[:10] else None,
                           "previous": r[3] if previous_start > since[:10] else None} for r in posts],
                "comments": {"visible": comments.get("visible", 0), "hidden": comments.get("hidden", 0), "deleted": comments.get("deleted", 0)},
                "coverage": {"visitsSince": visits_since, "postDailySince": since},
                "updatedAt": datetime.now(KST).isoformat(), "timezone": "Asia/Seoul"}

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


class GoogleReports:
    """Read-only reports; credentials and tokens never leave the server."""

    def __init__(self, config_path="/etc/dlog/google-reports.json"):
        self.config_path = Path(config_path)
        self._token = ""
        self._expires = 0
        self._token_lock = threading.Lock()
        self._locks = {name: threading.Lock() for name in ("ga4", "searchConsole")}
        self._cache = {name: {} for name in self._locks}

    @staticmethod
    def _json_request(url, body, headers):
        request = Request(url, data=body, headers=headers)
        with urlopen(request, timeout=8) as response:
            return json.load(response)

    def _access_token(self, config):
        with self._token_lock:
            if self._token and time.monotonic() < self._expires:
                return self._token
            key = json.loads(Path(config.get("credentials", "/etc/dlog/google-service-account.json")).read_text())
            def encode(value):
                return base64.urlsafe_b64encode(value).rstrip(b"=")
            now = int(time.time())
            claims = {"iss": key["client_email"], "aud": "https://oauth2.googleapis.com/token",
                      "scope": "https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly",
                      "iat": now, "exp": now + 3600}
            unsigned = encode(b'{"alg":"RS256","typ":"JWT"}') + b"." + encode(json.dumps(claims).encode())
            with tempfile.NamedTemporaryFile() as private:
                private.write(key["private_key"].encode())
                private.flush()
                signed = subprocess.run(["/usr/bin/openssl", "dgst", "-sha256", "-sign", private.name],
                                        input=unsigned, capture_output=True, check=True, timeout=5).stdout
            token = self._json_request("https://oauth2.googleapis.com/token", urlencode({
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": (unsigned + b"." + encode(signed)).decode(),
            }).encode(), {"Content-Type": "application/x-www-form-urlencoded"})
            self._token = token["access_token"]
            self._expires = time.monotonic() + max(0, int(token["expires_in"]) - 120)
            return self._token

    def _post(self, url, body, config):
        return self._json_request(url, json.dumps(body).encode(), {
            "Authorization": "Bearer " + self._access_token(config), "Content-Type": "application/json"})

    def report(self, provider, start, end):
        if provider not in self._locks:
            raise ValueError("invalid provider")
        first, last = date.fromisoformat(start), date.fromisoformat(end)
        if first > last or (last - first).days > 365 or last > datetime.now(KST).date():
            raise ValueError("invalid date range")
        # Canonical dates prevent alternate representations from filling the cache.
        start, end = first.isoformat(), last.isoformat()
        with self._locks[provider]:
            cache = self._cache[provider]
            cached = cache.get((start, end))
            if cached and cached[0] > time.monotonic():
                return cached[1]
            try:
                config = json.loads(self.config_path.read_text())
                data = self._ga4(start, end, config) if provider == "ga4" else self._search(start, end, config)
                result = {"status": "connected", "start": start, "end": end,
                          "updatedAt": datetime.now(KST).isoformat(), **data}
                ttl = 300
            except HTTPError as error:
                messages = {401: "Google 인증이 만료되었습니다. 서버 인증 설정을 확인해 주세요.",
                            403: "Google API 사용 설정과 속성 읽기 권한을 확인해 주세요.",
                            429: "Google 조회 한도에 도달했습니다. 잠시 후 다시 시도해 주세요."}
                result = {"status": "error", "message": messages.get(error.code, "Google 통계를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.")}
                ttl = 30
                if error.code == 401:
                    with self._token_lock:
                        self._expires = 0
            except FileNotFoundError:
                result = {"status": "error", "message": "서버의 Google 인증 설정이 필요합니다."}
                ttl = 30
            except (OSError, ValueError, KeyError, TypeError, IndexError, subprocess.SubprocessError):
                result = {"status": "error", "message": "Google 연결을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요."}
                ttl = 30
            if len(cache) >= 32:
                cache.pop(next(iter(cache)))
            cache[(start, end)] = (time.monotonic() + ttl, result)
            return result

    def _ga4(self, start, end, config):
        property_id = str(config["ga4PropertyId"])
        if not re.fullmatch(r"\d+", property_id):
            raise ValueError("invalid property")
        url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
        def query(dimensions, metrics, limit, order=None):
            body = {"dateRanges": [{"startDate": start, "endDate": end}],
                    "dimensions": [{"name": name} for name in dimensions],
                    "metrics": [{"name": name} for name in metrics], "limit": str(limit)}
            if order:
                body["orderBys"] = [{"metric": {"metricName": order}, "desc": True}]
            return self._post(url, body, config)
        metrics = ["totalUsers", "sessions", "screenPageViews"]
        summary = query([], metrics, 1)
        daily = query(["date"], metrics, 366)
        sources = query(["sessionSourceMedium"], ["sessions"], 20, "sessions")
        def values(row):
            return [int(value["value"]) for value in row["metricValues"]]
        totals = values(summary["rows"][0]) if summary.get("rows") else [0, 0, 0]
        days = []
        for row in daily.get("rows", []):
            day = datetime.strptime(row["dimensionValues"][0]["value"], "%Y%m%d").date().isoformat()
            users, sessions, views = values(row)
            days.append({"day": day, "users": users, "sessions": sessions, "views": views})
        metadata = summary.get("metadata", {})
        return {"propertyId": property_id, "timezone": metadata.get("timeZone", "속성 시간대"),
                "summary": dict(zip(["users", "sessions", "views"], totals)), "daily": sorted(days, key=lambda x: x["day"]),
                "sources": [{"source": row["dimensionValues"][0]["value"], "sessions": values(row)[0]} for row in sources.get("rows", [])],
                "thresholded": any(r.get("metadata", {}).get("subjectToThresholding", False) for r in [summary, daily, sources])}

    def _search(self, start, end, config):
        site = config["searchConsoleSite"]
        url = "https://www.googleapis.com/webmasters/v3/sites/" + quote(site, safe="") + "/searchAnalytics/query"
        def query(dimensions, limit):
            return self._post(url, {"startDate": start, "endDate": end, "type": "web",
                                   "dataState": "final", "dimensions": dimensions, "rowLimit": limit}, config)
        # Totals are queried independently: anonymized queries are absent from the query table.
        summary = query([], 1)
        daily = query(["date"], 366)
        queries = query(["query"], 50)
        def values(row):
            return {key: row[key] for key in ("clicks", "impressions", "ctr", "position")}
        return {"site": site, "timezone": "America/Los_Angeles",
                "summary": values(summary["rows"][0]) if summary.get("rows") else None,
                "daily": sorted([{"day": row["keys"][0], **values(row)} for row in daily.get("rows", [])], key=lambda x: x["day"]),
                "queries": [{"query": row["keys"][0], **values(row)} for row in queries.get("rows", [])]}


class VisitServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address: tuple[str, int], store: VisitStore) -> None:
        super().__init__(address, VisitHandler)
        self.store = store
        self.comment_guard = CommentGuard()
        self.google_reports = GoogleReports()


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
                "/ghost/api/admin/users/me/?include=roles",
                headers={
                    "Cookie": cookie,
                    "Host": "blog.dohyeon.kr",
                    "X-Forwarded-Proto": "https",
                    "User-Agent": self.headers.get("User-Agent", "comment-admin"),
                },
            )
            response = connection.getresponse()
            payload = json.loads(response.read()) if response.status == 200 else {}
            users = payload.get("users", [])
            return any(role.get("name") in ("Owner", "Administrator") for user in users for role in user.get("roles", []))
        except (OSError, ValueError, TypeError):
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
        if self._path() == "/ghost/api/dashboard/google":
            if not self._is_ghost_admin():
                self._send_json(401, {"error": "ghost_admin_required"})
                return
            query = parse_qs(urlsplit(self.path).query)
            try:
                result = self.server.google_reports.report(query.get("provider", [""])[0],
                                                          query.get("start", [""])[0], query.get("end", [""])[0])
            except ValueError:
                self._send_json(400, {"error": "invalid_report_query"})
                return
            self._send_json(200, result)
            return
        if self._path() in ("/ghost/api/dashboard", "/ghost/api/dashboard/post"):
            if not self._is_ghost_admin():
                self._send_json(401, {"error": "ghost_admin_required"})
                return
            query = parse_qs(urlsplit(self.path).query)
            try:
                result = self.server.store.dashboard(query.get("start", [""])[0], query.get("end", [""])[0], query.get("slug", [""])[0] if self._path().endswith("/post") else None)
            except ValueError:
                self._send_json(400, {"error": "invalid_date_range"})
                return
            self._send_json(200, result)
            return
        if self._path() == "/ghost/api/comments-admin":
            if not self._is_ghost_admin():
                self._send_json(401, {"error": "ghost_admin_required"})
                return
            query = parse_qs(urlsplit(self.path).query)
            try:
                offset = int(query.get("offset", ["0"])[0])
                if offset < 0:
                    raise ValueError()
            except ValueError:
                self._send_json(400, {"error": "invalid_offset"})
                return
            comments = self.server.store.admin_list_comments(offset=offset)
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
        admin_comment_id = self._comment_admin_id()
        if admin_comment_id is not None:
            if not self._valid_origin() or not self._is_ghost_admin():
                self._send_json(401, {"error": "ghost_admin_required"})
                return
            payload = self._read_json()
            if not payload or payload.get("action") not in ("hide", "restore"):
                self._send_json(400, {"error": "invalid_action"})
                return
            if not self.server.store.moderate_comment(admin_comment_id, payload["action"] == "hide"):
                self._send_json(404, {"error": "comment_not_found"})
                return
            self._send_json(200, {"status": "ok"})
            return
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
