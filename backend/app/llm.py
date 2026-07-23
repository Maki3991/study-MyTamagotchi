"""OpenRouter chat helper. Falls back to canned replies when the API is
unavailable so the demo never hard-fails."""

import json
import os
import random
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

API_KEY = os.getenv("OPENROUTER_API_KEY", "")
MODEL = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3-super-120b-a12b:free")
FALLBACK_MODELS = [
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "google/gemma-4-26b-a4b-it:free",
    "openai/gpt-oss-20b:free",
]
BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

FALLBACK_LINES = [
    "（伸了个懒腰）你回来啦！",
    "唔……我刚刚打了个盹，你说什么？",
    "今天也要加油哦！",
    "我把这件事记在心里了。",
]


async def chat(messages: list[dict], max_tokens: int = 400, temperature: float = 0.9) -> str:
    if not API_KEY:
        return random.choice(FALLBACK_LINES)
    async with httpx.AsyncClient(timeout=60) as client:
        for model in [MODEL, *FALLBACK_MODELS]:
            try:
                resp = await client.post(
                    BASE_URL,
                    headers={
                        "Authorization": f"Bearer {API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "max_tokens": max_tokens,
                        "temperature": temperature,
                        "reasoning": {"enabled": False},
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                text = data["choices"][0]["message"]["content"].strip()
                if text:
                    return text
            except Exception:
                continue
    return random.choice(FALLBACK_LINES)


async def chat_json(messages: list[dict], max_tokens: int = 600) -> dict | list | None:
    """Ask for JSON output and parse it; returns None on failure."""
    raw = await chat(messages, max_tokens=max_tokens, temperature=0.7)
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    start = min([i for i in (text.find("{"), text.find("[")) if i != -1], default=-1)
    if start == -1:
        return None
    end = max(text.rfind("}"), text.rfind("]"))
    try:
        return json.loads(text[start : end + 1])
    except Exception:
        return None
