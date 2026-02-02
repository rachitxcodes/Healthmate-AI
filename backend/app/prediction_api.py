# prediction_api.py

import pickle
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Extra
from typing import Dict, Any, List, Set
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent

# --- 1. Model Loading (Happens only once at startup) ---

# Dictionaries to hold our loaded model and scaler objects
MODELS = {}
SCALERS = {}
MODEL_PATHS = {
    "diabetes": (BASE_DIR / "models/diabetes_model.pkl", BASE_DIR / "models/diabetes_scaler.pkl"),
    "heart": (BASE_DIR / "models/heart_model_calibrated.pkl", BASE_DIR / "models/heart_scaler.pkl"),
    "liver": (BASE_DIR / "models/liver_model_calibrated.pkl", BASE_DIR / "models/liver_scaler.pkl"),
    "anemia": (BASE_DIR / "models/anemia_model_calibrated.pkl", BASE_DIR / "models/anemia_scaler.pkl"),
    "thyroid": (BASE_DIR / "models/thyroid_model_calibrated.pkl", BASE_DIR / "models/thyroid_scaler.pkl"),
}

for model_name, (model_path, scaler_path) in MODEL_PATHS.items():
    try:
        with open(model_path, "rb") as f:
            MODELS[model_name] = pickle.load(f)
        with open(scaler_path, "rb") as f:
            SCALERS[model_name] = pickle.load(f)
        print(f"✅ Loaded '{model_name}' model and scaler.")
    except FileNotFoundError:
        print(f"⚠️ Warning: Could not find model/scaler for '{model_name}'. It will be unavailable.")

router = APIRouter()

# Pydantic model to accept any JSON data from the frontend
class ReportData(BaseModel):
    class Config:
        extra = Extra.allow

# --- 2. Feature Definitions ---
# IMPORTANT: You MUST replace these lists with the actual column names 
# your models were trained on, in the correct order.

DIABETES_FEATURES = [
    'Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness', 
    'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age'
]
HEART_FEATURES = [
    'age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg', 
    'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal'
]
LIVER_FEATURES = [
    'Age', 'Gender', 'Total_Bilirubin', 'Direct_Bilirubin', 
    'Alkaline_Phosphotase', 'Alamine_Aminotransferase', 
    'Aspartate_Aminotransferase', 'Total_Protiens', 'Albumin', 
    'Albumin_and_Globulin_Ratio'
]


# --- 3. Prediction Logic (Wrapped in Robust Functions) ---

def _run_prediction(model_name: str, features_list: List[str], data: Dict[str, Any]):
    """
    A generic function to run a prediction for a given model.
    It checks for required features and handles errors gracefully.
    """
    # Check if the model was loaded successfully at startup
    if model_name not in MODELS or model_name not in SCALERS:
        return {
            "status": "error",
            "message": f"Model '{model_name}' is not loaded or available."
        }

    # Check if all required features are present in the input data
    incoming_features = set(data.keys())
    required_features = set(features_list)
    
    if not required_features.issubset(incoming_features):
        missing = list(required_features - incoming_features)
        return {
            "status": "skipped",
            "message": f"Missing required features: {missing}"
        }

    try:
        # Create a pandas DataFrame from the input data, with columns in the correct order
        df = pd.DataFrame([data], columns=features_list)
        
        # Scale the features
        scaled_features = SCALERS[model_name].transform(df)
        
        # Make a prediction
        prediction = MODELS[model_name].predict(scaled_features)
        prediction_proba = MODELS[model_name].predict_proba(scaled_features)
        
        # Format the result (this part can be customized for each model)
        if model_name == "diabetes":
            result_text = "Positive" if prediction[0] == 1 else "Negative"
        elif model_name == "heart":
            result_text = "Heart Disease Detected" if prediction[0] == 1 else "No Heart Disease Detected"
        elif model_name == "liver":
            result_text = "Liver Disease Detected" if prediction[0] == 1 else "No Liver Disease Detected"
        else:
            result_text = str(prediction[0])
            
        confidence = prediction_proba[0][prediction[0]]
        
        return {
            "status": "success",
            "prediction": result_text,
            "confidence": f"{confidence:.2%}" # Format as percentage
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"An error occurred during prediction: {str(e)}"
        }

# --- 4. The Single API Endpoint ---

@router.post("/predict")
async def get_all_predictions(report_data: ReportData):
    """
    Receives a comprehensive report data, runs all applicable prediction models,
    and returns a consolidated result.
    """
    data_dict = report_data.dict()
    print(f"Received data for combined prediction: {data_dict}")

    # Run all models and collect their results
    results = {
        "diabetes_prediction": _run_prediction("diabetes", DIABETES_FEATURES, data_dict),
        "heart_disease_prediction": _run_prediction("heart", HEART_FEATURES, data_dict),
        "liver_disease_prediction": _run_prediction("liver", LIVER_FEATURES, data_dict),
    }

    return results