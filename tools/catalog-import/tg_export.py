"""Чтение экспорта канала из Telegram Desktop (Export chat history).

Поддерживаются оба формата экспорта: Machine-readable JSON (`result.json`) и HTML
(`messages.html`, `messages2.html`, …). Фото могут быть отправлены и как фото, и как файлы.
"""

from __future__ import annotations

import html
import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

# Так экспорт подписывает файлы, которые не попали в выгрузку (не отмечен тип или превышен лимит).
MISSING_FILE_PREFIX = "(File not included"
PHOTO_EXT = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
VIDEO_EXT = {".mp4", ".mov", ".m4v"}
# Альбом иногда переваливает через секунду; посты в канале идут с паузой в десятки секунд.
ALBUM_GAP_SECONDS = 10


@dataclass
class TgMedia:
    message_id: int
    kind: str  # "photo" | "video"
    path: Path


@dataclass
class TgGroup:
    id: str
    date: str
    stamp: str
    caption: str = ""
    media: list[TgMedia] = field(default_factory=list)
    captions_count: int = 0

    @property
    def photos(self) -> list[TgMedia]:
        return [m for m in self.media if m.kind == "photo"]

    @property
    def videos(self) -> list[TgMedia]:
        return [m for m in self.media if m.kind == "video"]


@dataclass
class _Message:
    id: int
    stamp: str  # время отправки как в экспорте
    date: str
    text: str
    media: TgMedia | None
    missing: str | None = None
    timestamp: float | None = None


def _kind_by_path(path: str) -> str | None:
    suffix = Path(path).suffix.lower()
    if suffix in PHOTO_EXT:
        return "photo"
    if suffix in VIDEO_EXT:
        return "video"
    return None


# --- JSON ------------------------------------------------------------------------------------


def flatten_text(text: object) -> str:
    """`text` в JSON-экспорте — строка или массив из строк и entity-объектов `{type, text}`."""
    if isinstance(text, str):
        return text
    if isinstance(text, list):
        return "".join(part if isinstance(part, str) else str(part.get("text", "")) for part in text)
    return ""


def _json_media(msg: dict, root: Path) -> TgMedia | None:
    photo = msg.get("photo")
    if isinstance(photo, str) and not photo.startswith(MISSING_FILE_PREFIX):
        return TgMedia(msg["id"], "photo", root / photo)
    file = msg.get("file")
    if isinstance(file, str) and not file.startswith(MISSING_FILE_PREFIX):
        mime = msg.get("mime_type") or ""
        if msg.get("media_type") == "video_file" or mime.startswith("video/"):
            return TgMedia(msg["id"], "video", root / file)
        if mime.startswith("image/"):
            return TgMedia(msg["id"], "photo", root / file)
    return None


def _json_messages(export_dir: Path) -> list[_Message]:
    data = json.loads((export_dir / "result.json").read_text(encoding="utf-8"))
    messages = []
    for msg in data.get("messages", []):
        if msg.get("type") != "message":
            continue
        missing = None
        for key in ("photo", "file"):
            value = msg.get(key)
            if isinstance(value, str) and value.startswith(MISSING_FILE_PREFIX):
                missing = "файл не выгружен (проверь галочки Photos/Videos/Files и Size limit)"
        unixtime = msg.get("date_unixtime")
        messages.append(
            _Message(
                id=msg["id"],
                stamp=str(unixtime or msg.get("date", "")),
                date=msg.get("date", ""),
                text=flatten_text(msg.get("text", "")).strip(),
                media=_json_media(msg, export_dir),
                missing=missing,
                timestamp=float(unixtime) if unixtime else None,
            )
        )
    return messages


# --- HTML ------------------------------------------------------------------------------------

MESSAGE_SPLIT = re.compile(r'(?=<div class="message )')
MESSAGE_HEAD = re.compile(r'^<div class="message ([^"]*)" id="message(-?\d+)"')
DATE_TITLE = re.compile(r'class="pull_right date details" title="([^"]+)"')
MEDIA_HREF = re.compile(r'href="((?:files|photos|video_files|round_video_messages)/[^"]+)"')
TEXT_DIV = re.compile(r'<div class="text">\s*(.*?)\s*</div>', re.S)
TAG = re.compile(r"<[^>]+>")


def _html_page_order(path: Path) -> int:
    match = re.search(r"messages(\d*)\.html$", path.name)
    return int(match.group(1) or 1) if match else 0


def _parse_html_date(title: str) -> datetime | None:
    """`18 October 2026, 17:01:56` (иногда с хвостом таймзоны) → datetime; не разобрали — None."""
    head = title.split(" UTC")[0].strip()
    for fmt in ("%d %B %Y, %H:%M:%S", "%d.%m.%Y %H:%M:%S"):
        try:
            return datetime.strptime(head, fmt)
        except ValueError:
            continue
    return None


def _html_messages(export_dir: Path) -> list[_Message]:
    messages = []
    pages = sorted(export_dir.glob("messages*.html"), key=_html_page_order)
    for page in pages:
        for block in MESSAGE_SPLIT.split(page.read_text(encoding="utf-8")):
            head = MESSAGE_HEAD.match(block)
            if not head or "service" in head.group(1).split():
                continue
            message_id = int(head.group(2))
            title = DATE_TITLE.search(block)
            stamp = title.group(1) if title else ""
            text_match = TEXT_DIV.search(block)
            text = ""
            if text_match:
                text = html.unescape(TAG.sub("", text_match.group(1).replace("<br>", "\n"))).strip()
            media = None
            missing = None
            href = MEDIA_HREF.search(block)
            if href:
                relative = html.unescape(href.group(1))
                kind = _kind_by_path(relative)
                if kind:
                    media = TgMedia(message_id, kind, export_dir / relative)
            elif MISSING_FILE_PREFIX in block or "Exceeds maximum size" in block:
                missing = "файл не выгружен (проверь галочки Photos/Videos/Files и Size limit)"
            parsed = _parse_html_date(stamp)
            messages.append(
                _Message(
                    id=message_id,
                    stamp=stamp,
                    date=parsed.isoformat() if parsed else stamp,
                    text=text,
                    media=media,
                    missing=missing,
                    timestamp=parsed.timestamp() if parsed else None,
                )
            )
    return messages


# --- группировка в альбомы -------------------------------------------------------------------


def _starts_new_group(current: TgGroup | None, previous: _Message | None, message: _Message) -> bool:
    if current is None or previous is None:
        return True
    if message.timestamp is not None and previous.timestamp is not None:
        if message.timestamp - previous.timestamp > ALBUM_GAP_SECONDS:
            return True
    elif message.stamp != previous.stamp:
        return True
    # Подпись — начало следующего поста (два альбома, отправленные в одну секунду). Исключение:
    # подпись на не первом медиа того же альбома, пока у поста ещё нет своей подписи.
    if message.text:
        return bool(current.caption) or message.stamp != previous.stamp
    return False


def load_groups(export_dir: Path) -> tuple[list[TgGroup], list[dict]]:
    """Альбомы → группы.

    В экспорте нет id альбома. Пост в канале — альбом с кодом в подписи, поэтому новая группа
    начинается с подписи или после паузы больше `ALBUM_GAP_SECONDS`; медиа без подписи прилипают
    к текущей группе (альбом иногда переваливает через секунду). Сообщение без медиа разрывает
    группу. Возвращает группы и пропущенные сообщения — для `--inspect`.
    """
    if (export_dir / "result.json").exists():
        messages = _json_messages(export_dir)
    elif any(export_dir.glob("messages*.html")):
        messages = _html_messages(export_dir)
    else:
        raise FileNotFoundError(f"В {export_dir} нет ни result.json, ни messages.html")

    groups: list[TgGroup] = []
    skipped: list[dict] = []
    current: TgGroup | None = None
    previous: _Message | None = None
    for message in messages:
        if message.media is None:
            skipped.append(
                {
                    "id": message.id,
                    "date": message.date,
                    "text": message.text[:80],
                    "reason": message.missing or "нет медиа",
                }
            )
            current = previous = None
            continue
        if _starts_new_group(current, previous, message):
            current = TgGroup(id=str(message.id), date=message.date, stamp=message.stamp)
            groups.append(current)
        previous = message
        current.media.append(message.media)
        if message.text:
            current.captions_count += 1
            current.caption = f"{current.caption}\n{message.text}" if current.caption else message.text
    return groups, skipped
