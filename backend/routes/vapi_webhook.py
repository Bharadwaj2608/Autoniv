"""Vapi webhook receiver — stores Call records and auto-creates Appointment entries.

Vapi can be configured to extract structured info from the call via the
`analysis.structuredData` field (a JSON object you define when creating the
assistant). We look for these keys (case-insensitive):
    name / customer_name
    phone / contact / number
    email
    address
    appointment_time / scheduled_at / appointment_at
    service / reason
    booking_status            (pending | confirmed | cancelled)

If a `name` and `appointment_time` (or service) is present in structured data,
an Appointment row is auto-created and linked back to the Call.

Plan-limit enforcement:
- After every completed call, the user's total minutes are recomputed.
- If usage >= plan.monthly_minutes, the user is auto-blocked.
- A separate `/api/vapi/eligibility` endpoint can be wired as a Vapi
  pre-call hook to reject calls before they start.
"""
from fastapi import APIRouter, Request
from datetime import datetime, timezone
import uuid, re, logging

from exports import enforce_plan_limit, total_minutes_for_user

router = APIRouter(prefix="/vapi", tags=["vapi"])
log = logging.getLogger(__name__)
def _pick(d: dict, *keys):
    """Case-insensitive key picker."""
    if not isinstance(d, dict):
        return None
    lower = {k.lower(): v for k, v in d.items()}
    for k in keys:
        v = lower.get(k.lower())
        if v not in (None, ""):
            return v
    return None

# --- helpers ---

def _extract_lead_fields(transcript: str) -> dict:
    """Best-effort extract name & phone from receptionist transcript."""
    fields = {}
    # Name patterns: "my name is X", "this is X", "I'm X"
    m = re.search(
        r"(?:my name is|this is|i(?:'m| am))\s+([A-Z][a-z]+(?: [A-Z][a-z]+)*)",
        transcript, re.IGNORECASE
    )
    if m:
        fields["name"] = m.group(1).strip()
    # Phone patterns
    m2 = re.search(r"\b(\+?[\d\s\-().]{7,20})\b", transcript)
    if m2:
        fields["phone"] = re.sub(r"[\s\-()]", "", m2.group(1))
    return fields


def _extract_appointment_fields(transcript: str) -> dict:
    """Best-effort extract service, date, time from booking transcript."""
    fields = {}
    # Service type
    svc_m = re.search(
        r"(?:for a|book(?:ing)?|schedule(?:a)?|need a?n?)\s+([a-zA-Z ]{3,40}?)(?:\s+appointment|\s+session|\s+visit|\.|\?|,)",
        transcript, re.IGNORECASE
    )
    if svc_m:
        fields["service_type"] = svc_m.group(1).strip()
    # Date: e.g. June 15, 2025-06-15, tomorrow
    date_m = re.search(
        r"(?:on |for )?((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s*\d{4})?|\d{4}-\d{2}-\d{2})",
        transcript, re.IGNORECASE
    )
    if date_m:
        fields["preferred_date"] = date_m.group(1).strip()
    # Time: 2pm, 14:00, 10:30 AM
    time_m = re.search(r"\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{2}:\d{2})\b", transcript, re.IGNORECASE)
    if time_m:
        fields["preferred_time"] = time_m.group(1).strip()
    return fields


def _detect_agent_type(name: str, system_prompt: str) -> str:
    """Classify agent as receptionist / booking / faq based on name/prompt."""
    combined = (name + " " + system_prompt).lower()
    if any(w in combined for w in ["appointment", "booking", "schedule", "book"]):
        return "booking"
    if any(w in combined for w in ["faq", "support", "question", "pricing", "hours", "timings"]):
        return "faq"
    return "receptionist"  # default


# --- webhook ---

@router.post("/webhook")
async def vapi_webhook(request: Request):
    from server import db
    body = await request.json()
    msg = body.get("message", body)
    event_type = msg.get("type") or msg.get("event")
    call = msg.get("call") or {}
    assistant_id = call.get("assistantId") or msg.get("assistantId")

    # Lookup local agent by vapi_assistant_id
    agent = None
    if assistant_id:
        agent = await db.agents.find_one({"vapi_assistant_id": assistant_id})

    if not agent:
        log.info("Vapi webhook ignored (no matching agent for %s): %s", assistant_id, event_type)
        return {"ok": True, "ignored": True}

    vapi_call_id = call.get("id") or msg.get("callId")
    status = "completed"
    if event_type in ("end-of-call-report", "status-update"):
        s = (call.get("status") or msg.get("status") or "").lower()
        if "fail" in s:
            status = "failed"
        elif "missed" in s or "no-answer" in s:
            status = "missed"
        elif "progress" in s or "in-call" in s:
            status = "in-progress"
        else:
            status = "completed"

    duration = float(msg.get("durationSeconds") or call.get("duration") or 0.0)
    recording_url = msg.get("recordingUrl") or call.get("recordingUrl")
    transcript = msg.get("transcript") or call.get("transcript")

    existing = await db.calls.find_one({"vapi_call_id": vapi_call_id}) if vapi_call_id else None
    now_iso = datetime.now(timezone.utc).isoformat()
    if existing:
        await db.calls.update_one(
            {"id": existing["id"]},
            {"$set": {
                "status": status,
                "duration_seconds": duration or existing.get("duration_seconds", 0.0),
                "recording_url": recording_url or existing.get("recording_url"),
                "transcript": transcript or existing.get("transcript"),
                "ended_at": now_iso,
            }},
        )
    else:
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": agent["owner_id"],
            "agent_id": agent["id"],
            "vapi_call_id": vapi_call_id,
            "caller_number": (call.get("customer") or {}).get("number"),
            "status": status,
            "duration_seconds": duration,
            "recording_url": recording_url,
            "transcript": transcript,
            "started_at": call.get("startedAt") or now_iso,
            "ended_at": now_iso if status != "in-progress" else None,
        }
        await db.calls.insert_one(doc)
    if status in ("completed", "failed"):
        await enforce_plan_limit(db, agent["owner_id"])

    return {"ok": True}

@router.get("/eligibility/{assistant_id}")
async def eligibility(assistant_id: str):
    """Pre-call check Vapi can call before connecting a customer.
    Returns {"allowed": bool, "reason": str|null} so Vapi can refuse the call.
    Wire this as an assistant hook or server-side pre-call gate.
    """
    from server import db
    agent = await db.agents.find_one({"vapi_assistant_id": assistant_id})
    if not agent:
        return {"allowed": False, "reason": "Unknown assistant"}
    if agent.get("is_disabled"):
        return {"allowed": False, "reason": "Agent disabled"}
    user = await db.users.find_one({"id": agent["owner_id"]})
    if not user:
        return {"allowed": False, "reason": "Owner missing"}
    if user.get("is_blocked"):
        return {"allowed": False, "reason": "Account blocked (plan limit or admin action)"}
    minutes = await total_minutes_for_user(db, user["id"])
    limit = None
    if user.get("plan_id"):
        plan = await db.plans.find_one({"id": user["plan_id"]})
        limit = (plan or {}).get("monthly_minutes")
    if limit and minutes >= limit:
        # auto-block for future
        await db.users.update_one({"id": user["id"]}, {"$set": {"is_blocked": True}})
        return {"allowed": False, "reason": "Plan minute limit exceeded",
                "minutes_used": minutes, "minutes_limit": limit}
    return {"allowed": True, "minutes_used": minutes, "minutes_limit": limit}
    
    # ---- Auto-extract data when call ends ----
    if event_type == "end-of-call-report" and transcript and status == "completed":
        agent_type = _detect_agent_type(
            agent.get("name", ""), agent.get("system_prompt", "")
        )

        if agent_type == "receptionist":
            fields = _extract_lead_fields(transcript)
            if fields.get("name"):
                await db.leads.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": agent["owner_id"],
                    "name": fields["name"],
                    "phone": fields.get("phone"),
                    "email": None,
                    "notes": f"Auto-captured from call. Purpose: see transcript.",
                    "status": "new",
                    "source_call_id": call_id,
                    "created_at": now_iso,
                })
                log.info("Auto-created lead from receptionist call")

        elif agent_type == "booking":
            fields = _extract_appointment_fields(transcript)
            lead_fields = _extract_lead_fields(transcript)
            if fields.get("service_type") or fields.get("preferred_date"):
                await db.appointments.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": agent["owner_id"],
                    "caller_name": lead_fields.get("name", "Unknown"),
                    "caller_phone": lead_fields.get("phone"),
                    "service_type": fields.get("service_type", "General"),
                    "preferred_date": fields.get("preferred_date", "TBD"),
                    "preferred_time": fields.get("preferred_time", "TBD"),
                    "status": "pending",
                    "notes": "Auto-captured from booking call.",
                    "source_call_id": call_id,
                    "created_at": now_iso,
                })
                log.info("Auto-created appointment from booking call")

    return {"ok": True}
