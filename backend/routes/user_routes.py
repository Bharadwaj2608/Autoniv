import os
"""User-scoped endpoints (multi-tenant: only own data)."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from auth import get_current_user
from models import LeadCreate, LeadUpdate

router = APIRouter(tags=["user"])


# ----- Agents (READ ONLY — admin creates them) -----
@router.get("/agents")
async def list_agents(user: dict = Depends(get_current_user)):
    from server import db
    if user.get("role") == "admin":
        agents = await db.agents.find({}, {"_id": 0}).to_list(500)
    else:
        agents = await db.agents.find({"is_disabled": False}, {"_id": 0}).to_list(500)
    return agents


# ----- Calls -----
@router.get("/calls")
async def list_my_calls(user: dict = Depends(get_current_user)):
    from server import db
    calls = await db.calls.find({"user_id": user["id"]}, {"_id": 0}).sort("started_at", -1).to_list(1000)
    return calls


@router.get("/analytics")
async def my_analytics(user: dict = Depends(get_current_user)):
    from server import db
    pipeline = [
        {"$match": {"user_id": user["id"]}},
        {"$group": {
            "_id": None,
            "total_calls": {"$sum": 1},
            "total_minutes": {"$sum": {"$divide": ["$duration_seconds", 60]}},
            "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
            "missed": {"$sum": {"$cond": [{"$eq": ["$status", "missed"]}, 1, 0]}},
        }}
    ]
    agg = await db.calls.aggregate(pipeline).to_list(1)
    summary = agg[0] if agg else {"total_calls": 0, "total_minutes": 0, "completed": 0, "missed": 0}
    summary.pop("_id", None)
    summary["total_minutes"] = round(summary.get("total_minutes", 0), 2)

    daily_pipeline = [
        {"$match": {"user_id": user["id"]}},
        {"$group": {
            "_id": {"$substr": ["$started_at", 0, 10]},
            "calls": {"$sum": 1},
            "minutes": {"$sum": {"$divide": ["$duration_seconds", 60]}},
        }},
        {"$sort": {"_id": -1}},
        {"$limit": 14},
    ]
    daily = await db.calls.aggregate(daily_pipeline).to_list(14)
    daily = [{"date": d["_id"], "calls": d["calls"], "minutes": round(d["minutes"], 2)} for d in daily]
    daily.reverse()
    return {"summary": summary, "daily": daily}


# ----- Leads -----
@router.get("/leads")
async def list_my_leads(user: dict = Depends(get_current_user)):
    from server import db
    leads = await db.leads.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return leads


@router.post("/leads")
async def create_my_lead(payload: LeadCreate, user: dict = Depends(get_current_user)):
    from server import db
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        **payload.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.leads.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/leads/{lead_id}")
async def update_my_lead(lead_id: str, payload: LeadUpdate, user: dict = Depends(get_current_user)):
    from server import db
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    res = await db.leads.update_one({"id": lead_id, "user_id": user["id"]}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    doc = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return doc


@router.delete("/leads/{lead_id}")
async def delete_my_lead(lead_id: str, user: dict = Depends(get_current_user)):
    from server import db
    res = await db.leads.delete_one({"id": lead_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"ok": True}


# ----- Billing -----
@router.get("/billing")
async def my_billing(user: dict = Depends(get_current_user)):
    from server import db
    plan = None
    if user.get("plan_id"):
        plan = await db.plans.find_one({"id": user["plan_id"]}, {"_id": 0})
    pipeline = [
        {"$match": {"user_id": user["id"]}},
        {"$group": {"_id": None, "minutes": {"$sum": {"$divide": ["$duration_seconds", 60]}}}},
    ]
    agg = await db.calls.aggregate(pipeline).to_list(1)
    minutes = round(agg[0]["minutes"], 2) if agg else 0.0
    return {"plan": plan, "minutes_used": minutes, "is_blocked": user.get("is_blocked", False)}


@router.get("/plans")
async def list_public_plans():
    from server import db
    plans = await db.plans.find({}, {"_id": 0}).to_list(100)
    return plans


# ----- Web call logging -----
@router.post("/calls/web-start")
async def log_web_call_start(agent_id: str, user: dict = Depends(get_current_user)):
    from server import db
    agent = await db.agents.find_one({"id": agent_id})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    call_id = str(uuid.uuid4())
    doc = {
        "id": call_id,
        "user_id": user["id"],
        "agent_id": agent_id,
        "vapi_call_id": None,
        "caller_number": "web",
        "status": "in-progress",
        "duration_seconds": 0.0,
        "recording_url": None,
        "transcript": None,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "ended_at": None,
    }
    await db.calls.insert_one(doc)
    return {"call_id": call_id}


@router.post("/calls/web-end")
async def log_web_call_end(call_id: str, duration_seconds: float = 0, user: dict = Depends(get_current_user)):
    from server import db
    res = await db.calls.update_one(
        {"id": call_id, "user_id": user["id"]},
        {"$set": {
            "status": "completed",
            "duration_seconds": duration_seconds,
            "ended_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Call not found")
    return {"ok": True}


# ----- Vapi public key relay -----
@router.get("/vapi/public-key")
async def get_vapi_public_key(user: dict = Depends(get_current_user)):
    key = os.environ.get("VAPI_PUBLIC_KEY", "")
    return {"public_key": key, "configured": bool(key)}