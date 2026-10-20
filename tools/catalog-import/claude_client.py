"""Вызовы Claude со структурированным JSON-ответом и кэшем на диске.

Повторный прогон с теми же входами берёт ответ из `cache/claude/` и ничего не платит.
"""

from __future__ import annotations

import base64
import hashlib
import io
import json
import threading
from collections import Counter
from pathlib import Path

import anthropic
from PIL import Image, ImageOps

# Меняется, когда меняются промпты или схемы, — чтобы старый кэш не подсовывал устаревшие ответы.
PROMPT_VERSION = 1

# $ за 1M токенов: вход, выход, запись в кэш (5 мин), чтение кэша. Только для отчёта о расходе.
PRICES_PER_MTOK = {"claude-sonnet-5-5": (2.0, 10.0, 2.5, 0.2)}


class ClaudeRefusal(RuntimeError):
    pass


def image_block(source: Path | bytes, max_side: int = 1568) -> tuple[dict, str]:
    """→ (content-блок с base64 JPEG, короткий хэш картинки для ключа кэша)."""
    raw = source.read_bytes() if isinstance(source, Path) else source
    image = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert("RGB")
    image.thumbnail((max_side, max_side))
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=85)
    data = buffer.getvalue()
    block = {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": "image/jpeg",
            "data": base64.standard_b64encode(data).decode("ascii"),
        },
    }
    return block, hashlib.sha256(raw).hexdigest()[:16]


def nullable(schema: dict) -> dict:
    return {"anyOf": [schema, {"type": "null"}]}


def strict_object(properties: dict) -> dict:
    return {
        "type": "object",
        "properties": properties,
        "required": list(properties),
        "additionalProperties": False,
    }


class ClaudeJson:
    def __init__(self, model: str, cache_dir: Path):
        self.model = model
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.client = anthropic.Anthropic(max_retries=5)
        self.usage: Counter = Counter()
        self._lock = threading.Lock()

    def usage_summary(self) -> str:
        u = self.usage
        line = f"Claude: {u['calls']} запросов, {u['cached']} из кэша на диске"
        prices = PRICES_PER_MTOK.get(self.model)
        if not u["calls"] or not prices:
            return line
        cost = (
            u["input"] * prices[0] + u["output"] * prices[1] + u["cache_write"] * prices[2] + u["cache_read"] * prices[3]
        ) / 1_000_000
        return (
            f"{line}; токены: вход {u['input']:,}, выход {u['output']:,}, "
            f"запись кэша {u['cache_write']:,}, чтение кэша {u['cache_read']:,} → ≈ ${cost:.2f}"
        )

    def ask(
        self,
        *,
        cache_key: list,
        system: str | list[dict],
        content: list[dict],
        schema: dict,
        effort: str = "medium",
        max_tokens: int = 16000,
    ) -> dict:
        key = hashlib.sha256(
            json.dumps([self.model, PROMPT_VERSION, cache_key], ensure_ascii=False, sort_keys=True).encode()
        ).hexdigest()
        path = self.cache_dir / f"{key}.json"
        if path.exists():
            with self._lock:
                self.usage["cached"] += 1
            return json.loads(path.read_text(encoding="utf-8"))

        # fallbacks="default": если классификатор Sonnet откажет, API сам повторит запрос
        # на рекомендованной модели внутри того же вызова.
        response = self.client.beta.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            system=system,
            messages=[{"role": "user", "content": content}],
            output_config={"effort": effort, "format": {"type": "json_schema", "schema": schema}},
        )
        with self._lock:
            self.usage["calls"] += 1
            self.usage["input"] += response.usage.input_tokens or 0
            self.usage["output"] += response.usage.output_tokens or 0
            self.usage["cache_write"] += response.usage.cache_creation_input_tokens or 0
            self.usage["cache_read"] += response.usage.cache_read_input_tokens or 0
        if response.stop_reason == "refusal":
            raise ClaudeRefusal(f"Claude отказался отвечать: {response.stop_details}")
        if response.stop_reason == "max_tokens":
            raise RuntimeError("Ответ Claude обрезан по max_tokens")

        text = next(block.text for block in response.content if block.type == "text")
        data = json.loads(text)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return data
