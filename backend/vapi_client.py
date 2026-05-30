"""Vapi API client wrapper. Gracefully degrades when no API key is set."""
import os
import logging
import httpx
from typing import Optional

log = logging.getLogger(__name__)
VAPI_BASE = "https://api.vapi.ai"


def _key() -> Optional[str]:
    k = os.environ.get("VAPI_API_KEY", "").strip()
    return k or None


def is_configured() -> bool:
    return _key() is not None


async def create_assistant(name: str, first_message: str, system_prompt: str,
                           voice: str = "alloy", model: str = "gpt-4o-mini") -> Optional[str]:
    """Create a Vapi assistant; returns assistant id or None if not configured."""
    if not is_configured():
        return None
    payload = {
        "name": name,
        "firstMessage": first_message,
        "model": {
            "provider": "openai",
            "model": model,
            "messages": [{"role": "system", "content": system_prompt}],
        },
        "voice": {"provider": "openai", "voiceId": voice},
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                f"{VAPI_BASE}/assistant",
                headers={"Authorization": f"Bearer {_key()}"},
                json=payload,
            )
            if r.status_code >= 400:
                log.warning("Vapi assistant create failed: %s %s", r.status_code, r.text)
                return None
            return r.json().get("id")
    except Exception as e:
        log.exception("Vapi assistant create error: %s", e)
        return None


async def update_assistant(assistant_id: str, **fields) -> bool:
    if not is_configured() or not assistant_id:
        return False
    body = {}
    if "name" in fields:
        body["name"] = fields["name"]
    if "first_message" in fields:
        body["firstMessage"] = fields["first_message"]
    if "system_prompt" in fields:
        body["model"] = {
            "provider": "openai",
            "model": fields.get("model", "gpt-4o-mini"),
            "messages": [{"role": "system", "content": fields["system_prompt"]}],
        }
    if "voice" in fields:
        body["voice"] = {"provider": "openai", "voiceId": fields["voice"]}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.patch(
                f"{VAPI_BASE}/assistant/{assistant_id}",
                headers={"Authorization": f"Bearer {_key()}"},
                json=body,
            )
            return r.status_code < 400
    except Exception as e:
        log.exception("Vapi update error: %s", e)
        return False


async def delete_assistant(assistant_id: str) -> bool:
    if not is_configured() or not assistant_id:
        return False
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.delete(
                f"{VAPI_BASE}/assistant/{assistant_id}",
                headers={"Authorization": f"Bearer {_key()}"},
            )
            return r.status_code < 400
    except Exception:
        return False


async def list_calls(assistant_id: Optional[str] = None, limit: int = 100) -> list:
    if not is_configured():
        return []
    params = {"limit": limit}
    if assistant_id:
        params["assistantId"] = assistant_id
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(
                f"{VAPI_BASE}/call",
                headers={"Authorization": f"Bearer {_key()}"},
                params=params,
            )
            if r.status_code >= 400:
                return []
            return r.json() or []
    except Exception:
        return []
