# medicine_api.py — Medicine CRUD + Streak/Adherence tracking + Google Calendar Integration

import os
import base64
import uuid
import requests
from datetime import datetime, date, timedelta, timezone as pytimezone
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = f"https://{os.getenv('SUPABASE_PROJECT_ID')}.supabase.co"
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

router = APIRouter()
security = HTTPBearer()


def get_tz(timezone_name: str):
    import zoneinfo
    try:
        return zoneinfo.ZoneInfo(timezone_name)
    except Exception:
        import datetime
        return datetime.timezone.utc

def get_today_bounds_in_utc(timezone_name: str) -> tuple[str, str]:
    tz = get_tz(timezone_name)
    # Check if tz is tzinfo subclass or zoneinfo ZoneInfo
    if hasattr(tz, "utcoffset"):
        local_now = datetime.now(tz)
    else:
        local_now = datetime.now(pytimezone.utc)
    
    local_today = local_now.date()
    
    # Start and end of local today
    local_start = datetime.combine(local_today, datetime.min.time(), tzinfo=tz if hasattr(tz, "utcoffset") else None)
    local_end = datetime.combine(local_today, datetime.max.time(), tzinfo=tz if hasattr(tz, "utcoffset") else None)
    
    utc_start = local_start.astimezone(pytimezone.utc).isoformat().replace("+00:00", "Z")
    utc_end = local_end.astimezone(pytimezone.utc).isoformat().replace("+00:00", "Z")
    
    return utc_start, utc_end

# ── Auth ──────────────────────────────────────────────────────────────────────
def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    try:
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": SUPABASE_ANON_KEY,
            },
            timeout=10,
        )
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")
        user_data = response.json()
        user_id = user_data.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Could not extract user ID.")
        return user_id
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Error] Auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed.")


# ── Pydantic Models ───────────────────────────────────────────────────────────
class MedicineCreate(BaseModel):
    medicine_name: str
    dosage: str
    doses_per_day: int = 1
    times: list[str]
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    frequency: str = "daily"
    every_hours: Optional[int] = None
    timezone: Optional[str] = "UTC"


class MedicineTake(BaseModel):
    scheduled_time: str


class GoogleCallbackBody(BaseModel):
    code: str


# ── Google OAuth & Calendar Helpers ──────────────────────────────────────────
def get_valid_google_token(user_id: str) -> Optional[str]:
    try:
        res = supabase.table("user_google_tokens").select("*").eq("user_id", user_id).execute()
        if not res.data:
            return None
        
        token_data = res.data[0]
        access_token = token_data["access_token"]
        refresh_token = token_data["refresh_token"]
        expires_at_str = token_data["expires_at"]
        
        expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
        now = datetime.now(expires_at.tzinfo)
        
        if expires_at <= now + timedelta(seconds=60):
            print(f"[Google] Google Access Token expired for user {user_id[:8]}. Refreshing...")
            client_id = os.getenv("GOOGLE_CLIENT_ID")
            client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
            
            payload = {
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token"
            }
            
            resp = requests.post("https://oauth2.googleapis.com/token", json=payload, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                new_access_token = data["access_token"]
                expires_in = data.get("expires_in", 3600)
                new_expiry = (datetime.now(pytimezone.utc) + timedelta(seconds=expires_in)).isoformat()
                
                supabase.table("user_google_tokens").update({
                    "access_token": new_access_token,
                    "expires_at": new_expiry
                }).eq("user_id", user_id).execute()
                
                return new_access_token
            else:
                print(f"[Error] Failed to refresh Google Token: {resp.status_code} - {resp.text}")
                return None
        return access_token
    except Exception as e:
        print(f"[Warning] Error get_valid_google_token: {e}")
        return None


def sync_medicine_to_google_calendar(medicine: dict, timezone_name: str = "UTC") -> list[str]:
    user_id = medicine["user_id"]
    access_token = get_valid_google_token(user_id)
    if not access_token:
        print(f"[Info] Google Calendar not connected for user {user_id[:8]}, skipping sync.")
        return []
        
    medicine_name = medicine["medicine_name"]
    dosage = medicine["dosage"]
    times = medicine["times"]
    frequency = medicine["frequency"]
    every_hours = medicine.get("every_hours")
    start_date = medicine.get("start_date") or date.today().isoformat()
    end_date = medicine.get("end_date")
    
    rrule = ""
    if frequency == "daily":
        rrule = "FREQ=DAILY"
    elif frequency == "alternate":
        rrule = "FREQ=DAILY;INTERVAL=2"
    elif frequency == "every_x_hours" and every_hours:
        rrule = f"FREQ=HOURLY;INTERVAL={every_hours}"
        
    if end_date and rrule:
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        end_dt = end_dt.replace(hour=23, minute=59, second=59)
        rrule += f";UNTIL={end_dt.strftime('%Y%m%dT%H%M%SZ')}"
        
    event_ids = []
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    for t in times:
        try:
            hour, minute = map(int, t.split(":"))
        except Exception:
            hour, minute = 9, 0
            
        start_datetime_str = f"{start_date}T{hour:02d}:{minute:02d}:00"
        
        end_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = end_dt.replace(hour=hour, minute=minute) + timedelta(minutes=15)
        end_datetime_str = end_dt.strftime("%Y-%m-%dT%H:%M:%S")
        
        event_body = {
            "summary": f"💊 Take {medicine_name} ({dosage})",
            "description": f"Medicine reminder from HealthMate AI.\nDosage: {dosage}\nFrequency: {frequency}",
            "start": {
                "dateTime": start_datetime_str,
                "timeZone": timezone_name
            },
            "end": {
                "dateTime": end_datetime_str,
                "timeZone": timezone_name
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {
                        "method": "popup",
                        "minutes": 0
                    }
                ]
            }
        }
        
        if rrule:
            event_body["recurrence"] = [f"RRULE:{rrule}"]
            
        try:
            resp = requests.post(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                json=event_body,
                headers=headers,
                timeout=10
            )
            if resp.status_code in (200, 201):
                event_data = resp.json()
                event_ids.append(event_data["id"])
                print(f"[Google] Created calendar event: {event_data['id']} for {medicine_name} at {t}")
            else:
                print(f"[Warning] Failed to create Google Calendar event: {resp.status_code} - {resp.text}")
        except Exception as ex:
            print(f"[Error] Error creating Google Calendar event: {ex}")
            
    return event_ids


def delete_google_calendar_events(user_id: str, event_ids: list[str]):
    if not event_ids:
        return
        
    access_token = get_valid_google_token(user_id)
    if not access_token:
        print(f"[Info] Google Calendar not connected for user {user_id[:8]}, skipping event deletion.")
        return []
        
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    for event_id in event_ids:
        try:
            resp = requests.delete(
                f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}",
                headers=headers,
                timeout=10
            )
            if resp.status_code in (200, 204):
                print(f"[Google] Deleted Google Calendar event: {event_id}")
            elif resp.status_code == 404:
                print(f"[Info] Google Calendar event already deleted: {event_id}")
            else:
                print(f"[Warning] Failed to delete Google Calendar event {event_id}: {resp.status_code} - {resp.text}")
        except Exception as ex:
            print(f"[Error] Error deleting Google Calendar event {event_id}: {ex}")


# ── Google OAuth Endpoints ───────────────────────────────────────────────────
@router.get("/google/auth-url")
async def get_google_auth_url(user_id: str = Depends(get_current_user_id)):
    """Generate the Google authorization URL to redirect users to."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    
    if not client_id or not redirect_uri:
        raise HTTPException(status_code=500, detail="Google OAuth not configured on backend.")
        
    scopes = "https://www.googleapis.com/auth/calendar.events"
    
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope={scopes}&"
        "access_type=offline&"
        "prompt=consent"
    )
    return {"url": auth_url}


@router.post("/google/callback")
async def google_callback(body: GoogleCallbackBody, user_id: str = Depends(get_current_user_id)):
    """Exchange OAuth code for access and refresh tokens, and save to Supabase."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    
    if not client_id or not client_secret or not redirect_uri:
        raise HTTPException(status_code=500, detail="Google OAuth not configured on backend.")
        
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": body.code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri
    }
    
    try:
        resp = requests.post("https://oauth2.googleapis.com/token", json=payload, timeout=10)
        if resp.status_code != 200:
            print(f"❌ Token exchange failed: {resp.status_code} - {resp.text}")
            raise HTTPException(status_code=400, detail=f"Token exchange failed: {resp.text}")
            
        data = resp.json()
        access_token = data.get("access_token")
        refresh_token = data.get("refresh_token")
        expires_in = data.get("expires_in", 3600)
        
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token returned from Google.")
            
        expires_at = (datetime.now(pytimezone.utc) + timedelta(seconds=expires_in)).isoformat()
        
        row = {
            "user_id": user_id,
            "access_token": access_token,
            "expires_at": expires_at
        }
        if refresh_token:
            row["refresh_token"] = refresh_token
            
        check = supabase.table("user_google_tokens").select("user_id, refresh_token").eq("user_id", user_id).execute()
        if check.data:
            if "refresh_token" not in row:
                row["refresh_token"] = check.data[0]["refresh_token"]
            supabase.table("user_google_tokens").update(row).eq("user_id", user_id).execute()
        else:
            if "refresh_token" not in row:
                raise HTTPException(status_code=400, detail="Did not receive refresh_token. Please disconnect and try again.")
            supabase.table("user_google_tokens").insert(row).execute()
            
        return {"status": "connected"}
    except Exception as e:
        print(f"[Error] Google callback error: {e}")
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/google/status")
async def get_google_status(user_id: str = Depends(get_current_user_id)):
    """Check if the current user has connected their Google Calendar."""
    try:
        res = supabase.table("user_google_tokens").select("user_id").eq("user_id", user_id).execute()
        return {"connected": len(res.data) > 0}
    except Exception as e:
        print(f"[Warning] get_google_status error: {e}")
        return {"connected": False}


@router.post("/google/disconnect")
async def google_disconnect(user_id: str = Depends(get_current_user_id)):
    """Disconnect Google Calendar by deleting user tokens."""
    try:
        supabase.table("user_google_tokens").delete().eq("user_id", user_id).execute()
        return {"status": "disconnected"}
    except Exception as e:
        print(f"[Error] google_disconnect error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/google/sync")
async def sync_all_medicines(timezone: str = "UTC", user_id: str = Depends(get_current_user_id)):
    """Sync all unsynced active medicines for the current user to Google Calendar."""
    try:
        access_token = get_valid_google_token(user_id)
        if not access_token:
            raise HTTPException(status_code=400, detail="Google Calendar is not connected.")
            
        meds = (
            supabase.table("medicines")
            .select("*")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .execute()
        )
        
        synced_count = 0
        for med in (meds.data or []):
            event_ids = med.get("google_event_ids") or []
            if not event_ids:
                new_ids = sync_medicine_to_google_calendar(med, timezone)
                if new_ids:
                    supabase.table("medicines").update({
                        "google_event_ids": new_ids
                    }).eq("id", med["id"]).execute()
                    synced_count += 1
                    
        return {"status": "success", "synced_medicines_count": synced_count}
    except Exception as e:
        print(f"[Error] sync_all_medicines error: {e}")
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))


# ── Medicine CRUD Endpoints ───────────────────────────────────────────────────
@router.get("/medicines")
async def list_medicines(timezone: str = Query(default="UTC"), user_id: str = Depends(get_current_user_id)):
    """Fetch all active medicines for this user."""
    try:
        result = (
            supabase.table("medicines")
            .select("*")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .order("created_at", desc=True)
            .execute()
        )
        utc_start, utc_end = get_today_bounds_in_utc(timezone)
        logs_res = (
            supabase.table("medicine_logs")
            .select("medicine_id, scheduled_time")
            .eq("user_id", user_id)
            .gte("taken_at", utc_start)
            .lte("taken_at", utc_end)
            .execute()
        )
        active_ids = {m["id"] for m in (result.data or [])}
        filtered_logs = [log for log in (logs_res.data or []) if log["medicine_id"] in active_ids]
        return {
            "medicines": result.data or [],
            "today_logs": filtered_logs
        }
    except Exception as e:
        print(f"[Error] list_medicines error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/medicines")
async def create_medicine(body: MedicineCreate, user_id: str = Depends(get_current_user_id)):
    """Create a new medicine schedule."""
    try:
        row = {
            "user_id": user_id,
            "medicine_name": body.medicine_name.strip(),
            "dosage": body.dosage.strip(),
            "doses_per_day": body.doses_per_day,
            "times": body.times,
            "start_date": body.start_date,
            "end_date": body.end_date,
            "frequency": body.frequency,
            "every_hours": body.every_hours,
            "is_active": True,
        }
        result = supabase.table("medicines").insert(row).execute()
        medicine_db = result.data[0] if result.data else row
        
        # Sync to Google Calendar
        event_ids = []
        try:
            event_ids = sync_medicine_to_google_calendar(medicine_db, body.timezone or "UTC")
        except Exception as e:
            print(f"[Warning] Failed to sync to Google Calendar: {e}")
            
        if event_ids:
            try:
                supabase.table("medicines").update({
                    "google_event_ids": event_ids
                }).eq("id", medicine_db["id"]).execute()
                medicine_db["google_event_ids"] = event_ids
            except Exception as e:
                print(f"[Warning] Failed to update google_event_ids in DB: {e}")
                
        return {"medicine": medicine_db}
    except Exception as e:
        print(f"[Error] create_medicine error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/medicines/{medicine_id}")
async def delete_medicine(medicine_id: str, user_id: str = Depends(get_current_user_id)):
    """Soft-delete a medicine (set is_active=false) and remove from Google Calendar."""
    try:
        # Fetch event IDs to delete them from Google Calendar
        med_res = (
            supabase.table("medicines")
            .select("google_event_ids")
            .eq("id", medicine_id)
            .eq("user_id", user_id)
            .execute()
        )
        if med_res.data:
            event_ids = med_res.data[0].get("google_event_ids") or []
            if event_ids:
                try:
                    delete_google_calendar_events(user_id, event_ids)
                except Exception as e:
                    print(f"[Warning] Error deleting Google Calendar events: {e}")
                    
        supabase.table("medicines") \
            .update({"is_active": False}) \
            .eq("id", medicine_id) \
            .eq("user_id", user_id) \
            .execute()
        return {"status": "deleted"}
    except Exception as e:
        print(f"[Error] delete_medicine error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/medicines/{medicine_id}/take")
async def take_medicine(
    medicine_id: str,
    body: MedicineTake,
    timezone: str = Query(default="UTC"),
    user_id: str = Depends(get_current_user_id),
):
    """Log that a dose was taken."""
    try:
        utc_start, utc_end = get_today_bounds_in_utc(timezone)
        existing = (
            supabase.table("medicine_logs")
            .select("id")
            .eq("medicine_id", medicine_id)
            .eq("user_id", user_id)
            .eq("scheduled_time", body.scheduled_time)
            .gte("taken_at", utc_start)
            .lte("taken_at", utc_end)
            .execute()
        )
        if existing.data:
            return {"status": "already_logged"}

        supabase.table("medicine_logs").insert({
            "medicine_id": medicine_id,
            "user_id": user_id,
            "scheduled_time": body.scheduled_time,
        }).execute()
        return {"status": "logged"}
    except Exception as e:
        print(f"[Error] take_medicine error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/medicines/stats")
async def medicine_stats(timezone: str = Query(default="UTC"), user_id: str = Depends(get_current_user_id)):
    """Calculate adherence stats."""
    try:
        meds = (
            supabase.table("medicines")
            .select("id, times, doses_per_day")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .execute()
        )
        active_meds = meds.data or []
        today_total = sum(len(m.get("times", [])) for m in active_meds)

        utc_start, utc_end = get_today_bounds_in_utc(timezone)
        logs = (
            supabase.table("medicine_logs")
            .select("medicine_id, scheduled_time")
            .eq("user_id", user_id)
            .gte("taken_at", utc_start)
            .lte("taken_at", utc_end)
            .execute()
        )
        active_med_ids = {m["id"] for m in active_meds}
        unique_taken = {
            (log["medicine_id"], log["scheduled_time"]) 
            for log in (logs.data or []) 
            if log["medicine_id"] in active_med_ids
        }
        today_taken = len(unique_taken)

        # Local tz definition
        tz = get_tz(timezone)
        if hasattr(tz, "utcoffset"):
            local_today = datetime.now(tz).date()
            local_start_date = local_today - timedelta(days=365)
        else:
            local_today = date.today()
            local_start_date = local_today - timedelta(days=365)

        # Retrieve all logs in range to calculate streak
        all_logs_res = (
            supabase.table("medicine_logs")
            .select("taken_at")
            .eq("user_id", user_id)
            .gte("taken_at", f"{local_start_date.isoformat()}T00:00:00")
            .execute()
        )
        
        logged_dates = set()
        for log in (all_logs_res.data or []):
            utc_dt = datetime.fromisoformat(log["taken_at"].replace("Z", "+00:00"))
            local_dt = utc_dt.astimezone(tz if hasattr(tz, "utcoffset") else pytimezone.utc)
            logged_dates.add(local_dt.date())
        
        streak = 0
        check_date = local_today
        
        if check_date not in logged_dates:
            check_date -= timedelta(days=1)
            
        while check_date in logged_dates:
            streak += 1
            check_date -= timedelta(days=1)

        return {
            "streak": streak,
            "today_taken": today_taken,
            "today_total": today_total,
            "adherence_percent": round((today_taken / today_total * 100) if today_total > 0 else 0),
            "logged_dates": [d.isoformat() for d in logged_dates],
        }
    except Exception as e:
        print(f"[Error] medicine_stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
