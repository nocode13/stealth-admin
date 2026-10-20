#!/usr/bin/env python3
"""Готовит партию для страницы /catalog-import в админке.

Telegram-экспорт + прайс → разбор постов (Claude) → сопоставление с каталогом системы (Claude) →
названия и описания (Claude) → белый фон (rembg) → public/catalog-import/<batch>/manifest.json.
Всё кэшируется в cache/: повторный прогон не платит за Claude и не пересчитывает фон.
Подробности и порядок запуска — README.md.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
import traceback
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Callable

from dotenv import load_dotenv

import ai_steps
import background
from claude_client import ClaudeJson
from excel import ExcelRow, collapse_rows, load_price
from snapshot import load_or_fetch
from tg_export import TgGroup, load_groups
from variant import base_key, normalize, parse_name

HERE = Path(__file__).resolve().parent
DEFAULT_OUT = HERE.parent.parent / "public" / "catalog-import"
CACHE = HERE / "cache"

CODE_RE = re.compile(r"(?<!\d)\d{8}(?!\d)")
# Обычный пост канала: бирка + 2 фото растения + видео.
EXPECTED_SHAPE = (3, 1)
MAX_VIDEO_MB = 50
MAX_VIDEO_SEC = 60
# До этого размера весь каталог уходит в Claude одним кэшируемым блоком; больше — сначала сужаем.
FULL_CATALOG_LIMIT = 3000
SHORTLIST_SIZE = 50
NEIGHBOURS_LIMIT = 12


# ---------------------------------------------------------------------------------------------
# Утилиты
# ---------------------------------------------------------------------------------------------


def log(message: str) -> None:
    print(message, flush=True)


def run_parallel(fn: Callable, items: list, workers: int, label: str) -> list:
    """Параллельно, с прогрессом. Упавший элемент даёт Exception на своём месте, а не роняет прогон."""
    if not items:
        return []
    done = 0
    results: list = [None] * len(items)

    def wrapped(index_item):
        index, item = index_item
        try:
            return index, fn(item)
        except Exception as error:  # noqa: BLE001 — ошибку покажем на карточке
            traceback.print_exc()
            return index, error

    with ThreadPoolExecutor(max_workers=workers) as pool:
        for index, result in pool.map(wrapped, enumerate(items)):
            results[index] = result
            done += 1
            if done % 10 == 0 or done == len(items):
                log(f"  {label}: {done}/{len(items)}")
    return results


def copy_if_changed(src: Path, dst: Path) -> bool:
    if not src.exists():
        return False
    if not dst.exists() or dst.stat().st_size != src.stat().st_size:
        shutil.copy2(src, dst)
    return True


def video_duration(path: Path) -> float | None:
    if not shutil.which("ffprobe"):
        return None
    try:
        output = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
            capture_output=True,
            text=True,
            timeout=30,
            check=True,
        ).stdout.strip()
        return float(output)
    except (subprocess.SubprocessError, ValueError):
        return None


def first(*values):
    return next((value for value in values if value is not None), None)


def rel(path: Path | None, batch_dir: Path) -> str | None:
    return path.relative_to(batch_dir).as_posix() if path else None


# ---------------------------------------------------------------------------------------------
# --inspect
# ---------------------------------------------------------------------------------------------


def inspect(groups: list[TgGroup], skipped: list[dict], price: dict[str, list[ExcelRow]]) -> None:
    log(f"Групп (альбомов): {len(groups)}")
    for (photos, videos), count in Counter((len(g.photos), len(g.videos)) for g in groups).most_common():
        mark = "" if (photos, videos) == EXPECTED_SHAPE else "   ← проверь"
        log(f"  {photos} фото + {videos} видео: {count}{mark}")
    log(f"Без подписи: {sum(1 for g in groups if not g.caption)}")
    log(f"Несколько подписей в группе (могли склеиться посты): {sum(1 for g in groups if g.captions_count > 1)}")
    codes = [m.group(0) for g in groups if (m := CODE_RE.search(g.caption))]
    log(f"Код (8 цифр) в подписи: {len(codes)}, из них есть в прайсе: {sum(1 for c in codes if c in price)}")
    log("Примеры подписей:")
    for group in groups[:8]:
        log(f"  #{group.id} {group.date}  {group.caption[:100]!r}")
    if skipped:
        log(f"Сообщений без медиа пропущено: {len(skipped)}")
        for reason, count in Counter(s["reason"] for s in skipped).most_common():
            log(f"  {reason}: {count}")
        for item in skipped[:5]:
            log(f"  #{item['id']} {item['date']}  {item['text']!r}")


# ---------------------------------------------------------------------------------------------
# Группа поста
# ---------------------------------------------------------------------------------------------


def copy_media(group: TgGroup, batch_dir: Path) -> dict:
    media_dir = batch_dir / "media" / group.id
    media_dir.mkdir(parents=True, exist_ok=True)
    warnings: list[str] = []
    photos: list[Path] = []
    for index, media in enumerate(group.photos):
        dst = media_dir / f"{index}{media.path.suffix.lower() or '.jpg'}"
        if copy_if_changed(media.path, dst):
            photos.append(dst)
        else:
            warnings.append(f"Файл фото не найден в экспорте: {media.path.name}")
    video: Path | None = None
    if group.videos:
        src = group.videos[0].path
        dst = media_dir / f"video-muted{src.suffix.lower() or '.mp4'}"
        if not src.exists():
            warnings.append(f"Файл видео не найден в экспорте: {src.name}")
        elif mute_video(src, dst):
            video = dst
        else:
            warnings.append(f"Не удалось убрать звук из {src.name} — видео не загрузится")
    return {"group": group, "dir": media_dir, "photoFiles": photos, "videoFile": video, "warnings": warnings}


def mute_video(src: Path, dst: Path) -> bool:
    """Копия видео без звуковой дорожки. Видеопоток не перекодируем (`-c:v copy`) — быстро и без потерь."""
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        return True
    tmp = dst.with_name(f"tmp-{dst.name}")
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-i", str(src), "-map", "0:v:0", "-c:v", "copy", "-an", str(tmp)],
            check=True,
            capture_output=True,
            timeout=300,
        )
    except (subprocess.SubprocessError, OSError) as error:
        tmp.unlink(missing_ok=True)
        log(f"  ffmpeg: {src.name}: {error}")
        return False
    tmp.replace(dst)
    return True


def _digits(value: str | None) -> str | None:
    digits = re.sub(r"\D", "", value or "")
    return digits.zfill(8) if digits and len(digits) <= 8 else (digits or None)


def resolve_entry(entry: dict, extracted: dict | Exception | None, price: dict[str, list[ExcelRow]]) -> None:
    group: TgGroup = entry["group"]
    warnings: list[str] = entry["warnings"]
    ex = extracted if isinstance(extracted, dict) else {}
    if isinstance(extracted, Exception):
        warnings.append(f"Claude не разобрал пост: {extracted}")

    # --- медиа: какое фото бирка, какие — растение (лучшее первым)
    photos_count, videos_count = len(group.photos), len(group.videos)
    if (photos_count, videos_count) != EXPECTED_SHAPE:
        warnings.append(
            f"В посте {photos_count} фото и {videos_count} видео (обычно {EXPECTED_SHAPE[0]} + {EXPECTED_SHAPE[1]})"
        )
    if group.captions_count > 1:
        warnings.append("В группе несколько подписей — возможно, склеились два поста")
    photos = entry["photoFiles"]
    label_index = ex.get("labelPhotoIndex")
    if label_index is None or not 0 <= label_index < len(photos):
        label_index = None
    plant_indexes = [
        i for i in dict.fromkeys(ex.get("plantPhotoIndexes") or []) if 0 <= i < len(photos) and i != label_index
    ]
    if not plant_indexes:
        plant_indexes = [i for i in range(len(photos)) if i != label_index]
        if photos and isinstance(extracted, dict):
            warnings.append("Claude не выбрал фото растения — берём все, кроме бирки")
    if label_index is None and len(photos) > 1:
        warnings.append("Фото бирки не найдено — проверь, что она не уйдёт на витрину")
    entry["labelIndex"], entry["plantIndexes"] = label_index, plant_indexes
    entry["plantPhotos"] = [photos[i] for i in plant_indexes]
    entry["plantPhoto"] = entry["plantPhotos"][0] if entry["plantPhotos"] else None
    # Заметки Claude — справка на карточке, а не предупреждение: он часто пишет и подтверждения.
    entry["notes"] = (ex.get("notes") or "").strip()
    entry["labelText"] = (ex.get("labelText") or "").strip()

    video = entry["videoFile"]
    if video:
        size_mb = video.stat().st_size / 1024 / 1024
        if size_mb > MAX_VIDEO_MB:
            warnings.append(f"Видео {size_mb:.0f} МБ — больше лимита {MAX_VIDEO_MB} МБ, загрузка упадёт")
        duration = video_duration(video)
        if duration and duration > MAX_VIDEO_SEC:
            warnings.append(f"Видео {duration:.0f} с — длиннее {MAX_VIDEO_SEC} с, бэкенд его отклонит")

    # --- код товара
    caption_codes = CODE_RE.findall(group.caption)
    caption_code = caption_codes[0] if caption_codes else None
    label_code = _digits(ex.get("sku"))
    if len(set(caption_codes)) > 1:
        warnings.append(f"В подписи несколько кодов: {', '.join(sorted(set(caption_codes)))}")
    if caption_code and label_code and caption_code != label_code:
        warnings.append(f"Код в подписи {caption_code} ≠ на фото {label_code}")
    code = next((c for c in (caption_code, label_code) if c and c in price), None) or caption_code or label_code
    entry["code"], entry["captionCode"], entry["labelCode"] = code, caption_code, label_code

    # --- прайс
    rows, conflict = collapse_rows(price.get(code, [])) if code else ([], False)
    if not code:
        warnings.append("Код товара не найден ни в подписи, ни на фото")
    elif not rows:
        warnings.append(f"Кода {code} нет в прайсе")
    if conflict:
        warnings.append("Строки прайса по коду расходятся — выбери нужную")
    if rows and rows[0]["retailUsd"] is None:
        warnings.append("В прайсе нет розничной цены — введи себестоимость вручную")
    entry["excelRows"], entry["excelConflict"] = rows, conflict

    # --- вариант: прайс → подпись → бирка
    label_text = entry["labelText"]
    excel_variant = parse_name(rows[0]["name"]) if rows else {}
    caption_variant = parse_name(group.caption) if group.caption else {}
    label_variant = parse_name(label_text) if label_text else {}
    label_volume = round(ex["potVolumeL"] * 1000) if ex.get("potVolumeL") else label_variant.get("potVolumeMl")
    label_pp = ex.get("plantsPerPot") or label_variant.get("stemCount")
    variant = {
        "seedling": False,
        "potVolumeMl": first(excel_variant.get("potVolumeMl"), caption_variant.get("potVolumeMl"), label_volume),
        "stemCount": first(excel_variant.get("stemCount"), caption_variant.get("stemCount"), label_pp),
        "heightCm": first(
            excel_variant.get("heightCm"), caption_variant.get("heightCm"), label_variant.get("heightCm")
        ),
    }
    for source, volume in (("подписи", caption_variant.get("potVolumeMl")), ("на бирке", label_volume)):
        if volume and variant["potVolumeMl"] and volume != variant["potVolumeMl"]:
            warnings.append(f"Объём в {source} {volume / 1000:g} л ≠ {variant['potVolumeMl'] / 1000:g} л")
    for source, pp in (("подписи", caption_variant.get("stemCount")), ("на бирке", label_pp)):
        if pp and variant["stemCount"] and pp != variant["stemCount"]:
            warnings.append(f"PP в {source} {pp} ≠ {variant['stemCount']}")
    entry["variant"] = variant

    # --- растение (одно на все размеры); без прайса — название с бирки
    if rows:
        entry["plantKey"] = base_key(rows[0]["name"])
        entry["names"] = list(dict.fromkeys(row["name"] for row in rows))
    elif label_text and base_key(label_text):
        entry["plantKey"] = base_key(label_text)
        entry["names"] = [label_text]
    elif group.caption:
        first_line = group.caption.splitlines()[0]
        entry["plantKey"] = base_key(first_line) or f"tg-{group.id}"
        entry["names"] = [first_line]
    else:
        entry["plantKey"] = f"tg-{group.id}"
        entry["names"] = []


def warn_duplicate_codes(entries: list[dict], all_groups: list[TgGroup]) -> None:
    """Повтор кода ищем по всему экспорту, а не только в пачке: пост-дубль может быть в соседней."""
    by_code: dict[str, list[str]] = {}
    in_batch = {entry["group"].id for entry in entries}
    for entry in entries:
        if entry["code"]:
            by_code.setdefault(entry["code"], []).append(entry["group"].id)
    for group in all_groups:
        if group.id not in in_batch:
            for code in set(CODE_RE.findall(group.caption)):
                by_code.setdefault(code, []).append(group.id)
    for entry in entries:
        others = [gid for gid in by_code.get(entry["code"] or "", []) if gid != entry["group"].id]
        if others:
            entry["warnings"].append(
                f"Код {entry['code']} есть ещё в посте #{', #'.join(others)} — "
                "approve обоих перезапишет фото одной позиции, оставь один"
            )


# ---------------------------------------------------------------------------------------------
# Растения: сопоставление и тексты
# ---------------------------------------------------------------------------------------------


def build_plants(entries: list[dict]) -> dict[str, dict]:
    plants: dict[str, dict] = {}
    for entry in entries:
        plant = plants.setdefault(
            entry["plantKey"],
            {"key": entry["plantKey"], "names": [], "codes": set(), "photo": None, "match": None, "generated": None},
        )
        for name in entry["names"]:
            if name not in plant["names"]:
                plant["names"].append(name)
        if entry["code"]:
            plant["codes"].add(entry["code"])
        plant["photo"] = plant["photo"] or entry.get("plantPhoto")
    return plants


def _cover(catalog_id: str, catalogs: dict[str, dict], listings: list[dict]) -> str | None:
    catalog = catalogs.get(catalog_id)
    if catalog and catalog.get("coverUrl"):
        return catalog["coverUrl"]
    return next((l["coverUrl"] for l in listings if l["catalogItemId"] == catalog_id and l.get("coverUrl")), None)


def _shortlist(names: list[str], lines: list[str]) -> list[str]:
    tokens = set(normalize(" ".join(names)).split())
    scored = []
    for line in lines:
        name_tokens = set(normalize(line.split(" | ")[1]).split())
        scored.append((len(tokens & name_tokens), line))
    scored.sort(key=lambda item: -item[0])
    return [line for score, line in scored[:SHORTLIST_SIZE]]


def match_plants(claude: ClaudeJson, plants: dict[str, dict], snapshot: dict, workers: int) -> None:
    catalogs = {c["id"]: c for c in snapshot["catalogs"]}
    listings_by_sku: dict[str, list[dict]] = {}
    for listing in snapshot["listings"]:
        if listing.get("sku"):
            listings_by_sku.setdefault(listing["sku"].strip(), []).append(listing)
    lines, catalog_numbers = ai_steps.catalog_lines(snapshot)
    full_block = "\n".join(lines) if len(lines) <= FULL_CATALOG_LIMIT else None
    log(f"  в каталоге {len(lines)} позиций, {len(snapshot['listings'])} продажных позиций")

    def candidate(catalog_id: str, reason: str) -> dict:
        return {
            "catalogItemId": catalog_id,
            "name": catalogs[catalog_id]["name"],
            "coverUrl": _cover(catalog_id, catalogs, snapshot["listings"]),
            "reason": reason,
        }

    def one(plant: dict) -> dict:
        for code in sorted(plant["codes"]):
            hits = [h for h in listings_by_sku.get(code, []) if h["catalogItemId"] in catalogs]
            if hits:
                reason = f"Позиция #{hits[0]['code']} уже с кодом {code}"
                return {
                    "catalogItemId": hits[0]["catalogItemId"],
                    "confidence": "sku",
                    "reason": reason,
                    "candidates": [candidate(hits[0]["catalogItemId"], reason)],
                }
        if not plant["names"]:
            return {"catalogItemId": None, "confidence": None, "reason": "Нет названия для поиска", "candidates": []}
        block = full_block or "\n".join(_shortlist(plant["names"], lines))
        found = ai_steps.match_candidates(claude, plant["names"], block, catalog_numbers)
        if not found:
            return {"catalogItemId": None, "confidence": None, "reason": "Похожих позиций в каталоге нет", "candidates": []}
        candidates = [candidate(c["catalogItemId"], c["reason"]) for c in found]
        verdict = ai_steps.verify_by_photo(claude, plant["names"], plant["photo"], candidates, CACHE / "covers")
        return {
            "catalogItemId": verdict["catalogItemId"],
            "confidence": verdict["confidence"] if verdict["catalogItemId"] else None,
            "reason": verdict["reason"],
            "candidates": candidates,
        }

    items = list(plants.values())
    for plant, result in zip(items, run_parallel(one, items, workers, "Сопоставление")):
        if isinstance(result, Exception):
            plant["match"] = {"catalogItemId": None, "confidence": None, "reason": f"Ошибка: {result}", "candidates": []}
        else:
            plant["match"] = result


def generate_plants(claude: ClaudeJson, plants: dict[str, dict], snapshot: dict | None, workers: int) -> None:
    catalog_names = [c["name"] for c in snapshot["catalogs"]] if snapshot else []

    def neighbours(plant: dict) -> list[str]:
        genus = (normalize(plant["names"][0]).split() or [""])[0]
        return [name for name in catalog_names if normalize(name).split()[:1] == [genus]][:NEIGHBOURS_LIMIT]

    items = [plant for plant in plants.values() if plant["names"]]
    results = run_parallel(
        lambda plant: ai_steps.generate_texts(claude, plant["names"], plant["photo"], neighbours(plant)),
        items,
        workers,
        "Названия и описания",
    )
    for plant, result in zip(items, results):
        plant["generated"] = None if isinstance(result, Exception) else result


# ---------------------------------------------------------------------------------------------
# Фон
# ---------------------------------------------------------------------------------------------


def remove_backgrounds(entries: list[dict], model: str, force: bool) -> None:
    """Все фото растения поста → `white-<n>.jpg` в том же порядке (лучшее первым)."""
    todo = [(entry, photo) for entry in entries for photo in entry.get("plantPhotos", [])]
    for entry in entries:
        entry["whiteFiles"] = []
    for index, (entry, photo) in enumerate(todo, 1):
        white = entry["dir"] / f"white-{photo.stem}.jpg"
        fresh = white.exists() and white.stat().st_mtime >= photo.stat().st_mtime
        try:
            if force or not fresh:
                background.remove_to_white(photo, white, model)
            entry["whiteFiles"].append(white)
        except Exception as error:  # noqa: BLE001
            entry["warnings"].append(f"Не удалось убрать фон с {photo.name}: {error}")
        if index % 10 == 0 or index == len(todo):
            log(f"  Фон: {index}/{len(todo)}")


# ---------------------------------------------------------------------------------------------
# Манифест
# ---------------------------------------------------------------------------------------------


def write_json(path: Path, data: object) -> None:
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def write_manifest(batch: str, batch_dir: Path, entries: list[dict], plants: dict, snapshot: dict | None, model: str):
    groups = []
    for entry in entries:
        group: TgGroup = entry["group"]
        if entry.get("plantPhotos") and not entry.get("whiteFiles"):
            entry["warnings"].append("Нет фото с белым фоном")
        groups.append(
            {
                "id": group.id,
                "date": group.date,
                "caption": group.caption,
                "code": entry["code"],
                "codeSources": {"caption": entry["captionCode"], "label": entry["labelCode"]},
                "excelRows": entry["excelRows"],
                "excelConflict": entry["excelConflict"],
                "variant": entry["variant"],
                "plantKey": entry["plantKey"],
                "labelText": entry.get("labelText", ""),
                "notes": entry.get("notes", ""),
                "media": {
                    "photos": [rel(p, batch_dir) for p in entry["photoFiles"]],
                    "labelIndex": entry["labelIndex"],
                    "plantIndexes": entry["plantIndexes"],
                    "white": [rel(p, batch_dir) for p in entry.get("whiteFiles", [])],
                    "video": rel(entry["videoFile"], batch_dir),
                },
                "warnings": entry["warnings"],
            }
        )
    manifest = {
        "version": 1,
        "batch": batch,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "apiBaseUrl": snapshot["apiBaseUrl"] if snapshot else None,
        "snapshotAt": snapshot["fetchedAt"] if snapshot else None,
        "backgroundModel": model,
        "groups": groups,
        "plants": {
            key: {
                "key": key,
                "names": plant["names"],
                "codes": sorted(plant["codes"]),
                "match": plant["match"],
                "generated": plant["generated"],
            }
            for key, plant in plants.items()
        },
    }
    write_json(batch_dir / "manifest.json", manifest)
    return manifest


def update_index(out_root: Path) -> None:
    batches = []
    for manifest_path in out_root.glob("*/manifest.json"):
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        batches.append({"batch": manifest["batch"], "createdAt": manifest["createdAt"], "groups": len(manifest["groups"])})
    batches.sort(key=lambda b: b["createdAt"], reverse=True)
    write_json(out_root / "index.json", batches)


def match_rows(manifest: dict) -> list[tuple[str, str, str, str]]:
    rows = []
    for plant in manifest["plants"].values():
        match = plant.get("match") or {}
        chosen = next(
            (c["name"] for c in match.get("candidates", []) if c["catalogItemId"] == match.get("catalogItemId")),
            "— новый каталог",
        )
        rows.append((match.get("confidence") or "-", " | ".join(plant["names"][:2]), chosen, match.get("reason", "")))
    order = {"sku": 0, "high": 1, "medium": 2, "low": 3, "-": 4}
    rows.sort(key=lambda r: (order.get(r[0], 5), r[1]))
    return rows


def print_match_report(manifest_path: Path) -> None:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    rows = match_rows(manifest)
    for confidence, names, chosen, reason in rows:
        log(f"[{confidence:>6}] {names[:70]:70} → {chosen[:45]:45}  {reason[:120]}")
    log("\n" + ", ".join(f"{k}: {v}" for k, v in Counter(r[0] for r in rows).most_common()))


def write_match_report(batch_dir: Path, manifest: dict) -> None:
    lines = ["confidence\tпрайс\tкаталог\tпричина"]
    lines += ["\t".join(row) for row in match_rows(manifest)]
    (batch_dir / "match-report.tsv").write_text("\n".join(lines), encoding="utf-8")


# ---------------------------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Подготовка партии каталога для /catalog-import")
    parser.add_argument("--export", help="папка экспорта Telegram Desktop (с result.json)")
    parser.add_argument("--excel", help="прайс .xlsx")
    parser.add_argument("--batch", required=True, help="имя партии, например 2026-10-sun")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="куда писать (по умолчанию public/catalog-import)")
    parser.add_argument("--inspect", action="store_true", help="только статистика групп экспорта")
    parser.add_argument("--limit", type=int, help="обработать только первые N постов")
    parser.add_argument(
        "--chunk",
        type=int,
        metavar="K",
        help="пачка K (с 1): посты (K-1)*size+1 … K*size, партия называется <batch>-0K",
    )
    parser.add_argument("--chunk-size", type=int, default=10, help="размер пачки для --chunk (по умолчанию 10)")
    parser.add_argument("--compare", type=int, metavar="N", help="сравнить модели удаления фона на N постах")
    parser.add_argument("--match-report", action="store_true", help="показать отчёт сопоставления партии")
    parser.add_argument("--refresh-snapshot", action="store_true", help="заново выгрузить каталог из API")
    parser.add_argument("--no-match", action="store_true", help="без API: не сопоставлять с каталогом")
    parser.add_argument("--bg-model", default=background.DEFAULT_MODEL)
    parser.add_argument("--force-bg", action="store_true", help="пересчитать белый фон, даже если он уже есть")
    parser.add_argument("--workers", type=int, default=6, help="параллельных запросов к Claude")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    load_dotenv(HERE / ".env")
    out_root = Path(args.out).resolve()
    batch = f"{args.batch}-{args.chunk:02d}" if args.chunk else args.batch
    batch_dir = out_root / batch

    if args.match_report:
        print_match_report(batch_dir / "manifest.json")
        return
    if not args.export:
        sys.exit("Нужен --export <папка экспорта Telegram>")

    export_dir = Path(args.export).expanduser().resolve()
    log(f"Экспорт: {export_dir}")
    groups, skipped = load_groups(export_dir)
    price = load_price(Path(args.excel).expanduser()) if args.excel else {}
    log(f"Прайс: {len(price)} кодов")

    if args.inspect:
        inspect(groups, skipped, price)
        return
    all_groups = groups
    if args.compare:
        groups = groups[: args.compare]
    elif args.chunk:
        size = args.chunk_size
        total = (len(all_groups) + size - 1) // size
        start = (args.chunk - 1) * size
        groups = groups[start : start + size]
        if args.chunk < 1 or not groups:
            sys.exit(f"Пачки {args.chunk} нет: в экспорте {len(all_groups)} постов — это пачки 1…{total}")
        log(f"Пачка {args.chunk} из {total}: посты {start + 1}–{start + len(groups)} → партия «{batch}»")
    elif args.limit:
        groups = groups[: args.limit]

    if any(group.videos for group in groups) and not shutil.which("ffmpeg"):
        sys.exit("Нужен ffmpeg, чтобы убрать звук из видео: brew install ffmpeg")

    model = os.environ.get("CLAUDE_MODEL") or "claude-sonnet-5-5"
    claude = ClaudeJson(model, CACHE / "claude")

    log(f"1/6 Медиа → {batch_dir}")
    entries = [copy_media(group, batch_dir) for group in groups]

    log("2/6 Разбор постов (Claude)")
    extracted = run_parallel(
        lambda e: ai_steps.extract_group(claude, e["group"].caption, e["photoFiles"]) if e["photoFiles"] else {},
        entries,
        args.workers,
        "Разбор постов",
    )
    for entry, result in zip(entries, extracted):
        resolve_entry(entry, result, price)
    warn_duplicate_codes(entries, all_groups)

    if args.compare:
        for entry in entries:
            if entry.get("plantPhoto"):
                dst = batch_dir / "compare" / f"{entry['group'].id}.jpg"
                background.compare_models(entry["plantPhoto"], dst)
                log(f"  {dst}   (оригинал | {' | '.join(background.COMPARE_MODELS)})")
        log(claude.usage_summary())
        return

    plants = build_plants(entries)
    snapshot = None
    if args.no_match:
        log("3/6 Сопоставление пропущено (--no-match)")
    else:
        log("3/6 Снимок каталога из API")
        missing = [k for k in ("API_BASE_URL", "ADMIN_EMAIL", "ADMIN_PASSWORD") if not os.environ.get(k)]
        if missing:
            sys.exit(f"Заполни в .env: {', '.join(missing)} (или запусти с --no-match)")
        snapshot = load_or_fetch(
            CACHE / "snapshot.json",
            args.refresh_snapshot,
            os.environ["API_BASE_URL"],
            os.environ["ADMIN_EMAIL"],
            os.environ["ADMIN_PASSWORD"],
        )
        log(f"  снимок от {snapshot['fetchedAt']} ({snapshot['apiBaseUrl']})")
        log(f"4/6 Сопоставление {len(plants)} растений с каталогом (Claude)")
        match_plants(claude, plants, snapshot, args.workers)

    log("5/6 Названия и описания (Claude)")
    generate_plants(claude, plants, snapshot, args.workers)

    log(f"6/6 Белый фон ({args.bg_model})")
    remove_backgrounds(entries, args.bg_model, args.force_bg)

    manifest = write_manifest(batch, batch_dir, entries, plants, snapshot, args.bg_model)
    update_index(out_root)
    if snapshot:
        write_match_report(batch_dir, manifest)

    with_warnings = sum(1 for g in manifest["groups"] if g["warnings"])
    log(f"\nГотово: {len(manifest['groups'])} постов, {len(plants)} растений, с предупреждениями: {with_warnings}")
    log(claude.usage_summary())
    log(f"Манифест: {batch_dir / 'manifest.json'}")
    if snapshot:
        log(f"Отчёт сопоставления: .venv/bin/python prepare.py --batch {batch} --match-report")


if __name__ == "__main__":
    main()
