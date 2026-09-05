from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch, MagicMock
from http.client import HTTPConnection
import threading
import json
import unittest
from visit_counter import VisitStore, VisitServer, VisitHandler


class DashboardTest(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.store = VisitStore(Path(self.temp.name) / 'visits.sqlite')
        with self.store._connect() as db:
            db.execute("UPDATE dashboard_meta SET value = '2026-08-01T12:00:00+09:00'")

    def tearDown(self):
        self.temp.cleanup()

    def test_daily_views_keep_lifetime_and_kst_boundaries(self):
        with self.store._connect() as db:
            db.execute("INSERT INTO stats_post_views VALUES ('post', 100, 'legacy')")
        self.store.increment_post('post', datetime(2026, 8, 25, 14, 59, tzinfo=timezone.utc))
        self.store.increment_post('post', datetime(2026, 8, 25, 15, 0, tzinfo=timezone.utc))
        data = self.store.dashboard('2026-08-25', '2026-08-26')
        self.assertEqual([p['views'] for p in data['daily']], [1, 1])
        self.assertEqual(data['posts'][0]['lifetime'], 102)
        self.assertEqual(data['posts'][0]['views'], 2)
        self.assertEqual(len(data['previous']), 2)
        self.assertEqual(data['previous'][0]['day'], '2026-08-23')

    def test_missing_history_is_not_zero_and_post_filter(self):
        self.store.increment_post('a', datetime(2026, 8, 2, tzinfo=timezone.utc))
        self.store.increment_post('b', datetime(2026, 8, 2, tzinfo=timezone.utc))
        data = self.store.dashboard('2026-07-31', '2026-08-02', 'a')
        self.assertEqual([p['views'] for p in data['daily']], [None, 0, 1])
        self.assertTrue(all(p['visits'] is None for p in data['daily']))
        self.assertTrue(all(p['previous'] is None for p in data['posts']))
        self.assertTrue(all(p['views'] is None for p in self.store.dashboard('2026-07-01', '2026-07-02')['posts']))

    def test_invalid_ranges(self):
        for start, end in [('bad', '2026-08-01'), ('2026-08-02', '2026-08-01'), ('2024-01-01', '2026-01-01'), ('2099-01-01', '2099-01-02')]:
            with self.assertRaises(ValueError):
                self.store.dashboard(start, end)
        with self.assertRaises(ValueError):
            self.store.dashboard('2026-08-01', '2026-08-02', '../bad')

    def test_hide_restore_and_author_erasure(self):
        comment, token = self.store.create_comment('post', 'reader', 'A useful comment')
        self.assertTrue(self.store.moderate_comment(comment['id'], True))
        self.assertEqual(self.store.list_comments('post'), [])
        self.assertEqual(self.store.admin_list_comments()[0]['status'], 'hidden')
        self.assertEqual(self.store.dashboard('2026-08-01', '2026-08-02')['comments']['hidden'], 1)
        self.assertTrue(self.store.moderate_comment(comment['id'], False))
        self.assertEqual(self.store.list_comments('post')[0]['body'], 'A useful comment')
        self.store.moderate_comment(comment['id'], True)
        self.assertTrue(self.store.delete_comment('post', comment['id'], token))
        self.assertFalse(self.store.moderate_comment(comment['id'], False))
        self.assertEqual(self.store.admin_list_comments()[0]['body'], '')

    def test_existing_database_upgrade_is_repeatable(self):
        self.store.increment()
        VisitStore(self.store.database_path)
        self.assertEqual(self.store.get()['total'], 1)
        self.assertEqual(self.store.dashboard('2026-08-01', '2026-08-02')['coverage']['postDailySince'], '2026-08-01T12:00:00+09:00')

    def test_comment_pagination(self):
        for _ in range(4): self.store.create_comment('post', '', 'hello')
        first = self.store.admin_list_comments(limit=2)
        second = self.store.admin_list_comments(limit=2, offset=2)
        self.assertEqual(len(first), 2)
        self.assertFalse(set(c['id'] for c in first) & set(c['id'] for c in second))

    def test_http_auth_origin_and_invalid_queries(self):
        server = VisitServer(('127.0.0.1', 0), self.store)
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        def call(method, path, body=None, headers=None):
            client = HTTPConnection(*server.server_address)
            client.request(method, path, body=body, headers=headers or {})
            response = client.getresponse()
            status = response.status
            result = json.loads(response.read())
            client.close()
            return status, result
        try:
            self.assertEqual(call('GET', '/ghost/api/dashboard?start=2026-08-01&end=2026-08-02')[0], 401)
            with patch.object(server.google_reports, 'report') as report:
                self.assertEqual(call('GET', '/ghost/api/dashboard/google?provider=ga4&start=2026-08-01&end=2026-08-02')[0], 401)
                report.assert_not_called()
            with patch.object(VisitHandler, '_is_ghost_admin', return_value=True):
                self.assertEqual(call('GET', '/ghost/api/dashboard/google?provider=bad&start=2026-08-01&end=2026-08-02')[0], 400)
                with patch.object(server.google_reports, 'report', return_value={'status': 'connected'}) as report:
                    self.assertEqual(call('GET', '/ghost/api/dashboard/google?provider=ga4&start=2026-08-01&end=2026-08-02'), (200, {'status': 'connected'}))
                    report.assert_called_once_with('ga4', '2026-08-01', '2026-08-02')

                self.assertEqual(call('GET', '/ghost/api/dashboard?start=bad&end=bad')[0], 400)
                self.assertEqual(call('GET', '/ghost/api/comments-admin?offset=-1')[0], 400)
                self.assertEqual(call('GET', '/ghost/api/dashboard?start=2026-08-01&end=2026-08-02')[0], 200)
                comment, _ = self.store.create_comment('post', '', 'hello')
                path = '/ghost/api/comments-admin/' + comment['id']
                self.assertEqual(call('POST', path, '{"action":"hide"}', {'Content-Type':'application/json','Origin':'https://evil.test'})[0], 401)
                self.assertEqual(call('POST', path, '{"action":"hide"}', {'Content-Type':'application/json','Origin':'https://blog.dohyeon.kr'})[0], 200)
        finally:
            server.shutdown()
            server.server_close()
            worker.join()

    def test_staff_roles_are_enforced(self):
        handler = object.__new__(VisitHandler)
        handler.headers = {'Cookie':'session=test'}
        with patch('visit_counter.HTTPConnection') as connection:
            response = MagicMock(status=200)
            connection.return_value.getresponse.return_value = response
            for role, allowed in [('Owner', True), ('Administrator', True), ('Editor', False), ('Author', False)]:
                response.read.return_value = json.dumps({'users':[{'roles':[{'name':role}]}]}).encode()
                self.assertEqual(handler._is_ghost_admin(), allowed)

    def test_ghost_session_explicitly_requests_roles(self):
        handler = object.__new__(VisitHandler)
        handler.headers = {'Cookie': 'session=test', 'User-Agent': 'dashboard-test'}
        with patch('visit_counter.HTTPConnection') as connection:
            response = MagicMock(status=200)
            connection.return_value.getresponse.return_value = response
            # Ghost omits the role relation unless include=roles is requested.
            def body():
                path = connection.return_value.request.call_args.args[1]
                user = {'roles': [{'name': 'Owner'}]} if 'include=roles' in path else {}
                return json.dumps({'users': [user]}).encode()
            response.read.side_effect = body
            self.assertTrue(handler._is_ghost_admin())
            self.assertEqual(connection.return_value.request.call_args.args[1], '/ghost/api/admin/users/me/?include=roles')
            self.assertEqual(connection.return_value.request.call_args.kwargs['headers']['User-Agent'], 'dashboard-test')
