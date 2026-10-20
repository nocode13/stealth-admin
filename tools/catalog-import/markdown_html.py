"""Markdown от Claude → HTML описания каталога.

Только то, что пропускает allowlist бэкенда (`stealth-backend/src/common/rich-text.ts`): абзацы,
списки, жирный, курсив, H2/H3. Списки — в форме tiptap (`<li><p>…</p></li>`), чтобы редактор админки
открывал описание без перестройки. Эмодзи — обычный текст, проходят как есть.
"""

from __future__ import annotations

import html
import re

BOLD = re.compile(r"\*\*(.+?)\*\*")
ITALIC = re.compile(r"(?<![*\w])[*_](?!\s)(.+?)(?<!\s)[*_](?![*\w])")
BULLET = re.compile(r"^\s*[-*•]\s+(.*)$")
NUMBERED = re.compile(r"^\s*\d+[.)]\s+(.*)$")
HEADING = re.compile(r"^(#{1,6})\s+(.*)$")


def _inline(text: str) -> str:
    text = html.escape(text.strip(), quote=False)
    text = BOLD.sub(r"<strong>\1</strong>", text)
    return ITALIC.sub(r"<em>\1</em>", text)


def md_to_html(markdown: str) -> str:
    blocks: list[str] = []
    paragraph: list[str] = []
    items: list[str] = []
    list_tag = "ul"

    def flush_paragraph() -> None:
        if paragraph:
            blocks.append("<p>" + "<br>".join(_inline(line) for line in paragraph) + "</p>")
            paragraph.clear()

    def flush_list() -> None:
        if items:
            blocks.append(f"<{list_tag}>" + "".join(f"<li><p>{_inline(i)}</p></li>" for i in items) + f"</{list_tag}>")
            items.clear()

    for line in markdown.splitlines():
        stripped = line.strip()
        if not stripped:
            flush_paragraph()
            flush_list()
            continue
        if heading := HEADING.match(stripped):
            flush_paragraph()
            flush_list()
            tag = "h2" if len(heading.group(1)) <= 2 else "h3"
            blocks.append(f"<{tag}>{_inline(heading.group(2))}</{tag}>")
            continue
        bullet, numbered = BULLET.match(line), NUMBERED.match(line)
        if bullet or numbered:
            flush_paragraph()
            tag = "ul" if bullet else "ol"
            if items and tag != list_tag:
                flush_list()
            list_tag = tag
            items.append((bullet or numbered).group(1))
            continue
        flush_list()
        paragraph.append(stripped)

    flush_paragraph()
    flush_list()
    return "".join(blocks)
