"""
WMS Machine Learning Router:
Weather-Constrained Hydrological Forecasting & Stress Prediction Engine
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

ml_router = APIRouter(prefix="/api/ml", tags=["machine-learning"])

ML_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml")
MODEL_PATH = os.path.join(ML_DIR, "water_weather_ml_pipeline.joblib")
METRICS_PATH = os.path.join(ML_DIR, "model_metrics.json")

# In-memory pipeline cache
_cached_pipeline = None

def get_ml_pipeline():
    global _cached_pipeline
    if _cached_pipeline is None:
        if os.path.exists(MODEL_PATH):
            _cached_pipeline = joblib.load(MODEL_PATH)
        else:
            raise HTTPException(status_code=503, detail="ML model pipeline not yet trained or loaded.")
    return _cached_pipeline

class WeatherInferenceInput(BaseModel):
    locality_name: Optional[str] = "Banjara Hills"
    zone: Optional[str] = "Khairatabad"
    latitude: float = 17.4156
    longitude: float = 78.4350
    elevation_m: float = 540.0
    pipeline_age_years: float = 18.0
    base_capacity_mld: float = 4.2
    season: str = "Summer"
    temperature_c: float = 38.5
    humidity_pct: float = 42.0
    rainfall_mm: float = 0.0
    wind_speed_kmh: float = 12.0
    evapotranspiration_mm: Optional[float] = None
    heat_wave_flag: Optional[int] = None

class PredictionOutput(BaseModel):
    locality_name: str
    predicted_water_stress_index: float
    stress_category: str
    predicted_supply_reliability: float
    recommended_tanker_buffer_units: int
    meteorological_constraints: Dict[str, Any]
    model_version: str

@ml_router.get("/metrics")
async def get_model_metrics():
    """Returns training comparison metrics, holdout test metrics, and weather feature importances."""
    if not os.path.exists(METRICS_PATH):
        raise HTTPException(status_code=404, detail="Metrics file not found.")
    with open(METRICS_PATH, "r") as f:
        data = json.load(f)
    return data

@ml_router.post("/predict-stress", response_model=PredictionOutput)
async def predict_water_stress(payload: WeatherInferenceInput):
    """
    Performs real-time ML inference on water stress constrained by meteorological inputs
    (temperature, rainfall, humidity, heat wave index).
    """
    pipeline = get_ml_pipeline()

    heat_flag = payload.heat_wave_flag
    if heat_flag is None:
        heat_flag = 1 if payload.temperature_c >= 39.5 else 0

    et_mm = payload.evapotranspiration_mm
    if et_mm is None:
        et_mm = float(round(0.0023 * (payload.temperature_c + 17.8) * np.sqrt(max(0, payload.temperature_c - 12)) * (100 - payload.humidity_pct) / 50, 2))

    df_in = pd.DataFrame([{
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "elevation_m": payload.elevation_m,
        "pipeline_age_years": payload.pipeline_age_years,
        "base_capacity_mld": payload.base_capacity_mld,
        "temperature_c": payload.temperature_c,
        "humidity_pct": payload.humidity_pct,
        "rainfall_mm": payload.rainfall_mm,
        "wind_speed_kmh": payload.wind_speed_kmh,
        "evapotranspiration_mm": et_mm,
        "heat_wave_flag": heat_flag,
        "zone": payload.zone,
        "season": payload.season,
    }])

    pred_stress = float(pipeline.predict(df_in)[0])
    pred_stress = float(np.clip(pred_stress, 0.05, 0.98))

    if pred_stress >= 0.70:
        cat = "Critical Deficit / Acute Stress"
    elif pred_stress >= 0.45:
        cat = "Moderate Stress / High Evaporation"
    else:
        cat = "Stable / Normal Hydrological Balance"

    # Reliability is constrained inversely by stress
    reliability = float(np.clip(round(1.0 - (pred_stress * 0.85), 3), 0.05, 0.98))
    tankers = int(np.round(payload.base_capacity_mld * 2.8 * (1.0 + pred_stress * 2.2)))
    if heat_flag:
        tankers += 6

    return PredictionOutput(
        locality_name=payload.locality_name or "Ward",
        predicted_water_stress_index=round(pred_stress, 3),
        stress_category=cat,
        predicted_supply_reliability=reliability,
        recommended_tanker_buffer_units=tankers,
        meteorological_constraints={
            "temperature_c": payload.temperature_c,
            "rainfall_mm": payload.rainfall_mm,
            "humidity_pct": payload.humidity_pct,
            "heat_wave_active": bool(heat_flag),
            "evapotranspiration_rate_mm": et_mm
        },
        model_version="Gradient_Boosting_v1.0"
    )

@ml_router.get("/ward-forecast")
async def get_ward_forecast():
    """
    Returns 7-day predictive meteorological water-stress curves across Hyderabad wards.
    """
    pipeline = get_ml_pipeline()

    wards = [
        {"id": 1, "name": "Banjara Hills", "zone": "Khairatabad", "lat": 17.4156, "lng": 78.4350, "elev": 540, "base_cap_mld": 4.2, "pipe_age": 18},
        {"id": 2, "name": "Jubilee Hills", "zone": "Khairatabad", "lat": 17.4319, "lng": 78.4073, "elev": 555, "base_cap_mld": 3.8, "pipe_age": 14},
        {"id": 3, "name": "Kondapur", "zone": "Serilingampally", "lat": 17.4699, "lng": 78.3578, "elev": 560, "base_cap_mld": 5.1, "pipe_age": 9},
        {"id": 4, "name": "Madhapur", "zone": "Serilingampally", "lat": 17.4483, "lng": 78.3915, "elev": 550, "base_cap_mld": 6.5, "pipe_age": 11},
        {"id": 5, "name": "Gachibowli", "zone": "Serilingampally", "lat": 17.4401, "lng": 78.3489, "elev": 565, "base_cap_mld": 4.9, "pipe_age": 8},
        {"id": 6, "name": "Kukatpally", "zone": "Kukatpally", "lat": 17.4947, "lng": 78.3996, "elev": 535, "base_cap_mld": 7.2, "pipe_age": 22},
        {"id": 7, "name": "Secunderabad", "zone": "Secunderabad", "lat": 17.4399, "lng": 78.4983, "elev": 520, "base_cap_mld": 5.8, "pipe_age": 35},
        {"id": 8, "name": "Charminar", "zone": "Charminar", "lat": 17.3616, "lng": 78.4747, "elev": 505, "base_cap_mld": 6.1, "pipe_age": 42},
    ]

    base_temps = [36.5, 37.8, 39.2, 40.5, 39.0, 37.2, 35.8]
    base_rains = [0.0, 0.0, 0.0, 0.0, 2.5, 8.0, 14.5]

    forecast_results = []
    today = datetime.now()

    for day_offset in range(7):
        target_date = today + timedelta(days=day_offset)
        day_temp = base_temps[day_offset]
        day_rain = base_rains[day_offset]
        day_hum = 45.0 - (day_temp - 35.0) * 3.0 + (day_rain * 2.5)
        is_heat = 1 if day_temp >= 39.5 else 0

        ward_rows = []
        for w in wards:
            et = float(round(0.0023 * (day_temp + 17.8) * np.sqrt(max(0, day_temp - 12)) * (100 - day_hum) / 50, 2))
            ward_rows.append({
                "latitude": w["lat"],
                "longitude": w["lng"],
                "elevation_m": w["elev"],
                "pipeline_age_years": w["pipe_age"],
                "base_capacity_mld": w["base_cap_mld"],
                "temperature_c": day_temp,
                "humidity_pct": day_hum,
                "rainfall_mm": day_rain,
                "wind_speed_kmh": 11.5,
                "evapotranspiration_mm": et,
                "heat_wave_flag": is_heat,
                "zone": w["zone"],
                "season": "Summer",
            })

        df_in = pd.DataFrame(ward_rows)
        preds = pipeline.predict(df_in)

        ward_predictions = []
        for i, w in enumerate(wards):
            stress = float(np.clip(preds[i], 0.05, 0.98))
            ward_predictions.append({
                "ward_id": w["id"],
                "ward_name": w["name"],
                "zone": w["zone"],
                "latitude": w["lat"],
                "longitude": w["lng"],
                "predicted_stress_index": round(stress, 3),
                "predicted_reliability": round(float(np.clip(1.0 - (stress * 0.85), 0.05, 0.98)), 3),
                "tanker_demand_units": int(np.round(w["base_cap_mld"] * 2.8 * (1.0 + stress * 2.2))) + (6 if is_heat else 0)
            })

        forecast_results.append({
            "date": target_date.strftime("%Y-%m-%d"),
            "day_name": target_date.strftime("%A"),
            "weather": {
                "temperature_c": day_temp,
                "rainfall_mm": day_rain,
                "humidity_pct": round(day_hum, 1),
                "heat_wave_flag": bool(is_heat),
            },
            "ward_predictions": ward_predictions
        })

    return {
        "status": "success",
        "model": "Gradient_Boosting_v1.0",
        "forecast_window_days": 7,
        "daily_forecasts": forecast_results
    }
