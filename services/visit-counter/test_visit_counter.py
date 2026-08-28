from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from visit_counter import VisitStore


class VisitStoreTest(unittest.TestCase):
    def test_preserves_total_and_counts_by_kst_day(self) -> None:
        with TemporaryDirectory() as directory:
            store = VisitStore(Path(directory) / "visits.sqlite")

            first = store.increment(datetime(2026, 8, 26, 15, 30, tzinfo=timezone.utc))
            second = store.increment(datetime(2026, 8, 27, 15, 0, tzinfo=timezone.utc))

            self.assertEqual(first, {"today": 1, "total": 1})
            self.assertEqual(second, {"today": 1, "total": 2})
            self.assertEqual(
                store.get(datetime(2026, 8, 27, 15, 0, tzinfo=timezone.utc)),
                {"today": 1, "total": 2},
            )

    def test_get_does_not_increment(self) -> None:
        with TemporaryDirectory() as directory:
            store = VisitStore(Path(directory) / "visits.sqlite")
            now = datetime(2026, 8, 27, tzinfo=timezone.utc)

            self.assertEqual(store.get(now), {"today": 0, "total": 0})
            self.assertEqual(store.get(now), {"today": 0, "total": 0})

    def test_preserves_and_increments_post_views(self) -> None:
        with TemporaryDirectory() as directory:
            store = VisitStore(Path(directory) / "visits.sqlite")

            self.assertEqual(store.get_post("about-seamless-works"), {"total": 0})
            self.assertEqual(
                store.increment_post("about-seamless-works"), {"total": 1}
            )
            self.assertEqual(
                store.increment_post("about-seamless-works"), {"total": 2}
            )
            self.assertEqual(store.get_post("about-seamless-works"), {"total": 2})

    def test_rejects_invalid_post_slugs(self) -> None:
        with TemporaryDirectory() as directory:
            store = VisitStore(Path(directory) / "visits.sqlite")

            with self.assertRaises(ValueError):
                store.increment_post("../ghost.db")

    def test_anonymous_comment_lifecycle(self) -> None:
        with TemporaryDirectory() as directory:
            store = VisitStore(Path(directory) / "visits.sqlite")

            comment, delete_token = store.create_comment(
                "about-seamless-works", "", "좋은 글 감사합니다."
            )
            self.assertEqual(comment["displayName"], "익명")
            self.assertEqual(store.list_comments("about-seamless-works"), [comment])
            self.assertFalse(
                store.delete_comment("about-seamless-works", comment["id"], "wrong")
            )
            self.assertTrue(
                store.delete_comment(
                    "about-seamless-works", comment["id"], delete_token
                )
            )
            self.assertEqual(store.list_comments("about-seamless-works"), [])

    def test_rejects_invalid_comment_content(self) -> None:
        with TemporaryDirectory() as directory:
            store = VisitStore(Path(directory) / "visits.sqlite")

            with self.assertRaises(ValueError):
                store.create_comment("post", "name\nadmin", "valid body")
            with self.assertRaises(ValueError):
                store.create_comment("post", "name", "x")
            with self.assertRaises(ValueError):
                store.create_comment(
                    "post", "name", "https://a.test https://b.test https://c.test"
                )


if __name__ == "__main__":
    unittest.main()
