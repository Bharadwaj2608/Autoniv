# Vapi Voice Agents — Setup Guide

Three agents are built into this project:

| Agent | Purpose | Saves to |
|---|---|---|
| **Receptionist Agent** | Greets caller, collects name/phone/purpose | Leads table |
| **Appointment Booking Agent** | Books service, date, time | Appointments table |
| **FAQ Support Agent** | Answers pricing, services, timings | (no storage needed) |

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free tier)
- [Vapi account](https://dashboard.vapi.ai) — free tier works

---

## Step 1 — Clone & install backend

```bash
cd backend
pip install -r requirements.txt
```

---

## Step 2 — Configure backend environment

```bash
cp .env.example .env
```

Edit `backend/.env`:

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=autoniv
JWT_SECRET=some-long-random-string
ADMIN_EMAIL=admin@yoursite.com
ADMIN_PASSWORD=StrongPass123!
DEMO_USER_EMAIL=demo@clinic.com
DEMO_USER_PASSWORD=Demo1234!
VAPI_API_KEY=your_vapi_private_key_here     # dashboard.vapi.ai → Account → API Keys → Private
VAPI_PUBLIC_KEY=your_vapi_public_key_here   # dashboard.vapi.ai → Account → API Keys → Public
CORS_ORIGINS=http://localhost:3000
```

> **Two Vapi keys:** The private key (`VAPI_API_KEY`) creates/manages assistants server-side.  
> The public key (`VAPI_PUBLIC_KEY`) is used by the browser SDK to start in-browser calls.

---

## Step 3 — Configure frontend environment

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_VAPI_PUBLIC_KEY=your_vapi_public_key_here
```

---

## Step 4 — Start the backend

```bash
cd backend
uvicorn server:app --reload --port 8000
```

---

## Step 5 — Start the frontend

```bash
cd frontend
npm install
npm start
```

Open **http://localhost:3000** and log in with your `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD`.

---

## Step 6 — Create agents and make a call

1. In the sidebar, click **Agents**.
2. Click **Use Template** on any of the three template cards.
3. Click **Create Agent** — the agent is created in Vapi and shows `● Live on Vapi`.
4. Click the **Call** button next to an agent to start an in-browser voice call.
5. After the call ends, check **Leads** or **Appointments** — data is auto-saved.

---

## How data is stored automatically

The Vapi webhook at `/api/vapi/webhook` receives call events. When a call ends:

- **Receptionist agent** → parses name & phone from transcript → saves a **Lead**
- **Booking agent** → parses service, date, time → saves an **Appointment**
- **FAQ agent** → no storage (answers are ephemeral)

This works for both in-browser calls (via the Call button) and inbound phone calls.

---

## Setting up inbound phone calls (optional)

1. Go to [dashboard.vapi.ai](https://dashboard.vapi.ai) → **Phone Numbers** → buy a number.
2. Assign it to an assistant.
3. Set webhook URL: `https://your-domain.com/api/vapi/webhook`
   - For local dev: `ngrok http 8000`, use the HTTPS URL.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `● No Vapi key` on agent | Add `VAPI_API_KEY` to `backend/.env` and restart backend |
| **Call** button shows "No public key" | Add `VAPI_PUBLIC_KEY` to `backend/.env` and `REACT_APP_VAPI_PUBLIC_KEY` to `frontend/.env` |
| **Call** button shows "No Vapi ID" | Agent has no `vapi_assistant_id` — delete and recreate with a valid `VAPI_API_KEY` |
| Calls connect but data not saved | Ensure webhook URL is set in Vapi dashboard; use ngrok for local dev |
| Appointments not auto-created | Agent name must contain "booking" or "appointment" |
| Leads not auto-created | Agent name must contain "receptionist" |
| API calls fail (network error) | Check `REACT_APP_BACKEND_URL` in `frontend/.env` (should be `http://localhost:8000`, not `.../api`) |
| CORS error in browser | Set `CORS_ORIGINS=http://localhost:3000` in `backend/.env` |
