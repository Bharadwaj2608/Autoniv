"""Auth endpoints."""
from fastapi import APIRouter, HTTPException, Response, Depends, Request
from datetime import datetime, timezone

from models import LoginRequest, RegisterRequest, UserPublic
from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    set_auth_cookies, clear_auth_cookies, get_current_user, decode_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _public(user: dict) -> dict:
    user = {**user}
    user.pop("password_hash", None)
    user.pop("_id", None)
    return user


@router.post("/login")
async def login(payload: LoginRequest, response: Response):
    from server import db
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("is_blocked"):
        raise HTTPException(status_code=403, detail="Account blocked. Contact admin.")
    access = create_access_token(user["id"], user["email"], user.get("role", "user"))
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return _public(user)


@router.post("/register")
async def register(payload: RegisterRequest, response: Response):
    from server import db
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    import uuid
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "role": "user",
        "plan_id": None,
        "minutes_used": 0.0,
        "is_blocked": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    access = create_access_token(user_doc["id"], email, "user")
    refresh = create_refresh_token(user_doc["id"])
    set_auth_cookies(response, access, refresh)
    return _public(user_doc)


@router.post("/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return _public(user)


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token")
        from server import db
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(user["id"], user["email"], user.get("role", "user"))
        refresh_t = create_refresh_token(user["id"])
        set_auth_cookies(response, access, refresh_t)
        return {"ok": True}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
