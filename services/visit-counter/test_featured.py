from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from http.client import HTTPConnection
import json
import threading
import unittest
from visit_counter import VisitStore, VisitServer


class FeaturedTest(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.store = VisitStore(Path(self.temp.name) / 'visits.sqlite')

    def tearDown(self):
        self.temp.cleanup()

    def test_daily_window_candidates_top_three_and_ties(self):
        with self.store._connect() as db:
            db.executemany('INSERT INTO stats_post_daily VALUES (?, ?, ?)', [
                ('2026-09-01', 'old', 10000), ('2026-09-02', 'a', 10),
                ('2026-09-08', 'a', 2), ('2026-09-08', 'b', 12),
                ('2026-09-08', 'c', 5), ('2026-09-08', 'd', 4),
                ('2026-09-08', 'unlisted', 999), ('2026-09-09', 'd', 999)])
            db.execute("INSERT INTO stats_post_views VALUES ('old', 99999, 'legacy')")
        data = self.store.featured_week(['old', 'a', 'b', 'c', 'd'], datetime(2026, 9, 8, 14, 59, tzinfo=timezone.utc))
        self.assertEqual((data['start'], data['end']), ('2026-09-02', '2026-09-08'))
        self.assertEqual(data['posts'], [{'slug': 'a', 'views': 12}, {'slug': 'b', 'views': 12}, {'slug': 'c', 'views': 5}])
        self.assertEqual(self.store.featured_week(['old'], datetime(2026, 9, 8, tzinfo=timezone.utc))['posts'], [])
        tomorrow = self.store.featured_week(['a', 'd'], datetime(2026, 9, 8, 15, 0, tzinfo=timezone.utc))
        self.assertEqual(tomorrow['start'], '2026-09-03')
        self.assertEqual(tomorrow['posts'], [{'slug': 'd', 'views': 1003}, {'slug': 'a', 'views': 2}])

    def test_public_report_does_not_increment_views(self):
        self.store.increment_post('post')
        server = VisitServer(('127.0.0.1', 0), self.store)
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        try:
            conn = HTTPConnection(*server.server_address)
            conn.request('POST', '/api/visit/featured', json.dumps({'slugs': ['post']}),
                         {'Content-Type': 'application/json', 'Origin': 'https://blog.dohyeon.kr'})
            response = conn.getresponse()
            self.assertEqual(response.status, 200)
            self.assertEqual(json.loads(response.read())['posts'], [{'slug': 'post', 'views': 1}])
            self.assertEqual(self.store.get_post('post')['total'], 1)
            conn.close()
        finally:
            server.shutdown()
            server.server_close()
            worker.join()

    def test_invalid_candidates_and_empty_result(self):
        for value in [None, 'post', [1], ['bad/slug'], ['post'] * 1001]:
            with self.assertRaises(ValueError):
                self.store.featured_week(value)
        self.assertEqual(self.store.featured_week([])['posts'], [])
