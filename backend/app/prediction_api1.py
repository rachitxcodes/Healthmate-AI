# File: prediction_api1.py

import os
import json
import joblib
import numpy as np
from fastapi import APIRouter
import re

# ==========================================================
# 1. CONSTANTS & CONFIGURATION
# ==========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")

router = APIRouter()

# --- Alias Table (EXPANDED) ---
ALIASES = {
    "HGB": ["hemoglobin", "hb", "hgb"],
    "RBC": ["rbc count", "rbc", "red blood cell", "total rbc"],
    "MCV": ["mean corpuscular volume", "mcv"],
    "MCH": ["mean corpuscular hemoglobin", "mch"],
    "MCHC": ["mean corpuscular hemoglobin concentration", "mchc"],
    "RDW": ["red cell distribution width", "rdw"],
    "PCV": ["pcv", "hematocrit", "hct"],

    "WBC": ["total wbc count", "wbc count", "total wbc", "wbc"],
    "Platelets": ["platelet count", "platelets", "plt"],

    "Age": ["age"],
    "Sex": ["sex", "gender"],
}

IGNORE_KEYWORDS = ["unit", "reference", "range", "value", "normal"]


# ==========================================================
# 2. DATA NORMALIZATION
# ==========================================================

def clean_numeric(value):
    """
    Cleans numeric values:
    - '12.5 g/dL'  → 12.5
    - '9000 cumm'  → 9000
    - '13.6%'      → 13.6
    - '5.2 million/cumm' → 5200000
    - 'Male'/'Female' → returned as string for sex
    """
    if value is None:
        return None

    s = str(value).lower().strip()

    # --- categorical sex value ---
    if s in ["male", "female", "m", "f"]:
        return s

    # --- remove commas ---
    s = s.replace(",", "")

    # --- handle million ---
    if "million" in s:
        m = re.search(r"\d*\.?\d+", s)
        if m:
            return float(m.group()) * 1_000_000

    # --- percentage ---
    if "%" in s:
        m = re.search(r"\d*\.?\d+", s)
        if m:
            return float(m.group())

    # --- extract any number ---
    m = re.search(r"[-+]?\d*\.?\d+", s)
    if m:
        return float(m.group())

    return None


def normalize_input_data(raw_json: dict) -> dict:
    """
    Standardizes OCR output → ML-ready feature dict.
    """
    normalized = {}

    for key_raw, value in raw_json.items():
        key_clean = key_raw.lower().strip()

        # skip unwanted lines
        if any(kw in key_clean for kw in IGNORE_KEYWORDS):
            continue

        for std_key, variants in ALIASES.items():
            if any(alias in key_clean for alias in variants):

                cleaned_value = clean_numeric(value)

                if cleaned_value is not None:
                    normalized[std_key] = cleaned_value

                break  # stop searching aliases for this field

    return normalized


# ==========================================================
# 3. PREDICTION ENGINE
# ==========================================================

def encode_categorical(feature, value):
    """Convert categorical values to numeric where needed."""
    if feature == "Sex":
        if isinstance(value, str):
            if value.startswith("m"):
                return 1
            if value.startswith("f"):
                return 0
    return value


def run_prediction_for_all_models(normalized_data: dict) -> dict:
    results = {}

    if not os.path.exists(MODEL_DIR):
        raise FileNotFoundError(f"Model directory not found: {MODEL_DIR}")

    for meta_file in os.listdir(MODEL_DIR):

        if not meta_file.endswith("_metadata.pkl"):
            continue

        disease_name = meta_file.replace("_metadata.pkl", "")

        try:
            meta = joblib.load(os.path.join(MODEL_DIR, f"{disease_name}_metadata.pkl"))
            model = joblib.load(os.path.join(MODEL_DIR, f"{disease_name}_model_calibrated.pkl"))
            scaler = joblib.load(os.path.join(MODEL_DIR, f"{disease_name}_scaler.pkl"))
        except:
            print(f"⚠ Missing model files for: {disease_name}")
            continue

        required = meta["features"]
        medians = meta["feature_medians"]

        matched = [f for f in required if f in normalized_data]
        missing = [f for f in required if f not in normalized_data]

        # require 40% match
        if len(matched) < max(1, int(0.4 * len(required))):
            results[disease_name] = {
                "ran": False,
                "reason": "Insufficient features available",
                "matched_features": matched,
                "missing_features": missing
            }
            continue

        # build feature vector
        feature_vec = []
        for feat in required:
            val = normalized_data.get(feat, medians[feat])
            val = encode_categorical(feat, val)
            feature_vec.append(val)

        X = np.array(feature_vec).reshape(1, -1)
        X_scaled = scaler.transform(X)
        prob = float(model.predict_proba(X_scaled)[0][1])

        results[disease_name] = {
            "ran": True,
            "risk_probability": prob,
            "risk_percent": f"{prob*100:.2f}%",
            "matched_features": matched,
            "missing_features": missing,
        }

    return results


# ==========================================================
# 4. MAIN PIPELINE FUNCTION
# ==========================================================

def process_report_data(raw_json_data: dict) -> dict:
    print("\n🔄 Normalizing raw OCR data...")
    normalized_features = normalize_input_data(raw_json_data)
    print("📦 Final Features for Models:", json.dumps(normalized_features, indent=2))

    print("\n🤖 Running prediction models...")
    prediction_results = run_prediction_for_all_models(normalized_features)
    print("📊 Final Risk Results:", json.dumps(prediction_results, indent=2))

    return prediction_results
