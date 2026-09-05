import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from urllib.error import HTTPError
from visit_counter import GoogleReports


class GoogleReportsTest(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.config = Path(self.temp.name) / 'config.json'
        self.config.write_text(json.dumps({'ga4PropertyId': '123', 'searchConsoleSite': 'sc-domain:example.com'}))
        self.reports = GoogleReports(self.config)

    def tearDown(self):
        self.temp.cleanup()

    def test_rejects_invalid_queries_before_any_network_call(self):
        with patch.object(self.reports, '_post') as post:
            for provider, start, end in [('unknown', '2026-01-01', '2026-01-02'), ('ga4', 'bad', '2026-01-02'), ('ga4', '2026-01-02', '2026-01-01'), ('ga4', '2024-01-01', '2026-01-01'), ('ga4', '2099-01-01', '2099-01-02')]:
                with self.assertRaises(ValueError):
                    self.reports.report(provider, start, end)
            post.assert_not_called()

    def test_ga4_period_users_are_not_summed_and_cache_reuses_result(self):
        def row(dimensions, values):
            return {'dimensionValues': [{'value': x} for x in dimensions], 'metricValues': [{'value': str(x)} for x in values]}
        responses = [{'rows': [row([], [3, 7, 12])], 'metadata': {'timeZone': 'Asia/Seoul'}},
                     {'rows': [row(['20260102'], [3, 4, 7]), row(['20260101'], [2, 3, 5])]},
                     {'rows': [row(['google / organic'], [7])]}]
        with patch.object(self.reports, '_post', side_effect=responses) as post:
            data = self.reports.report('ga4', '2026-01-01', '2026-01-02')
            self.assertEqual(data['summary']['users'], 3)
            self.assertEqual([x['day'] for x in data['daily']], ['2026-01-01', '2026-01-02'])
            self.assertEqual(data['sources'][0]['sessions'], 7)
            self.assertEqual(data, self.reports.report('ga4', '2026-01-01', '2026-01-02'))
            self.assertEqual(post.call_count, 3)

    def test_search_totals_include_anonymized_queries(self):
        total = {'clicks': 20, 'impressions': 100, 'ctr': .2, 'position': 4}
        query = {'keys': ['hello'], 'clicks': 2, 'impressions': 10, 'ctr': .2, 'position': 4}
        with patch.object(self.reports, '_post', side_effect=[{'rows': [total]}, {'rows': []}, {'rows': [query]}]) as post:
            data = self.reports.report('searchConsole', '2026-01-01', '2026-01-02')
            self.assertEqual(data['summary']['clicks'], 20)
            self.assertEqual(data['queries'][0]['clicks'], 2)
            self.assertIn('sc-domain%3Aexample.com', post.call_args.args[0])
            self.assertEqual(post.call_args.args[1]['dataState'], 'final')

    def test_empty_search_is_connected_without_fabricating_zero_metrics(self):
        with patch.object(self.reports, '_post', return_value={}):
            data = self.reports.report('searchConsole', '2026-01-01', '2026-01-02')
            self.assertEqual(data['status'], 'connected')
            self.assertIsNone(data['summary'])
            self.assertEqual(data['daily'], [])

    def test_provider_failure_is_sanitized_cached_and_does_not_block_other_provider(self):
        error = HTTPError('secret-url', 403, 'private-key-token', None, None)
        with patch.object(self.reports, '_post', side_effect=error) as post:
            data = self.reports.report('ga4', '2026-01-01', '2026-01-02')
            self.assertEqual(data['status'], 'error')
            self.assertNotIn('private-key-token', json.dumps(data))
            self.reports.report('ga4', '2026-01-01', '2026-01-02')
            self.assertEqual(post.call_count, 1)
        with patch.object(self.reports, '_post', return_value={}):
            self.assertEqual(self.reports.report('searchConsole', '2026-01-01', '2026-01-02')['status'], 'connected')

    def test_missing_configuration_does_not_expose_path(self):
        self.config.unlink()
        data = self.reports.report('ga4', '2026-01-01', '2026-01-02')
        self.assertEqual(data['status'], 'error')
        self.assertNotIn(self.temp.name, json.dumps(data))
