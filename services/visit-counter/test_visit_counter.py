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


if __name__ == "__main__":
    unittest.main()
