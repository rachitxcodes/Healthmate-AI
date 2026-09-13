import serial
import json
import requests
import time
import sys
import os
from dotenv import load_dotenv

load_dotenv()

# ── CONFIGURATION ────────────────────────────────────────────────────────────
SERIAL_PORT = 'COM13'  # Update if your port differs
BAUD_RATE   = 115200
API_URL     = "http://localhost:8000/api3/vitals"
API_KEY     = "sk_test_nancy0125"

SUPABASE_PROJECT_ID = os.getenv("SUPABASE_PROJECT_ID")
SUPABASE_SVC_KEY    = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def sync_active_medicine_to_esp(ser):
    """Pulls current scheduled medicine from database and syncs it to the ESP32 OLED"""
    if not (SUPABASE_PROJECT_ID and SUPABASE_SVC_KEY):
        return
    try:
        from supabase import create_client
        supabase_url = f"https://{SUPABASE_PROJECT_ID}.supabase.co"
        sb = create_client(supabase_url, SUPABASE_SVC_KEY)
        
        # Get latest active medicine
        res = sb.table("medicines").select("id, medicine_name, dosage, times").eq("is_active", True).order("created_at", desc=True).limit(1).execute()
        if res.data:
            med = res.data[0]
            times = med.get("times") or ["02:00 PM"]
            first_time = times[0] if isinstance(times, list) and len(times) > 0 else "02:00 PM"
            
            sync_payload = {
                "med_name": med.get("medicine_name", "Paracetamol"),
                "med_dose": med.get("dosage", "500mg"),
                "med_time": str(first_time)
            }
            ser.write((json.dumps(sync_payload) + "\n").encode('utf-8'))
            print(f"💊 [MED SYNC] Pushed active medicine to ESP32 band: {sync_payload['med_name']} ({sync_payload['med_dose']} @ {sync_payload['med_time']})")
    except Exception as e:
        print(f"⚠️ Med sync notice: {e}")

def record_dose_taken(medicine_name, scheduled_time):
    """Logs the dose taken in Supabase when user presses the ESP32 band button"""
    if not (SUPABASE_PROJECT_ID and SUPABASE_SVC_KEY):
        return
    try:
        from supabase import create_client
        supabase_url = f"https://{SUPABASE_PROJECT_ID}.supabase.co"
        sb = create_client(supabase_url, SUPABASE_SVC_KEY)
        hw_user_id = os.getenv("HARDWARE_USER_ID", "550e8400-e29b-41d4-a716-446655440000")
        
        # Find matching medicine
        meds = sb.table("medicines").select("id, user_id").ilike("medicine_name", f"%{medicine_name}%").eq("is_active", True).limit(1).execute()
        if not meds.data:
            meds = sb.table("medicines").select("id, user_id").eq("is_active", True).limit(1).execute()
            
        if meds.data:
            med_id = meds.data[0]["id"]
            user_id = meds.data[0].get("user_id") or hw_user_id
            
            sb.table("medicine_logs").insert({
                "medicine_id": med_id,
                "user_id": user_id,
                "scheduled_time": scheduled_time or "02:00 PM"
            }).execute()
            print(f"🎉 [SUCCESS] Dose for '{medicine_name}' logged to Database! Dashboard streak updated.")
    except Exception as e:
        print(f"⚠️ Failed to log dose in DB: {e}")

def run_bridge():
    print("🚀 HealthMate AI Serial-to-Dashboard Bridge & Medicine Sync")
    print(f"📡 Listening on {SERIAL_PORT}...")
    print(f"🔗 Forwarding to {API_URL}")
    print("-" * 60)

    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=0.1)
        time.sleep(2)  # Wait for ESP32 to reset/init
        
        # Push initial medicine sync to OLED
        sync_active_medicine_to_esp(ser)

        last_forward_time = 0
        last_med_check_time = 0
        last_triggered_time = ""
        FORWARD_INTERVAL = 4.0

        while True:
            now = time.time()
            
            # Periodically check scheduled medicines and trigger watch alert at exact scheduled time
            if now - last_med_check_time >= 15.0:
                last_med_check_time = now
                try:
                    if SUPABASE_PROJECT_ID and SUPABASE_SVC_KEY:
                        from supabase import create_client
                        from datetime import datetime
                        sb = create_client(f"https://{SUPABASE_PROJECT_ID}.supabase.co", SUPABASE_SVC_KEY)
                        
                        # Fetch active medicines
                        res = sb.table("medicines").select("id, medicine_name, dosage, times").eq("is_active", True).order("created_at", desc=True).limit(1).execute()
                        if res.data:
                            med = res.data[0]
                            times = med.get("times") or ["02:00 PM"]
                            first_time = times[0] if isinstance(times, list) and len(times) > 0 else "02:00 PM"
                            
                            # Check if current local time matches scheduled time
                            current_hm_12 = datetime.now().strftime("%I:%M %p")   # e.g. "02:00 PM"
                            current_hm_24 = datetime.now().strftime("%H:%M")      # e.g. "14:00"
                            
                            is_time_now = False
                            for t in times:
                                t_clean = str(t).strip()
                                if t_clean in [current_hm_12, current_hm_24, current_hm_12.lstrip("0")]:
                                    is_time_now = True
                                    break
                            
                            if is_time_now and last_triggered_time != current_hm_24:
                                last_triggered_time = current_hm_24
                                alert_cmd = {
                                    "trigger_med_alert": True,
                                    "med_name": med.get("medicine_name", "Paracetamol"),
                                    "med_dose": med.get("dosage", "500mg"),
                                    "med_time": str(first_time)
                                }
                                ser.write((json.dumps(alert_cmd) + "\n").encode('utf-8'))
                                print(f"\n⏰ [ALARM TRIGGERED] Dose scheduled at {current_hm_12}! Beeping watch...")
                            else:
                                # Regular background medicine name & schedule sync to watch
                                sync_payload = {
                                    "med_name": med.get("medicine_name", "Paracetamol"),
                                    "med_dose": med.get("dosage", "500mg"),
                                    "med_time": str(first_time)
                                }
                                ser.write((json.dumps(sync_payload) + "\n").encode('utf-8'))
                except Exception as e:
                    pass

            if ser.in_waiting > 0:
                try:
                    line = ser.readline().decode('utf-8').strip()
                    if not line:
                        continue
                    
                    if line.startswith('{') and line.endswith('}'):
                        data = json.loads(line)
                        
                        # Check for custom hardware events
                        event = data.get("event")
                        if event == "med_taken":
                            print(f"\n💊 [HARDWARE CONFIRMATION] Button pressed! Dose confirmed for: {data.get('medicine')}")
                            record_dose_taken(data.get("medicine", "Paracetamol"), data.get("time", "02:00 PM"))
                            continue
                        elif event == "med_alert_triggered":
                            print(f"\n⏰ [ALARM] Medicine Dose Reminder Ringing on ESP32: {data.get('medicine')}")
                            continue
                        elif event == "fall_confirmed":
                            print("\n🚨 [EMERGENCY] FALL CONFIRMED BY HARDWARE ACCELEROMETER!")
                        
                        print(f"📥 Received: HR={data.get('heart_rate')} | SpO2={data.get('spo2')}% | Temp={data.get('temperature')}°C | Steps={data.get('steps')} | Screen={data.get('screen')}/3")
                        
                        # Handle null/out-of-bound values smoothly
                        if data.get("heart_rate") is not None and isinstance(data["heart_rate"], (int, float)):
                            data["heart_rate"] = max(40.0, min(float(data["heart_rate"]), 200.0))
                        else:
                            data["heart_rate"] = 74.0

                        if data.get("spo2") is not None and isinstance(data["spo2"], (int, float)):
                            data["spo2"] = max(70.0, min(float(data["spo2"]), 100.0))
                        else:
                            data["spo2"] = 98.5

                        if data.get("temperature") is not None and isinstance(data["temperature"], (int, float)):
                            data["temperature"] = max(10.0, min(float(data["temperature"]), 43.0))
                        else:
                            data["temperature"] = 36.6

                        # Throttle POSTing to avoid flooding backend
                        now = time.time()
                        if now - last_forward_time >= FORWARD_INTERVAL:
                            headers = {
                                "Content-Type": "application/json",
                                "Authorization": f"Bearer {API_KEY}"
                            }
                            
                            payload = {
                                "heart_rate": data["heart_rate"],
                                "spo2": data["spo2"],
                                "temperature": data["temperature"],
                                "steps": data.get("steps", 0),
                                "activity": "fall_detected" if data.get("fall") else "stable",
                                "fall_detected": bool(data.get("fall", False))
                            }
                            
                            response = requests.post(API_URL, json=payload, headers=headers)
                            if response.status_code in [200, 201]:
                                print(f"  └─ 📤 Dashboard Updated ({response.status_code})")
                            else:
                                print(f"  └─ ❌ Backend returned {response.status_code}: {response.text}")
                                
                            last_forward_time = now

                except json.JSONDecodeError:
                    if "SYS_" in line or "OLED" in line:
                        print(f"ESP32 Boot: {line}")
                except Exception as e:
                    print(f"⚠️ Loop Error: {e}")
                    
            time.sleep(0.01)

    except serial.SerialException as e:
        print(f"\n❌ CRITICAL ERROR: Could not open {SERIAL_PORT}.")
        print("1. Is the ESP32 plugged in?")
        print("2. Make sure Arduino Serial Monitor is CLOSED.")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n🛑 Bridge stopped by user.")
        sys.exit(0)

if __name__ == "__main__":
    run_bridge()
