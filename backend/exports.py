"""CSV export helpers + plan-limit enforcement."""
import csv
import io
from datetime import datetime, timezone
from fastapi.responses import StreamingResponse


def csv_response(rows, fieldnames, filename: str) -> StreamingResponse:
    """Build a streaming CSV response from a list of dicts."""
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for r in rows:
        # flatten None to empty for cleaner CSV
        writer.writerow({k: ("" if r.get(k) is None else r.get(k)) for k in fieldnames})
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def total_minutes_for_user(db, user_id: str) -> float:
    """Sum of duration_seconds across all calls for a user (in minutes)."""
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": None, "secs": {"$sum": "$duration_seconds"}}},
    ]
    agg = await db.calls.aggregate(pipeline).to_list(1)
    if not agg:
        return 0.0
    return round(agg[0]["secs"] / 60.0, 2)


async def enforce_plan_limit(db, user_id: str) -> dict:
    """Compute usage vs plan; auto-block user if over limit. Returns status dict."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        return {"ok": False, "reason": "user-missing"}

    minutes = await total_minutes_for_user(db, user_id)
    plan = None
    if user.get("plan_id"):
        plan = await db.plans.find_one({"id": user["plan_id"]})
    limit = (plan or {}).get("monthly_minutes")

    over = bool(limit and minutes >= limit)
    if over and not user.get("is_blocked"):
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"is_blocked": True, "blocked_at": datetime.now(timezone.utc).isoformat(),
                      "blocked_reason": "Plan minute limit exceeded"}},
        )

    # update minutes_used for quick reads
    await db.users.update_one({"id": user_id}, {"$set": {"minutes_used": minutes}})

    return {
        "ok": True,
        "minutes_used": minutes,
        "minutes_limit": limit,
        "over_limit": over,
        "is_blocked": over or bool(user.get("is_blocked")),
    }
"