from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from http.client import HTTPConnection
import json
import math
import threading
import unittest
from visit_counter import VisitStore, VisitServer

NOW = datetime(2026, 9, 8, 3, tzinfo=timezone.utc)

def candidate(slug, published='2026-08-01T00:00:00Z'):
    return {'slug': slug, 'publishedAt': published}

class FeaturedTest(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.store = VisitStore(Path(self.temp.name) / 'visits.sqlite')

    def tearDown(self):
        self.temp.cleanup()

    def test_window_candidates_top_three_and_kst_boundary(self):
        with self.store._connect() as db:
            db.executemany('INSERT INTO stats_post_daily VALUES (?, ?, ?)', [
                ('2026-09-01', 'old', 10000), ('2026-09-02', 'a', 10),
                ('2026-09-08', 'a', 2), ('2026-09-08', 'b', 12),
                ('2026-09-08', 'c', 5), ('2026-09-08', 'd', 4),
                ('2026-09-08', 'unlisted', 999), ('2026-09-09', 'd', 999)])
            db.execute("INSERT INTO stats_post_views VALUES ('old', 99999, 'legacy')")
        data = self.store.featured_week([candidate(s) for s in ['old', 'a', 'b', 'c', 'd']], NOW)
        self.assertEqual((data['start'], data['end']), ('2026-09-02', '2026-09-08'))
        self.assertEqual([(p['slug'], p['views']) for p in data['posts']], [('a', 12), ('b', 12), ('c', 5)])
        tomorrow = self.store.featured_week([candidate('a'), candidate('d')], datetime(2026, 9, 8, 15, tzinfo=timezone.utc))
        self.assertEqual(tomorrow['start'], '2026-09-03')
        self.assertEqual([(p['slug'], p['views']) for p in tomorrow['posts']], [('d', 1003), ('a', 2)])

    def test_formula_freshness_and_zero_view_new_post(self):
        posts = self.store.featured_week([
            candidate('today', NOW.isoformat()), candidate('three', '2026-09-05T03:00:00Z'),
            candidate('six', '2026-09-02T03:00:00Z')], NOW)['posts']
        self.assertEqual([p['score'] for p in posts], [20, 10, 5])
        self.assertTrue(all(p['views'] == 0 for p in posts))
        self.store.increment_post('popular', NOW)
        # A new hour refreshes the reaction snapshot.
        post = self.store.featured_week([candidate('popular')], NOW.replace(hour=4))['posts'][0]
        self.assertAlmostEqual(post['reactionScore'], 10 * math.log(2))
        self.assertEqual(post['score'], post['reactionScore'] + post['freshnessScore'])

    def test_valid_comments_only_and_timestamp_offsets(self):
        with self.store._connect() as db:
            for i, stamp, status in [(1, '2026-09-01T15:00:00Z', 'visible'),
                                     (2, '2026-09-01T14:59:59Z', 'visible'),
                                     (3, NOW.isoformat(), 'deleted'),
                                     (4, NOW.isoformat(), 'visible'),
                                     (5, '2026-09-09T00:00:00Z', 'visible')]:
                db.execute('INSERT INTO anonymous_comments VALUES (?, ?, ?, ?, ?, ?, ?, NULL)',
                           (str(i), 'post', 'anon', 'body', status, 'hash', stamp))
            db.execute("INSERT INTO comment_moderation VALUES ('4', 1)")
        post = self.store.featured_week([candidate('post')], NOW)['posts'][0]
        self.assertEqual(post['comments'], 1)
        self.assertAlmostEqual(post['reactionScore'], 10 * math.log(9))

    def test_hourly_snapshot_and_candidate_independence(self):
        first = self.store.featured_week([candidate('a')], NOW)
        self.store.increment_post('b', NOW)
        cached = self.store.featured_week([candidate('b')], NOW.replace(minute=59))
        self.assertEqual(cached['posts'][0]['views'], 0)
        self.assertEqual(first['computedAt'], cached['computedAt'])
        refreshed = self.store.featured_week([candidate('b')], NOW.replace(hour=4))
        self.assertEqual(refreshed['posts'][0]['views'], 1)

    def test_public_report_does_not_increment_views(self):
        self.store.increment_post('post')
        server = VisitServer(('127.0.0.1', 0), self.store)
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        try:
            conn = HTTPConnection(*server.server_address)
            conn.request('POST', '/api/visit/featured', json.dumps({'candidates': [candidate('post')]}),
                         {'Content-Type': 'application/json', 'Origin': 'https://blog.dohyeon.kr'})
            response = conn.getresponse()
            self.assertEqual(response.status, 200)
            self.assertEqual(json.loads(response.read())['posts'][0]['views'], 1)
            self.assertEqual(self.store.get_post('post')['total'], 1)
            conn.close()
        finally:
            server.shutdown()
            server.server_close()
            worker.join()

    def test_invalid_candidates_and_empty_result(self):
        for value in [None, 'post', [1], [candidate('bad/slug')], [candidate('a')] * 1001,
                      [candidate('a'), candidate('a')], [candidate('a', 'garbage')],
                      [candidate('a', '2026-09-09T00:00:00Z')], [candidate('a', '2026-09-01')]]:
            with self.assertRaises(ValueError):
                self.store.featured_week(value, NOW)
        self.assertEqual(self.store.featured_week([], NOW)['posts'], [])
