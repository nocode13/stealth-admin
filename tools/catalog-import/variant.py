"""Разбор названия из прайса на вариант позиции и «базовое» имя растения.

`АГЛАОНЕМА "ГОЛДЕН МАДОННА" Clt7 D24 3PP` → объём 7 л, 3 растения в горшке, база
`АГЛАОНЕМА "ГОЛДЕН МАДОННА"`. Диаметр горшка (`D24`, `Ø24`, `P10`) в системе не хранится —
только вырезаем. Высоту диапазоном (`20-40СМ`) берём по нижней границе.
"""

from __future__ import annotations

import re

# В прайсе встречается кириллица вперемешку с латиницей: «Сlt», «3РР», «ЗРР» (З вместо 3).
VOLUME_CLT = re.compile(r"[CС][lL][tT]\s*(\d+(?:[.,]\d+)?)")
VOLUME_LITERS = re.compile(r"(?<![\w.,])(\d+(?:[.,]\d+)?)\s*Л(?![\w])")
PLANTS_PER_POT = re.compile(r"(?<![\w])(\d+|З)\s*[PРpр]{2}(?![\w])")
PLANTS_PER_POT_RU = re.compile(r"(?<![\w])ПП\s*(\d+)(?![\w])")
HEIGHT_RANGE = re.compile(r"(?<![\w/])(\d+)\s*[-–]\s*(\d+)\s*(?:СМ|CM|см|cm)(?![\w])")
HEIGHT_SINGLE = re.compile(r"(?<![\w/.,\-–])(\d+)\s*(?:СМ|CM|см|cm)(?![\w])")
DIAMETER = re.compile(
    r"(?<![\w])[DД]\s*\d+(?:[.,]\d+)?(?![\w])"
    r"|Ø\s*\d+(?:[.,]\d+)?(?:\s*[-–/]\s*\d+(?:[.,]\d+)?)*"
    r"|(?<![\w])P\s*\d+(?![\w])"
)
# «Ø12/14 СМ» — после вырезания диаметра остаётся висящая единица.
LONE_UNIT = re.compile(r"(?<![\w])(?:СМ|CM|см|cm)(?![\w])")

LATIN_TO_CYRILLIC = str.maketrans("aceopxykmthb", "асеорхукмтнв")
QUOTES = re.compile(r"[«»\"'“”„`]")
CYRILLIC = re.compile(r"[а-яё]")


def _liters_to_ml(text: str) -> int:
    return round(float(text.replace(",", ".")) * 1000)


def parse_name(name: str) -> dict:
    """→ `{potVolumeMl, stemCount, heightCm, baseName}`; не найденное — `None`."""
    rest = name
    pot_volume_ml = stem_count = height_cm = None

    if match := VOLUME_CLT.search(rest):
        pot_volume_ml = _liters_to_ml(match.group(1))
        rest = VOLUME_CLT.sub(" ", rest)
    elif match := VOLUME_LITERS.search(rest):
        pot_volume_ml = _liters_to_ml(match.group(1))
        rest = VOLUME_LITERS.sub(" ", rest)

    if match := PLANTS_PER_POT.search(rest):
        stem_count = 3 if match.group(1) == "З" else int(match.group(1))
        rest = PLANTS_PER_POT.sub(" ", rest)
    elif match := PLANTS_PER_POT_RU.search(rest):
        stem_count = int(match.group(1))
        rest = PLANTS_PER_POT_RU.sub(" ", rest)

    rest = DIAMETER.sub(" ", rest)

    if match := HEIGHT_RANGE.search(rest):
        height_cm = int(match.group(1))
        rest = HEIGHT_RANGE.sub(" ", rest)
    elif match := HEIGHT_SINGLE.search(rest):
        height_cm = int(match.group(1))
        rest = HEIGHT_SINGLE.sub(" ", rest)

    rest = LONE_UNIT.sub(" ", rest)
    base = " ".join(rest.split()).strip(" ,.-–/")
    return {
        "potVolumeMl": pot_volume_ml,
        "stemCount": stem_count,
        "heightCm": height_cm,
        "baseName": base,
    }


def normalize(text: str) -> str:
    """Ключ для сравнения названий: регистр, ё→е, без кавычек, латиница→кириллица в
    кириллических словах (в прайсе «C» и «С» путают)."""
    words = []
    for word in QUOTES.sub(" ", text.lower().replace("ё", "е")).split():
        words.append(word.translate(LATIN_TO_CYRILLIC) if CYRILLIC.search(word) else word)
    return " ".join(words)


def base_key(name: str) -> str:
    return normalize(parse_name(name)["baseName"])
