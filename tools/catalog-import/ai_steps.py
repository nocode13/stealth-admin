"""Шаги с Claude: разбор поста, сопоставление с каталогом, название и описание нового каталога."""

from __future__ import annotations

import hashlib
from pathlib import Path

import requests

from claude_client import ClaudeJson, image_block, nullable, strict_object
from markdown_html import md_to_html

# ---------------------------------------------------------------------------------------------
# 1. Разбор поста: код, объём, PP, какое фото — бирка, какое — растение
# ---------------------------------------------------------------------------------------------

EXTRACT_SYSTEM = """Ты помогаешь заводить растения питомника в интернет-магазин. Тебе показывают один пост \
из Telegram-канала поставщика: подпись и фото, пронумерованные с 0.

Обычно в посте одно фото бирки — табличка с наклейкой, где напечатан код товара (8 цифр, часто \
с ведущими нулями, например 13000392), название, объём горшка (CLT 3,5 — это 3,5 л; D14 — диаметр) и \
иногда количество растений в горшке (3PP). Остальные фото — само растение с разных ракурсов.

Верни:
- sku — код товара с бирки. Подпись к посту тоже обычно содержит код, но в ней бывают опечатки, \
поэтому код с бирки важнее. Если цифр не 8, верни как видишь. Кода нет — null.
- potVolumeL — объём горшка в литрах с бирки или из подписи, иначе null.
- plantsPerPot — сколько растений в горшке (PP), иначе null.
- labelText — текст бирки как есть (название, CLT, D, PP), иначе пустая строка.
- labelPhotoIndex — номер фото бирки (на витрину оно не пойдёт), иначе null.
- plantPhotoIndexes — номера фото растения для витрины, лучшее первым (растение целиком, без \
обрезанных листьев, ракурс сбоку). Фото бирки сюда не входит.
- notes — только проблемы: что-то не читается или противоречит. Если всё сходится — пустая строка, \
подтверждений вроде «код совпадает» не пиши."""

EXTRACT_SCHEMA = strict_object(
    {
        "sku": nullable({"type": "string"}),
        "potVolumeL": nullable({"type": "number"}),
        "plantsPerPot": nullable({"type": "integer"}),
        "labelText": {"type": "string"},
        "labelPhotoIndex": nullable({"type": "integer"}),
        "plantPhotoIndexes": {"type": "array", "items": {"type": "integer"}},
        "notes": {"type": "string"},
    }
)


def extract_group(claude: ClaudeJson, caption: str, photos: list[Path]) -> dict:
    content: list[dict] = [{"type": "text", "text": f"Подпись к посту:\n{caption or '(подписи нет)'}"}]
    hashes = []
    for index, photo in enumerate(photos):
        block, digest = image_block(photo)
        hashes.append(digest)
        content += [{"type": "text", "text": f"Фото {index}:"}, block]
    return claude.ask(
        cache_key=["extract", caption, hashes],
        system=EXTRACT_SYSTEM,
        content=content,
        schema=EXTRACT_SCHEMA,
        effort="low",
    )


# ---------------------------------------------------------------------------------------------
# 2. Сопоставление с каталогом: отбор по названиям (весь каталог в кэшируемом system-блоке)
# ---------------------------------------------------------------------------------------------

MATCH_SYSTEM = """Ты сопоставляешь позиции из прайс-листа питомника с каталогом интернет-магазина \
растений.

В прайсе названия заглавными буквами, с транслитом сортов, опечатками и размерами (Clt — объём \
горшка, D или Ø — диаметр, PP — растений в горшке, СМ — высота). В каталоге магазина названия \
записаны по-своему: другой регистр и кавычки, иной транслит, другой порядок слов, иногда латынь.

Правила:
- Позиция каталога — это растение без размера. Размеры, объём горшка и количество растений при \
сопоставлении не важны.
- Род и сорт (или вид) обязаны совпасть. Транслит, опечатки, сокращения и латиница допустимы: \
«Эпипремнум» = «Эпипренум», «Сильвер Бэй» = «Silver Bay». Но разные сорта — разные позиции: \
«Сильвер Бэй» ≠ «Сильвер Блю», «Голден Мадонна» ≠ «Мадонна».
- Если в прайсе сорт не указан, подходит позиция каталога без сорта.
- Форма выращивания (штамб, шпалера, тотем, ампель) — часть позиции, если она есть в названии каталога.
- Народное и научное название вида — одно и то же растение: «Кофе арабика» = «Кофе аравийский» = \
Coffea arabica. Это совпадение вида, а не разные сорта.
- Возвращай номер позиции из первой колонки списка ниже, ничего не придумывай.

Каталог магазина, по строке на позицию: номер | название | подкатегория | варианты, которые уже \
продаются."""

# Номера вместо id: cuid каталогов, заведённых пачкой, отличаются только хвостом, и модель путала их
# при переписывании (кофе пропал из сопоставления из-за одной перепутанной буквы в id).
MATCH_TEXT_SCHEMA = strict_object(
    {
        "candidates": {
            "type": "array",
            "items": strict_object({"catalogNumber": {"type": "integer"}, "reason": {"type": "string"}}),
        },
        "comment": {"type": "string"},
    }
)

VERIFY_SYSTEM = """Ты проверяешь, совпадает ли растение с фото поставщика с одной из позиций каталога \
интернет-магазина. Сравнивай род и сорт: форму, окраску и рисунок листьев, характер роста. Размер \
растения, горшок, фон и освещение не важны."""

VERIFY_SCHEMA = strict_object(
    {
        "candidateNumber": nullable({"type": "integer"}),
        "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
        "reason": {"type": "string"},
    }
)

MAX_CANDIDATES = 5


def catalog_lines(snapshot: dict) -> tuple[list[str], dict[int, str]]:
    """→ строки «номер | название | подкатегория | варианты» и номер → id каталога."""
    variants: dict[str, set[str]] = {}
    for listing in snapshot["listings"]:
        variants.setdefault(listing["catalogItemId"], set()).add(format_variant(listing))
    lines: list[str] = []
    ids: dict[int, str] = {}
    approved = [c for c in snapshot["catalogs"] if c["status"] == "APPROVED"]
    for number, catalog in enumerate(sorted(approved, key=lambda c: (c["name"].lower(), c["id"])), 1):
        listed = ", ".join(sorted(v for v in variants.get(catalog["id"], set()) if v)[:8]) or "—"
        lines.append(f"{number} | {catalog['name']} | {catalog['subcategory'] or '—'} | {listed}")
        ids[number] = catalog["id"]
    return lines, ids


def format_variant(listing: dict) -> str:
    parts = []
    if listing.get("seedling"):
        parts.append("росток")
    if listing.get("potVolumeMl"):
        parts.append(f"{listing['potVolumeMl'] / 1000:g} л")
    if listing.get("stemCount"):
        parts.append(f"{listing['stemCount']} шт")
    if listing.get("heightCm"):
        parts.append(f"{listing['heightCm']} см")
    return " · ".join(parts)


def match_candidates(claude: ClaudeJson, names: list[str], catalog_block: str, ids: dict[int, str]) -> list[dict]:
    """→ `[{catalogItemId, reason}]`; номера из ответа переводим в id сами."""
    names_text = "\n".join(f"- {name}" for name in names)
    result = claude.ask(
        cache_key=["match-text-v2", names, hashlib.sha256(catalog_block.encode()).hexdigest()],
        system=[
            {"type": "text", "text": MATCH_SYSTEM},
            {"type": "text", "text": catalog_block, "cache_control": {"type": "ephemeral"}},
        ],
        content=[
            {
                "type": "text",
                "text": f"Названия этого растения в прайсе (разные размеры):\n{names_text}\n\n"
                f"Верни до {MAX_CANDIDATES} самых вероятных позиций каталога по убыванию вероятности "
                "(пустой список, если подходящих нет) с короткой причиной.",
            }
        ],
        schema=MATCH_TEXT_SCHEMA,
        effort="medium",
    )
    seen: set[str] = set()
    candidates = []
    for candidate in result["candidates"]:
        catalog_id = ids.get(candidate["catalogNumber"])
        if catalog_id and catalog_id not in seen:
            seen.add(catalog_id)
            candidates.append({"catalogItemId": catalog_id, "reason": candidate["reason"]})
    return candidates[:MAX_CANDIDATES]


def _download(url: str, cache_dir: Path) -> bytes | None:
    path = cache_dir / hashlib.sha256(url.encode()).hexdigest()
    if path.exists():
        return path.read_bytes()
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
    except requests.RequestException:
        return None
    cache_dir.mkdir(parents=True, exist_ok=True)
    path.write_bytes(response.content)
    return response.content


def verify_by_photo(
    claude: ClaudeJson,
    names: list[str],
    plant_photo: Path | None,
    candidates: list[dict],
    covers_dir: Path,
) -> dict:
    """candidates: `{catalogItemId, name, coverUrl}`."""
    content: list[dict] = [{"type": "text", "text": "Растение в прайсе: " + "; ".join(names)}]
    key: list = ["verify-v2", names]
    if plant_photo:
        block, digest = image_block(plant_photo, max_side=1024)
        content += [{"type": "text", "text": "Фото поставщика:"}, block]
        key.append(digest)
    for number, candidate in enumerate(candidates, 1):
        content.append({"type": "text", "text": f"Кандидат {number}: {candidate['name']}"})
        raw = _download(candidate["coverUrl"], covers_dir) if candidate.get("coverUrl") else None
        if raw:
            try:
                block, digest = image_block(raw, max_side=768)
                content.append(block)
                key.append(digest)
                continue
            except OSError:
                pass
        content.append({"type": "text", "text": "(фото у позиции нет)"})
        key.append(candidate["catalogItemId"])
    content.append(
        {
            "type": "text",
            "text": "Верни номер кандидата, который является тем же растением, или null, если "
            "не подходит ни один. confidence: high — совпадают и название, и фото; medium — "
            "название подходит, но по фото уверенности нет или фото нет; low — сомневаешься.",
        }
    )
    result = claude.ask(cache_key=key, system=VERIFY_SYSTEM, content=content, schema=VERIFY_SCHEMA, effort="medium")
    number = result["candidateNumber"]
    chosen = candidates[number - 1]["catalogItemId"] if number and 1 <= number <= len(candidates) else None
    return {"catalogItemId": chosen, "confidence": result["confidence"], "reason": result["reason"]}


# ---------------------------------------------------------------------------------------------
# 3. Название и описание для нового каталога (и описание для существующего, где его нет)
# ---------------------------------------------------------------------------------------------

GENERATE_SYSTEM = """Ты пишешь карточки растений для интернет-магазина в Ташкенте. Языки: русский, \
узбекский (латиница) и английский. Пишешь тепло и живо, как пост для покупателя, а не статья из \
энциклопедии, но факты — только проверенные: лучше пропустить, чем выдумать."""

GENERATE_SCHEMA = strict_object(
    {
        "nameRu": {"type": "string"},
        "nameUz": {"type": "string"},
        "nameEn": {"type": "string"},
        "descriptionRu": {"type": "string"},
        "descriptionUz": {"type": "string"},
        "descriptionEn": {"type": "string"},
        "genusRu": {"type": "string"},
    }
)

DESCRIPTION_FIELDS = ("descriptionRu", "descriptionUz", "descriptionEn")

GENERATE_RULES = """Требования:
- nameRu — название позиции каталога: род или вид с заглавной буквы, сорт в кавычках «…» с \
заглавных букв, например: Аглаонема «Голден Мадонна». Без размеров, объёма, диаметра, высоты, \
количества растений в горшке, без «ВГ», «ЭКО-БОКС» и подобных пометок прайса. Исправь опечатки и \
транслит прайса. Если ниже есть позиции того же рода из каталога, пиши в их стиле.
- nameUz и nameEn — то же название; сорт — в оригинальном написании латиницей в одинарных \
кавычках, например: Aglaonema 'Golden Madonna'.
- descriptionRu — описание в Markdown, по такой схеме:
  1. Первая строка — зацепка: «<растение> — <чем хорошо и кому подойдёт>» и один эмодзи по смыслу.
  2. Абзац о родине и природных условиях и что из этого следует дома (растёт под пологом \
леса → хватит рассеянного света, подойдёт окно не на солнечной стороне).
  3. Абзац с интересным фактом: что значит народное или английское название, история, необычная \
особенность. Только то, в чём уверен; если уверенного факта нет — пропусти абзац.
  4. Строка «Что ей нравится:» (род по названию: ей / ему / им) и список из 3–4 пунктов \
«- эмодзи текст»: свет (🌤️ или ☀️), полив (💧), температура (🌡️), влажность (💦), если она важна. \
Коротко и конкретно.
  5. Если растение ядовито для кошек, собак или детей — абзац «⚠️ **Важно:** …» с советом, где \
его держать. Если не ядовито или ты не уверен — абзац не пиши.
  6. Последняя строка — короткая тёплая фраза с эмодзи.
  Абзацы разделяй пустой строкой. Из Markdown — только абзацы, список «- », **жирный** и *курсив*: \
без заголовков, ссылок, таблиц и цитат. Эмодзи — 5–8 на весь текст. Обращайся на «вы». Без цен, \
размеров горшка, наличия и обещаний доставки.
- descriptionUz (узбекский, латиница) и descriptionEn — та же схема и тот же смысл, но живым языком \
своего читателя, а не дословный перевод. Строка перед списком: «Nimani yoqtiradi:» / «What it likes:».
- genusRu — род по-русски одним словом с заглавной буквы, например: Аглаонема.

Пример descriptionRu для другого растения — ориентир по тону и схеме, факты из него не переноси:

Аглаонема — растение для тех, кто хочет зелёный уголок без лишних хлопот 🌿

Родом она из тропических лесов Азии, где растёт под пологом больших деревьев. Поэтому ей не нужно \
палящее солнце: хватит мягкого рассеянного света. Это отличный вариант для комнаты, где окно \
выходит не на солнечную сторону.

В англоязычных странах её называют *Chinese Evergreen*, то есть «китайская вечнозелёная». \
Аглаонема попала в знаменитое исследование NASA о растениях, которые поглощают вредные вещества \
из воздуха.

Что ей нравится:
- 🌤️ рассеянный свет, без прямых лучей
- 💧 умеренный полив, когда верхний слой земли подсох
- 🌡️ тепло, сквозняки и холод она не любит

⚠️ **Важно:** листья и сок аглаонемы ядовиты для кошек и собак. Держите её там, где питомцы не \
смогут её погрызть.

Немного солнечного настроения в квартире, даже если за окном пасмурно ☀️"""


def generate_texts(claude: ClaudeJson, names: list[str], plant_photo: Path | None, neighbours: list[str]) -> dict:
    names_text = "\n".join(f"- {name}" for name in names)
    neighbours_text = "\n".join(f"- {name}" for name in neighbours) or "(нет)"
    content: list[dict] = [
        {
            "type": "text",
            "text": f"Названия растения в прайсе поставщика (разные размеры):\n{names_text}\n\n"
            f"Позиции того же рода, которые уже есть в каталоге магазина:\n{neighbours_text}",
        }
    ]
    # v2 — описания в Markdown в стиле поста; старые HTML-ответы из кэша не подтягиваются.
    key: list = ["generate-v2", names, neighbours]
    if plant_photo:
        block, digest = image_block(plant_photo, max_side=1024)
        content += [{"type": "text", "text": "Фото растения:"}, block]
        key.append(digest)
    content.append({"type": "text", "text": GENERATE_RULES})
    texts = claude.ask(cache_key=key, system=GENERATE_SYSTEM, content=content, schema=GENERATE_SCHEMA, effort="medium")
    # Claude пишет Markdown, бэкенд хранит описания HTML-ом — переводим здесь (в кэше сырой Markdown).
    return {**texts, **{field: md_to_html(texts[field]) for field in DESCRIPTION_FIELDS}}
