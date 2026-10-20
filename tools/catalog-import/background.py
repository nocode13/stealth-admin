"""Удаление фона (rembg) и заливка белым #FFFFFF. Кадр не трогаем: фото из канала уже квадратные."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps

DEFAULT_MODEL = "birefnet-general"
COMPARE_MODELS = ("isnet-general-use", "birefnet-general")
# Бэкенд всё равно ужимает до 1600 по длинной стороне; оригиналы из канала 2992×2992, а лимит
# загрузки фото — 5 МБ.
MAX_SIDE = 1600

_sessions: dict = {}


def _session(model: str):
    from rembg import new_session  # тяжёлый импорт (onnxruntime) — только когда реально нужен

    if model not in _sessions:
        _sessions[model] = new_session(model)
    return _sessions[model]


def cut_out(src: Path, model: str) -> Image.Image:
    from rembg import remove

    image = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    return remove(image, session=_session(model))


def on_white(cutout: Image.Image) -> Image.Image:
    rgba = cutout.convert("RGBA")
    background = Image.new("RGB", rgba.size, (255, 255, 255))
    background.paste(rgba, mask=rgba.getchannel("A"))
    return background


def remove_to_white(src: Path, dst: Path, model: str = DEFAULT_MODEL) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    image = on_white(cut_out(src, model))
    image.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
    image.save(dst, "JPEG", quality=92)


def compare_models(src: Path, dst: Path) -> None:
    """Оригинал и результат каждой модели в одну полосу — чтобы выбрать модель глазами."""
    original = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    tiles = [original] + [on_white(cut_out(src, model)) for model in COMPARE_MODELS]
    height = 600
    tiles = [tile.resize((round(tile.width * height / tile.height), height)) for tile in tiles]
    strip = Image.new("RGB", (sum(t.width for t in tiles), height), (255, 255, 255))
    x = 0
    for tile in tiles:
        strip.paste(tile, (x, 0))
        x += tile.width
    dst.parent.mkdir(parents=True, exist_ok=True)
    strip.save(dst, "JPEG", quality=90)
