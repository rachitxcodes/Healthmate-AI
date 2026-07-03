# File: symptom.py
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import List, Optional
import os
import joblib
import numpy as np
from datetime import datetime, timezone
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# --- Config ---
SUPABASE_URL = f"https://{os.getenv('SUPABASE_PROJECT_ID')}.supabase.co"
SUPABASE_SVC_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SVC_KEY)

# --- Global Model Variables ---
_MODEL = None
_FEATURES = None

# --- Rule-Based Scorer ---
# Weights on a 0-100 scale for clinical concern
SYMPTOM_RULES = {
    "chest pain": 30,
    "shortness of breath": 25,
    "dizziness": 20,
    "fever": 15,
    "extreme fatigue": 20,
    "nausea": 10,
    "persistent cough": 10,
    "body aches": 10,
    "loss of appetite": 5,
    "sore throat": 5,
    "headache": 5,
    "chills": 10,
    "weakness": 10,
    "fatigue": 15
}

# --- OTC Medicine Mappings for 41 Diseases ---
DISEASE_OTC_MAPPING = {
    "AIDS": {"name": "Antiviral Therapy Support", "dosage": "As prescribed", "frequency": "daily", "times": ["09:00"]},
    "Acne": {"name": "Benzoyl Peroxide / Salicylic Acid", "dosage": "Apply topically", "frequency": "daily", "times": ["21:00"]},
    "Alcoholic Hepatitis": {"name": "Vitamin B Complex", "dosage": "1 tablet", "frequency": "daily", "times": ["09:00"]},
    "Allergy": {"name": "Cetirizine", "dosage": "10mg", "frequency": "daily", "times": ["20:00"]},
    "Arthritis": {"name": "Ibuprofen", "dosage": "400mg", "frequency": "daily", "times": ["08:00", "20:00"]},
    "Bronchial Asthma": {"name": "Albuterol Inhaler", "dosage": "2 puffs", "frequency": "daily", "times": ["08:00"]},
    "Cervical Spondylosis": {"name": "Ibuprofen", "dosage": "400mg", "frequency": "daily", "times": ["08:00", "20:00"]},
    "Chickenpox": {"name": "Calamine Lotion", "dosage": "Apply topically", "frequency": "daily", "times": ["08:00", "14:00", "20:00"]},
    "Chronic Cholestasis": {"name": "Ursodeoxycholic Acid", "dosage": "250mg", "frequency": "daily", "times": ["08:00", "20:00"]},
    "Common Cold": {"name": "Paracetamol", "dosage": "500mg", "frequency": "daily", "times": ["08:00", "14:00", "20:00"]},
    "Dengue": {"name": "Acetaminophen", "dosage": "500mg", "frequency": "daily", "times": ["06:00", "12:00", "18:00", "00:00"]},
    "Diabetes": {"name": "Metformin", "dosage": "500mg", "frequency": "daily", "times": ["08:00"]},
    "Dimorphic Hemmorhoids (piles)": {"name": "Stool Softener", "dosage": "1 tablet", "frequency": "daily", "times": ["21:00"]},
    "Drug Reaction": {"name": "Antihistamine", "dosage": "1 tablet", "frequency": "daily", "times": ["12:00"]},
    "Fungal Infection": {"name": "Clotrimazole Cream", "dosage": "Apply topically", "frequency": "daily", "times": ["08:00", "20:00"]},
    "GERD": {"name": "Omeprazole", "dosage": "20mg", "frequency": "daily", "times": ["07:00"]},
    "Gastroenteritis": {"name": "ORS (Oral Rehydration)", "dosage": "1 sachet in water", "frequency": "daily", "times": ["10:00", "16:00"]},
    "Heart Attack": {"name": "Aspirin", "dosage": "325mg chewable", "frequency": "daily", "times": ["12:00"]},
    "Hepatitis A": {"name": "Liver Support Vitamins", "dosage": "1 capsule", "frequency": "daily", "times": ["08:00"]},
    "Hepatitis B": {"name": "Tenofovir Alafenamide", "dosage": "25mg", "frequency": "daily", "times": ["08:00"]},
    "Hepatitis C": {"name": "Direct-Acting Antivirals", "dosage": "1 tablet", "frequency": "daily", "times": ["08:00"]},
    "Hepatitis D": {"name": "Interferon support", "dosage": "Consult doctor", "frequency": "daily", "times": ["08:00"]},
    "Hepatitis E": {"name": "Hydration / Rest support", "dosage": "As needed", "frequency": "daily", "times": ["08:00"]},
    "Hypertension": {"name": "Amlodipine", "dosage": "5mg", "frequency": "daily", "times": ["08:00"]},
    "Hyperthyroidism": {"name": "Methimazole", "dosage": "10mg", "frequency": "daily", "times": ["08:00"]},
    "Hypoglycemia": {"name": "Glucose Tablets / Gel", "dosage": "15g", "frequency": "daily", "times": ["12:00"]},
    "Hypothyroidism": {"name": "Levothyroxine", "dosage": "50mcg", "frequency": "daily", "times": ["07:00"]},
    "Impetigo": {"name": "Mupirocin Ointment", "dosage": "Apply topically", "frequency": "daily", "times": ["08:00", "14:00", "20:00"]},
    "Jaundice": {"name": "Hepatoprotective formulation", "dosage": "1 tablet", "frequency": "daily", "times": ["08:00"]},
    "Malaria": {"name": "Artemether/Lumefantrine", "dosage": "1 tablet", "frequency": "daily", "times": ["08:00", "20:00"]},
    "Migraine": {"name": "Sumatriptan / Ibuprofen", "dosage": "50mg / 400mg", "frequency": "daily", "times": ["08:00", "20:00"]},
    "Osteoarthritis": {"name": "Glucosamine / Chondroitin", "dosage": "1 tablet", "frequency": "daily", "times": ["08:00"]},
    "Paralysis (brain hemorrhage)": {"name": "Emergency Support", "dosage": "Immediate", "frequency": "daily", "times": ["12:00"]},
    "Peptic Ulcer Disease": {"name": "Pantoprazole", "dosage": "40mg", "frequency": "daily", "times": ["07:00"]},
    "Pneumonia": {"name": "Mucolytic (Ambroxol)", "dosage": "30mg", "frequency": "daily", "times": ["08:00", "14:00", "20:00"]},
    "Psoriasis": {"name": "Coal Tar Shampoo / Cream", "dosage": "Apply topically", "frequency": "daily", "times": ["21:00"]},
    "Tuberculosis": {"name": "RIPE Therapy Support", "dosage": "As prescribed", "frequency": "daily", "times": ["08:00"]},
    "Typhoid": {"name": "Ciprofloxacin", "dosage": "500mg", "frequency": "daily", "times": ["08:00", "20:00"]},
    "Urinary Tract Infection": {"name": "Cranberry Extract / D-Mannose", "dosage": "500mg", "frequency": "daily", "times": ["08:00"]},
    "Varicose Veins": {"name": "Flavonoid supplement", "dosage": "500mg", "frequency": "daily", "times": ["08:00"]},
    "Vertigo": {"name": "Betahistine", "dosage": "16mg", "frequency": "daily", "times": ["08:00"]}
}

# --- Pydantic Models ---
class SymptomsIn(BaseModel):
    symptoms: List[str]
    user_id: Optional[str] = None # Added for manual/hardware sync if needed

class PredictedDisease(BaseModel):
    disease: str
    probability: float
    probability_percent: str
    recommended_med: dict

class PredictOut(BaseModel):
    total_score: int
    risk_level: str
    breakdown: dict
    predicted_diseases: List[PredictedDisease] = []

# --- Load Artifacts ---
def load_artifacts():
    global _MODEL, _FEATURES
    print("[Info] Initializing ML Disease Prediction Engine...")
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "..", "models", "symbipredict_model.joblib")
    features_path = os.path.join(base_dir, "..", "models", "feature_names.joblib")
    try:
        if os.path.exists(model_path) and os.path.exists(features_path):
            _MODEL = joblib.load(model_path)
            _FEATURES = list(joblib.load(features_path))
            print(f"[Success] Loaded RandomForestClassifier with {len(_FEATURES)} features and {len(_MODEL.classes_)} classes.")
        else:
            print(f"[Warning] Model artifacts not found at: {model_path} or {features_path}. Symptom ML engine skipped.")
    except Exception as e:
        print(f"[Error] Error loading ML symptom artifacts: {e}")

# --- Helper logic for ML Prediction ---
def predict_disease_risks(input_symptoms: list[str]) -> list[dict]:
    if _MODEL is None or _FEATURES is None:
        return []

    # Map user input symptoms to indices
    symptom_alias_map = {
        "chest pain": "chest_pain",
        "shortness of breath": "breathlessness",
        "extreme fatigue": "fatigue",
        "fatigue": "fatigue",
        "fever": "high_fever",
        "persistent cough": "cough",
        "nausea": "nausea",
        "body aches": "muscle_pain",
        "chills": "chills",
        "weakness": "muscle_weakness",
        "headache": "headache",
        "sore throat": "throat_irritation",
        "loss of appetite": "loss_of_appetite",
        "dizziness": "dizziness"
    }

    cleaned_inputs = set()
    for s in input_symptoms:
        s_clean = s.strip().lower()
        if s_clean in symptom_alias_map:
            cleaned_inputs.add(symptom_alias_map[s_clean])
        # Also clean spaces and replace with underscores
        s_clean_underscore = s_clean.replace(" ", "_")
        cleaned_inputs.add(s_clean_underscore)

    # Initialize feature vector of zeros
    x_input = np.zeros(len(_FEATURES))
    for i, feat in enumerate(_FEATURES):
        if feat in cleaned_inputs:
            x_input[i] = 1

    try:
        # Run predict_proba
        probabilities = _MODEL.predict_proba(x_input.reshape(1, -1))[0]
        
        predictions = []
        for class_name, prob in zip(_MODEL.classes_, probabilities):
            if prob > 0.01:  # threshold 1%
                disease = str(class_name).strip()
                med_info = DISEASE_OTC_MAPPING.get(disease, {
                    "name": "General Consult",
                    "dosage": "As prescribed",
                    "frequency": "daily",
                    "times": ["09:00"]
                })
                predictions.append({
                    "disease": disease,
                    "probability": round(float(prob), 4),
                    "probability_percent": f"{prob * 100:.1f}%",
                    "recommended_med": med_info
                })
        
        # Sort descending by probability
        predictions.sort(key=lambda x: x["probability"], reverse=True)
        return predictions
    except Exception as e:
        print(f"[Warning] Error running disease prediction: {e}")
        return []

# --- Endpoints ---
@router.post("/predict", response_model=PredictOut, tags=["Predictions"])
def predict(payload: SymptomsIn):
    """
    Calculate a rule-based risk score based on symptoms, and run RandomForest disease classifier.
    """
    symptoms = [s.lower() for s in payload.symptoms]
    total_score = 0
    breakdown = {}

    for s in symptoms:
        weight = SYMPTOM_RULES.get(s, 5) # Default weight 5 for unknown symptoms
        total_score += weight
        breakdown[s] = weight

    # Cap at 100
    total_score = min(100, total_score)

    # Determine Severity
    if total_score <= 15:
        risk_level = "Stable"
    elif total_score <= 40:
        risk_level = "Warning"
    else:
        risk_level = "Critical"

    # Get ML Predictions
    diseases = predict_disease_risks(payload.symptoms)

    return {
        "total_score": total_score,
        "risk_level": risk_level,
        "breakdown": breakdown,
        "predicted_diseases": diseases
    }

@router.post("/sync", tags=["Predictions"])
async def sync_symptoms(payload: SymptomsIn):
    """
    Saves the symptom score to Supabase so the Risk Engine can use it.
    Requires a user_id from the frontend (Supabase Auth).
    """
    if not payload.user_id:
        raise HTTPException(status_code=400, detail="User ID required for sync")

    # Calculate score and run ML predictions
    result = predict(payload)
    
    try:
        supabase.table("user_symptom_scores").insert({
            "user_id": payload.user_id,
            "symptoms": payload.symptoms,
            "score": result["total_score"],
            "risk_level": result["risk_level"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        
        return {
            "status": "synced",
            "score": result["total_score"],
            "predicted_diseases": result["predicted_diseases"]
        }
    except Exception as e:
        print(f"[Error] Sync failed: {e}")
        raise HTTPException(status_code=500, detail="Database sync failed")


@router.get("/latest", tags=["Predictions"])
async def get_latest_symptoms(user_id: str = Query(...)):
    """
    Returns the most recently synced symptom list and score for a user.
    Uses RF model to predict disease risks on-the-fly.
    """
    try:
        result = (
            supabase.table("user_symptom_scores")
            .select("symptoms, score, risk_level, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            row = result.data[0]
            # Run prediction on-the-fly for the saved symptoms
            diseases = predict_disease_risks(row["symptoms"])
            return {
                "symptoms": row["symptoms"],
                "score": row["score"],
                "risk_level": row["risk_level"],
                "synced_at": row["created_at"],
                "predicted_diseases": diseases
            }
        return {"symptoms": [], "score": 0, "risk_level": "Stable", "synced_at": None, "predicted_diseases": []}
    except Exception as e:
        print(f"[Warning] get_latest_symptoms: {e}")
        return {"symptoms": [], "score": 0, "risk_level": "Stable", "synced_at": None, "predicted_diseases": []}