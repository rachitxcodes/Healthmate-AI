import os
print("GCP CREDS:", os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
import os
import shutil
from jose import jwt

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Header,
    Request,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from dotenv import load_dotenv

# ---------------- Internal imports ----------------
from app.symptom import router as symptom_router, load_artifacts
from app.prediction_api1 import router as prediction_router

# ====================================================
# ENV
# ====================================================
load_dotenv()

SUPABASE_PROJECT_ID = os.getenv("SUPABASE_PROJECT_ID")
SUPABASE_JWT_ISSUER = os.getenv("SUPABASE_JWT_ISSUER")

if not SUPABASE_PROJECT_ID or not SUPABASE_JWT_ISSUER:
    raise RuntimeError("❌ Supabase env vars missing")

print("✅ Supabase env loaded")

# ====================================================
# APP INIT
# ====================================================
app = FastAPI()

# ====================================================
# CORS
# ====================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================================================
# OPTIONS (CORS PREFLIGHT)
# ====================================================
@app.options("/{path:path}")
async def options_handler(path: str, request: Request):
    return Response(status_code=200)

# ====================================================
# AUTH (A5.0 – TRUST SUPABASE SESSION)
# ====================================================
async def get_current_user_id(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    try:
        scheme, token = authorization.split(" ")
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")

        # 🔓 Decode WITHOUT verifying signature (A5.0)
        payload = jwt.decode(
            token,
            key=None,
            options={
                "verify_signature": False,
                "verify_aud": False,
                "verify_iss": False,
            },
        )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        return user_id

    except Exception as e:
        print("JWT PARSE ERROR:", e)
        raise HTTPException(status_code=401, detail="Invalid token")

# ====================================================
# STARTUP (LOAD ML MODELS)
# ====================================================
@app.on_event("startup")
def startup_event():
    print("🚀 Loading ML artifacts...")
    load_artifacts()
    print("✅ ML models loaded. Server ready.")

# ====================================================
# ROUTERS
# ====================================================
app.include_router(symptom_router, prefix="/api")
app.include_router(prediction_router, prefix="/api1")

# ====================================================
# HEALTH CHECK
# ====================================================
@app.get("/")
def root():
    return {"status": "HealthMate backend running"}

# ====================================================
# UPLOAD (A5.0 – PIPELINE STUB)
# ====================================================
from fastapi import UploadFile, File, HTTPException
import os
import shutil
import uuid

@app.post("/upload-image/")
async def upload_image(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, f"{file_id}_{file.filename}")

    try:
        # 1️⃣ Save file safely
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print(f"📥 File received from user: {file_id}")

        # 2️⃣ TEMP OCR STUB (until Tesseract)
        extracted_data = {
            "HGB": 12.5,
            "RBC": 5.2,
            "WBC": 9000,
            "Platelets": 320000
        }

        print("🧪 Returning mock OCR data:", extracted_data)

        return {
            "message": "OCR extraction successful",
            "extracted_data": extracted_data,
            "predictions": {}
        }

    except Exception as e:
        print("❌ OCR ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # 3️⃣ SAFE DELETE (Windows-safe)
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print("🗑️ Temp file cleaned")
        except Exception as cleanup_err:
            print("⚠️ Cleanup failed:", cleanup_err)
