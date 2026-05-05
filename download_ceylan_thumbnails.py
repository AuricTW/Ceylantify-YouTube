from __future__ import annotations

import argparse
import csv
import json
import sys
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

try:
    from yt_dlp import YoutubeDL
except ImportError:
    print("Missing dependency: yt-dlp. Install it with: python -m pip install yt-dlp", file=sys.stderr)
    raise


DEFAULT_CHANNEL_URL = "https://www.youtube.com/@xilanceylan/videos"
THUMBNAIL_CANDIDATES = (
    "maxresdefault.jpg",
    "sddefault.jpg",
    "hqdefault.jpg",
    "mqdefault.jpg",
    "default.jpg",
)
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download the latest YouTube thumbnails from Ceylan's channel."
    )
    parser.add_argument("--channel-url", default=DEFAULT_CHANNEL_URL)
    parser.add_argument("--limit", type=int, default=40)
    parser.add_argument("--start-index", type=int, default=1, help="1-based playlist index to start from.")
    parser.add_argument("--end-index", type=int, help="1-based playlist index to end at, inclusive.")
    parser.add_argument("--output", type=Path, default=Path("data") / "ceylan_thumbnails")
    parser.add_argument("--sleep", type=float, default=0.2, help="Seconds to sleep between downloads.")
    args = parser.parse_args()
    if args.start_index < 1:
        parser.error("--start-index must be 1 or greater.")
    if args.limit < 1:
        parser.error("--limit must be 1 or greater.")
    if args.end_index is not None and args.end_index < args.start_index:
        parser.error("--end-index must be greater than or equal to --start-index.")
    return args


def extract_latest_entries(channel_url: str, start_index: int, end_index: int) -> list[dict[str, Any]]:
    options = {
        "extract_flat": "in_playlist",
        "ignoreerrors": True,
        "playliststart": start_index,
        "playlistend": end_index,
        "quiet": True,
        "no_warnings": True,
    }
    with YoutubeDL(options) as ydl:
        playlist = ydl.extract_info(channel_url, download=False)

    if not playlist:
        raise RuntimeError(f"Could not extract playlist data from {channel_url}")

    entries = [entry for entry in playlist.get("entries", []) if entry and entry.get("id")]
    return entries[: end_index - start_index + 1]


def request_image(url: str, timeout: int = 20) -> tuple[bytes, str]:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=timeout) as response:
        content_type = response.headers.get("Content-Type", "")
        if not content_type.startswith("image/"):
            raise RuntimeError(f"Unexpected content type for {url}: {content_type}")
        return response.read(), content_type


def download_best_thumbnail(video_id: str, output_path: Path) -> tuple[str, str]:
    errors: list[str] = []
    for candidate in THUMBNAIL_CANDIDATES:
        url = f"https://i.ytimg.com/vi/{video_id}/{candidate}"
        try:
            image_bytes, content_type = request_image(url)
        except HTTPError as exc:
            errors.append(f"{candidate}: HTTP {exc.code}")
            continue
        except (URLError, TimeoutError, RuntimeError) as exc:
            errors.append(f"{candidate}: {exc}")
            continue

        output_path.write_bytes(image_bytes)
        return url, content_type

    joined_errors = "; ".join(errors)
    raise RuntimeError(f"No thumbnail downloaded for {video_id}. Tried: {joined_errors}")


def write_manifest(rows: list[dict[str, Any]], output_dir: Path) -> None:
    json_path = output_dir / "manifest.json"
    csv_path = output_dir / "manifest.csv"

    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    fieldnames = [
        "index",
        "video_id",
        "title",
        "video_url",
        "thumbnail_file",
        "thumbnail_url",
        "content_type",
        "duration",
        "view_count",
    ]
    with csv_path.open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def load_manifest(output_dir: Path) -> list[dict[str, Any]]:
    json_path = output_dir / "manifest.json"
    if not json_path.exists():
        return []
    return json.loads(json_path.read_text(encoding="utf-8"))


def merge_manifest(existing_rows: list[dict[str, Any]], new_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: dict[int, dict[str, Any]] = {}
    for row in existing_rows + new_rows:
        try:
            index = int(row["index"])
        except (KeyError, TypeError, ValueError):
            continue
        row["index"] = index
        merged[index] = row
    return [merged[index] for index in sorted(merged)]


def main() -> int:
    args = parse_args()
    output_dir = args.output
    output_dir.mkdir(parents=True, exist_ok=True)

    end_index = args.end_index or args.start_index + args.limit - 1
    requested_count = end_index - args.start_index + 1

    entries = extract_latest_entries(args.channel_url, args.start_index, end_index)
    if len(entries) < requested_count:
        print(f"Warning: only found {len(entries)} entries; requested {requested_count}.", file=sys.stderr)

    rows: list[dict[str, Any]] = []
    for batch_position, entry in enumerate(entries, start=1):
        index = args.start_index + batch_position - 1
        video_id = entry["id"]
        filename = f"{index:03d}_{video_id}.jpg"
        thumbnail_path = output_dir / filename
        thumbnail_url, content_type = download_best_thumbnail(video_id, thumbnail_path)

        rows.append(
            {
                "index": index,
                "video_id": video_id,
                "title": entry.get("title") or "",
                "video_url": entry.get("url") or f"https://www.youtube.com/watch?v={video_id}",
                "thumbnail_file": filename,
                "thumbnail_url": thumbnail_url,
                "content_type": content_type,
                "duration": entry.get("duration"),
                "view_count": entry.get("view_count"),
            }
        )
        print(f"{batch_position:02d}/{len(entries)} downloaded {filename}")
        if args.sleep:
            time.sleep(args.sleep)

    merged_rows = merge_manifest(load_manifest(output_dir), rows)
    write_manifest(merged_rows, output_dir)
    print(f"Done. Downloaded {len(rows)} thumbnails to {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
