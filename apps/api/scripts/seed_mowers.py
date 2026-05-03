"""Seed the `mowers` table with the MVP catalog.

Reads `scripts/data/mowers.csv` and upserts each row by `slug`. Re-run safely;
existing slugs are updated rather than duplicated.

NOTE: spec values were drafted from public manufacturer pages but should be
re-verified against current spec sheets before going to prod. Tag the CSV
with a `data_updated_at` bump when you do.

Usage:
    python scripts/seed_mowers.py
    python scripts/seed_mowers.py --dry-run
    python scripts/seed_mowers.py --csv path/to/other.csv
"""

from __future__ import annotations

import argparse
import csv
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_sync_engine
from app.models import Mower
from app.models.enums import DriveType, NavigationType

DEFAULT_CSV = Path(__file__).parent / "data" / "mowers.csv"


def _parse_bool(s: str) -> bool:
    return s.strip().lower() in {"1", "true", "t", "yes", "y"}


def _coerce_row(row: dict[str, str]) -> dict[str, Any]:
    return {
        "brand": row["brand"].strip(),
        "model": row["model"].strip(),
        "slug": row["slug"].strip(),
        "price_usd": float(row["price_usd"]),
        "max_area_sqft": int(row["max_area_sqft"]),
        "max_slope_pct": int(row["max_slope_pct"]),
        "min_passage_inches": float(row["min_passage_inches"]),
        "navigation_type": NavigationType(row["navigation_type"].strip()),
        "drive_type": DriveType(row["drive_type"].strip()),
        "cutting_width_inches": float(row["cutting_width_inches"]),
        "cutting_height_min": float(row["cutting_height_min"]),
        "cutting_height_max": float(row["cutting_height_max"]),
        "battery_minutes": int(row["battery_minutes"]),
        "noise_db": int(row["noise_db"]) if row.get("noise_db") else None,
        "rain_handling": _parse_bool(row["rain_handling"]),
        "has_gps_theft_protection": _parse_bool(row["has_gps_theft_protection"]),
        "product_url": row["product_url"].strip(),
        "affiliate_url": row["affiliate_url"].strip() or None,
        "image_url": row["image_url"].strip(),
        "manufacturer_specs_url": row["manufacturer_specs_url"].strip(),
        "is_active": True,
        "data_updated_at": datetime.now(timezone.utc),
    }


def upsert_catalog(csv_path: Path, *, dry_run: bool = False) -> tuple[int, int]:
    """Returns `(inserted, updated)` counts."""
    engine = get_sync_engine()
    inserted = updated = 0

    with engine.begin() as conn, Session(bind=conn) as session:
        with csv_path.open("r", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            for raw in reader:
                row = _coerce_row(raw)
                existing = session.execute(
                    select(Mower).where(Mower.slug == row["slug"])
                ).scalar_one_or_none()

                if existing:
                    for k, v in row.items():
                        setattr(existing, k, v)
                    updated += 1
                    print(f"~ updated {row['slug']}")
                else:
                    session.add(Mower(**row))
                    inserted += 1
                    print(f"+ inserted {row['slug']}")

        if dry_run:
            session.rollback()
            print("dry run — rolled back")
        else:
            session.commit()

    return inserted, updated


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Seed ZippyLawnz mower catalog")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    if not args.csv.exists():
        print(f"error: csv not found: {args.csv}", file=sys.stderr)
        return 2

    inserted, updated = upsert_catalog(args.csv, dry_run=args.dry_run)
    print(f"\ndone — inserted {inserted}, updated {updated}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
