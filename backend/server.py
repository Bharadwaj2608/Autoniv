"""Autoniv backend entrypoint."""
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from auth import hash_password, verify_password

# ----- DB -----
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ----- App -----
app = FastAPI(title="Autoniv Voice Platform")
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "Autoniv API", "version": "1.0"}


@api_router.get("/health")
async def health():
    return {"ok": True}


# Mount sub-routers
from routes.auth_routes import router as auth_router
from routes.admin_routes import router as admin_router
from routes.user_routes import router as user_router
from routes.vapi_webhook import router as vapi_router
from routes.appointment_routes import router as appointment_router

api_router.include_router(auth_router)
api_router.include_router(admin_router)
api_router.include_router(user_router)
api_router.include_router(appointment_router)
api_router.include_router(vapi_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


async def seed_admin_and_demo():
    """Idempotent seed for admin + demo user + sample plans."""
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    now = datetime.now(timezone.utc).isoformat()
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Platform Admin",
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "plan_id": None,
            "minutes_used": 0.0,
            "is_blocked": False,
            "created_at": now,
        })
        logger.info("Seeded admin user: %s", admin_email)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Updated admin password")

    # Demo user
    demo_email = os.environ["DEMO_USER_EMAIL"].lower()
    demo_password = os.environ["DEMO_USER_PASSWORD"]
    demo = await db.users.find_one({"email": demo_email})
    if not demo:
        demo_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": demo_id,
            "email": demo_email,
            "name": "Demo Clinic",
            "password_hash": hash_password(demo_password),
            "role": "user",
            "plan_id": None,
            "minutes_used": 0.0,
            "is_blocked": False,
            "created_at": now,
        })
        logger.info("Seeded demo user: %s", demo_email)

    # Sample plans
    if await db.plans.count_documents({}) == 0:
        await db.plans.insert_many([
            {"id": str(uuid.uuid4()), "name": "Starter", "monthly_minutes": 500,
             "price_usd": 49.0, "description": "For small teams getting started",
             "created_at": now},
            {"id": str(uuid.uuid4()), "name": "Pro", "monthly_minutes": 2500,
             "price_usd": 199.0, "description": "Growing businesses with steady call volume",
             "created_at": now},
            {"id": str(uuid.uuid4()), "name": "Enterprise", "monthly_minutes": 10000,
             "price_usd": 799.0, "description": "High-volume enterprise deployments",
             "created_at": now},
        ])
        logger.info("Seeded plans")


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.agents.create_index("owner_id")
    await db.calls.create_index("user_id")
    await db.calls.create_index("vapi_call_id")
    await db.leads.create_index("user_id")
    await db.appointments.create_index("user_id")
    await seed_admin_and_demo()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
