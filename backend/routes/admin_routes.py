"""Admin-only endpoints."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from auth import require_admin, hash_password
from models import UserCreateAdmin, UserUpdate, Plan, PlanCreate, AgentCreate, AgentUpdate
from exports import csv_response
import vapi_client

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


# ----- Users -----
@router.get("/users")
async def list_users():
    from server import db
    users = await db.users.find({}, {"password_hash": 0, "_id": 0}).to_list(1000)
    return users


@router.post("/users")
async def create_user(payload: UserCreateAdmin):
    from server import db
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already exists")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "role": payload.role,
        "plan_id": payload.plan_id,
        "minutes_used": 0.0,
        "is_blocked": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    return _clean(doc)


@router.patch("/users/{user_id}")
async def update_user(user_id: str, payload: UserUpdate):
    from server import db
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None or k == "is_blocked"}
    if "password" in update:
        update["password_hash"] = hash_password(update.pop("password"))
    if "email" in update:
        update["email"] = update["email"].lower().strip()
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.users.update_one({"id": user_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.users.find_one({"id": user_id}, {"password_hash": 0, "_id": 0})
    return user


@router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    from server import db
    res = await db.users.delete_one({"id": user_id, "role": {"$ne": "admin"}})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found or is admin")
    # If admin unblocked the user, clear blocked metadata
    if update.get("is_blocked") is False:
        await db.users.update_one(
            {"id": user_id},
            {"$unset": {"blocked_reason": "", "blocked_at": ""}},
        )
    await db.calls.delete_many({"user_id": user_id})
    await db.leads.delete_many({"user_id": user_id})
    return {"ok": True}


# ----- Agents (admin full CRUD) -----
@router.get("/agents")
async def list_all_agents():
    from server import db
    agents = await db.agents.find({}, {"_id": 0}).to_list(2000)
    return agents

@router.post("/agents")
async def create_agent_admin(payload: AgentCreate):
    from server import db
    vapi_id = await vapi_client.create_assistant(
        name=payload.name,
        first_message=payload.first_message,
        system_prompt=payload.system_prompt,
        voice=payload.voice,
        model=payload.model,
    )
    doc = {
        "id": str(uuid.uuid4()),
        "owner_id": "admin",
        "name": payload.name,
        "voice": payload.voice,
        "model": payload.model,
        "first_message": payload.first_message,
        "system_prompt": payload.system_prompt,
        "vapi_assistant_id": vapi_id,
        "is_disabled": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.agents.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.post("/agents")
async def create_agent(payload: AgentCreate):
    """Admin creates agents — shared across all users."""
    from server import db
    vapi_id = await vapi_client.create_assistant(
        name=payload.name,
        first_message=payload.first_message,
        system_prompt=payload.system_prompt,
        voice=payload.voice,
        model=payload.model,
    )
    doc = {
        "id": str(uuid.uuid4()),
        "owner_id": "admin",
        "name": payload.name,
        "voice": payload.voice,
        "model": payload.model,
        "first_message": payload.first_message,
        "system_prompt": payload.system_prompt,
        "vapi_assistant_id": vapi_id,
        "is_disabled": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.agents.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/agents/{agent_id}")
async def update_agent(agent_id: str, payload: AgentUpdate):
    from server import db
    existing = await db.agents.find_one({"id": agent_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Agent not found")
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if update:
        await db.agents.update_one({"id": agent_id}, {"$set": update})
        if existing.get("vapi_assistant_id"):
            await vapi_client.update_assistant(existing["vapi_assistant_id"], **update)
    doc = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    return doc


@router.patch("/agents/{agent_id}/disable")
async def disable_agent(agent_id: str, disabled: bool = True):
    from server import db
    res = await db.agents.update_one({"id": agent_id}, {"$set": {"is_disabled": disabled}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"ok": True}


@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str):
    from server import db
    existing = await db.agents.find_one({"id": agent_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Agent not found")
    if existing.get("vapi_assistant_id"):
        await vapi_client.delete_assistant(existing["vapi_assistant_id"])
    await db.agents.delete_one({"id": agent_id})
    return {"ok": True}


# ----- Calls (admin view all) -----
@router.get("/calls")
async def list_all_calls():
    from server import db
    calls = await db.calls.find({}, {"_id": 0}).sort("started_at", -1).to_list(2000)
    return calls


@router.get("/calls/export")
async def export_all_calls():
    from server import db
    calls = await db.calls.find({}, {"_id": 0}).sort("started_at", -1).to_list(10000)
    fields = ["started_at", "user_id", "agent_id", "customer_name", "caller_number",
              "customer_email", "customer_address", "status", "duration_seconds",
              "recording_url", "summary", "vapi_call_id"]
    return csv_response(calls, fields, "all_calls.csv")

# ----- Usage analytics -----
@router.get("/usage")
async def usage_summary():
    from server import db
    users = await db.users.find({"role": "user"}, {"password_hash": 0, "_id": 0}).to_list(2000)
    pipeline = [
        {"$group": {
            "_id": "$user_id",
            "total_calls": {"$sum": 1},
            "total_minutes": {"$sum": {"$divide": ["$duration_seconds", 60]}},
            "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
            "missed": {"$sum": {"$cond": [{"$eq": ["$status", "missed"]}, 1, 0]}},
        }}
    ]
    agg = await db.calls.aggregate(pipeline).to_list(2000)
    by_user = {a["_id"]: a for a in agg}
    rows = []
    for u in users:
        s = by_user.get(u["id"], {})
        rows.append({
            "user_id": u["id"], "email": u["email"], "name": u["name"],
            "plan_id": u.get("plan_id"),
            "minutes_used": round(s.get("total_minutes", 0), 2),
            "total_calls": s.get("total_calls", 0),
            "completed": s.get("completed", 0),
            "missed": s.get("missed", 0),
            "is_blocked": u.get("is_blocked", False),
        })
    totals = {
        "users": len(users),
        "agents": await db.agents.count_documents({}),
        "calls": await db.calls.count_documents({}),
        "minutes": round(sum(r["minutes_used"] for r in rows), 2),
    }
    return {"rows": rows, "totals": totals}


# ----- Plans -----
@router.get("/plans")
async def list_plans():
    from server import db
    plans = await db.plans.find({}, {"_id": 0}).to_list(100)
    return plans


@router.post("/plans")
async def create_plan(payload: PlanCreate):
    from server import db
    plan = Plan(**payload.model_dump())
    await db.plans.insert_one(plan.model_dump())
    return plan.model_dump()


@router.delete("/plans/{plan_id}")
async def delete_plan(plan_id: str):
    from server import db
    await db.plans.delete_one({"id": plan_id})
    return {"ok": True}