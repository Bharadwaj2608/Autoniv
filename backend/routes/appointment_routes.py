"""Appointment booking endpoints (user-scoped)."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from auth import get_current_user,require_active_user
from models import AppointmentCreate, AppointmentUpdate

router = APIRouter(tags=["appointments"])


@router.get("/appointments")
async def list_appointments(user: dict = Depends(get_current_user)):
    from server import db
    items = await db.appointments.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return items


@router.post("/appointments")
async def create_appointment(payload: AppointmentCreate, user: dict = Depends(require_active_user)):
    from server import db
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        **payload.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.appointments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/appointments/{appt_id}")
async def update_appointment(appt_id: str, payload: AppointmentUpdate,
                              user: dict = Depends(get_current_user)):
    from server import db
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    res = await db.appointments.update_one(
        {"id": appt_id, "user_id": user["id"]}, {"$set": update}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    doc = await db.appointments.find_one({"id": appt_id}, {"_id": 0})
    return doc


@router.delete("/appointments/{appt_id}")
async def delete_appointment(appt_id: str, user: dict = Depends(get_current_user)):
    from server import db
    res = await db.appointments.delete_one({"id": appt_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"ok": True}
